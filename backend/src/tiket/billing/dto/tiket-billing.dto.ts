// ==================================================
// FILE: backend/src/tiket/billing/dto/tiket-billing.dto.ts
// FUNGSI: Validasi request modul Billing & Rekapan Tiket
// ==================================================

import { Type } from 'class-transformer';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
} from 'class-validator';

/**
 * bulan & tahun sengaja string (dikonversi manual di service) - DTO ini
 * dikirim lewat multipart/form-data (bareng file ZIP), dan konversi
 * angka lewat @Type() class-transformer tidak selalu reliable dipakai
 * bareng field file di multipart form di NestJS.
 */
export class BuatTiketBillingDto {
  @IsString()
  @IsNotEmpty({ message: 'Nama rekapan wajib diisi' })
  @MaxLength(150)
  namaRekapan: string;

  @IsString()
  @IsNotEmpty({ message: 'Bulan wajib diisi' })
  bulan: string;

  @IsString()
  @IsNotEmpty({ message: 'Tahun wajib diisi' })
  tahun: string;
}

/** Edit metadata Billing (nama/bulan/tahun) - tidak mengulang proses ZIP/PDF. */
export class UbahTiketBillingDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Nama rekapan wajib diisi' })
  @MaxLength(150)
  namaRekapan?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Bulan wajib diisi' })
  bulan?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Tahun wajib diisi' })
  tahun?: string;
}

export class HitungRekapDto {
  @IsInt()
  @Min(0)
  @Type(() => Number)
  ppn: number;

  @IsInt()
  @Min(0)
  @Type(() => Number)
  pph23: number;

  @IsInt()
  @Min(0)
  @Max(999_999_999_999)
  @Type(() => Number)
  grandTotalVendor: number;
}
