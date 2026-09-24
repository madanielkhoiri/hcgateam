// ==================================================
// FILE: backend/src/ir/dokumen/ir-dokumen.service.ts
// FUNGSI: Master dokumen IR (SK/IM/FORM) - kelola: Admin/Admin HC/Section Head,
// lihat & unduh: seluruh akun yang punya akses Portal IR.
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { KategoriDokumenIr } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IrFileService } from '../common/ir-file.service';
import { AktorIr } from '../common/ir-aktor';

const KATEGORI_VALID = Object.values(KategoriDokumenIr);

@Injectable()
export class IrDokumenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly file: IrFileService,
  ) {}

  async daftar(kategori?: string) {
    const kategoriValid =
      kategori && KATEGORI_VALID.includes(kategori as KategoriDokumenIr)
        ? (kategori as KategoriDokumenIr)
        : undefined;

    return this.prisma.dokumenIr.findMany({
      where: kategoriValid ? { kategori: kategoriValid } : undefined,
      include: { uploadedBy: { select: { id: true, name: true, nrp: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async unggah(
    kategori: string,
    judul: string,
    file: Express.Multer.File,
    aktor: AktorIr,
  ) {
    if (!KATEGORI_VALID.includes(kategori as KategoriDokumenIr)) {
      throw new BadRequestException('Kategori dokumen tidak valid');
    }

    if (!judul?.trim()) {
      throw new BadRequestException('Judul dokumen wajib diisi');
    }

    const urlFile = this.file.simpanDokumen(file);

    return this.prisma.dokumenIr.create({
      data: {
        kategori: kategori as KategoriDokumenIr,
        judul: judul.trim(),
        namaFile: file.originalname,
        urlFile,
        uploadedById: aktor.id,
      },
      include: { uploadedBy: { select: { id: true, name: true, nrp: true } } },
    });
  }

  /** Ubah metadata dokumen (judul/kategori); file tidak diganti. */
  async ubah(id: number, data: { judul?: string; kategori?: string }) {
    const dokumen = await this.prisma.dokumenIr.findUnique({ where: { id } });

    if (!dokumen) {
      throw new NotFoundException('Dokumen tidak ditemukan');
    }

    const perubahan: { judul?: string; kategori?: KategoriDokumenIr } = {};

    if (data.judul !== undefined) {
      if (!data.judul?.trim()) {
        throw new BadRequestException('Judul dokumen wajib diisi');
      }
      perubahan.judul = data.judul.trim();
    }

    if (data.kategori !== undefined) {
      if (!KATEGORI_VALID.includes(data.kategori as KategoriDokumenIr)) {
        throw new BadRequestException('Kategori dokumen tidak valid');
      }
      perubahan.kategori = data.kategori as KategoriDokumenIr;
    }

    return this.prisma.dokumenIr.update({
      where: { id },
      data: perubahan,
      include: { uploadedBy: { select: { id: true, name: true, nrp: true } } },
    });
  }

  async hapus(id: number) {
    const dokumen = await this.prisma.dokumenIr.findUnique({ where: { id } });

    if (!dokumen) {
      throw new NotFoundException('Dokumen tidak ditemukan');
    }

    await this.prisma.dokumenIr.delete({ where: { id } });
    this.file.hapus(dokumen.urlFile);

    return { message: 'Dokumen berhasil dihapus' };
  }
}
