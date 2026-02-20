import { DataSource } from 'typeorm';
import { User } from 'entities/user';
import { RefreshToken } from 'entities/refresh-token';
import { PasswordResetToken } from 'entities/password-reset-token';

// In production this service reads DB credentials from AWS SSM Parameter Store.
// For local development, credentials are read from the .env file.
export const getDataSource = (): DataSource => {
    return new DataSource({
        type: 'postgres',
        host: process.env.DATABASE_HOST,
        port: Number(process.env.DATABASE_PORT),
        database: process.env.DATABASE_NAME,
        username: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD || undefined,
        entities: [User, RefreshToken, PasswordResetToken],
        synchronize: process.env.NODE_ENV !== 'production',
        logging: false,
    });
};
