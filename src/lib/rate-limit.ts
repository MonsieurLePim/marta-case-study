import rateLimit from 'express-rate-limit';

export const createRateLimiter = (max: number, windowMs: number, message: string) => {
    return rateLimit({
        windowMs,
        max,
        standardHeaders: true,
        legacyHeaders: false,
        message: { error: message },
    });
};

export const loginRateLimiter = createRateLimiter(
    10,
    15 * 60 * 1000,
    'Too many login attempts, please try again later',
);

export const registerRateLimiter = createRateLimiter(
    5,
    60 * 60 * 1000,
    'Too many accounts created from this IP, please try again later',
);

export const forgotPasswordRateLimiter = createRateLimiter(
    5,
    60 * 60 * 1000,
    'Too many password reset requests, please try again later',
);
