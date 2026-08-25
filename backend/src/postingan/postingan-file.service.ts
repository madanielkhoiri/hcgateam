// ==================================================
// FILE: backend/src/postingan/postingan-file.service.ts
// FUNGSI: Simpan poster (gambar) dan video Postingan ke disk
// ==================================================

import { BadRequestException, Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';

const EKSTENSI_POSTER = ['.jpg', '.jpeg', '.png', '.webp'];
const UKURAN_POSTER_MAKS_BYTE = 10 * 1024 * 1024;

const EKSTENSI_VIDEO = ['.mp4', '.webm', '.mov'];
const UKURAN_VIDEO_MAKS_BYTE = 300 * 1024 * 1024;

@Injectable()
export class PostinganFileService {
  private readonly rootDir = join(process.cwd(), 'uploads', 'postingan');

  private direktori(): string {
    if (!existsSync(this.rootDir)) {
      mkdirSync(this.rootDir, { recursive: true });
    }

    return this.rootDir;
  }

  simpanPoster(file: Express.Multer.File): string {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File poster wajib diunggah');
    }

    if (file.size > UKURAN_POSTER_MAKS_BYTE) {
      throw new BadRequestException('Ukuran poster maksimal 10 MB');
    }

    const ekstensi = extname(file.originalname || '').toLowerCase();

    if (!EKSTENSI_POSTER.includes(ekstensi)) {
      throw new BadRequestException('Format poster harus JPG, PNG, atau WEBP');
    }

    return this.simpan(file, ekstensi);
  }

  simpanVideo(file: Express.Multer.File): string {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File video wajib diunggah');
    }

    if (file.size > UKURAN_VIDEO_MAKS_BYTE) {
      throw new BadRequestException('Ukuran video maksimal 300 MB');
    }

    const ekstensi = extname(file.originalname || '').toLowerCase();

    if (!EKSTENSI_VIDEO.includes(ekstensi)) {
      throw new BadRequestException('Format video harus MP4, WEBM, atau MOV');
    }

    return this.simpan(file, ekstensi);
  }

  private simpan(file: Express.Multer.File, ekstensi: string): string {
    const namaFile = `${Date.now()}-${randomUUID()}${ekstensi}`;
    writeFileSync(join(this.direktori(), namaFile), file.buffer);

    return `postingan/${namaFile}`;
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
