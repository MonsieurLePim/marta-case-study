import { PasswordManagerServiceImpl } from './password-manager-service';

describe('PasswordManagerService', () => {
    let service: PasswordManagerServiceImpl;

    beforeEach(() => {
        service = new PasswordManagerServiceImpl();
    });

    describe('toHash', () => {
        it('should return a string in hash.salt format', async () => {
            const result = await service.toHash('password123');
            const parts = result.split('.');
            expect(parts).toHaveLength(2);
            expect(parts[0]).toHaveLength(128); // 64 bytes hex
            expect(parts[1]).toHaveLength(32);  // 16 bytes hex
        });

        it('should produce different hashes for the same password', async () => {
            const hash1 = await service.toHash('password123');
            const hash2 = await service.toHash('password123');
            expect(hash1).not.toBe(hash2);
        });
    });

    describe('compare', () => {
        it('should return true for the correct password', async () => {
            const hash = await service.toHash('password123');
            const result = await service.compare(hash, 'password123');
            expect(result).toBe(true);
        });

        it('should return false for an incorrect password', async () => {
            const hash = await service.toHash('password123');
            const result = await service.compare(hash, 'wrongpassword');
            expect(result).toBe(false);
        });
    });
});
