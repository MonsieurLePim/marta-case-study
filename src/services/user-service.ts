import { injectable, inject } from 'inversify';
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

export interface UserService {
    register(userData: RegisterUserDto): Promise<User>;
    authenticate(email: string, password: string): Promise<string>;
    getProfile(userId: string): Promise<User>;
    updateProfile(userId: string, data: UpdateProfileDto): Promise<User>;
}

@injectable()
export class UserServiceImpl implements UserService {
    constructor(
        @inject(TYPES.UserRepository) private userRepository: UserRepository,
        @inject(TYPES.PasswordManagerService) private passwordManager: PasswordManagerService,
    ) {}

    async register(_userData: RegisterUserDto): Promise<User> {
        throw new Error('Not implemented');
    }

    async authenticate(_email: string, _password: string): Promise<string> {
        throw new Error('Not implemented');
    }

    async getProfile(_userId: string): Promise<User> {
        throw new Error('Not implemented');
    }

    async updateProfile(_userId: string, _data: UpdateProfileDto): Promise<User> {
        throw new Error('Not implemented');
    }
}
