// ==================================================
// FILE: backend/src/eprom/dokumen/eprom-dokumen.service.ts
// FUNGSI: Surat Teguran, Surat Peringatan, Coaching & Counseling, Memo
// (Project Area - Dokumen, arsip administratif tanpa approve/reject)
// Referensi: alur-workflow-tender-kontrak-project-area.md bagian 5.4
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsDateString, IsIn } from 'class-validator';
import { TipeDokumenSurat } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { EpromFileService } from '../common/eprom-file.service';
import { AktorEprom } from '../common/eprom-aktor';

const TIPE_DOKUMEN_SURAT: TipeDokumenSurat[] = [
  'SURAT_TEGURAN',
  'SURAT_PERINGATAN',
  'COACHING_COUNSELING',
  'MEMO',
];

export class BuatDokumenSuratDto {
  @Type(() => Number)
  projectId: number;

  @IsIn(TIPE_DOKUMEN_SURAT)
  tipe: TipeDokumenSurat;

  @IsDateString()
  tanggal: string;
}

@Injectable()
export class EpromDokumenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: EpromAksesService,
    private readonly file: EpromFileService,
  ) {}

  validasiTipe(tipe: string): TipeDokumenSurat {
    if (!TIPE_DOKUMEN_SURAT.includes(tipe as TipeDokumenSurat)) {
      throw new BadRequestException('Tipe Dokumen tidak valid');
    }

    return tipe as TipeDokumenSurat;
  }

  async daftar(aktor: AktorEprom, projectId: number, tipe: TipeDokumenSurat) {
    await this.akses.wajibAksesProject(aktor, projectId);

    return this.prisma.dokumenSurat.findMany({
      where: { projectId, tipe },
      orderBy: { tanggal: 'desc' },
    });
  }

  async buat(aktor: AktorEprom, dto: BuatDokumenSuratDto, file?: Express.Multer.File) {
    await this.akses.wajibAksesProject(aktor, dto.projectId);

    const fileUrl = file
      ? this.file.simpanDokumen(file, `project/${dto.projectId}/dokumen/${dto.tipe.toLowerCase()}`)
      : null;

    return this.prisma.dokumenSurat.create({
      data: {
        projectId: dto.projectId,
        tipe: dto.tipe,
        fileUrl,
        tanggal: new Date(dto.tanggal),
      },
    });
  }

  async hapus(aktor: AktorEprom, id: number) {
    const item = await this.prisma.dokumenSurat.findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException('Dokumen tidak ditemukan');
    }

    await this.akses.wajibAksesProject(aktor, item.projectId);
    await this.prisma.dokumenSurat.delete({ where: { id } });

    if (item.fileUrl) {
      this.file.hapus(item.fileUrl);
    }

    return { message: 'Dokumen berhasil dihapus' };
  }
}
