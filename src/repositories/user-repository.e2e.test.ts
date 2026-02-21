import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { User } from 'entities/user';
import { UserRepositoryImpl } from './user-repository';

describe('UserRepository (e2e)', () => {
    let container: StartedPostgreSqlContainer;
    let dataSource: DataSource;
    let repository: UserRepositoryImpl;

    beforeAll(async () => {
        container = await new PostgreSqlContainer().start();

        dataSource = new DataSource({
            type: 'postgres',
            host: container.getHost(),
            port: container.getMappedPort(5432),
            database: container.getDatabase(),
            username: container.getUsername(),
            password: container.getPassword(),
            entities: [User],
            synchronize: true,
        });

        await dataSource.initialize();
        repository = new UserRepositoryImpl(dataSource);
    }, 60000);

    afterAll(async () => {
        await dataSource.destroy();
        await container.stop();
    });

    beforeEach(async () => {
        await dataSource.getRepository(User).delete({});
    });

    const seed = (overrides = {}) =>
        repository.create({
            email: 'test@example.com',
            password: 'hashed-password',
            firstName: 'John',
            lastName: 'Doe',
            ...overrides,
        });

    describe('create', () => {
        it('should persist a user and return it with a generated uuid and timestamps', async () => {
            const user = await seed();

            expect(user.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
            expect(user.email).toBe('test@example.com');
            expect(user.firstName).toBe('John');
            expect(user.createdAt).toBeInstanceOf(Date);
            expect(user.updatedAt).toBeInstanceOf(Date);
        });

        it('should enforce the unique email constraint', async () => {
            await seed();
            await expect(seed()).rejects.toThrow();
        });
    });

    describe('findByEmail', () => {
        it('should return the user when the email exists', async () => {
            const created = await seed();
            const found = await repository.findByEmail('test@example.com');

            expect(found?.id).toBe(created.id);
        });

        it('should return null when the email does not exist', async () => {
            const result = await repository.findByEmail('nobody@example.com');
            expect(result).toBeNull();
        });
    });

    describe('findById', () => {
        it('should return the user when the id exists', async () => {
            const created = await seed();
            const found = await repository.findById(created.id);

            expect(found?.email).toBe(created.email);
        });

        it('should return null when the id does not exist', async () => {
            const result = await repository.findById('00000000-0000-0000-0000-000000000000');
            expect(result).toBeNull();
        });
    });

    describe('update', () => {
        it('should persist field changes and return the updated user', async () => {
            const created = await seed();
            const updated = await repository.update(created.id, { firstName: 'Jane' });

            expect(updated.firstName).toBe('Jane');
            expect(updated.lastName).toBe('Doe');

            const refetched = await repository.findById(created.id);
            expect(refetched?.firstName).toBe('Jane');
        });

        it('should update both fields and return the complete user object', async () => {
            const created = await seed();
            const updated = await repository.update(created.id, { firstName: 'Jane', lastName: 'Smith' });

            expect(updated.id).toBe(created.id);
            expect(updated.email).toBe(created.email);
            expect(updated.firstName).toBe('Jane');
            expect(updated.lastName).toBe('Smith');
            expect(updated.updatedAt).toBeInstanceOf(Date);

            const refetched = await repository.findById(created.id);
            expect(refetched?.firstName).toBe('Jane');
            expect(refetched?.lastName).toBe('Smith');
        });

        it('should throw when the user does not exist', async () => {
            await expect(
                repository.update('00000000-0000-0000-0000-000000000000', { firstName: 'Jane' }),
            ).rejects.toThrow();
        });
    });
});
