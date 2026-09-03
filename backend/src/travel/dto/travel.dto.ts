// ==================================================
// FILE: backend/src/travel/dto/travel.dto.ts
// FUNGSI: DTO modul Travel (jadwal shuttle, driver, checkin/checkout, rating)
// ==================================================

import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class BuatDriverDto {
  @IsString()
  @IsNotEmpty()
  nama: string;

  @IsOptional()
  @IsString()
  noTelepon?: string;

  @IsOptional()
  @IsString()
  @MinLength(4)
  username?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;
}

export class UbahDriverDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nama?: string;

  @IsOptional()
  @IsString()
  noTelepon?: string;

  @IsOptional()
  @IsBoolean()
  statusAktif?: boolean;
}

export class BuatJadwalDto {
  @IsString()
  @IsNotEmpty()
  armada: string;

  @Type(() => Number)
  @IsInt()
  driverId: number;

  @IsOptional()
  @IsString()
  asal?: string;

  @IsString()
  @IsNotEmpty()
  tujuan: string;

  @IsString()
  @IsNotEmpty()
  waktuBerangkatRencana: string;

  @IsOptional()
  @IsString()
  catatan?: string;

  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  karyawanIds: number[];
}

export class UbahJadwalDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  armada?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  driverId?: number;

  @IsOptional()
  @IsString()
  asal?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  tujuan?: string;

  @IsOptional()
  @IsString()
  waktuBerangkatRencana?: string;

  @IsOptional()
  @IsString()
  catatan?: string;

  @IsOptional()
  @IsIn(['DIJADWALKAN', 'DIBATALKAN'])
  status?: 'DIJADWALKAN' | 'DIBATALKAN';

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @Type(() => Number)
  @IsInt({ each: true })
  karyawanIds?: number[];
}

/** Perubahan jadwal dadakan (delay, dsb.) — bukan edit biasa, WAJIB notifikasi ulang ke penumpang. */
export class RescheduleJadwalDto {
  @IsString()
  @IsNotEmpty()
  waktuBerangkatRencana: string;

  @IsOptional()
  @IsString()
  alasan?: string;
}

export class RatingTravelDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  bintang: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  ulasan?: string;
}
