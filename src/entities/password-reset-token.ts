import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user';

// TODO: used by UserService.forgotPassword() — store one token per user (delete old ones on new request)
@Entity({ name: 'password_reset_tokens' })
export class PasswordResetToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    // Store the hash, never the raw token (raw token is sent in the email link only)
    @Column()
    tokenHash: string;

    @Column()
    expiresAt: Date;

    // Set when consumed so it cannot be reused
    @Column({ nullable: true, type: 'timestamptz' })
    usedAt: Date | null;

    @CreateDateColumn()
    createdAt: Date;
}
