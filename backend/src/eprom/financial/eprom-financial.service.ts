// ==================================================
// FILE: backend/src/eprom/financial/eprom-financial.service.ts
// FUNGSI: Opname Pekerjaan (Project Area - Financial & Monitoring)
// Referensi: alur-workflow-tender-kontrak-project-area.md bagian 5.5.1
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { StatusApprovalEprom } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { EpromFileService } from '../common/eprom-file.service';
import { AktorEprom } from '../common/eprom-aktor';

export class BuatOpnameDto {
  @Type(() => Number)
  @IsInt()
  projectId: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPersen: number;
}

export class ReviewOpnameDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';

  @IsOptional()
  @IsString()
  komentar?: string;
}

@Injectable()
export class EpromFinancialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: EpromAksesService,
    private readonly file: EpromFileService,
  ) {}

  async daftar(aktor: AktorEprom, projectId: number) {
    await this.akses.wajibAksesProject(aktor, projectId);

    return this.prisma.opnamePekerjaan.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async buat(aktor: AktorEprom, dto: BuatOpnameDto, file?: Express.Multer.File) {
    await this.akses.wajibAksesProject(aktor, dto.projectId);

    const fileUrl = file
      ? this.file.simpanDokumen(file, `project/${dto.projectId}/financial/opname`)
      : null;

    return this.prisma.opnamePekerjaan.create({
      data: {
        projectId: dto.projectId,
        progressPersen: dto.progressPersen,
        fileUrl,
      },
    });
  }

  async review(aktor: AktorEprom, id: number, dto: ReviewOpnameDto) {
    this.akses.wajibOwner(aktor);

    const item = await this.itemAtauThrow(id);

    if (item.status !== StatusApprovalEprom.PENDING) {
      throw new BadRequestException('Item ini sudah direview sebelumnya');
    }

    return this.prisma.opnamePekerjaan.update({
      where: { id },
      data: {
        status: dto.status as StatusApprovalEprom,
        komentar: dto.komentar?.trim() || null,
      },
    });
  }

  async hapus(aktor: AktorEprom, id: number) {
    const item = await this.itemAtauThrow(id);

    await this.akses.wajibAksesProject(aktor, item.projectId);

    if (item.status !== StatusApprovalEprom.PENDING) {
      throw new BadRequestException('Item yang sudah direview tidak dapat dihapus');
    }

    await this.prisma.opnamePekerjaan.delete({ where: { id } });

    if (item.fileUrl) {
      this.file.hapus(item.fileUrl);
    }

    return { message: 'Item berhasil dihapus' };
  }

  async ringkasanPending(aktor: AktorEprom, projectId: number) {
    await this.akses.wajibAksesProject(aktor, projectId);

    const jumlah = await this.prisma.opnamePekerjaan.count({
      where: { projectId, status: StatusApprovalEprom.PENDING },
    });

    return { 'opname-pekerjaan': jumlah };
  }

  private async itemAtauThrow(id: number) {
    const item = await this.prisma.opnamePekerjaan.findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException('Opname Pekerjaan tidak ditemukan');
    }

    return item;
  }
}
