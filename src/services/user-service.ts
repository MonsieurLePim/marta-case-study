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
}

@injectable()
export class UserServiceImpl implements UserService {
    constructor(
        @inject(TYPES.UserRepository) private userRepository: UserRepository,
        @inject(TYPES.PasswordManagerService) private passwordManager: PasswordManagerService,
    ) {}

    async register(userData: RegisterUserDto): Promise<User> {
        const existing = await this.userRepository.findByEmail(userData.email);
        if (existing) {
            throw new Error('Email already in use');
        }
        const hashedPassword = await this.passwordManager.toHash(userData.password);
        return this.userRepository.create({ ...userData, password: hashedPassword });
    }

    async authenticate(_email: string, _password: string): Promise<AuthTokens> {
        throw new Error('Not implemented');
    }

    async refresh(_token: string): Promise<string> {
        throw new Error('Not implemented');
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
}
