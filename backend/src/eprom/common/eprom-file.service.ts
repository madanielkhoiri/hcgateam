// ==================================================
// FILE: backend/src/eprom/common/eprom-file.service.ts
// FUNGSI: Simpan, baca, dan hapus dokumen e-ProM (folder Tender/Vendor)
// Referensi: alur-workflow-tender-kontrak-project-area.md bagian 4.1.1 & 4.2.2
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { TipeFileEprom } from '@prisma/client';

const EKSTENSI_PER_TIPE: Record<TipeFileEprom, string[]> = {
  PDF: ['.pdf'],
  RAB: ['.xlsx', '.xls', '.csv', '.pdf'],
  CAD: ['.dwg', '.dxf', '.pdf'],
  FOTO: ['.jpg', '.jpeg', '.png', '.webp'],
};

const SEMUA_EKSTENSI_DIIZINKAN = Array.from(
  new Set(Object.values(EKSTENSI_PER_TIPE).flat()),
);

/**
 * Ekstensi dokumen umum yang aman untuk lampiran bebas-tipe (mis. File Kontrak) —
 * mencakup dokumen kantor, gambar, arsip, dan CAD, TIDAK termasuk tipe yang bisa
 * dieksekusi/berisi script (html, svg, js, exe, dst.) untuk mencegah stored XSS
 * atau distribusi malware lewat file yang disajikan statis di /api/uploads/.
 */
const EKSTENSI_DOKUMEN_UMUM = [
  '.pdf',
  '.doc',
  '.docx',
  '.xls',
  '.xlsx',
  '.csv',
  '.ppt',
  '.pptx',
  '.txt',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.dwg',
  '.dxf',
  '.zip',
  '.rar',
];

const UKURAN_MAKS_BYTE = 25 * 1024 * 1024;

@Injectable()
export class EpromFileService {
  private readonly rootDir = join(process.cwd(), 'uploads', 'eprom');

  private direktori(scope: string): string {
    const dir = join(this.rootDir, scope);

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    return dir;
  }

  /** Menebak TipeFileEprom dari ekstensi berkas bila tidak dikirim eksplisit. */
  tebakTipe(originalname: string): TipeFileEprom {
    const ekstensi = extname(originalname || '').toLowerCase();

    if (['.jpg', '.jpeg', '.png', '.webp'].includes(ekstensi)) {
      return TipeFileEprom.FOTO;
    }

    if (['.dwg', '.dxf'].includes(ekstensi)) {
      return TipeFileEprom.CAD;
    }

    if (['.xlsx', '.xls', '.csv'].includes(ekstensi)) {
      return TipeFileEprom.RAB;
    }

    return TipeFileEprom.PDF;
  }

  simpan(
    file: Express.Multer.File,
    scope: string,
    tipe: TipeFileEprom,
  ): string {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File wajib diunggah');
    }

    if (file.size > UKURAN_MAKS_BYTE) {
      throw new BadRequestException('Ukuran file maksimal 25 MB');
    }

    const ekstensi = extname(file.originalname || '').toLowerCase();

    if (!SEMUA_EKSTENSI_DIIZINKAN.includes(ekstensi)) {
      throw new BadRequestException('Format file tidak didukung');
    }

    if (!EKSTENSI_PER_TIPE[tipe].includes(ekstensi)) {
      throw new BadRequestException(
        `Format file tidak sesuai untuk tipe ${tipe}`,
      );
    }

    const namaFile = `${Date.now()}-${randomUUID()}${ekstensi}`;
    const tujuan = join(this.direktori(scope), namaFile);

    writeFileSync(tujuan, file.buffer);

    return `eprom/${scope}/${namaFile}`;
  }

  /** Simpan lampiran bebas-tipe (mis. File Kontrak) — lihat EKSTENSI_DOKUMEN_UMUM. */
  simpanDokumen(file: Express.Multer.File, scope: string): string {
    if (!file?.buffer?.length) {
      throw new BadRequestException('File wajib diunggah');
    }

    if (file.size > UKURAN_MAKS_BYTE) {
      throw new BadRequestException('Ukuran file maksimal 25 MB');
    }

    const ekstensi = extname(file.originalname || '').toLowerCase();

    if (!EKSTENSI_DOKUMEN_UMUM.includes(ekstensi)) {
      throw new BadRequestException('Format file tidak didukung');
    }

    const namaFile = `${Date.now()}-${randomUUID()}${ekstensi}`;
    const tujuan = join(this.direktori(scope), namaFile);

    writeFileSync(tujuan, file.buffer);

    return `eprom/${scope}/${namaFile}`;
  }

  /** Resolve path relatif menjadi absolut sambil menahan path traversal. */
  resolveAbsolut(pathRelatif: string): string {
    const bersih = pathRelatif.replace(/\\/g, '/').replace(/^\/+/, '');

    if (!bersih.startsWith('eprom/')) {
      throw new BadRequestException('Path dokumen tidak valid');
    }

    const uploadsRoot = resolve(join(process.cwd(), 'uploads'));
    const absolut = resolve(join(uploadsRoot, bersih));

    if (!absolut.startsWith(uploadsRoot)) {
      throw new BadRequestException('Path dokumen tidak valid');
    }

    if (!existsSync(absolut)) {
      throw new NotFoundException('File tidak ditemukan');
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
