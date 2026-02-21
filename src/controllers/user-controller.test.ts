import 'reflect-metadata';
import request from 'supertest';
import { json } from 'body-parser';
import jwt from 'jsonwebtoken';
import { Container } from 'inversify';
import { InversifyExpressServer } from 'inversify-express-utils';

// Mock rate limiters as pass-throughs so controller tests are not affected by rate limiting.
// Rate limiter behaviour is covered independently in rate-limit.test.ts.
jest.mock('lib', () => ({
    ...jest.requireActual('lib'),
    loginRateLimiter: (_req: any, _res: any, next: any) => next(),
    registerRateLimiter: (_req: any, _res: any, next: any) => next(),
    forgotPasswordRateLimiter: (_req: any, _res: any, next: any) => next(),
}));

import { TYPES } from 'lib';
import { UserService } from 'services/user-service';
import { User } from 'entities/user';
import './user-controller';

const ROOT = '/partner-app/api';
const JWT_SECRET = 'test-secret';

const buildApp = (mockUserService: jest.Mocked<UserService>) => {
    const container = new Container();
    container.bind<UserService>(TYPES.UserService).toConstantValue(mockUserService);
    const server = new InversifyExpressServer(container, null, {
        rootPath: ROOT,
    });
    server.setConfig((app) => app.use(json()));
    return server.build();
};

const makeToken = () => jwt.sign({ id: 'user-1', email: 'test@test.com' }, JWT_SECRET);

