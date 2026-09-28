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
        quiz: { orderBy: { urutan: 'asc' }, select: { id: true, pertanyaan: true, pilihan: true, urutan: true } },
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
      quiz: item.quiz,
    }));
  }

  async unggah(
    judul: string,
    deskripsi: string | undefined,
    file: Express.Multer.File,
    aktor: AktorIr,
    quiz: unknown,
  ) {
    if (!judul?.trim()) {
      throw new BadRequestException('Judul video wajib diisi');
    }

    const urlVideo = this.file.simpanVideo(file);
    const pertanyaan = this.validasiQuiz(quiz);

    return this.prisma.irCourseVideo.create({
      data: {
        judul: judul.trim(),
        deskripsi: deskripsi?.trim() || null,
        urlVideo,
        uploadedById: aktor.id,
        quiz: { create: pertanyaan.map((item, index) => ({ ...item, urutan: index + 1 })) },
      },
    });
  }

  async jawabQuiz(videoId: number, aktor: AktorIr, jawaban: unknown) {
    const video = await this.prisma.irCourseVideo.findUnique({
      where: { id: videoId }, include: { quiz: { orderBy: { urutan: 'asc' } } },
    });
    if (!video) throw new NotFoundException('Video tidak ditemukan');
    if (video.quiz.length === 0) throw new BadRequestException('Video ini belum memiliki quiz');
    const tontonan = await this.prisma.irCourseTontonan.findUnique({ where: { videoId_userId: { videoId, userId: aktor.id } } });
    if (!tontonan) throw new BadRequestException('Video harus ditonton sampai selesai terlebih dahulu');
    const daftar = Array.isArray(jawaban) ? jawaban : [];
    if (daftar.length !== video.quiz.length) throw new BadRequestException('Semua pertanyaan quiz wajib dijawab');
    const hasil = video.quiz.map((quiz, index) => {
      const pilihan = Number((daftar[index] as { pilihan?: unknown })?.pilihan);
      if (!Number.isInteger(pilihan) || pilihan < 0 || pilihan >= (quiz.pilihan as unknown[]).length) throw new BadRequestException('Pilihan jawaban tidak valid');
      return { quizId: quiz.id, userId: aktor.id, pilihan, benar: pilihan === quiz.jawabanBenar };
    });
    await this.prisma.$transaction(hasil.map((item) => this.prisma.irCourseQuizJawaban.upsert({ where: { quizId_userId: { quizId: item.quizId, userId: item.userId } }, create: item, update: { pilihan: item.pilihan, benar: item.benar, dijawabPada: new Date() } })));
    return { lulus: hasil.every((item) => item.benar), benar: hasil.filter((item) => item.benar).length, total: hasil.length };
  }

  private validasiQuiz(value: unknown): { pertanyaan: string; pilihan: string[]; jawabanBenar: number }[] {
    if (!Array.isArray(value) || value.length === 0) throw new BadRequestException('Minimal 1 pertanyaan quiz wajib dibuat');
    return value.map((item) => {
      const data = item as { pertanyaan?: unknown; pilihan?: unknown; jawabanBenar?: unknown };
      const pilihan = Array.isArray(data.pilihan) ? data.pilihan.map(String).filter(Boolean) : [];
      const jawabanBenar = Number(data.jawabanBenar);
      if (typeof data.pertanyaan !== 'string' || !data.pertanyaan.trim() || pilihan.length < 2 || !Number.isInteger(jawabanBenar) || jawabanBenar < 0 || jawabanBenar >= pilihan.length) throw new BadRequestException('Quiz harus memiliki pertanyaan, minimal 2 pilihan, dan kunci jawaban yang valid');
      return { pertanyaan: data.pertanyaan.trim(), pilihan, jawabanBenar };
    });
  }

  /** Ubah metadata video (judul/deskripsi); file video tidak diganti. */
  async ubah(id: number, data: { judul?: string; deskripsi?: string }) {
    const video = await this.prisma.irCourseVideo.findUnique({ where: { id } });

    if (!video) {
      throw new NotFoundException('Video tidak ditemukan');
    }

    const perubahan: { judul?: string; deskripsi?: string | null } = {};

    if (data.judul !== undefined) {
      if (!data.judul?.trim()) {
        throw new BadRequestException('Judul video wajib diisi');
      }
      perubahan.judul = data.judul.trim();
    }

    if (data.deskripsi !== undefined) {
      perubahan.deskripsi = data.deskripsi?.trim() || null;
    }

    return this.prisma.irCourseVideo.update({ where: { id }, data: perubahan });
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
