import { Request, Response, NextFunction } from 'express';

export const validateBody = (_DtoClass: any) => {
    return (_req: Request, _res: Response, next: NextFunction): void => {
        next();
    };
};
