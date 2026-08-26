// ==================================================
// FILE: backend/src/drive/drive-file.service.ts
// FUNGSI: Simpan file Drive Administrasi (CSR, Form Download) ke disk
// ==================================================

import { BadRequestException, Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const EKSTENSI_DIIZINKAN = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.ppt',
  '.pptx',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.zip',
  '.rar',
];
const UKURAN_MAKS_BYTE = 25 * 1024 * 1024;

@Injectable()
export class DriveFileService {
  private readonly rootDir = join(process.cwd(), 'uploads', 'drive');

  private direktori(): string {
    if (!existsSync(this.rootDir)) {
      mkdirSync(this.rootDir, { recursive: true });
    }

    return this.rootDir;
  }

  simpan(file: Express.Multer.File): string {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File wajib diunggah');
    }

    if (file.size > UKURAN_MAKS_BYTE) {
      throw new BadRequestException('Ukuran file maksimal 25 MB');
    }

    const ekstensi = extname(file.originalname || '').toLowerCase();

    if (!EKSTENSI_DIIZINKAN.includes(ekstensi)) {
      throw new BadRequestException(
        'Format file tidak didukung (PDF, Office, gambar, atau ZIP/RAR saja)',
      );
    }

    const namaFile = `${Date.now()}-${randomUUID()}${ekstensi}`;
    writeFileSync(join(this.direktori(), namaFile), file.buffer);

    return `drive/${namaFile}`;
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
