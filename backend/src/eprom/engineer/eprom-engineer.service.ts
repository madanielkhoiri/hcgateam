// ==================================================
// FILE: backend/src/eprom/engineer/eprom-engineer.service.ts
// FUNGSI: Shop Drawing, Material Approval, Metode Pekerjaan,
// Sertifikasi Pekerjaan, dan Daftar Peralatan (Project Area - Engineer)
// Referensi: alur-workflow-tender-kontrak-project-area.md bagian 5.1
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional, IsString } from 'class-validator';
import { StatusApprovalEprom } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { EpromFileService } from '../common/eprom-file.service';
import { AktorEprom } from '../common/eprom-aktor';

export const TIPE_ENGINEER = [
  'shop-drawing',
  'material-approval',
  'metode-pekerjaan',
  'sertifikasi-pekerjaan',
  'peralatan-list',
] as const;

export type TipeEngineer = (typeof TIPE_ENGINEER)[number];

/** Field "nama" masing-masing tipe (null bila tipe itu tidak punya field nama). */
const FIELD_NAMA: Record<TipeEngineer, string | null> = {
  'shop-drawing': 'namaPekerjaan',
  'material-approval': 'namaMaterial',
  'metode-pekerjaan': 'namaMetode',
  'sertifikasi-pekerjaan': null,
  'peralatan-list': null,
};

const LABEL_TIPE: Record<TipeEngineer, string> = {
  'shop-drawing': 'Shop Drawing',
  'material-approval': 'Material Approval',
  'metode-pekerjaan': 'Metode Pekerjaan',
  'sertifikasi-pekerjaan': 'Sertifikasi Pekerjaan',
  'peralatan-list': 'Daftar Peralatan',
};

export class BuatEngineerDto {
  @Type(() => Number)
  @IsInt()
  projectId: number;

  @IsOptional()
  @IsString()
  nama?: string;
}

export class ReviewEngineerDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  komentar?: string;
}

@Injectable()
export class EpromEngineerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: EpromAksesService,
    private readonly file: EpromFileService,
  ) {}

  validasiTipe(tipe: string): TipeEngineer {
    if (!TIPE_ENGINEER.includes(tipe as TipeEngineer)) {
      throw new BadRequestException('Tipe Engineer tidak valid');
    }

    return tipe as TipeEngineer;
  }

  /**
   * Dispatcher generik ke salah satu dari 5 model Prisma yang bentuknya
   * seragam (id, projectId, fileUrl, status, komentar, + field nama opsional).
   * Di-tipe `any` dengan sengaja — TS tidak bisa menyatukan signature
   * findMany/create/update/delete dari 5 delegate model yang berbeda.
   */
  private delegate(tipe: TipeEngineer): any {
    switch (tipe) {
      case 'shop-drawing':
        return this.prisma.shopDrawing;
      case 'material-approval':
        return this.prisma.materialApproval;
      case 'metode-pekerjaan':
        return this.prisma.metodePekerjaan;
      case 'sertifikasi-pekerjaan':
        return this.prisma.sertifikasiPekerjaan;
      case 'peralatan-list':
        return this.prisma.peralatanList;
    }
  }

  async daftar(aktor: AktorEprom, tipe: TipeEngineer, projectId: number) {
    await this.akses.wajibAksesProject(aktor, projectId);

    return this.delegate(tipe).findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async buat(
    aktor: AktorEprom,
    tipe: TipeEngineer,
    projectId: number,
    dto: BuatEngineerDto,
    file?: Express.Multer.File,
  ) {
    await this.akses.wajibAksesProject(aktor, projectId);

    const namaField = FIELD_NAMA[tipe];

    if (namaField && !dto.nama?.trim()) {
      throw new BadRequestException(`Nama wajib diisi untuk ${LABEL_TIPE[tipe]}`);
    }

    const fileUrl = file
      ? this.file.simpanDokumen(file, `project/${projectId}/engineer/${tipe}`)
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
  async review(aktor: AktorEprom, tipe: TipeEngineer, id: number, dto: ReviewEngineerDto) {
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
  async hapus(aktor: AktorEprom, tipe: TipeEngineer, id: number) {
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

    const hasil: Record<TipeEngineer, number> = {
      'shop-drawing': 0,
      'material-approval': 0,
      'metode-pekerjaan': 0,
      'sertifikasi-pekerjaan': 0,
      'peralatan-list': 0,
    };

    await Promise.all(
      TIPE_ENGINEER.map(async (tipe) => {
        hasil[tipe] = await this.delegate(tipe).count({
          where: { projectId, status: StatusApprovalEprom.PENDING },
        });
      }),
    );

    return hasil;
  }

  private async itemAtauThrow(tipe: TipeEngineer, id: number) {
    const item = await this.delegate(tipe).findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException(`${LABEL_TIPE[tipe]} tidak ditemukan`);
    }

    return item;
  }
}
