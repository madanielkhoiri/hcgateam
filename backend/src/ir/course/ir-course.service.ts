// ==================================================
// FILE: backend/src/ir/course/ir-course.service.ts
// FUNGSI: Video IR Course - Admin/Admin HC/Section Head upload,
// akun lain menonton (status tontonan tercatat per akun).
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IrFileService } from '../common/ir-file.service';
import { AktorIr } from '../common/ir-aktor';

@Injectable()
export class IrCourseService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly file: IrFileService,
  ) {}

  async daftar(aktor: AktorIr) {
    const video = await this.prisma.irCourseVideo.findMany({
      include: {
        uploadedBy: { select: { id: true, name: true, nrp: true } },
        _count: { select: { tontonan: true } },
        tontonan: { where: { userId: aktor.id }, select: { ditontonPada: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return video.map((item) => ({
      id: item.id,
      judul: item.judul,
      deskripsi: item.deskripsi,
      urlVideo: item.urlVideo,
      uploadedBy: item.uploadedBy,
      createdAt: item.createdAt,
      totalDitonton: item._count.tontonan,
      sudahDitonton: item.tontonan.length > 0,
      ditontonPada: item.tontonan[0]?.ditontonPada ?? null,
    }));
  }

  async unggah(
    judul: string,
    deskripsi: string | undefined,
    file: Express.Multer.File,
    aktor: AktorIr,
  ) {
    if (!judul?.trim()) {
      throw new BadRequestException('Judul video wajib diisi');
    }

    const urlVideo = this.file.simpanVideo(file);

    return this.prisma.irCourseVideo.create({
      data: {
        judul: judul.trim(),
        deskripsi: deskripsi?.trim() || null,
        urlVideo,
        uploadedById: aktor.id,
      },
    });
  }

  async hapus(id: number) {
    const video = await this.prisma.irCourseVideo.findUnique({ where: { id } });

    if (!video) {
      throw new NotFoundException('Video tidak ditemukan');
    }

    await this.prisma.irCourseVideo.delete({ where: { id } });
    this.file.hapus(video.urlVideo);

    return { message: 'Video berhasil dihapus' };
  }

  async tandaiDitonton(videoId: number, aktor: AktorIr) {
    const video = await this.prisma.irCourseVideo.findUnique({
      where: { id: videoId },
    });

    if (!video) {
      throw new NotFoundException('Video tidak ditemukan');
    }

    return this.prisma.irCourseTontonan.upsert({
      where: { videoId_userId: { videoId, userId: aktor.id } },
      create: { videoId, userId: aktor.id },
      update: {},
    });
  }

  /** Daftar akun yang sudah menonton satu video - Admin/Admin HC/Section Head. */
  async daftarPenonton(videoId: number) {
    const video = await this.prisma.irCourseVideo.findUnique({
      where: { id: videoId },
      include: {
        tontonan: {
          include: { user: { select: { id: true, name: true, nrp: true } } },
          orderBy: { ditontonPada: 'desc' },
        },
      },
    });

    if (!video) {
      throw new NotFoundException('Video tidak ditemukan');
    }

    return video;
  }
}
