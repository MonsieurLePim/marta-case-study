import { injectable, inject } from 'inversify';
import { DataSource } from 'typeorm';
import { User } from 'entities/user';
import { TYPES } from 'lib';

export interface CreateUserDto {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
}

export interface UpdateUserDto {
    firstName?: string;
    lastName?: string;
}

export interface UserRepository {
    findByEmail(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    create(userData: CreateUserDto): Promise<User>;
    update(id: string, userData: UpdateUserDto): Promise<User>;
}

@injectable()
export class UserRepositoryImpl implements UserRepository {
    constructor(@inject(TYPES.DB) private dataSource: DataSource) {}

    async findByEmail(_email: string): Promise<User | null> {
        throw new Error('Not implemented');
    }

    async findById(_id: string): Promise<User | null> {
        throw new Error('Not implemented');
    }

    async create(_userData: CreateUserDto): Promise<User> {
        throw new Error('Not implemented');
    }

    async update(_id: string, _userData: UpdateUserDto): Promise<User> {
        throw new Error('Not implemented');
    }
}
