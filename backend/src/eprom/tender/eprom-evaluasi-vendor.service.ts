// ==================================================
// FILE: backend/src/eprom/tender/eprom-evaluasi-vendor.service.ts
// FUNGSI: Evaluasi vendor — gabungan Eksternal (Bumdes dkk, kode 1-4) dan
// Teknis (Teknikal/Schedule/Harga Penawaran/SHE/Legalitas, skor bebas
// berbobot) — salah satu dari 2 pertimbangan pemenang tender (bersama SPH),
// dipilih manual oleh Owner.
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, Max, Min } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';

// ---------------- Eksternal ----------------

export const KATEGORI_EVALUASI_VENDOR = [
  'bumdesKode',
  'bupatiDprKode',
  'lingkunganKode',
  'pekerjaLokalKode',
  'kepolisianKode',
  'dlhKode',
  'dpuprKode',
] as const;

export type KategoriEvaluasiVendor = (typeof KATEGORI_EVALUASI_VENDOR)[number];

export const LABEL_KATEGORI_EVALUASI_VENDOR: Record<KategoriEvaluasiVendor, string> = {
  bumdesKode: 'Bumdes',
  bupatiDprKode: 'Bupati & DPR/tim bersangkutan',
  lingkunganKode: 'Lingkungan',
  pekerjaLokalKode: 'Pekerja Lokal',
  kepolisianKode: 'Kepolisian',
  dlhKode: 'DLH',
  dpuprKode: 'DPUPR',
};

/** Kode 1-4 dan bobotnya — sama untuk seluruh kategori eksternal. */
export const KODE_EVALUASI_VENDOR: Record<number, { keterangan: string; bobot: number }> = {
  1: { keterangan: 'Sudah Terjalin Komunikasi', bobot: 100 },
  2: { keterangan: 'Pernah Menjalin Komunikasi', bobot: 75 },
  3: { keterangan: 'Belum Menjalin Komunikasi', bobot: 50 },
  4: { keterangan: 'Track Record Tidak Baik', bobot: 0 },
};

const KODE_VALID = [1, 2, 3, 4];

// ---------------- Teknis ----------------

export const ITEM_TEKNIKAL = [
  'teknikalMetode',
  'teknikalAlatKerja',
  'teknikalSpesifikasi',
  'teknikalPengalaman',
  'teknikalKomunikatif',
] as const;

export const ITEM_HARGA = ['hargaKetepatanWaktu', 'hargaNegosiasi'] as const;

export const KATEGORI_EVALUASI_TEKNIS = [
  ...ITEM_TEKNIKAL,
  'scheduleSkor',
  ...ITEM_HARGA,
  'sheSkor',
  'legalitasSkor',
] as const;

export type KategoriEvaluasiTeknis = (typeof KATEGORI_EVALUASI_TEKNIS)[number];

export const LABEL_ITEM_TEKNIS: Record<KategoriEvaluasiTeknis, string> = {
  teknikalMetode: 'Metode Pelaksanaan',
  teknikalAlatKerja: 'Alat Kerja dan Man Power',
  teknikalSpesifikasi: 'Spesifikasi Teknik',
  teknikalPengalaman: 'Pengalaman',
  teknikalKomunikatif: 'Komunikatif',
  scheduleSkor: 'Schedule',
  hargaKetepatanWaktu: 'Ketepatan Waktu Pengiriman',
  hargaNegosiasi: 'Negosiasi',
  sheSkor: 'SHE',
  legalitasSkor: 'Legalitas Perusahaan',
};

/** Bobot 5 kriteria utama (harus berjumlah 1.0). */
const BOBOT_KRITERIA_TEKNIS = {
  teknikal: 0.25,
  schedule: 0.2,
  harga: 0.2,
  she: 0.2,
  legalitas: 0.15,
};

export const LABEL_ROUND_TEKNIS: Record<number, string> = {
  1: 'Kurang',
  2: 'Cukup',
  3: 'Baik',
};

export class UbahEvaluasiVendorDto {
  @IsOptional()
  @IsIn(KODE_VALID)
  bumdesKode?: number;

  @IsOptional()
  @IsIn(KODE_VALID)
  bupatiDprKode?: number;

  @IsOptional()
  @IsIn(KODE_VALID)
  lingkunganKode?: number;

  @IsOptional()
  @IsIn(KODE_VALID)
  pekerjaLokalKode?: number;

  @IsOptional()
  @IsIn(KODE_VALID)
  kepolisianKode?: number;

  @IsOptional()
  @IsIn(KODE_VALID)
  dlhKode?: number;

  @IsOptional()
  @IsIn(KODE_VALID)
  dpuprKode?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  teknikalMetode?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  teknikalAlatKerja?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  teknikalSpesifikasi?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  teknikalPengalaman?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  teknikalKomunikatif?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  scheduleSkor?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  hargaKetepatanWaktu?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  hargaNegosiasi?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  sheSkor?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  legalitasSkor?: number;
}

