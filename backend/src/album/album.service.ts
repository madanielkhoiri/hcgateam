// ==================================================
// FILE: backend/src/album/album.service.ts
// FUNGSI: Album Dokumentasi (foto kegiatan). Kelola: Admin/Admin HC/
// Admin Comben/Section Head. Lihat: seluruh akun ber-akses Administrasi.
// ==================================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AlbumFileService } from './album-file.service';
import { AktorPostingan, bolehKelolaPostingan } from '../postingan/postingan-aktor';

@Injectable()
export class AlbumService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly file: AlbumFileService,
  ) {}

  private wajibKelola(aktor: AktorPostingan): void {
    if (!bolehKelolaPostingan(aktor)) {
      throw new ForbiddenException(
        'Aksi ini hanya dapat dilakukan oleh Admin/Admin HC/Admin Comben/Section Head',
      );
    }
  }

  async daftar() {
    const album = await this.prisma.albumDokumentasi.findMany({
      include: {
        uploadedBy: { select: { id: true, name: true, nrp: true } },
        foto: { take: 1, orderBy: { createdAt: 'asc' } },
        _count: { select: { foto: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return album.map((item) => ({
      id: item.id,
      judul: item.judul,
      deskripsi: item.deskripsi,
      uploadedBy: item.uploadedBy,
      createdAt: item.createdAt,
      totalFoto: item._count.foto,
      sampul: item.foto[0]?.urlFoto ?? null,
    }));
  }

  async detail(id: number) {
    const album = await this.prisma.albumDokumentasi.findUnique({
      where: { id },
      include: {
        uploadedBy: { select: { id: true, name: true, nrp: true } },
        foto: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (!album) {
      throw new NotFoundException('Album tidak ditemukan');
    }

    return album;
  }

  async buat(aktor: AktorPostingan, judul: string, deskripsi?: string) {
    this.wajibKelola(aktor);

    if (!judul?.trim()) {
      throw new BadRequestException('Judul album wajib diisi');
    }

    return this.prisma.albumDokumentasi.create({
      data: {
        judul: judul.trim(),
        deskripsi: deskripsi?.trim() || null,
        uploadedById: aktor.id,
      },
    });
  }

  async tambahFoto(
    aktor: AktorPostingan,
    albumId: number,
    files: Express.Multer.File[],
  ) {
    this.wajibKelola(aktor);

    const album = await this.prisma.albumDokumentasi.findUnique({
      where: { id: albumId },
    });

    if (!album) {
      throw new NotFoundException('Album tidak ditemukan');
    }

    if (!files?.length) {
      throw new BadRequestException('Minimal 1 foto wajib diunggah');
    }

    const urlFotoList = files.map((file) => this.file.simpan(file));

    await this.prisma.albumFoto.createMany({
      data: urlFotoList.map((urlFoto) => ({ albumId, urlFoto })),
    });

    return this.detail(albumId);
  }

  async hapusAlbum(aktor: AktorPostingan, id: number) {
    this.wajibKelola(aktor);

    const album = await this.prisma.albumDokumentasi.findUnique({
      where: { id },
      include: { foto: true },
    });

    if (!album) {
      throw new NotFoundException('Album tidak ditemukan');
    }

    await this.prisma.albumDokumentasi.delete({ where: { id } });

    for (const foto of album.foto) {
      this.file.hapus(foto.urlFoto);
    }

    return { message: 'Album berhasil dihapus' };
  }

  async hapusFoto(aktor: AktorPostingan, fotoId: number) {
    this.wajibKelola(aktor);

    const foto = await this.prisma.albumFoto.findUnique({ where: { id: fotoId } });

    if (!foto) {
      throw new NotFoundException('Foto tidak ditemukan');
    }

    await this.prisma.albumFoto.delete({ where: { id: fotoId } });
    this.file.hapus(foto.urlFoto);

    return { message: 'Foto berhasil dihapus' };
  }
}
