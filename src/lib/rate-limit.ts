import { Request, Response, NextFunction } from 'express';

export const createLoginRateLimiter = (_max = 10, _windowMs = 15 * 60 * 1000) => {
    return (_req: Request, _res: Response, next: NextFunction): void => {
        next();
    };
};

export const loginRateLimiter = createLoginRateLimiter();
