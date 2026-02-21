import { IsEmail, IsString, MinLength, Matches, IsOptional } from 'class-validator';
import { Expose } from 'class-transformer';

export class RegisterDto {
    @Expose()
    @IsEmail({}, { message: 'Must be a valid email address' })
    email: string;

    @Expose()
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    })
    password: string;

    @Expose()
    @IsString()
    firstName: string;

    @Expose()
    @IsString()
    lastName: string;
}

export class LoginDto {
    @Expose()
    @IsEmail({}, { message: 'Must be a valid email address' })
    email: string;

    @Expose()
    @IsString()
    password: string;
}

export class RefreshDto {
    @Expose()
    @IsString()
    refreshToken: string;
}

export class ForgotPasswordDto {
    @Expose()
    @IsEmail({}, { message: 'Must be a valid email address' })
    email: string;
}

export class ResetPasswordDto {
    @Expose()
    @IsString()
    token: string;

    @Expose()
    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: 'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    })
    newPassword: string;
}

export class UpdateProfileDto {
    @Expose()
    @IsOptional()
    @IsString()
    firstName?: string;

    @Expose()
    @IsOptional()
    @IsString()
    lastName?: string;
}