describe('UserController', () => {
    let mockUserService: jest.Mocked<UserService>;

    beforeEach(() => {
        process.env.JWT_SECRET = JWT_SECRET;
        mockUserService = {
            register: jest.fn(),
            authenticate: jest.fn(),
            refresh: jest.fn(),
            getProfile: jest.fn(),
            updateProfile: jest.fn(),
            forgotPassword: jest.fn(),
            resetPassword: jest.fn(),
        };
    });

    describe('POST /users/register', () => {
        const dto = {
            email: 'test@test.com',
            password: 'Password1',
            firstName: 'John',
            lastName: 'Doe',
        };

        it('should return 400 for an invalid email', async () => {
            const res = await request(buildApp(mockUserService))
                .post(`${ROOT}/users/register`)
                .send({ ...dto, email: 'not-an-email' });

            expect(res.status).toBe(400);
            expect(mockUserService.register).not.toHaveBeenCalled();
        });

        it('should return 400 when password is too short', async () => {
            const res = await request(buildApp(mockUserService))
                .post(`${ROOT}/users/register`)
                .send({ ...dto, password: 'Ab1' });

            expect(res.status).toBe(400);
            expect(mockUserService.register).not.toHaveBeenCalled();
        });

        it('should return 400 when password has no uppercase letter', async () => {
            const res = await request(buildApp(mockUserService))
                .post(`${ROOT}/users/register`)
                .send({ ...dto, password: 'password1' });

            expect(res.status).toBe(400);
            expect(mockUserService.register).not.toHaveBeenCalled();
        });

        it('should return 400 when password has no number', async () => {
            const res = await request(buildApp(mockUserService))
                .post(`${ROOT}/users/register`)
                .send({ ...dto, password: 'Passwordd' });

            expect(res.status).toBe(400);
            expect(mockUserService.register).not.toHaveBeenCalled();
        });

        it('should return 201 with user data (no password) on success', async () => {
            const user = {
                id: 'user-1',
                ...dto,
                createdAt: new Date(),
                updatedAt: new Date(),
            } as User;
            mockUserService.register.mockResolvedValue(user);

            const res = await request(buildApp(mockUserService)).post(`${ROOT}/users/register`).send(dto);

            expect(res.status).toBe(201);
            expect(res.body).toMatchObject({
                email: 'test@test.com',
                firstName: 'John',
            });
            expect(res.body.password).toBeUndefined();
        });

        it('should return 400 when email is already taken', async () => {
            mockUserService.register.mockRejectedValue(new Error('Email already in use'));

            const res = await request(buildApp(mockUserService)).post(`${ROOT}/users/register`).send(dto);

            expect(res.status).toBe(400);
        });
    });

    describe('POST /users/login', () => {
        it('should return 400 for an invalid email', async () => {
            const res = await request(buildApp(mockUserService))
                .post(`${ROOT}/users/login`)
                .send({ email: 'not-an-email', password: 'Password1' });

            expect(res.status).toBe(400);
            expect(mockUserService.authenticate).not.toHaveBeenCalled();
        });
        it('should return 200 with accessToken and refreshToken on valid credentials', async () => {
            mockUserService.authenticate.mockResolvedValue({
                accessToken: 'access',
                refreshToken: 'refresh',
            });

            const res = await request(buildApp(mockUserService))
                .post(`${ROOT}/users/login`)
                .send({ email: 'test@test.com', password: 'Password1' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('accessToken');
            expect(res.body).toHaveProperty('refreshToken');
        });

        it('should return 401 on invalid credentials', async () => {
            mockUserService.authenticate.mockRejectedValue(new Error('Invalid credentials'));

            const res = await request(buildApp(mockUserService))
                .post(`${ROOT}/users/login`)
                .send({ email: 'test@test.com', password: 'wrong' });

            expect(res.status).toBe(401);
        });
    });

    describe('POST /users/refresh', () => {
        it('should return 200 with a new accessToken for a valid refresh token', async () => {
            mockUserService.refresh.mockResolvedValue('new-access-token');

            const res = await request(buildApp(mockUserService))
                .post(`${ROOT}/users/refresh`)
                .send({ refreshToken: 'valid-refresh-token' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('accessToken');
        });

        it('should return 401 for an invalid refresh token', async () => {
            mockUserService.refresh.mockRejectedValue(new Error('Invalid token'));

            const res = await request(buildApp(mockUserService))
                .post(`${ROOT}/users/refresh`)
                .send({ refreshToken: 'bad-token' });

            expect(res.status).toBe(401);
        });

        it('should return 400 when refreshToken field is missing', async () => {
            const res = await request(buildApp(mockUserService)).post(`${ROOT}/users/refresh`).send({});

            expect(res.status).toBe(400);
            expect(mockUserService.refresh).not.toHaveBeenCalled();
        });
    });

    describe('POST /users/forgot-password', () => {
        it('should return 200 regardless of whether the email exists', async () => {
            mockUserService.forgotPassword.mockResolvedValue(undefined);

            const res = await request(buildApp(mockUserService))
                .post(`${ROOT}/users/forgot-password`)
                .send({ email: 'anyone@test.com' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('message');
        });

        it('should return 400 for an invalid email', async () => {
            const res = await request(buildApp(mockUserService))
                .post(`${ROOT}/users/forgot-password`)
                .send({ email: 'not-an-email' });

            expect(res.status).toBe(400);
            expect(mockUserService.forgotPassword).not.toHaveBeenCalled();
        });
    });

    describe('POST /users/reset-password', () => {
        it('should return 200 on a valid request', async () => {
            mockUserService.resetPassword.mockResolvedValue(undefined);

            const res = await request(buildApp(mockUserService))
                .post(`${ROOT}/users/reset-password`)
                .send({ token: 'some-token', newPassword: 'NewPassword1' });

            expect(res.status).toBe(200);
        });

        it('should return 400 for an invalid new password', async () => {
            const res = await request(buildApp(mockUserService))
                .post(`${ROOT}/users/reset-password`)
                .send({ token: 'some-token', newPassword: 'weak' });

            expect(res.status).toBe(400);
            expect(mockUserService.resetPassword).not.toHaveBeenCalled();
        });

        it('should return 400 for an invalid or expired token', async () => {
            mockUserService.resetPassword.mockRejectedValue(new Error('Invalid or expired token'));

            const res = await request(buildApp(mockUserService))
                .post(`${ROOT}/users/reset-password`)
                .send({ token: 'bad-token', newPassword: 'NewPassword1' });

            expect(res.status).toBe(400);
        });
    });

    describe('GET /users/profile', () => {
        it('should return 200 with user profile when authenticated', async () => {
            const user = {
                id: 'user-1',
                email: 'test@test.com',
                firstName: 'John',
                lastName: 'Doe',
            } as User;
            mockUserService.getProfile.mockResolvedValue(user);

            const res = await request(buildApp(mockUserService))
                .get(`${ROOT}/users/profile`)
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({ email: 'test@test.com' });
        });

        it('should return 401 when not authenticated', async () => {
            const res = await request(buildApp(mockUserService)).get(`${ROOT}/users/profile`);

            expect(res.status).toBe(401);
        });
    });

    describe('PUT /users/profile', () => {
        it('should return 200 with updated profile when authenticated', async () => {
            const updated = {
                id: 'user-1',
                firstName: 'New',
                lastName: 'Name',
            } as User;
            mockUserService.updateProfile.mockResolvedValue(updated);

            const res = await request(buildApp(mockUserService))
                .put(`${ROOT}/users/profile`)
                .set('Authorization', `Bearer ${makeToken()}`)
                .send({ firstName: 'New', lastName: 'Name' });

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({ firstName: 'New' });
        });

        it('should return 401 when not authenticated', async () => {
            const res = await request(buildApp(mockUserService)).put(`${ROOT}/users/profile`);

            expect(res.status).toBe(401);
        });

        it('should strip extra fields and only pass firstName and lastName to the service', async () => {
            const updated = { id: 'user-1', firstName: 'New', lastName: 'Name' } as User;
            mockUserService.updateProfile.mockResolvedValue(updated);

            await request(buildApp(mockUserService))
                .put(`${ROOT}/users/profile`)
                .set('Authorization', `Bearer ${makeToken()}`)
                .send({ firstName: 'New', lastName: 'Name', password: 'hacked', email: 'attacker@evil.com' });

            const data = mockUserService.updateProfile.mock.calls[0][1];
            expect(data).toEqual({ firstName: 'New', lastName: 'Name' });
        });
    });
});
