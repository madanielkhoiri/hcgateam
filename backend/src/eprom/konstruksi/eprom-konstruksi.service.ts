// ==================================================
// FILE: backend/src/eprom/konstruksi/eprom-konstruksi.service.ts
// FUNGSI: Checklist Tahapan Pekerjaan, IBPR, JSA (Project Area - Konstruksi,
// sub-modul yang memakai approve/reject + badge notifikasi merah)
// Referensi: alur-workflow-tender-kontrak-project-area.md bagian 5.2.1, 5.2.9, 5.2.10
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { StatusApprovalEprom } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { EpromFileService } from '../common/eprom-file.service';
import { AktorEprom } from '../common/eprom-aktor';

export const TIPE_KONSTRUKSI = ['checklist-tahapan', 'ibpr', 'jsa'] as const;

export type TipeKonstruksi = (typeof TIPE_KONSTRUKSI)[number];

/** Field "nama" masing-masing tipe (null bila tipe itu tidak punya field nama). */
const FIELD_NAMA: Record<TipeKonstruksi, string | null> = {
  'checklist-tahapan': 'namaTahap',
  ibpr: null,
  jsa: 'namaPekerjaan',
};

const LABEL_TIPE: Record<TipeKonstruksi, string> = {
  'checklist-tahapan': 'Checklist Tahapan Pekerjaan',
  ibpr: 'IBPR',
  jsa: 'JSA',
};

export class BuatKonstruksiDto {
  @Type(() => Number)
  @IsInt()
  projectId: number;

  @IsOptional()
  @IsString()
  nama?: string;
}

export class ReviewKonstruksiDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  komentar?: string;
}

@Injectable()
export class EpromKonstruksiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: EpromAksesService,
    private readonly file: EpromFileService,
  ) {}

  validasiTipe(tipe: string): TipeKonstruksi {
    if (!TIPE_KONSTRUKSI.includes(tipe as TipeKonstruksi)) {
      throw new BadRequestException('Tipe Konstruksi tidak valid');
    }

    return tipe as TipeKonstruksi;
  }

  /**
   * Dispatcher generik ke salah satu dari 3 model Prisma yang bentuknya
   * seragam (id, projectId, fileUrl, status, komentar, + field nama opsional).
   * Di-tipe `any` dengan sengaja — TS tidak bisa menyatukan signature
   * findMany/create/update/delete dari 3 delegate model yang berbeda.
   */
  private delegate(tipe: TipeKonstruksi): any {
    switch (tipe) {
      case 'checklist-tahapan':
        return this.prisma.checklistKonstruksi;
      case 'ibpr':
        return this.prisma.iBPR;
      case 'jsa':
        return this.prisma.jSA;
    }
  }

  async daftar(aktor: AktorEprom, tipe: TipeKonstruksi, projectId: number) {
    await this.akses.wajibAksesProject(aktor, projectId);

    return this.delegate(tipe).findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async buat(
    aktor: AktorEprom,
    tipe: TipeKonstruksi,
    projectId: number,
    dto: BuatKonstruksiDto,
    file?: Express.Multer.File,
  ) {
    await this.akses.wajibAksesProject(aktor, projectId);

    const namaField = FIELD_NAMA[tipe];

    if (namaField && !dto.nama?.trim()) {
      throw new BadRequestException(`Nama wajib diisi untuk ${LABEL_TIPE[tipe]}`);
    }

    const fileUrl = file
      ? this.file.simpanDokumen(file, `project/${projectId}/konstruksi/${tipe}`)
      : null;

    return this.delegate(tipe).create({
      data: {
        projectId,
        fileUrl,
        ...(namaField ? { [namaField]: dto.nama!.trim() } : {}),
      },
    });
  }

  /** Owner meninjau (approve/reject) — item PENDING dianggap final setelahnya (bagian 3.1). */
  async review(aktor: AktorEprom, tipe: TipeKonstruksi, id: number, dto: ReviewKonstruksiDto) {
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

  /** Hapus item yang masih PENDING (salah unggah) — Owner atau Vendor pemilik project. */
  async hapus(aktor: AktorEprom, tipe: TipeKonstruksi, id: number) {
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

  /** Ringkasan jumlah PENDING per tipe untuk badge notifikasi (bagian 3.2). */
  async ringkasanPending(aktor: AktorEprom, projectId: number) {
    await this.akses.wajibAksesProject(aktor, projectId);

    const hasil: Record<TipeKonstruksi, number> = {
      'checklist-tahapan': 0,
      ibpr: 0,
      jsa: 0,
    };

    await Promise.all(
      TIPE_KONSTRUKSI.map(async (tipe) => {
        hasil[tipe] = await this.delegate(tipe).count({
          where: { projectId, status: StatusApprovalEprom.PENDING },
        });
      }),
    );

    return hasil;
  }

  private async itemAtauThrow(tipe: TipeKonstruksi, id: number) {
    const item = await this.delegate(tipe).findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException(`${LABEL_TIPE[tipe]} tidak ditemukan`);
    }

    return item;
  }
}
