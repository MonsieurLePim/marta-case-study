import 'reflect-metadata';
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authMiddleware } from './auth-middleware';

const mockRes = () => {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
};

describe('authMiddleware', () => {
    const JWT_SECRET = 'test-secret';
    let next: jest.MockedFunction<NextFunction>;

    beforeEach(() => {
        next = jest.fn();
        process.env.JWT_SECRET = JWT_SECRET;
    });

    it('should call next() and attach currentUser for a valid token', () => {
        const token = jwt.sign({ id: '1', email: 'test@test.com' }, JWT_SECRET);
        const req = { headers: { authorization: `Bearer ${token}` } } as Request;
        const res = mockRes();

        authMiddleware(req, res, next);

        expect(next).toHaveBeenCalledTimes(1);
        expect(next).toHaveBeenCalledWith();
        expect(req.currentUser).toEqual(expect.objectContaining({ id: '1', email: 'test@test.com' }));
    });

    it('should return 401 when Authorization header is missing', () => {
        const req = { headers: {} } as Request;
        const res = mockRes();

        authMiddleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 401 when token is invalid', () => {
        const req = {
            headers: { authorization: 'Bearer invalidtoken' },
        } as Request;
        const res = mockRes();

        authMiddleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });

    it('should return 401 when token is signed with a wrong secret', () => {
        const token = jwt.sign({ id: '1', email: 'test@test.com' }, 'wrong-secret');
        const req = { headers: { authorization: `Bearer ${token}` } } as Request;
        const res = mockRes();

        authMiddleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(401);
        expect(res.json).toHaveBeenCalledWith({ error: 'Unauthorized' });
    });
});
