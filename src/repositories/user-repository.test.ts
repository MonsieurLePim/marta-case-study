import 'reflect-metadata';
import { UserRepositoryImpl, CreateUserDto, UpdateUserDto } from './user-repository';
import { DataSource, Repository } from 'typeorm';
import { User } from 'entities/user';

describe('UserRepository', () => {
    let repository: UserRepositoryImpl;
    let mockDataSource: jest.Mocked<Pick<DataSource, 'getRepository'>>;
    let mockRepo: jest.Mocked<Pick<Repository<User>, 'findOne' | 'save' | 'create'>>;

    beforeEach(() => {
        mockRepo = {
            findOne: jest.fn(),
            save: jest.fn(),
            create: jest.fn(),
        };

        mockDataSource = {
            getRepository: jest.fn().mockReturnValue(mockRepo),
        };

        repository = new UserRepositoryImpl(mockDataSource as unknown as DataSource);
    });

    describe('findByEmail', () => {
        it('should return a user when found', async () => {
            const user = { id: '1', email: 'test@test.com' } as User;
            mockRepo.findOne.mockResolvedValue(user);

            const result = await repository.findByEmail('test@test.com');

            expect(result).toEqual(user);
            expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { email: 'test@test.com' } });
        });

        it('should return null when not found', async () => {
            mockRepo.findOne.mockResolvedValue(null);

            const result = await repository.findByEmail('notfound@test.com');

            expect(result).toBeNull();
        });
    });

    describe('findById', () => {
        it('should return a user when found', async () => {
            const user = { id: '123', email: 'test@test.com' } as User;
            mockRepo.findOne.mockResolvedValue(user);

            const result = await repository.findById('123');

            expect(result).toEqual(user);
            expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: '123' } });
        });

        it('should return null when not found', async () => {
            mockRepo.findOne.mockResolvedValue(null);

            const result = await repository.findById('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('create', () => {
        it('should create and return a new user', async () => {
            const dto: CreateUserDto = {
                email: 'new@test.com',
                password: 'hashed',
                firstName: 'John',
                lastName: 'Doe',
            };
            const user = { id: 'uuid', ...dto } as User;
            mockRepo.create.mockReturnValue(user);
            mockRepo.save.mockResolvedValue(user);

            const result = await repository.create(dto);

            expect(result).toEqual(user);
            expect(mockRepo.create).toHaveBeenCalledWith(dto);
            expect(mockRepo.save).toHaveBeenCalledWith(user);
        });
    });

    describe('update', () => {
        it('should update and return the user', async () => {
            const existing = { id: '1', firstName: 'Old', lastName: 'Name' } as User;
            const updated = { ...existing, firstName: 'New' } as User;
            mockRepo.findOne.mockResolvedValue(existing);
            mockRepo.save.mockResolvedValue(updated);

            const dto: UpdateUserDto = { firstName: 'New' };
            const result = await repository.update('1', dto);

            expect(result).toEqual(updated);
            expect(mockRepo.save).toHaveBeenCalledWith({ ...existing, ...dto });
        });

        it('should throw when user is not found', async () => {
            mockRepo.findOne.mockResolvedValue(null);

            await expect(repository.update('nonexistent', { firstName: 'New' })).rejects.toThrow();
        });
    });
});
