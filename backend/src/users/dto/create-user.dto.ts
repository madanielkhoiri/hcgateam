import { UserRole } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateUserDto {
  @IsString()
  @MinLength(2, { message: 'Nama minimal 2 karakter' })
  @MaxLength(120)
  name: string;

  @IsString()
  @MinLength(3, { message: 'Username minimal 3 karakter' })
  @MaxLength(60)
  username: string;

  @IsString()
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  @MaxLength(100)
  password: string;

  @IsEnum(UserRole, { message: 'Role akun tidak valid' })
  role: UserRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEmail({}, { message: 'Format email tidak valid' })
  @MaxLength(150)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  departemen?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  jabatan?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  accessKeys?: string[];
}
