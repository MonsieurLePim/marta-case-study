# Design Decisions

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

`UserRepository` is defined as an interface and injected into `UserService`. The implementation (`UserRepositoryImpl`) holds the only TypeORM reference in the data layer. This keeps ORM details out of business logic and makes the service unit-testable with a plain mock — no database needed.

---

## Security

### Password Hashing

Passwords are hashed with **scrypt** (Node.js built-in `crypto.scrypt`) rather than bcrypt. Scrypt is memory-hard, making it more resistant to GPU-based brute-force attacks. A random 16-byte salt is generated per password and stored alongside the hash as `hash.salt` in a single column, so no separate column or table is needed for the salt.

### JWT Strategy

Two tokens are issued on login:

| Token | Algorithm | Expiry | Secret |
|---|---|---|---|
| Access token | HS256 | 15 minutes | `JWT_SECRET` |
| Refresh token | HS256 | 7 days | `JWT_REFRESH_SECRET` |

Short-lived access tokens limit the window of exposure if a token is leaked. The refresh token lets clients obtain new access tokens without re-authenticating, while the separate secret means a compromised `JWT_SECRET` does not affect refresh tokens.

The access token payload carries only `{ id, email }` — the minimum needed for the auth middleware to identify the user without an extra DB round-trip on every request.

### Input Validation

Every endpoint is guarded by `validateBody(DtoClass)` middleware (built with `class-validator` + `class-transformer`). Validation runs before the controller method executes, so invalid payloads are rejected with a structured `400` response and the service layer is never reached. Password strength rules (min 8 chars, one uppercase, one lowercase, one number) are enforced at the DTO level via `@Matches`.

### Rate Limiting

`POST /users/login` is protected by `express-rate-limit` (max 10 requests per 15 minutes per IP). The limiter is exported as a factory (`createLoginRateLimiter(max, windowMs)`) so tests can instantiate a lower-limit version without touching the production singleton, avoiding test-environment side effects.

### User Enumeration Prevention

`POST /users/forgot-password` always returns `200` with a generic message regardless of whether the email is registered. This prevents an attacker from probing which email addresses have accounts.

### Response Sanitisation

The `password` field is stripped from every user response via destructuring (`{ password: _, ...safeUser }`). The field never appears in any API response, even on error paths.

---

## Data Model

Three entities cover the full feature set:

**`User`** — core identity record. Stores the hashed password inline (no separate table needed given scrypt's salt-in-value format).

**`RefreshToken`** — one row per active session. Required to support token revocation (logout, suspicious activity). Stores the token *hash* only — the raw token is held by the client. Has `revokedAt` timestamp for soft-revocation and `CASCADE` delete on user removal.

**`PasswordResetToken`** — one row per reset request. Stores the token *hash* with an `expiresAt` and `usedAt` timestamp to enforce one-time use and expiry. `CASCADE` delete on user removal.

> **Note:** `RefreshToken` and `PasswordResetToken` are currently entity stubs. The DB schema is defined and will be created by TypeORM's `synchronize` mode, but the service methods that read/write them are stubbed with TODO comments (see below).

---

## What Was Deferred and Why

### Password Reset Flow (structure only)

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

**What is not covered:** full-stack integration tests against a real database. For that, `testcontainers` (ephemeral Postgres in Docker per test run) would be the approach — it was out of scope here but is the natural next step to give confidence that the repository queries and TypeORM mappings work correctly end-to-end.

### TDD Approach

Each component was built in two commits: a stub + failing tests first, then the implementation to make them green. This ensured the tests were written against the interface contract, not the implementation.

---

## Bonus Items Completed

| Item | Notes |
|---|---|
| Refresh token mechanism | Separate secret, 7-day expiry, dedicated `/users/refresh` endpoint |
| Rate limiting | Factory pattern for testability; 429 documented in Swagger |
| Password reset flow | Endpoint structure, DTO validation, entity stubs, TODO comments for email/token infra |
| Request validation | `class-validator` DTOs, structured error responses |
| Docker Compose | Multi-stage Dockerfile, Postgres with healthcheck, env override pattern |
| Swagger / OpenAPI | Full OpenAPI 3.0 spec, served at `/partner-app/api/docs` |
