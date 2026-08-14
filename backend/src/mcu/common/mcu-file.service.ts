// ==================================================
// FILE: backend/src/mcu/common/mcu-file.service.ts
// FUNGSI: Simpan, baca, dan hapus dokumen MCU (PDF/gambar)
// Catatan: file medis mentah hanya boleh diakses HC & Dokter.
// ==================================================

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

export type KategoriFileMcu =
  | 'hasil-mcu'
  | 'hasil-follow-up'
  | 'rekomendasi'
  | 'surat-rujukan'
  | 'surat-pengantar';

const SEMUA_KATEGORI: KategoriFileMcu[] = [
  'hasil-mcu',
  'hasil-follow-up',
  'rekomendasi',
  'surat-rujukan',
  'surat-pengantar',
];

const EKSTENSI_DIIZINKAN = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
const UKURAN_MAKS_BYTE = 15 * 1024 * 1024;

@Injectable()
export class McuFileService {
  private readonly rootDir = join(process.cwd(), 'uploads', 'mcu');

  private direktori(kategori: KategoriFileMcu): string {
    const dir = join(this.rootDir, kategori);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    return dir;
  }

  parseKategori(value: string): KategoriFileMcu {
    if (!SEMUA_KATEGORI.includes(value as KategoriFileMcu)) {
      throw new BadRequestException('Kategori dokumen MCU tidak valid');
    }

    return value as KategoriFileMcu;
  }

  simpan(file: Express.Multer.File, kategori: KategoriFileMcu): string {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File dokumen wajib diunggah');
    }

    if (file.size > UKURAN_MAKS_BYTE) {
      throw new BadRequestException('Ukuran file maksimal 15 MB');
    }

    const ekstensi = extname(file.originalname || '').toLowerCase();

    if (!EKSTENSI_DIIZINKAN.includes(ekstensi)) {
      throw new BadRequestException(
        'Format file harus PDF, JPG, PNG, atau WEBP',
      );
    }

    const namaFile = `${Date.now()}-${randomUUID()}${ekstensi}`;
    const tujuan = join(this.direktori(kategori), namaFile);

    writeFileSync(tujuan, file.buffer);

    return `mcu/${kategori}/${namaFile}`;
  }

  /** Resolve path relatif menjadi absolut sambil menahan path traversal. */
  resolveAbsolut(pathRelatif: string): string {
    const bersih = pathRelatif.replace(/\\/g, '/').replace(/^\/+/, '');

    if (!bersih.startsWith('mcu/')) {
      throw new BadRequestException('Path dokumen tidak valid');
    }

    const uploadsRoot = resolve(join(process.cwd(), 'uploads'));
    const absolut = resolve(join(uploadsRoot, bersih));

    if (!absolut.startsWith(uploadsRoot)) {
      throw new BadRequestException('Path dokumen tidak valid');
    }

    if (!existsSync(absolut)) {
      throw new NotFoundException('File dokumen tidak ditemukan');
    }

    return absolut;
  }

  /** Hapus fisik file; dipakai job retensi 6 bulan. */
  hapus(pathRelatif: string | null | undefined): boolean {
    if (!pathRelatif) {
      return false;
    }

    try {
      const absolut = this.resolveAbsolut(pathRelatif);
      unlinkSync(absolut);
      return true;
    } catch {
      // File sudah tidak ada — retensi tetap dianggap tuntas.
      return false;
    }
  }

  hapusBanyak(paths: Array<string | null | undefined>): number {
    return paths.reduce<number>(
      (total, path) => total + (this.hapus(path) ? 1 : 0),
      0,
    );
  }
}
