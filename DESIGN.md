# Documentation & Design Decisions

## How To Run

### Option A: Full stack via Docker Compose (recommended)

Builds and runs both the app and Postgres in containers. No local setup needed beyond Docker.

```bash
cp env.example .env        # fill in secrets before starting
docker compose up --build
```

API: `http://localhost:9000/partner-app/api`
Swagger UI: `http://localhost:9000/docs`

### Option B: Local app + DB in Docker

Faster dev loop — avoids rebuilding the image on every change.

```bash
cp env.example .env        # fill in JWT secrets
docker compose up db       # starts Postgres only
yarn install
yarn dev
```

### Running Tests

```bash
yarn test          # unit + HTTP integration tests
yarn test:e2e      # repository e2e tests — requires Docker
```

---

## Architecture

The service follows a layered architecture with strict separation of concerns:

```
HTTP Request
    └── Controller          validates input, maps HTTP ↔ service calls
            └── Service     business logic, orchestrates domain operations
                    └── Repository    data access, TypeORM ↔ domain objects
                            └── Database (PostgreSQL)
```

Each layer only depends on the layer directly below it, and all dependencies are expressed as interfaces — making every layer independently testable without touching infrastructure.

### Dependency Injection (Inversify)

All components are wired through an Inversify IoC container (`inversify.config.ts`). Dependencies are declared via constructor injection with `@inject(TYPES.X)` symbols rather than concrete classes. This means:

- Swapping implementations (e.g. a different password hashing strategy, or an in-memory repository for tests) requires changing a single binding in the container, not touching call sites.
- The controller tests demonstrate this: `TYPES.UserService` is rebound to a `jest.Mocked<UserService>` per test, giving complete isolation from the real service and database.

`inversify-express-utils` is used to co-locate route definitions with controllers via decorators (`@controller`, `@httpPost`, etc.), keeping routing close to the code that handles it.

### Repository Pattern

`UserRepository` is defined as an interface and injected into `UserService`. The implementation (`UserRepositoryImpl`) is the only place that knows about TypeORM. This decouples persistence details from business logic — the service works against a contract, not a specific ORM, which makes it unit-testable with a plain mock and straightforward to swap the storage layer without touching business rules.

---

## Security

### Password Hashing

Passwords are hashed with **scrypt** (Node.js built-in `crypto.scrypt`) rather than bcrypt. Scrypt is memory-hard, making it more resistant to GPU-based brute-force attacks. A random 16-byte salt is generated per password and stored alongside the hash as `hash.salt` in a single column, so no separate column or table is needed for the salt.

### JWT Strategy

Two tokens are issued on login:


| Token         | Algorithm | Expiry     | Secret               |
| ------------- | --------- | ---------- | -------------------- |
| Access token  | HS256     | 15 minutes | `JWT_SECRET`         |
| Refresh token | HS256     | 7 days     | `JWT_REFRESH_SECRET` |


Short-lived access tokens limit the window of exposure if a token is leaked. The refresh token lets clients obtain new access tokens without re-authenticating, while the separate secret means a compromised `JWT_SECRET` does not affect refresh tokens.

The access token payload carries only `{ id, email }` — the minimum needed for the auth middleware to identify the user without an extra DB round-trip on every request.

**Known limitation:** old access tokens are not invalidated when a new one is issued via refresh. A stolen access token remains usable until it expires. Mitigation options: token blacklisting (store revoked JTIs in Redis/DB), refresh token rotation with reuse detection, or shortening the access token TTL further. The 15-minute expiry is a pragmatic middle ground for now.

### Input Validation

Every endpoint is guarded by a `validateBody` middleware that runs before the controller method. It uses `class-transformer` to deserialise the raw request body into a typed DTO, then `class-validator` to run the decorator-based rules. Invalid payloads are rejected at the boundary with a structured `400` response — the service layer is never reached with malformed data, keeping business logic free of defensive input checks. Password strength rules are enforced declaratively on the DTO, co-located with the shape they describe.

`plainToInstance` is called with `excludeExtraneousValues: true`, so any field not explicitly decorated with `@Expose()` is stripped before the controller is reached. This acts as allowlist-style input sanitisation — unknown or unexpected fields are silently dropped rather than passed through.

### Rate Limiting

Three sensitive endpoints are rate-limited per IP using `express-rate-limit`:


