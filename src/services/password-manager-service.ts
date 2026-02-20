import { scrypt, randomBytes } from 'crypto';
import { injectable } from 'inversify';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

export interface PasswordManagerService {
    toHash(password: string): Promise<string>;
    compare(storedPassword: string, suppliedPassword: string): Promise<boolean>;
}

@injectable()
export class PasswordManagerServiceImpl implements PasswordManagerService {
    async toHash(password: string): Promise<string> {
        const salt = randomBytes(16).toString('hex');
        const hash = (await scryptAsync(password, salt, 64)) as Buffer;
        return `${hash.toString('hex')}.${salt}`;
    }

    async compare(storedPassword: string, suppliedPassword: string): Promise<boolean> {
        const [hash, salt] = storedPassword.split('.');
        const suppliedHash = (await scryptAsync(suppliedPassword, salt, 64)) as Buffer;
        return hash === suppliedHash.toString('hex');
    }
}
