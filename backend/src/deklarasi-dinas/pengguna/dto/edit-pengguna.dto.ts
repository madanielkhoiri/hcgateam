import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString } from 'class-validator';

// <--- fitur dto edit pengguna --->
export class EditPenggunaDto {
  @IsOptional()
  @IsString()
  nrp?: string;

  @IsOptional()
  @IsString()
  nama?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  nomor_telepon?: string;

  @IsOptional()
  @IsString()
  kata_sandi?: string;

  @IsOptional()
  @IsEnum(['SUPER_ADMIN', 'FA', 'KARYAWAN'])
  role?: 'SUPER_ADMIN' | 'FA' | 'KARYAWAN';

  @IsOptional()
  @IsBoolean()
  aktif?: boolean;
}
// <--- end --->