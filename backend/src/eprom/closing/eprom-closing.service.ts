// ==================================================
// FILE: backend/src/eprom/closing/eprom-closing.service.ts
// FUNGSI: As Build Drawing, Komisioning, Serah Terima, Checklist Masa Pemeliharaan,
// BA Serah Terima (Project Area - Project Closing)
// Referensi: alur-workflow-tender-kontrak-project-area.md bagian 5.6
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { StatusApprovalEprom } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { EpromFileService } from '../common/eprom-file.service';
import { AktorEprom } from '../common/eprom-aktor';

export const TIPE_CLOSING = [
  'as-build-drawing',
  'komisioning',
  'serah-terima',
  'masa-pemeliharaan-checklist',
  'ba-serah-terima',
] as const;

export type TipeClosing = (typeof TIPE_CLOSING)[number];

const LABEL_TIPE: Record<TipeClosing, string> = {
  'as-build-drawing': 'As Build Drawing',
  komisioning: 'Komisioning',
  'serah-terima': 'Serah Terima',
  'masa-pemeliharaan-checklist': 'Checklist Masa Pemeliharaan',
  'ba-serah-terima': 'BA Serah Terima',
};

export class BuatClosingDto {
  @Type(() => Number)
  @IsInt()
  projectId: number;
}

export class ReviewClosingDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  komentar?: string;
}

@Injectable()
export class EpromClosingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: EpromAksesService,
    private readonly file: EpromFileService,
  ) {}

  validasiTipe(tipe: string): TipeClosing {
    if (!TIPE_CLOSING.includes(tipe as TipeClosing)) {
      throw new BadRequestException('Tipe Project Closing tidak valid');
    }

    return tipe as TipeClosing;
  }

  /**
   * Dispatcher generik ke salah satu dari 5 model Prisma yang bentuknya
   * seragam (id, projectId, fileUrl, status, komentar). Di-tipe `any`
   * dengan sengaja, sama seperti EpromEngineerService/EpromKonstruksiService.
   */
  private delegate(tipe: TipeClosing): any {
    switch (tipe) {
      case 'as-build-drawing':
        return this.prisma.asBuildDrawing;
      case 'komisioning':
        return this.prisma.komisioning;
      case 'serah-terima':
        return this.prisma.serahTerima;
      case 'masa-pemeliharaan-checklist':
        return this.prisma.masaPemeliharaanChecklist;
      case 'ba-serah-terima':
        return this.prisma.bASerahTerima;
    }
  }

  async daftar(aktor: AktorEprom, tipe: TipeClosing, projectId: number) {
    await this.akses.wajibAksesProject(aktor, projectId);

    return this.delegate(tipe).findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async buat(
    aktor: AktorEprom,
    tipe: TipeClosing,
    projectId: number,
    files: Express.Multer.File[] = [],
  ) {
    await this.akses.wajibAksesProject(aktor, projectId);

    if (files.length === 0) {
      return [await this.delegate(tipe).create({ data: { projectId, fileUrl: null } })];
    }

    const fileUrls: string[] = [];

    try {
      for (const file of files) {
        fileUrls.push(
          this.file.simpanDokumen(file, `project/${projectId}/closing/${tipe}`),
        );
      }

      return await this.prisma.$transaction(
        fileUrls.map((fileUrl) =>
          this.delegate(tipe).create({ data: { projectId, fileUrl } }),
        ),
      );
    } catch (error) {
      fileUrls.forEach((fileUrl) => this.file.hapus(fileUrl));
      throw error;
    }
  }

  async review(aktor: AktorEprom, tipe: TipeClosing, id: number, dto: ReviewClosingDto) {
    this.akses.wajibOwner(aktor);

    const item = await this.itemAtauThrow(tipe, id);

    if (item.status !== StatusApprovalEprom.PENDING) {
      throw new BadRequestException('Item ini sudah direview sebelumnya');
    }

    return this.delegate(tipe).update({
      where: { id },
      data: {
        status: dto.status as StatusApprovalEprom,
        komentar: dto.komentar?.trim() || null,
      },
    });
  }

  async hapus(aktor: AktorEprom, tipe: TipeClosing, id: number) {
    const item = await this.itemAtauThrow(tipe, id);

    await this.akses.wajibAksesProject(aktor, item.projectId);

    if (item.status !== StatusApprovalEprom.PENDING) {
      throw new BadRequestException('Item yang sudah direview tidak dapat dihapus');
    }

    await this.delegate(tipe).delete({ where: { id } });

    if (item.fileUrl) {
      this.file.hapus(item.fileUrl);
    }

    return { message: 'Item berhasil dihapus' };
  }

  async ringkasanPending(aktor: AktorEprom, projectId: number) {
    await this.akses.wajibAksesProject(aktor, projectId);

    const hasil: Record<TipeClosing, number> = {
      'as-build-drawing': 0,
      komisioning: 0,
      'serah-terima': 0,
      'masa-pemeliharaan-checklist': 0,
      'ba-serah-terima': 0,
    };

    await Promise.all(
      TIPE_CLOSING.map(async (tipe) => {
        hasil[tipe] = await this.delegate(tipe).count({
          where: { projectId, status: StatusApprovalEprom.PENDING },
        });
      }),
    );

    return hasil;
  }

  private async itemAtauThrow(tipe: TipeClosing, id: number) {
    const item = await this.delegate(tipe).findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException(`${LABEL_TIPE[tipe]} tidak ditemukan`);
    }

    return item;
  }
}
