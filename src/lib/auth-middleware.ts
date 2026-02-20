import { Request, Response, NextFunction } from 'express';

export const authMiddleware = (_req: Request, _res: Response, _next: NextFunction): void => {
    throw new Error('Not implemented');
};
