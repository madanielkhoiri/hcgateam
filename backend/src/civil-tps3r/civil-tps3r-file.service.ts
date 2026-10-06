import { BadRequestException, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';

@Injectable()
export class CivilTps3rFileService {
  private readonly dir = join(process.cwd(), 'uploads', 'tps3r');
  simpan(file?: Express.Multer.File) {
    if (!file?.buffer?.length) throw new BadRequestException('Foto wajib diunggah');
    if (file.size > 10 * 1024 * 1024) throw new BadRequestException('Ukuran foto maksimal 10 MB');
    const ext = extname(file.originalname).toLowerCase();
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) throw new BadRequestException('Format foto harus JPG, PNG, atau WEBP');
    if (!existsSync(this.dir)) mkdirSync(this.dir, { recursive: true });
    const nama = `${Date.now()}-${randomUUID()}${ext}`;
    writeFileSync(join(this.dir, nama), file.buffer);
    return `tps3r/${nama}`;
  }
  hapus(path?: string | null) {
    if (!path) return;
    try { unlinkSync(join(process.cwd(), 'uploads', path)); } catch { /* file sudah tidak ada */ }
  }
}
