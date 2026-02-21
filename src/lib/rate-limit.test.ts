import 'reflect-metadata';
import express from 'express';
import request from 'supertest';
import { createRateLimiter } from './rate-limit';

const buildTestApp = () => {
    const limiter = createRateLimiter(3, 60000, 'Too many requests');
    const app = express();
    app.post('/test', limiter, (_req, res) => res.status(200).json({ ok: true }));
    return app;
};

describe('loginRateLimiter', () => {
    it('should allow requests within the limit', async () => {
        const app = buildTestApp();

        for (let i = 0; i < 3; i++) {
            const res = await request(app).post('/test');
            expect(res.status).toBe(200);
        }
    });

    it('should return 429 after exceeding the limit', async () => {
        const app = buildTestApp();

        for (let i = 0; i < 3; i++) {
            await request(app).post('/test');
        }

        const res = await request(app).post('/test');
        expect(res.status).toBe(429);
    });

    it('should include an error message when rate limited', async () => {
        const app = buildTestApp();

        for (let i = 0; i < 3; i++) {
            await request(app).post('/test');
        }

        const res = await request(app).post('/test');
        expect(res.body).toHaveProperty('error');
    });
});
