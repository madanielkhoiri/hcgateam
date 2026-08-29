// ==================================================
// FILE: backend/src/kip/dto/kip.dto.ts
// FUNGSI: DTO modul KIP (Kartu Inspeksi Peralatan)
// ==================================================

import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { LokasiHousekeepingIndoor } from '@prisma/client';
import { LOKASI_HOUSEKEEPING_INDOOR } from '../../housekeeping-indoor/dto/housekeeping-indoor.dto';

export { LOKASI_HOUSEKEEPING_INDOOR };

export class BuatKipDto {
  @IsString()
  @IsNotEmpty()
  noKip: string;

  @IsString()
  @IsNotEmpty()
  jenisPeralatan: string;

  @IsString()
  @IsNotEmpty()
  departemen: string;

  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  tahun: number;

  @IsIn(LOKASI_HOUSEKEEPING_INDOOR)
  lokasi: LokasiHousekeepingIndoor;
}

export class SimpanGpsLokasiDto {
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude: number;

  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude: number;
}

export class CeklisDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  longitude?: number;
}
