import { BadRequestException, Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';

const EKSTENSI_FOTO = ['.jpg', '.jpeg', '.png', '.webp'];
const MAKSIMAL_FOTO = 10 * 1024 * 1024;

@Injectable()
export class MonitoringRkbFileService {
  private readonly rootDir = join(process.cwd(), 'uploads', 'monitoring-rkb');

  simpan(file: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('Foto barang wajib diunggah');
    if (file.size > MAKSIMAL_FOTO) throw new BadRequestException('Ukuran foto maksimal 10 MB');
    const ekstensi = extname(file.originalname || '').toLowerCase();
    if (!EKSTENSI_FOTO.includes(ekstensi)) throw new BadRequestException('Format foto harus JPG, PNG, atau WEBP');
    if (!existsSync(this.rootDir)) mkdirSync(this.rootDir, { recursive: true });
    const nama = `${Date.now()}-${randomUUID()}${ekstensi}`;
    writeFileSync(join(this.rootDir, nama), file.buffer);
    return `monitoring-rkb/${nama}`;
  }

  hapus(path: string | null | undefined) {
    if (!path) return;
    try { unlinkSync(join(process.cwd(), 'uploads', path)); } catch { /* file sudah tidak ada */ }
  }
}
