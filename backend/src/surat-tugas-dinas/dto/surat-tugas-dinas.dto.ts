// ==================================================
// FILE: backend/src/surat-tugas-dinas/dto/surat-tugas-dinas.dto.ts
// FUNGSI: Validasi request Surat Tugas Dinas (R & D)
// ==================================================

import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsDateString,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class KaryawanTugasDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  nrp: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  nama: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  departemen: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  jabatan: string;
}

export class BuatSuratTugasDinasDto {
  @IsString()
  @IsNotEmpty({ message: 'Nomor surat wajib diisi' })
  @MaxLength(120)
  nomor: string;

  @IsString()
  @IsNotEmpty({ message: 'Tujuan/Lokasi wajib diisi' })
  @MaxLength(200)
  tujuanLokasi: string;

  @IsDateString()
  tanggalMulai: string;

  @IsDateString()
  tanggalSelesai: string;

  @IsString()
  @IsNotEmpty({ message: 'Keterangan tugas wajib diisi' })
  keteranganTugas: string;

  @ValidateNested({ each: true })
  @Type(() => KaryawanTugasDto)
  @ArrayMinSize(1, { message: 'Minimal 1 karyawan pada surat tugas' })
  karyawan: KaryawanTugasDto[];
}

export class TolakSuratTugasDinasDto {
  @IsString()
  @IsNotEmpty({ message: 'Alasan penolakan wajib diisi' })
  alasan: string;
}