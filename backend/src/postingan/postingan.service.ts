// ==================================================
// FILE: backend/src/postingan/postingan.service.ts
// FUNGSI: Poster/video informasi yang tampil di carousel beranda -
// kelola: Admin/Admin HC/Admin Comben/Section Head, lihat: seluruh akun.
// ==================================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { TipePostingan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PostinganFileService } from './postingan-file.service';
import { AktorPostingan, bolehKelolaPostingan } from './postingan-aktor';

const TIPE_VALID = Object.values(TipePostingan);

@Injectable()
export class PostinganService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly file: PostinganFileService,
  ) {}

  private wajibKelola(aktor: AktorPostingan): void {
    if (!bolehKelolaPostingan(aktor)) {
      throw new ForbiddenException(
        'Aksi ini hanya dapat dilakukan oleh Admin/Admin HC/Admin Comben/Section Head',
      );
    }
  }

  /** Seluruh postingan - dipakai halaman kelola di Administrasi. */
  async daftar() {
    return this.prisma.postingan.findMany({
      include: { uploadedBy: { select: { id: true, name: true, nrp: true } } },
      orderBy: [{ urutan: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /** Hanya yang ditandai tampil di beranda - dipakai carousel dashboard, semua akun. */
  async untukBeranda() {
    return this.prisma.postingan.findMany({
      where: { tampilBeranda: true },
      include: { uploadedBy: { select: { id: true, name: true, nrp: true } } },
      orderBy: [{ urutan: 'asc' }, { createdAt: 'desc' }],
    });
  }

  async unggah(
    aktor: AktorPostingan,
    judul: string,
    deskripsi: string | undefined,
    tipe: string,
    tampilBeranda: string | undefined,
    urutan: string | undefined,
    file: Express.Multer.File,
  ) {
    this.wajibKelola(aktor);

    if (!judul?.trim()) {
      throw new BadRequestException('Judul postingan wajib diisi');
    }

    if (!TIPE_VALID.includes(tipe as TipePostingan)) {
      throw new BadRequestException('Tipe postingan tidak valid');
    }

    const urlMedia =
      tipe === TipePostingan.VIDEO
        ? this.file.simpanVideo(file)
        : this.file.simpanPoster(file);

    return this.prisma.postingan.create({
      data: {
        judul: judul.trim(),
        deskripsi: deskripsi?.trim() || null,
        tipe: tipe as TipePostingan,
        urlMedia,
        tampilBeranda: tampilBeranda !== 'false',
        urutan: urutan ? Number(urutan) : 0,
        uploadedById: aktor.id,
      },
      include: { uploadedBy: { select: { id: true, name: true, nrp: true } } },
    });
  }

  async ubah(
    aktor: AktorPostingan,
    id: number,
    data: {
      judul?: string;
      deskripsi?: string;
      tampilBeranda?: boolean;
      urutan?: number;
    },
  ) {
    this.wajibKelola(aktor);

    const postingan = await this.prisma.postingan.findUnique({
      where: { id },
    });

    if (!postingan) {
      throw new NotFoundException('Postingan tidak ditemukan');
    }

    return this.prisma.postingan.update({
      where: { id },
      data: {
        ...(data.judul !== undefined ? { judul: data.judul.trim() } : {}),
        ...(data.deskripsi !== undefined
          ? { deskripsi: data.deskripsi.trim() || null }
          : {}),
        ...(data.tampilBeranda !== undefined
          ? { tampilBeranda: data.tampilBeranda }
          : {}),
        ...(data.urutan !== undefined ? { urutan: data.urutan } : {}),
      },
      include: { uploadedBy: { select: { id: true, name: true, nrp: true } } },
    });
  }

  async hapus(aktor: AktorPostingan, id: number) {
    this.wajibKelola(aktor);

    const postingan = await this.prisma.postingan.findUnique({
      where: { id },
    });

    if (!postingan) {
      throw new NotFoundException('Postingan tidak ditemukan');
    }

    await this.prisma.postingan.delete({ where: { id } });
    this.file.hapus(postingan.urlMedia);

    return { message: 'Postingan berhasil dihapus' };
  }
}
