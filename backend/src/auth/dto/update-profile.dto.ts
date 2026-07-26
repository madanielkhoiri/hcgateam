// ==================================================
// FILE: backend/src/auth/dto/update-profile.dto.ts
// FUNGSI: Validasi perubahan profil pengguna
// ==================================================

import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  username: string;
}

// ==================================================
// SELESAI: backend/src/auth/dto/update-profile.dto.ts
// ==================================================
