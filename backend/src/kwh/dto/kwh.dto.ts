// ==================================================
// FILE: backend/src/kwh/dto/kwh.dto.ts
// FUNGSI: DTO modul Perhitungan KWH (Civil > GA MEP > Electric)
// ==================================================

import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class BuatPencatatanKwhDto {
  /** Pilih meter yang sudah ada... */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  meterId?: number;

  /** ...atau buat meter baru langsung dari form tambah data. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  namaMeterBaru?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  lokasiMeterBaru?: string;

  /** Angka stand meter (kWh) yang terbaca saat pencatatan. */
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999999)
  standMeter: number;

  /** ISO datetime; kosong = sekarang. */
  @IsOptional()
  @IsString()
  tanggalCatat?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  catatan?: string;
}

export class UbahPencatatanKwhDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(999999999999)
  standMeter: number;

  @IsOptional()
  @IsString()
  tanggalCatat?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  catatan?: string;
}