function hitungNilaiAvgEksternal(evaluasi: Record<string, unknown> | null): number | null {
  if (!evaluasi) return null;

  const nilai = KATEGORI_EVALUASI_VENDOR.map((kategori) => evaluasi[kategori] as number | null).filter(
    (kode): kode is number => kode !== null && kode !== undefined,
  );

  if (nilai.length === 0) return null;

  const totalBobot = nilai.reduce((a, kode) => a + KODE_EVALUASI_VENDOR[kode].bobot, 0);
  return Math.round((totalBobot / nilai.length) * 10) / 10;
}

function rataRata(nilai: (number | null | undefined)[]): number | null {
  const terisi = nilai.filter((n): n is number => n !== null && n !== undefined).map(Number);
  if (terisi.length === 0) return null;
  return terisi.reduce((a, b) => a + b, 0) / terisi.length;
}

function hitungEvaluasiTeknis(evaluasi: Record<string, unknown> | null) {
  if (!evaluasi) {
    return { teknikalAvg: null, hargaAvg: null, nilaiTeknis: null, roundTeknis: null };
  }

  const teknikalAvg = rataRata(ITEM_TEKNIKAL.map((k) => evaluasi[k] as number | null));
  const hargaAvg = rataRata(ITEM_HARGA.map((k) => evaluasi[k] as number | null));
  const scheduleSkor = evaluasi.scheduleSkor as number | null;
  const sheSkor = evaluasi.sheSkor as number | null;
  const legalitasSkor = evaluasi.legalitasSkor as number | null;

  const kriteria = [
    { nilai: teknikalAvg, bobot: BOBOT_KRITERIA_TEKNIS.teknikal },
    { nilai: scheduleSkor !== null && scheduleSkor !== undefined ? Number(scheduleSkor) : null, bobot: BOBOT_KRITERIA_TEKNIS.schedule },
    { nilai: hargaAvg, bobot: BOBOT_KRITERIA_TEKNIS.harga },
    { nilai: sheSkor !== null && sheSkor !== undefined ? Number(sheSkor) : null, bobot: BOBOT_KRITERIA_TEKNIS.she },
    { nilai: legalitasSkor !== null && legalitasSkor !== undefined ? Number(legalitasSkor) : null, bobot: BOBOT_KRITERIA_TEKNIS.legalitas },
  ].filter((k) => k.nilai !== null);

  if (kriteria.length === 0) {
    return { teknikalAvg, hargaAvg, nilaiTeknis: null, roundTeknis: null };
  }

  const totalBobot = kriteria.reduce((a, k) => a + k.bobot, 0);
  const nilaiTeknis =
    Math.round((kriteria.reduce((a, k) => a + k.nilai! * k.bobot, 0) / totalBobot) * 1000) / 1000;

  return { teknikalAvg, hargaAvg, nilaiTeknis, roundTeknis: Math.round(nilaiTeknis) };
}

@Injectable()
export class EpromEvaluasiVendorService {
  constructor(private readonly prisma: PrismaService) {}

  /** Satu baris per vendor yang diundang, evaluasi null kalau belum diisi sama sekali. */
  async daftar(tenderId: number) {
    const undangan = await this.prisma.tenderUndangan.findMany({
      where: { tenderId },
      include: { vendor: { select: { id: true, namaVendor: true } } },
      orderBy: { id: 'asc' },
    });

    const evaluasiList = await this.prisma.evaluasiVendor.findMany({ where: { tenderId } });
    const petaEvaluasi = new Map(evaluasiList.map((e) => [e.vendorId, e]));

    return undangan.map(({ vendor }) => {
      const evaluasi = petaEvaluasi.get(vendor.id) ?? null;

      return {
        vendorId: vendor.id,
        namaVendor: vendor.namaVendor,
        evaluasi,
        nilaiAvg: hitungNilaiAvgEksternal(evaluasi),
        ...hitungEvaluasiTeknis(evaluasi),
      };
    });
  }

  async ubah(tenderId: number, vendorId: number, dto: UbahEvaluasiVendorDto) {
    const tender = await this.prisma.tenderProcess.findUnique({ where: { id: tenderId } });

    if (!tender) {
      throw new NotFoundException('Tender tidak ditemukan');
    }

    const undangan = await this.prisma.tenderUndangan.findUnique({
      where: { tenderId_vendorId: { tenderId, vendorId } },
    });

    if (!undangan) {
      throw new BadRequestException('Vendor ini belum diundang pada tender tersebut');
    }

    const evaluasi = await this.prisma.evaluasiVendor.upsert({
      where: { tenderId_vendorId: { tenderId, vendorId } },
      create: { tenderId, vendorId, ...dto },
      update: { ...dto },
    });

    return {
      ...evaluasi,
      nilaiAvg: hitungNilaiAvgEksternal(evaluasi),
      ...hitungEvaluasiTeknis(evaluasi),
    };
  }
}
