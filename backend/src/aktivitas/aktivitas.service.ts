// ==================================================
// FILE: backend/src/aktivitas/aktivitas.service.ts
// FUNGSI: Rekap aktivitas upload terbaru lintas modul (Postingan,
// Dokumen IR, IR Course) untuk panel "Aktivitas Terbaru" di beranda.
// Khusus Admin/Admin HC/Admin Comben/Section Head.
// ==================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type JenisAktivitas =
  | 'POSTINGAN_POSTER'
  | 'POSTINGAN_VIDEO'
  | 'DOKUMEN_IR'
  | 'IR_COURSE';

@Injectable()
export class AktivitasService {
  constructor(private readonly prisma: PrismaService) {}

  async terbaru(limit = 8) {
    const pilihUploader = {
      select: { id: true, name: true, nrp: true },
    } as const;

    const [postingan, dokumen, video] = await Promise.all([
      this.prisma.postingan.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { uploadedBy: pilihUploader },
      }),
      this.prisma.dokumenIr.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { uploadedBy: pilihUploader },
      }),
      this.prisma.irCourseVideo.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { uploadedBy: pilihUploader },
      }),
    ]);

    const gabungan = [
      ...postingan.map((item) => ({
        judul: item.judul,
        jenis: (item.tipe === 'VIDEO'
          ? 'POSTINGAN_VIDEO'
          : 'POSTINGAN_POSTER') as JenisAktivitas,
        uploadedBy: item.uploadedBy,
        createdAt: item.createdAt,
      })),
      ...dokumen.map((item) => ({
        judul: item.judul,
        jenis: 'DOKUMEN_IR' as JenisAktivitas,
        uploadedBy: item.uploadedBy,
        createdAt: item.createdAt,
      })),
      ...video.map((item) => ({
        judul: item.judul,
        jenis: 'IR_COURSE' as JenisAktivitas,
        uploadedBy: item.uploadedBy,
        createdAt: item.createdAt,
      })),
    ];

    return gabungan
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}
