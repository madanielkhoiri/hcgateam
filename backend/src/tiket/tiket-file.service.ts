// ==================================================
// FILE: backend/src/tiket/tiket-file.service.ts
// FUNGSI: Simpan, baca, dan hapus dokumen tiket cuti
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const EKSTENSI_DIIZINKAN = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];
const UKURAN_MAKS_BYTE = 15 * 1024 * 1024;

@Injectable()
export class TiketFileService {
  private readonly rootDir = join(process.cwd(), 'uploads', 'tiket');

  private direktori(scope: string): string {
    const dir = join(this.rootDir, scope);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    return dir;
  }

  simpan(file: Express.Multer.File, karyawanId: number): { fileUrl: string; namaFile: string } {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File tiket wajib diunggah');
    }

    if (file.size > UKURAN_MAKS_BYTE) {
      throw new BadRequestException('Ukuran file maksimal 15 MB');
    }

    const ekstensi = extname(file.originalname || '').toLowerCase();

    if (!EKSTENSI_DIIZINKAN.includes(ekstensi)) {
      throw new BadRequestException('Format file harus PDF, JPG, PNG, atau WEBP');
    }

    const namaFile = `${Date.now()}-${randomUUID()}${ekstensi}`;
    const scope = `karyawan-${karyawanId}`;
    const tujuan = join(this.direktori(scope), namaFile);

    writeFileSync(tujuan, file.buffer);

    return {
      fileUrl: `tiket/${scope}/${namaFile}`,
      namaFile: file.originalname || namaFile,
    };
  }

  /** Resolve path relatif menjadi absolut sambil menahan path traversal. */
  resolveAbsolut(pathRelatif: string): string {
    const bersih = pathRelatif.replace(/\\/g, '/').replace(/^\/+/, '');

    if (!bersih.startsWith('tiket/')) {
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
