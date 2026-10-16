// ==================================================
// FILE: backend/src/eprom/financial/eprom-financial.service.ts
// FUNGSI: Opname Pekerjaan (Project Area - Financial & Monitoring)
// Referensi: alur-workflow-tender-kontrak-project-area.md bagian 5.5.1
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsArray, IsIn, IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { EngineerDocumentType, StatusApprovalEprom } from '@prisma/client';
import { basename, extname } from 'node:path';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { EpromFileService } from '../common/eprom-file.service';
import { AktorEprom } from '../common/eprom-aktor';
import { ApproveEngineerDto } from '../engineer/eprom-engineer.service';
import { EpromEngineerSigningService } from '../engineer/eprom-engineer-signing.service';

export class BuatOpnameDto {
  @Type(() => Number)
  @IsInt()
  projectId: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  progressPersen: number;

  @Type(() => Number)
  @IsOptional()
  @IsInt()
  revisiDariId?: number;
}

export class UbahOpnameDto {
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

  @IsOptional() @IsArray() annotations?: unknown[];
  @IsOptional() @IsArray() textAnnotations?: unknown[];
}

@Injectable()
export class EpromFinancialService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: EpromAksesService,
    private readonly file: EpromFileService,
    private readonly signing: EpromEngineerSigningService,
  ) {}

  async daftar(aktor: AktorEprom, projectId: number) {
    await this.akses.wajibAksesProject(aktor, projectId);

    const items = await this.prisma.opnamePekerjaan.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });
    return this.denganApproval(items);
  }

  async buat(aktor: AktorEprom, dto: BuatOpnameDto, file?: Express.Multer.File) {
    await this.akses.wajibAksesProject(aktor, dto.projectId);

    let revisionRootId: number | null = null;
    if (dto.revisiDariId) {
      if (!file) throw new BadRequestException('File revisi wajib diunggah');
      const sumber = await this.itemAtauThrow(dto.revisiDariId);
      if (sumber.projectId !== dto.projectId) {
        throw new BadRequestException('Dokumen revisi tidak termasuk dalam project ini');
      }
      if (sumber.status !== StatusApprovalEprom.REJECTED) {
        throw new BadRequestException('Hanya Opname yang ditolak yang dapat direvisi');
      }
      revisionRootId = sumber.revisionRootId ?? sumber.id;
    }

    const fileUrl = file
      ? this.file.simpanDokumen(file, `project/${dto.projectId}/financial/opname`)
      : null;

    return this.prisma.opnamePekerjaan.create({
      data: {
        projectId: dto.projectId,
        progressPersen: dto.progressPersen,
        fileUrl,
        ...(revisionRootId ? { revisionRootId } : {}),
      },
    });
  }

  async review(aktor: AktorEprom, id: number, dto: ReviewOpnameDto) {
    this.akses.wajibOwner(aktor);

    const item = await this.itemAtauThrow(id);

    if (item.status !== StatusApprovalEprom.PENDING) {
      throw new BadRequestException('Item ini sudah direview sebelumnya');
    }

    let reviewedFilePath: string | undefined;
    if (
      dto.status === 'REJECTED' &&
      item.fileUrl?.toLowerCase().endsWith('.pdf') &&
      (dto.annotations?.length || dto.textAnnotations?.length)
    ) {
      reviewedFilePath = await this.signing.buatPdfReview(
        item.fileUrl,
        (dto.annotations ?? []) as any,
        (dto.textAnnotations ?? []) as any,
        `project/${item.projectId}/financial/opname`,
      );
    }

    return this.prisma.opnamePekerjaan.update({
      where: { id },
      data: {
        status: dto.status as StatusApprovalEprom,
        komentar: dto.komentar?.trim() || null,
        ...(reviewedFilePath ? { fileUrl: reviewedFilePath } : {}),
      },
    });
  }

  daftarTandaTangan(aktor: AktorEprom) {
    this.akses.wajibOwner(aktor);
    return this.signing.daftarTandaTangan();
  }

  async detailApproval(aktor: AktorEprom, id: number) {
    this.akses.wajibOwner(aktor);
    const item = await this.itemAtauThrow(id);
    const project = await this.prisma.project.findUnique({
      where: { id: item.projectId },
      include: { kontrak: { include: { vendor: true, tender: true } } },
    });
    if (!project) throw new NotFoundException('Project tidak ditemukan');
    const [itemLengkap] = await this.denganApproval([item]);
    return {
      item: itemLengkap,
      project,
      documentType: EngineerDocumentType.OPNAME_PEKERJAAN,
      documentLabel: 'Opname Pekerjaan',
      canSign: Boolean(item.fileUrl && extname(item.fileUrl).toLowerCase() === '.pdf'),
    };
  }

  async approveDenganTandaTangan(aktor: AktorEprom, id: number, dto: ApproveEngineerDto) {
    this.akses.wajibOwner(aktor);
    const item = await this.itemAtauThrow(id);
    if (!item.fileUrl || extname(item.fileUrl).toLowerCase() !== '.pdf') {
      throw new BadRequestException('Tanda tangan hanya dapat ditempatkan pada dokumen PDF.');
    }
    const documentType = EngineerDocumentType.OPNAME_PEKERJAAN;
    const approvalTerakhir = await this.prisma.engineerDocumentApproval.findFirst({
      where: { documentType, documentId: id },
      orderBy: { approvedAt: 'desc' },
    });
    const sourceFilePath = approvalTerakhir?.sourceFilePath ?? item.fileUrl;
    const tanggalApproval = new Date();
    const signedFilePath = await this.signing.buatPdfSigned(
      sourceFilePath,
      dto.placements,
      `project/${item.projectId}/financial/opname`,
      tanggalApproval,
      dto.annotations ?? [],
      dto.textAnnotations ?? [],
      await this.nomorRevisi(item),
    );
    const pertama = dto.placements[0];
    const placements = dto.placements.map((p) => ({ ...p, signatureFile: basename(p.signatureFile) }));
    try {
      const hasil = await this.prisma.$transaction(async (tx) => {
        const dataApproval = {
          documentId: id,
          documentType,
          projectId: item.projectId,
          approvedById: aktor.id,
          approvedAt: tanggalApproval,
          adaTandaTangan: true,
          signatureFile: basename(pertama.signatureFile),
          signaturePage: pertama.signaturePage,
          signatureXRatio: pertama.signatureXRatio,
          signatureYRatio: pertama.signatureYRatio,
          signatureWidthRatio: pertama.signatureWidthRatio,
          signatureHeightRatio: pertama.signatureHeightRatio,
          signaturePlacements: placements,
          originalFilePath: item.fileUrl!,
          sourceFilePath,
          signedFilePath,
        };
        const approval = approvalTerakhir
          ? await tx.engineerDocumentApproval.update({ where: { id: approvalTerakhir.id }, data: dataApproval, include: { approvedBy: { select: { id: true, name: true } } } })
          : await tx.engineerDocumentApproval.create({ data: dataApproval, include: { approvedBy: { select: { id: true, name: true } } } });
        const updated = await tx.opnamePekerjaan.update({ where: { id }, data: { status: StatusApprovalEprom.APPROVED, komentar: null } });
        return { approval, updated };
      });
      if (approvalTerakhir?.adaTandaTangan && approvalTerakhir.signedFilePath !== signedFilePath && approvalTerakhir.signedFilePath !== item.fileUrl) {
        this.file.hapus(approvalTerakhir.signedFilePath);
      }
      return { ...hasil.updated, effectiveFileUrl: hasil.approval.signedFilePath, latestApproval: hasil.approval };
    } catch (error) {
      this.file.hapus(signedFilePath);
      throw error;
    }
  }

  async approveTanpaTandaTangan(aktor: AktorEprom, id: number) {
    this.akses.wajibOwner(aktor);
    const item = await this.itemAtauThrow(id);
    if (!item.fileUrl) throw new BadRequestException('Dokumen belum diunggah');
    const approval = await this.prisma.engineerDocumentApproval.create({
      data: {
        documentId: id,
        documentType: EngineerDocumentType.OPNAME_PEKERJAAN,
        projectId: item.projectId,
        approvedById: aktor.id,
        adaTandaTangan: false,
        originalFilePath: item.fileUrl,
        sourceFilePath: item.fileUrl,
        signedFilePath: item.fileUrl,
      },
      include: { approvedBy: { select: { id: true, name: true } } },
    });
    const updated = await this.prisma.opnamePekerjaan.update({ where: { id }, data: { status: StatusApprovalEprom.APPROVED, komentar: null } });
    return { ...updated, effectiveFileUrl: approval.signedFilePath, latestApproval: approval };
  }

  /** Ubah persentase progress opname yang masih PENDING. File tidak diganti. */
  async ubah(aktor: AktorEprom, id: number, dto: UbahOpnameDto) {
    const item = await this.itemAtauThrow(id);

    await this.akses.wajibAksesProject(aktor, item.projectId);

    if (item.status !== StatusApprovalEprom.PENDING) {
      throw new BadRequestException('Item yang sudah direview tidak dapat diubah');
    }

    return this.prisma.opnamePekerjaan.update({
      where: { id },
      data: { progressPersen: dto.progressPersen },
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

  private async denganApproval(items: any[]) {
    if (!items.length) return items;
    const approvals = await this.prisma.engineerDocumentApproval.findMany({
      where: {
        documentType: EngineerDocumentType.OPNAME_PEKERJAAN,
        documentId: { in: items.map((item) => item.id) },
      },
      orderBy: { approvedAt: 'desc' },
      include: { approvedBy: { select: { id: true, name: true } } },
    });
    const terbaru = new Map<number, any>();
    for (const approval of approvals) if (!terbaru.has(approval.documentId)) terbaru.set(approval.documentId, approval);
    const rootIds = [...new Set(items.map((item) => item.revisionRootId).filter(Boolean))] as number[];
    const anggotaRevisi = rootIds.length
      ? await this.prisma.opnamePekerjaan.findMany({
          where: { OR: [{ id: { in: rootIds } }, { revisionRootId: { in: rootIds } }] },
          select: { id: true, revisionRootId: true, createdAt: true },
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        })
      : [];
    const nomorRevisi = new Map<number, number>();
    for (const rootId of rootIds) {
      const grup = anggotaRevisi.filter((row) => row.id === rootId || row.revisionRootId === rootId);
      grup.forEach((row, index) => nomorRevisi.set(row.id, index));
    }
    return items.map((item) => {
      const latestApproval = terbaru.get(item.id) ?? null;
      return { ...item, revision: nomorRevisi.get(item.id) ?? 0, effectiveFileUrl: latestApproval?.signedFilePath ?? item.fileUrl, latestApproval };
    });
  }

  private async nomorRevisi(item: { id: number; revisionRootId: number | null }) {
    if (!item.revisionRootId) return 0;
    const grup = await this.prisma.opnamePekerjaan.findMany({
      where: { OR: [{ id: item.revisionRootId }, { revisionRootId: item.revisionRootId }] },
      select: { id: true },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    return Math.max(0, grup.findIndex((row) => row.id === item.id));
  }
}
