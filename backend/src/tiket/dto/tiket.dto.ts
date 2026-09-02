// ==================================================
// FILE: backend/src/tiket/dto/tiket.dto.ts
// FUNGSI: DTO modul Tiket (tiket cuti karyawan)
// ==================================================

import { JenisTiket } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, IsNotEmpty, Matches } from 'class-validator';

const FORMAT_JAM_24 = /^([01]\d|2[0-3]):[0-5]\d$/;
const PESAN_FORMAT_JAM = 'Jam wajib format 24 jam (HH:mm), contoh: 14:30';

export class TautkanNikDto {
  @IsString()
  @IsNotEmpty()
  nik: string;
}

export class BuatTiketDto {
  @Type(() => Number)
  @IsInt()
  karyawanId: number;

  @IsEnum(JenisTiket)
  jenisTiket: JenisTiket;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tanggalMulai?: string;

  @IsOptional()
  @Matches(FORMAT_JAM_24, { message: PESAN_FORMAT_JAM })
  jamMulai?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tanggalSelesai?: string;

  @IsOptional()
  @Matches(FORMAT_JAM_24, { message: PESAN_FORMAT_JAM })
  jamSelesai?: string;

  @IsOptional()
  @IsString()
  keterangan?: string;
}

/** Perubahan jadwal dadakan dari penerbangan (delay, cuaca buruk, dsb.) — bukan edit biasa, WAJIB notifikasi ulang ke karyawan. */
export class RescheduleTiketDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tanggalMulai?: string;

  @IsOptional()
  @Matches(FORMAT_JAM_24, { message: PESAN_FORMAT_JAM })
  jamMulai?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tanggalSelesai?: string;

  @IsOptional()
  @Matches(FORMAT_JAM_24, { message: PESAN_FORMAT_JAM })
  jamSelesai?: string;

  @IsOptional()
  @IsString()
  alasan?: string;
}
