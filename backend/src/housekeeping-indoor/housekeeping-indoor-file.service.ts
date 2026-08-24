// ==================================================
// FILE: backend/src/housekeeping-indoor/housekeeping-indoor-file.service.ts
// FUNGSI: Simpan & hapus foto laporan Housekeeping Indoor
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const EKSTENSI_DIIZINKAN = ['.jpg', '.jpeg', '.png', '.webp'];
const UKURAN_MAKS_BYTE = 10 * 1024 * 1024;

@Injectable()
export class HousekeepingIndoorFileService {
  private readonly rootDir = join(process.cwd(), 'uploads', 'housekeeping-indoor');

  private direktori(scope: string): string {
    const dir = join(this.rootDir, scope);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    return dir;
  }

  simpan(file: Express.Multer.File, laporanId: number): string {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File foto wajib diunggah');
    }

    if (file.size > UKURAN_MAKS_BYTE) {
      throw new BadRequestException('Ukuran tiap foto maksimal 10 MB');
    }

    const ekstensi = extname(file.originalname || '').toLowerCase();

    if (!EKSTENSI_DIIZINKAN.includes(ekstensi)) {
      throw new BadRequestException('Format foto harus JPG, PNG, atau WEBP');
    }

    const namaFile = `${Date.now()}-${randomUUID()}${ekstensi}`;
    const scope = `laporan-${laporanId}`;
    const tujuan = join(this.direktori(scope), namaFile);

    writeFileSync(tujuan, file.buffer);

    return `housekeeping-indoor/${scope}/${namaFile}`;
  }

  resolveAbsolut(pathRelatif: string): string {
    const bersih = pathRelatif.replace(/\\/g, '/').replace(/^\/+/, '');

    if (!bersih.startsWith('housekeeping-indoor/')) {
      throw new BadRequestException('Path foto tidak valid');
    }

    const uploadsRoot = resolve(join(process.cwd(), 'uploads'));
    const absolut = resolve(join(uploadsRoot, bersih));

    if (!absolut.startsWith(uploadsRoot)) {
      throw new BadRequestException('Path foto tidak valid');
    }

    if (!existsSync(absolut)) {
      throw new NotFoundException('Foto tidak ditemukan');
    }

    return absolut;
  }

  hapus(pathRelatif: string | null | undefined): boolean {
    if (!pathRelatif) {
      return false;
    }

    try {
      const absolut = this.resolveAbsolut(pathRelatif);
      unlinkSync(absolut);
      return true;
    } catch {
      return false;
    }
  }
}
