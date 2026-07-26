// ==================================================
// FILE: backend/src/auth/dto/login.dto.ts
// FUNGSI: Validasi data login
// ==================================================

import { IsNotEmpty, IsString, MinLength } from 'class-validator';

// ==================================================
// LOGIN DTO
// ==================================================

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;
}

// ==================================================
// SELESAI: backend/src/auth/dto/login.dto.ts
// ==================================================
