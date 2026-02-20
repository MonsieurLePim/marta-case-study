import { injectable, inject } from 'inversify';
import jwt from 'jsonwebtoken';
import { User } from 'entities/user';
import { UserRepository } from 'repositories/user-repository';
import { PasswordManagerService } from './password-manager-service';
import { TYPES } from 'lib';

export interface RegisterUserDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}

export interface UpdateProfileDto {
    firstName?: string;
    lastName?: string;
}

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface UserService {
    register(userData: RegisterUserDto): Promise<User>;
    authenticate(email: string, password: string): Promise<AuthTokens>;
    refresh(token: string): Promise<string>;
    getProfile(userId: string): Promise<User>;
    updateProfile(userId: string, data: UpdateProfileDto): Promise<User>;
    forgotPassword(email: string): Promise<void>;
    resetPassword(token: string, newPassword: string): Promise<void>;
}

@injectable()
export class UserServiceImpl implements UserService {
    constructor(
        @inject(TYPES.UserRepository) private userRepository: UserRepository,
        @inject(TYPES.PasswordManagerService)
        private passwordManager: PasswordManagerService,
    ) {}

    async register(userData: RegisterUserDto): Promise<User> {
        const existing = await this.userRepository.findByEmail(userData.email);
        if (existing) {
            throw new Error('Email already in use');
        }
        const hashedPassword = await this.passwordManager.toHash(userData.password);
        return this.userRepository.create({
            ...userData,
            password: hashedPassword,
        });
    }

    async authenticate(email: string, password: string): Promise<AuthTokens> {
        const user = await this.userRepository.findByEmail(email);
        if (!user) {
            throw new Error('Invalid credentials');
        }
        const isMatch = await this.passwordManager.compare(user.password, password);
        if (!isMatch) {
            throw new Error('Invalid credentials');
        }
        const payload = { id: user.id, email: user.email };
        const accessToken = jwt.sign(payload, process.env.JWT_SECRET!, {
            expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
        });
        const refreshToken = jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
            expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
        });
        return { accessToken, refreshToken };
    }

    async refresh(token: string): Promise<string> {
        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as {
            id: string;
            email: string;
        };
        const user = await this.userRepository.findById(decoded.id);
        if (!user) {
            throw new Error('User not found');
        }
        return jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET!, {
            expiresIn: (process.env.JWT_EXPIRES_IN || '15m') as any,
        });
    }

    async getProfile(userId: string): Promise<User> {
        const user = await this.userRepository.findById(userId);
        if (!user) {
            throw new Error('User not found');
        }
        return user;
    }

    async updateProfile(userId: string, data: UpdateProfileDto): Promise<User> {
        return this.userRepository.update(userId, data);
    }

    async forgotPassword(_email: string): Promise<void> {
        // TODO: find user by email (silently ignore if not found — no user enumeration)
        // TODO: generate a cryptographically secure reset token (e.g. crypto.randomBytes(32).toString('hex'))
        // TODO: store hashed token + expiry (e.g. 1 hour) against the user record in the DB
        // TODO: send reset-password email via an email provider (e.g. SendGrid / SES) with a link containing the token
    }

    async resetPassword(_token: string, _newPassword: string): Promise<void> {
        // TODO: look up the hashed token in the DB and verify it matches
        // TODO: check that the token has not expired
        // TODO: hash the new password via PasswordManagerService.toHash()
        // TODO: update the user's password in the DB
        // TODO: invalidate (delete) the token so it cannot be reused
    }
}
