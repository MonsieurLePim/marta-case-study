import rateLimit from 'express-rate-limit';

export const createLoginRateLimiter = (max: number = 10, windowMs: number = 15 * 60 * 1000) => {
    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: 'Too many login attempts, please try again later' },
    });
};

export const loginRateLimiter = createLoginRateLimiter();
