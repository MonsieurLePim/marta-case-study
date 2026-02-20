import 'reflect-metadata';
import jwt from 'jsonwebtoken';
import { UserServiceImpl, RegisterUserDto, UpdateProfileDto } from './user-service';
import { UserRepository } from 'repositories/user-repository';
import { PasswordManagerService } from './password-manager-service';
import { User } from 'entities/user';

describe('UserService', () => {
    let service: UserServiceImpl;
    let mockUserRepository: jest.Mocked<UserRepository>;
    let mockPasswordManager: jest.Mocked<PasswordManagerService>;

    beforeEach(() => {
        mockUserRepository = {
            findByEmail: jest.fn(),
            findById: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
        };

        mockPasswordManager = {
            toHash: jest.fn(),
            compare: jest.fn(),
        };

        service = new UserServiceImpl(mockUserRepository, mockPasswordManager);
        process.env.JWT_SECRET = 'test-secret';
        process.env.JWT_EXPIRES_IN = '24h';
    });

    describe('register', () => {
        const dto: RegisterUserDto = {
            email: 'test@test.com',
            password: 'Password1',
            firstName: 'John',
            lastName: 'Doe',
        };

        it('should throw if email is already taken', async () => {
            mockUserRepository.findByEmail.mockResolvedValue({ id: '1' } as User);

            await expect(service.register(dto)).rejects.toThrow();
        });

        it('should hash the password before saving', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(null);
            mockPasswordManager.toHash.mockResolvedValue('hashed');
            mockUserRepository.create.mockResolvedValue({ ...dto, id: '1', password: 'hashed' } as User);

            await service.register(dto);

            expect(mockPasswordManager.toHash).toHaveBeenCalledWith(dto.password);
            expect(mockUserRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({ password: 'hashed' }),
            );
        });

        it('should return the created user', async () => {
            const user = { id: '1', ...dto, password: 'hashed' } as User;
            mockUserRepository.findByEmail.mockResolvedValue(null);
            mockPasswordManager.toHash.mockResolvedValue('hashed');
            mockUserRepository.create.mockResolvedValue(user);

            const result = await service.register(dto);

            expect(result).toEqual(user);
        });
    });

    describe('authenticate', () => {
        const user = { id: '1', email: 'test@test.com', password: 'hashed' } as User;

        it('should throw if user is not found', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(null);

            await expect(service.authenticate('test@test.com', 'Password1')).rejects.toThrow();
        });

        it('should throw if password is incorrect', async () => {
            mockUserRepository.findByEmail.mockResolvedValue(user);
            mockPasswordManager.compare.mockResolvedValue(false);

            await expect(service.authenticate('test@test.com', 'wrong')).rejects.toThrow();
        });

        it('should return a signed accessToken and refreshToken on valid credentials', async () => {
            process.env.JWT_REFRESH_SECRET = 'refresh-secret';
            process.env.JWT_REFRESH_EXPIRES_IN = '7d';
            mockUserRepository.findByEmail.mockResolvedValue(user);
            mockPasswordManager.compare.mockResolvedValue(true);

            const { accessToken, refreshToken } = await service.authenticate('test@test.com', 'Password1');
            const decodedAccess = jwt.verify(accessToken, 'test-secret') as { id: string };
            const decodedRefresh = jwt.verify(refreshToken, 'refresh-secret') as { id: string };

            expect(decodedAccess.id).toBe(user.id);
            expect(decodedRefresh.id).toBe(user.id);
        });
    });

    describe('refresh', () => {
        const user = { id: '1', email: 'test@test.com', password: 'hashed' } as User;

        beforeEach(() => {
            process.env.JWT_REFRESH_SECRET = 'refresh-secret';
        });

        it('should return a new accessToken for a valid refresh token', async () => {
            const refreshToken = jwt.sign({ id: user.id, email: user.email }, 'refresh-secret');
            mockUserRepository.findById.mockResolvedValue(user);

            const accessToken = await service.refresh(refreshToken);
            const decoded = jwt.verify(accessToken, 'test-secret') as { id: string };

            expect(decoded.id).toBe(user.id);
        });

        it('should throw for an invalid refresh token', async () => {
            await expect(service.refresh('invalid-token')).rejects.toThrow();
        });

        it('should throw if user no longer exists', async () => {
            const refreshToken = jwt.sign({ id: 'ghost', email: 'gone@test.com' }, 'refresh-secret');
            mockUserRepository.findById.mockResolvedValue(null);

            await expect(service.refresh(refreshToken)).rejects.toThrow();
        });
    });

    describe('getProfile', () => {
        it('should return the user when found', async () => {
            const user = { id: '1', email: 'test@test.com' } as User;
            mockUserRepository.findById.mockResolvedValue(user);

            const result = await service.getProfile('1');

            expect(result).toEqual(user);
        });

        it('should throw when user is not found', async () => {
            mockUserRepository.findById.mockResolvedValue(null);

            await expect(service.getProfile('nonexistent')).rejects.toThrow();
        });
    });

    describe('updateProfile', () => {
        it('should return the updated user', async () => {
            const updated = { id: '1', firstName: 'New', lastName: 'Name' } as User;
            mockUserRepository.update.mockResolvedValue(updated);

            const dto: UpdateProfileDto = { firstName: 'New', lastName: 'Name' };
            const result = await service.updateProfile('1', dto);

            expect(result).toEqual(updated);
            expect(mockUserRepository.update).toHaveBeenCalledWith('1', dto);
        });
    });
});