| Endpoint                      | Limit       | Window     | Rationale                                            |
| ----------------------------- | ----------- | ---------- | ---------------------------------------------------- |
| `POST /users/login`           | 10 requests | 15 minutes | Mitigate brute-force and credential-stuffing attacks |
| `POST /users/register`        | 5 requests  | 1 hour     | Prevent bulk account creation from a single IP       |
| `POST /users/forgot-password` | 5 requests  | 1 hour     | Prevent password reset request spam                  |


`POST /users/refresh` is not rate-limited — it requires a valid, signed refresh token, which is sufficient protection on its own.

**Known limitation:** the limiter uses an in-memory store, so counters are not shared across multiple server instances. In a horizontally scaled deployment, a request could hit a different instance each time and bypass the limit. The fix is to swap in a Redis-backed store (e.g. `rate-limit-redis`), which `express-rate-limit` supports as a drop-in via its `store` option.

### User Enumeration Prevention

`POST /users/forgot-password` always returns `200` with a generic message regardless of whether the email is registered. This prevents an attacker from probing which email addresses have accounts.

### Response Sanitisation

The `password` field is stripped from every user response via destructuring (`{ password: _, ...safeUser }`). The field never appears in any API response, even on error paths.

---

## Data Model

Three entities cover the full feature set:

`**User`** — core identity record. Stores the hashed password inline (no separate table needed given scrypt's salt-in-value format).

`**RefreshToken**` — one row per active session. Required to support token revocation (logout, suspicious activity). Stores the token *hash* only — the raw token is held by the client. Has `revokedAt` timestamp for soft-revocation and `CASCADE` delete on user removal.

`**PasswordResetToken*`* — one row per reset request. Stores the token *hash* with an `expiresAt` and `usedAt` timestamp to enforce one-time use and expiry. `CASCADE` delete on user removal.

> **Note:** `RefreshToken` and `PasswordResetToken` are currently entity stubs. The DB schema is defined and will be created by TypeORM's `synchronize` mode, but the service methods that read/write them are stubbed with TODO comments (see below).

---

## Known Limitations

### Error Response Detail

Controller catch blocks return `err.message` directly in the response body. In production this can leak internal details — TypeORM constraint messages expose column and table names, and JWT errors expose token state. The proper fix is a normalised error handler that maps known error types to safe messages and swallows the rest. Omitted here to keep the scope focused.

---

## What Was Deferred and Why

### Password Reset Flow

Completing the password reset flow requires two pieces of infrastructure that are out of scope for a standalone auth service:

1. **Email delivery** — sending the reset link requires an email provider (SendGrid, SES, etc.) which would need to be provisioned, credentialed, and injected as a service. The integration point is marked with TODO in `UserServiceImpl.forgotPassword`.
2. **Token storage** — the `PasswordResetToken` entity is defined and ready; the repository and service wiring are the next step. The token generation, hashing, and lookup logic is documented in TODO comments in `UserServiceImpl`.

The endpoint contract is fully implemented: `POST /forgot-password` always returns 200 (see user enumeration above), `POST /reset-password` returns 200 on success and 400 on invalid/expired token.

### Refresh Token Revocation

`UserService.refresh` currently validates the JWT signature and re-issues an access token, but does not persist or check the `RefreshToken` table. Wiring this up is the natural next step: on login, insert a hashed token row; on refresh, look up the hash and check `revokedAt`; on logout (not yet exposed as an endpoint), set `revokedAt`.

---

## Testing Strategy

Tests are co-located with the implementation files they cover (`*.test.ts` next to `*.ts`). The suite is structured in two layers:

**Unit tests** (`password-manager-service`, `user-service`, `user-repository`, `auth-middleware`, `rate-limit`) — mock all external dependencies (DataSource, JWT, etc.). Each test constructs the class under test directly, passing mocked collaborators. No HTTP layer, no database.

**HTTP integration tests** (`user-controller`) — spin up a real Express app via `InversifyExpressServer` with a mock container binding, and send real HTTP requests using Supertest. These tests exercise routing, middleware ordering (auth, validation, rate limiting), status codes, and response shapes. The `UserService` is mocked so they remain fast and deterministic without a database.

**Repository e2e tests** (`user-repository.e2e.test.ts`) — spin up an ephemeral Postgres container via testcontainers, apply the schema with TypeORM's `synchronize`, and run all repository operations against a real database. This gives confidence that queries, TypeORM mappings, and DB constraints (e.g. unique email) behave correctly. The container is created once per test run and the table is truncated between tests for isolation. Run with `yarn test:e2e`; requires Docker.

Tests were written stub-first against the interface contract before implementing, ensuring the test suite reflects requirements rather than implementation details.

---

