// ==================================================
// FILE: backend/src/mcu/karyawan/dto/mcu-karyawan.dto.ts
// FUNGSI: Validasi request master karyawan & departemen MCU
// ==================================================

import { PartialType } from '@nestjs/mapped-types';
import { StatusKerja, StatusKesehatanDirumahkan } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';

export class BuatDepartemenDto {
  @IsString()
  @IsNotEmpty()
  namaDepartemen: string;

  @IsOptional()
  @IsInt()
  adminAkunId?: number;

  @IsOptional()
  @IsBoolean()
  aktif?: boolean;
}

export class UbahDepartemenDto extends PartialType(BuatDepartemenDto) {}

export class BuatKaryawanDto {
  @IsString()
  @IsNotEmpty()
  nik: string;

  @IsString()
  @IsNotEmpty()
  nama: string;

  @IsInt()
  departemenId: number;

  @IsOptional()
  @IsString()
  jabatan?: string;

  @IsOptional()
  @IsEmail({}, { message: 'Format email tidak valid' })
  email?: string;

  @IsOptional()
  @IsDateString()
  tanggalLahir?: string;

  @IsOptional()
  @IsDateString()
  tanggalMcuTerakhir?: string;

  /** tanggal_mcu_berikutnya dihitung otomatis = expired - 3 bulan. */
  @IsOptional()
  @IsDateString()
  tanggalMcuExpired?: string;

  @IsOptional()
  @IsEnum(StatusKerja)
  statusKerja?: StatusKerja;

  @IsOptional()
  @IsEnum(StatusKesehatanDirumahkan)
  statusKesehatanDirumahkan?: StatusKesehatanDirumahkan;

  @IsOptional()
  @IsInt()
  akunId?: number;
}

export class UbahKaryawanDto extends PartialType(BuatKaryawanDto) {}

export class UbahStatusKerjaDto {
  @IsEnum(StatusKerja)
  statusKerja: StatusKerja;

  @IsOptional()
  @IsEnum(StatusKesehatanDirumahkan)
  statusKesehatanDirumahkan?: StatusKesehatanDirumahkan;
}
