// ==================================================
// FILE: backend/src/surat-balasan-magang/dto/surat-balasan-magang.dto.ts
// FUNGSI: Validasi request Surat Balasan Magang (R & D)
// ==================================================

import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class BarisSuratBalasanDto {
  @IsInt()
  anakMagangId: number;

  @IsString()
  @IsNotEmpty({ message: 'Departemen tujuan wajib diisi' })
  @MaxLength(150)
  departemenTujuan: string;

  @IsDateString()
  tanggalMulai: string;

  @IsDateString()
  tanggalSelesai: string;
}

export class BuatSuratBalasanMagangDto {
  @IsString()
  @IsNotEmpty({ message: 'Tujuan jurusan/institusi wajib diisi' })
  @MaxLength(250)
  tujuanJurusan: string;

  @IsString()
  @IsNotEmpty({ message: 'Kota tujuan wajib diisi' })
  @MaxLength(80)
  kotaTujuan: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  nomorSuratMasuk?: string;

  @IsOptional()
  @IsString()
  @MaxLength(250)
  perihalSuratMasuk?: string;

  @ValidateNested({ each: true })
  @Type(() => BarisSuratBalasanDto)
  @ArrayMinSize(1, { message: 'Minimal 1 anak magang pada surat balasan' })
  baris: BarisSuratBalasanDto[];
}
