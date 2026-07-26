// ==================================================
// FILE: backend/src/auth/dto/change-password.dto.ts
// FUNGSI: Validasi perubahan password
// ==================================================

import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  confirmPassword: string;
}

// ==================================================
// SELESAI: backend/src/auth/dto/change-password.dto.ts
// ==================================================
