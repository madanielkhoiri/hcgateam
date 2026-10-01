// ==================================================
// FILE: backend/src/ir/common/ir-file.service.ts
// FUNGSI: Simpan dokumen (SK/IM/FORM) dan video IR Course ke disk
// ==================================================

import { BadRequestException, Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const EKSTENSI_DOKUMEN = ['.pdf', '.jpg', '.jpeg', '.png', '.webp'];

const EKSTENSI_VIDEO = ['.mp4', '.webm', '.mov'];

@Injectable()
export class IrFileService {
  private readonly rootDir = join(process.cwd(), 'uploads', 'ir');

  private direktori(sub: string): string {
    const dir = join(this.rootDir, sub);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    return dir;
  }

  simpanDokumen(file: Express.Multer.File): string {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File dokumen wajib diunggah');
    }

    const ekstensi = extname(file.originalname || '').toLowerCase();

    if (!EKSTENSI_DOKUMEN.includes(ekstensi)) {
      throw new BadRequestException(
        'Format dokumen harus PDF, JPG, PNG, atau WEBP',
      );
    }

    const namaFile = `${Date.now()}-${randomUUID()}${ekstensi}`;
    writeFileSync(join(this.direktori('dokumen'), namaFile), file.buffer);

    return `ir/dokumen/${namaFile}`;
  }

  simpanVideo(file: Express.Multer.File): string {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File video wajib diunggah');
    }

    const ekstensi = extname(file.originalname || '').toLowerCase();

    if (!EKSTENSI_VIDEO.includes(ekstensi)) {
      throw new BadRequestException('Format video harus MP4, WEBM, atau MOV');
    }

    const namaFile = `${Date.now()}-${randomUUID()}${ekstensi}`;
    writeFileSync(join(this.direktori('course'), namaFile), file.buffer);

    return `ir/course/${namaFile}`;
  }

  /** Hapus fisik file berdasarkan path relatif tersimpan di DB (mis. "ir/dokumen/xxx.pdf"). */
  hapus(pathRelatif: string | null | undefined): void {
    if (!pathRelatif) {
      return;
    }

    try {
      const absolut = join(process.cwd(), 'uploads', pathRelatif);
      unlinkSync(absolut);
    } catch {
      // File sudah tidak ada — abaikan, data DB tetap dihapus.
    }
  }
}
