import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user';

// TODO: used by UserService.authenticate() — persist on login, verify on refresh, revoke on logout
@Entity({ name: 'refresh_tokens' })
export class RefreshToken {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column()
    userId: string;

    @ManyToOne(() => User, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    // Store the hash, never the raw token
    @Column()
    tokenHash: string;

    @Column()
    expiresAt: Date;

    // Set on logout or suspicious activity; checked before issuing a new access token
    @Column({ nullable: true, type: 'timestamptz' })
    revokedAt: Date | null;

    @CreateDateColumn()
    createdAt: Date;
}
