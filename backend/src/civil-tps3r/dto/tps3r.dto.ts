// ==================================================
// FILE: backend/src/civil-tps3r/dto/tps3r.dto.ts
// FUNGSI: Validasi input Laporan Timbangan Sampah TPS 3R
// Rincian mengikuti format Excel TPS 3R; total per kategori dihitung otomatis.
// Field total lama (beratOrganik dst.) tetap diterima untuk kompatibilitas.
// ==================================================

import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsNumber, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';

/** Angka kg opsional; null = dikosongkan. */
function Kg(): PropertyDecorator {
  return (target, key) => {
    IsOptional()(target, key);
    Type(() => Number)(target, key);
    IsNumber()(target, key);
    Min(0)(target, key);
  };
}

export class BuatLaporanTps3rDto {
  @IsDateString()
  tanggal: string;

  // Total lama (dipakai bila rincian kategori tsb. tidak dikirim).
  @Kg() beratOrganik?: number | null;
  @Kg() beratReuse?: number | null;
  @Kg() beratRecycle?: number | null;
  @Kg() beratResidu?: number | null;

  // Organik
  @Kg() organikMakanan?: number | null;
  @Kg() organikTaman?: number | null;
  // Guna ulang / Reuse
  @Kg() reuseKertas?: number | null;
  @Kg() reusePlastik?: number | null;
  @Kg() reuseLainnya?: number | null;
  // Daur ulang / Recycle
  @Kg() recycleKertas?: number | null;
  @Kg() recyclePlastikKeras?: number | null;
  @Kg() recyclePallet?: number | null;
  @Kg() recycleKaca?: number | null;
  @Kg() recycleLogam?: number | null;
}

export class UbahLaporanTps3rDto extends PartialType(BuatLaporanTps3rDto) {}

export class BuatSampahTerkelolaTps3rDto {
  @IsDateString()
  tanggal: string;

  @Kg() beratOrganik?: number | null;
  @Kg() beratReuse?: number | null;
  @Kg() beratRecycle?: number | null;
  /** Residu & lainnya ke TPA. */
  @Kg() beratResidu?: number | null;

  // Penanganan organik
  @Kg() tanganiBiopori?: number | null;
  @Kg() tanganiKompos?: number | null;
  @Kg() tanganiMaggot?: number | null;
  // Penanganan anorganik
  @Kg() tanganiTpsNavaraha?: number | null;
  @Kg() tanganiTpsMenanti?: number | null;
  @Kg() tanganiTpsMajuBersama?: number | null;
  @Kg() tanganiBankSampah?: number | null;
}

export class UbahSampahTerkelolaTps3rDto extends PartialType(BuatSampahTerkelolaTps3rDto) {}
