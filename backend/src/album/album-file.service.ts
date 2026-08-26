// ==================================================
// FILE: backend/src/album/album-file.service.ts
// FUNGSI: Simpan foto Album Dokumentasi ke disk
// ==================================================

import { BadRequestException, Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const EKSTENSI_DIIZINKAN = ['.jpg', '.jpeg', '.png', '.webp'];
const UKURAN_MAKS_BYTE = 10 * 1024 * 1024;

@Injectable()
export class AlbumFileService {
  private readonly rootDir = join(process.cwd(), 'uploads', 'album');

  private direktori(): string {
    if (!existsSync(this.rootDir)) {
      mkdirSync(this.rootDir, { recursive: true });
    }

    return this.rootDir;
  }

  simpan(file: Express.Multer.File): string {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File foto wajib diunggah');
    }

    if (file.size > UKURAN_MAKS_BYTE) {
      throw new BadRequestException('Ukuran foto maksimal 10 MB');
    }

    const ekstensi = extname(file.originalname || '').toLowerCase();

    if (!EKSTENSI_DIIZINKAN.includes(ekstensi)) {
      throw new BadRequestException('Format foto harus JPG, PNG, atau WEBP');
    }

    const namaFile = `${Date.now()}-${randomUUID()}${ekstensi}`;
    writeFileSync(join(this.direktori(), namaFile), file.buffer);

    return `album/${namaFile}`;
  }

  hapus(pathRelatif: string | null | undefined): void {
    if (!pathRelatif) {
      return;
    }

    try {
      unlinkSync(join(process.cwd(), 'uploads', pathRelatif));
    } catch {
      // File sudah tidak ada — abaikan, data DB tetap dihapus.
    }
  }
}
