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

    async findByEmail(email: string): Promise<User | null> {
        return this.dataSource.getRepository(User).findOne({ where: { email } });
    }

    async findById(id: string): Promise<User | null> {
        return this.dataSource.getRepository(User).findOne({ where: { id } });
    }

    async create(userData: CreateUserDto): Promise<User> {
        const repo = this.dataSource.getRepository(User);
        const user = repo.create(userData);
        return repo.save(user);
    }

    async update(id: string, userData: UpdateUserDto): Promise<User> {
        const repo = this.dataSource.getRepository(User);
        const user = await repo.findOne({ where: { id } });
        if (!user) {
            throw new Error(`User with id ${id} not found`);
        }
        return repo.save({ ...user, ...userData });
    }
}
