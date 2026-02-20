import 'reflect-metadata';
import request from 'supertest';
import { json } from 'body-parser';
import jwt from 'jsonwebtoken';
import { Container } from 'inversify';
import { InversifyExpressServer } from 'inversify-express-utils';

import { TYPES } from 'lib';
import { UserService } from 'services/user-service';
import { User } from 'entities/user';
import './user-controller';

const ROOT = '/partner-app/api';
const JWT_SECRET = 'test-secret';

const buildApp = (mockUserService: jest.Mocked<UserService>) => {
    const container = new Container();
    container.bind<UserService>(TYPES.UserService).toConstantValue(mockUserService);
    const server = new InversifyExpressServer(container, null, { rootPath: ROOT });
    server.setConfig(app => app.use(json()));
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
            getProfile: jest.fn(),
            updateProfile: jest.fn(),
        };
    });

    describe('POST /users/register', () => {
        const dto = { email: 'test@test.com', password: 'Password1', firstName: 'John', lastName: 'Doe' };

        it('should return 201 with user data (no password) on success', async () => {
            const user = { id: 'user-1', ...dto, createdAt: new Date(), updatedAt: new Date() } as User;
            mockUserService.register.mockResolvedValue(user);

            const res = await request(buildApp(mockUserService))
                .post(`${ROOT}/users/register`)
                .send(dto);

            expect(res.status).toBe(201);
            expect(res.body).toMatchObject({ email: 'test@test.com', firstName: 'John' });
            expect(res.body.password).toBeUndefined();
        });

        it('should return 400 when email is already taken', async () => {
            mockUserService.register.mockRejectedValue(new Error('Email already in use'));

            const res = await request(buildApp(mockUserService))
                .post(`${ROOT}/users/register`)
                .send(dto);

            expect(res.status).toBe(400);
        });
    });

    describe('POST /users/login', () => {
        it('should return 200 with token on valid credentials', async () => {
            mockUserService.authenticate.mockResolvedValue('jwt-token');

            const res = await request(buildApp(mockUserService))
                .post(`${ROOT}/users/login`)
                .send({ email: 'test@test.com', password: 'Password1' });

            expect(res.status).toBe(200);
            expect(res.body).toHaveProperty('token');
        });

        it('should return 401 on invalid credentials', async () => {
            mockUserService.authenticate.mockRejectedValue(new Error('Invalid credentials'));

            const res = await request(buildApp(mockUserService))
                .post(`${ROOT}/users/login`)
                .send({ email: 'test@test.com', password: 'wrong' });

            expect(res.status).toBe(401);
        });
    });

    describe('GET /users/profile', () => {
        it('should return 200 with user profile when authenticated', async () => {
            const user = { id: 'user-1', email: 'test@test.com', firstName: 'John', lastName: 'Doe' } as User;
            mockUserService.getProfile.mockResolvedValue(user);

            const res = await request(buildApp(mockUserService))
                .get(`${ROOT}/users/profile`)
                .set('Authorization', `Bearer ${makeToken()}`);

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({ email: 'test@test.com' });
        });

        it('should return 401 when not authenticated', async () => {
            const res = await request(buildApp(mockUserService))
                .get(`${ROOT}/users/profile`);

            expect(res.status).toBe(401);
        });
    });

    describe('PUT /users/profile', () => {
        it('should return 200 with updated profile when authenticated', async () => {
            const updated = { id: 'user-1', firstName: 'New', lastName: 'Name' } as User;
            mockUserService.updateProfile.mockResolvedValue(updated);

            const res = await request(buildApp(mockUserService))
                .put(`${ROOT}/users/profile`)
                .set('Authorization', `Bearer ${makeToken()}`)
                .send({ firstName: 'New', lastName: 'Name' });

            expect(res.status).toBe(200);
            expect(res.body).toMatchObject({ firstName: 'New' });
        });

        it('should return 401 when not authenticated', async () => {
            const res = await request(buildApp(mockUserService))
                .put(`${ROOT}/users/profile`);

            expect(res.status).toBe(401);
        });
    });
});
