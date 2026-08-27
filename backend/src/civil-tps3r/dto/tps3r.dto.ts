// ==================================================
// FILE: backend/src/civil-tps3r/dto/tps3r.dto.ts
// FUNGSI: Validasi input Laporan Timbangan Sampah TPS 3R
// Satu laporan mencakup kelima kategori sekaligus (kg).
// ==================================================

import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class BuatLaporanTps3rDto {
  @IsDateString()
  tanggal: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  beratOrganik: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  beratNonOrganik: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  beratReuse: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  beratRecycle: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  beratResidu: number;
}

export class UbahLaporanTps3rDto extends PartialType(BuatLaporanTps3rDto) {}
