import { Request, Response, NextFunction } from 'express';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

export const validateBody = (DtoClass: any) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const instance = plainToInstance(DtoClass, req.body, { excludeExtraneousValues: true });
        const errors = await validate(instance);

        if (errors.length > 0) {
            const messages = errors.flatMap((e) => Object.values(e.constraints || {}));
            res.status(400).json({ errors: messages });
            return;
        }

        req.body = instance;
        next();
    };
};
