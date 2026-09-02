// ==================================================
// FILE: backend/src/tiket/dto/tiket.dto.ts
// FUNGSI: DTO modul Tiket (tiket cuti karyawan)
// ==================================================

import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, IsNotEmpty } from 'class-validator';

export class TautkanNikDto {
  @IsString()
  @IsNotEmpty()
  nik: string;
}

export class BuatTiketDto {
  @Type(() => Number)
  @IsInt()
  karyawanId: number;

  @IsString()
  @IsNotEmpty()
  tanggalMulai: string;

  @IsString()
  @IsNotEmpty()
  tanggalSelesai: string;

  @IsOptional()
  @IsString()
  keterangan?: string;
}

/** Perubahan jadwal dadakan dari penerbangan (delay, cuaca buruk, dsb.) — bukan edit biasa, WAJIB notifikasi ulang ke karyawan. */
export class RescheduleTiketDto {
  @IsString()
  @IsNotEmpty()
  tanggalMulai: string;

  @IsString()
  @IsNotEmpty()
  tanggalSelesai: string;

  @IsOptional()
  @IsString()
  alasan?: string;
}
