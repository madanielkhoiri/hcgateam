import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

// <--- fitur dto buat pengguna --->
export class BuatPenggunaDto {
  @IsString()
  @IsNotEmpty()
  nrp!: string;

  @IsString()
  @IsNotEmpty()
  nama!: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  nomor_telepon?: string;

  @IsString()
  @IsNotEmpty()
  kata_sandi!: string;

  @IsOptional()
  @IsEnum(['SUPER_ADMIN', 'FA', 'KARYAWAN'])
  role?: 'SUPER_ADMIN' | 'FA' | 'KARYAWAN';

  @IsOptional()
  @IsBoolean()
  aktif?: boolean;
}
// <--- end --->