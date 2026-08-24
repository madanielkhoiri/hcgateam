// ==================================================
// FILE: backend/src/eprom/sosialisasi-jsa/eprom-sosialisasi-jsa.service.ts
// FUNGSI: Sosialisasi JSA — 1 slot otomatis per entri JSA, replace-only, tanpa approve/reject
// Referensi: alur-workflow-tender-kontrak-project-area.md bagian 3.5, 5.2.11
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { EpromFileService } from '../common/eprom-file.service';
import { AktorEprom } from '../common/eprom-aktor';

@Injectable()
export class EpromSosialisasiJsaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: EpromAksesService,
    private readonly file: EpromFileService,
  ) {}

  /** Satu baris per JSA (slot otomatis mengikuti jumlah JSA), sosialisasi null kalau belum diunggah. */
  async daftar(aktor: AktorEprom, projectId: number) {
    await this.akses.wajibAksesProject(aktor, projectId);

    return this.prisma.jSA.findMany({
      where: { projectId },
      include: { sosialisasi: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async unggah(aktor: AktorEprom, jsaId: number, file?: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File wajib diunggah');
    }

    const jsa = await this.prisma.jSA.findUnique({
      where: { id: jsaId },
      include: { sosialisasi: true },
    });

    if (!jsa) {
      throw new NotFoundException('JSA tidak ditemukan');
    }

    await this.akses.wajibAksesProject(aktor, jsa.projectId);

    const fileUrlLama = jsa.sosialisasi?.fileUrl ?? null;
    const fileUrlBaru = this.file.simpanDokumen(file, `project/${jsa.projectId}/sosialisasi-jsa`);

    const hasil = await this.prisma.sosialisasiJSA.upsert({
      where: { jsaId },
      create: { jsaId, fileUrl: fileUrlBaru, tanggal: new Date() },
      update: { fileUrl: fileUrlBaru, tanggal: new Date() },
    });

    if (fileUrlLama) {
      this.file.hapus(fileUrlLama);
    }

    return hasil;
  }
}
