// ==================================================
// FILE: backend/src/eprom/engineer/eprom-engineer.service.ts
// FUNGSI: Shop Drawing, Material Approval, Metode Pekerjaan,
// Sertifikasi Pekerjaan, Daftar Peralatan, dan Komisioning Alat Berat
// (Project Area - Engineer)
// Referensi: alur-workflow-tender-kontrak-project-area.md bagian 5.1
// ==================================================

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { EngineerDocumentType, StatusApprovalEprom } from '@prisma/client';
import { basename, extname } from 'node:path';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { EpromFileService } from '../common/eprom-file.service';
import { AktorEprom } from '../common/eprom-aktor';
import { EpromEngineerSigningService } from './eprom-engineer-signing.service';

export const TIPE_ENGINEER = [
  'shop-drawing',
  'material-approval',
  'metode-pekerjaan',
  'sertifikasi-pekerjaan',
  'peralatan-list',
  'komisioning-alat-berat',
] as const;

export type TipeEngineer = (typeof TIPE_ENGINEER)[number];

/** Field "nama" masing-masing tipe (null bila tipe itu tidak punya field nama). */
const FIELD_NAMA: Record<TipeEngineer, string | null> = {
  'shop-drawing': 'namaPekerjaan',
  'material-approval': 'namaMaterial',
  'metode-pekerjaan': 'namaMetode',
  'sertifikasi-pekerjaan': null,
  'peralatan-list': null,
  'komisioning-alat-berat': null,
};

const LABEL_TIPE: Record<TipeEngineer, string> = {
  'shop-drawing': 'Shop Drawing',
  'material-approval': 'Material Approval',
  'metode-pekerjaan': 'Metode Pekerjaan',
  'sertifikasi-pekerjaan': 'Sertifikasi Pekerjaan',
  'peralatan-list': 'Daftar Peralatan',
  'komisioning-alat-berat': 'Komisioning Alat Berat',
};

const DOCUMENT_TYPE: Record<TipeEngineer, EngineerDocumentType> = {
  'shop-drawing': EngineerDocumentType.SHOP_DRAWING,
  'material-approval': EngineerDocumentType.MATERIAL_APPROVAL,
  'metode-pekerjaan': EngineerDocumentType.METODE_PEKERJAAN,
  'sertifikasi-pekerjaan': EngineerDocumentType.SERTIFIKASI_PEKERJAAN,
  'peralatan-list': EngineerDocumentType.DAFTAR_PERALATAN,
  'komisioning-alat-berat': EngineerDocumentType.KOMISIONING_ALAT_BERAT,
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
  @IsIn(['REJECTED'])
  status: 'REJECTED';

  @IsString()
  komentar: string;
}

export class EngineerSignaturePlacementDto {
  @IsString()
  signatureFile: string;

  @IsInt()
  @Min(1)
  signaturePage: number;

  @IsNumber()
  signatureXRatio: number;

  @IsNumber()
  signatureYRatio: number;

  @IsNumber()
  signatureWidthRatio: number;

  @IsNumber()
  signatureHeightRatio: number;
}

export class ApproveEngineerDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EngineerSignaturePlacementDto)
  placements: EngineerSignaturePlacementDto[];
}

@Injectable()
export class EpromEngineerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: EpromAksesService,
    private readonly file: EpromFileService,
    private readonly signing: EpromEngineerSigningService,
  ) {}

  validasiTipe(tipe: string): TipeEngineer {
    if (!TIPE_ENGINEER.includes(tipe as TipeEngineer)) {
      throw new BadRequestException('Tipe Engineer tidak valid');
    }

    return tipe as TipeEngineer;
  }

  /**
   * Dispatcher generik ke salah satu model Prisma yang bentuknya
   * seragam (id, projectId, fileUrl, status, komentar, + field nama opsional).
   * Di-tipe `any` dengan sengaja — TS tidak bisa menyatukan signature
   * findMany/create/update/delete dari 5 delegate model yang berbeda.
   */
  private delegate(tipe: TipeEngineer, client: any = this.prisma): any {
    switch (tipe) {
      case 'shop-drawing':
        return client.shopDrawing;
      case 'material-approval':
        return client.materialApproval;
      case 'metode-pekerjaan':
        return client.metodePekerjaan;
      case 'sertifikasi-pekerjaan':
        return client.sertifikasiPekerjaan;
      case 'peralatan-list':
        return client.peralatanList;
      case 'komisioning-alat-berat':
        return client.komisioningAlatBerat;
    }
  }

  async daftar(aktor: AktorEprom, tipe: TipeEngineer, projectId: number) {
    await this.akses.wajibAksesProject(aktor, projectId);

    const items = await this.delegate(tipe).findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
    });

    return this.denganApproval(tipe, items);
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
      throw new BadRequestException(
        `Nama wajib diisi untuk ${LABEL_TIPE[tipe]}`,
      );
    }

    if (tipe === 'komisioning-alat-berat' && !file) {
      throw new BadRequestException('File Komisioning Alat Berat wajib diunggah');
    }

    if (
      tipe === 'komisioning-alat-berat' &&
      extname(file!.originalname).toLowerCase() !== '.pdf'
    ) {
      throw new BadRequestException(
        'File Komisioning Alat Berat harus berformat PDF agar dapat di-approve',
      );
    }

    const fileUrl = file
      ? this.file.simpanDokumen(file, `project/${projectId}/engineer/${tipe}`)
      : null;

    return this.delegate(tipe).create({
      data: {
        projectId,
        fileUrl,
        originalFileName: file?.originalname || null,
        ...(namaField ? { [namaField]: dto.nama!.trim() } : {}),
      },
    });
  }

  /** Owner meninjau (approve/reject) — item PENDING dianggap final setelahnya (bagian 3.1). */
  async review(
    aktor: AktorEprom,
    tipe: TipeEngineer,
    id: number,
    dto: ReviewEngineerDto,
  ) {
    this.akses.wajibOwner(aktor);

    const item = await this.itemAtauThrow(tipe, id);

    if (item.status !== StatusApprovalEprom.PENDING) {
      throw new BadRequestException('Item ini sudah direview sebelumnya');
    }

    if (!dto.komentar?.trim()) {
      throw new BadRequestException('Alasan penolakan wajib diisi');
    }

    return this.delegate(tipe).update({
      where: { id },
      data: {
        status: StatusApprovalEprom.REJECTED,
        komentar: dto.komentar.trim(),
      },
    });
  }

  daftarTandaTangan(aktor: AktorEprom) {
    this.akses.wajibOwner(aktor);
    return this.signing.daftarTandaTangan();
  }

  async detailApproval(aktor: AktorEprom, tipe: TipeEngineer, id: number) {
    this.akses.wajibOwner(aktor);

    const item = await this.itemAtauThrow(tipe, id);
    const project = await this.prisma.project.findUnique({
      where: { id: item.projectId },
      include: { kontrak: { include: { vendor: true, tender: true } } },
    });

    if (!project) {
      throw new NotFoundException('Project tidak ditemukan');
    }

    const [itemLengkap] = await this.denganApproval(tipe, [item]);

    return {
      item: itemLengkap,
      project,
      documentType: DOCUMENT_TYPE[tipe],
      documentLabel: LABEL_TIPE[tipe],
      canSign: Boolean(
        item.fileUrl && extname(item.fileUrl).toLowerCase() === '.pdf',
      ),
    };
  }

  async approveDenganTandaTangan(
    aktor: AktorEprom,
    tipe: TipeEngineer,
    id: number,
    dto: ApproveEngineerDto,
  ) {
    this.akses.wajibOwner(aktor);

    const item = await this.itemAtauThrow(tipe, id);

    if (item.status !== StatusApprovalEprom.PENDING) {
      throw new BadRequestException('Item ini sudah direview sebelumnya');
    }

    if (!item.fileUrl || extname(item.fileUrl).toLowerCase() !== '.pdf') {
      throw new BadRequestException(
        'Tanda tangan hanya dapat ditempatkan pada dokumen PDF.',
      );
    }

    const documentType = DOCUMENT_TYPE[tipe];
    const approvalTerakhir =
      await this.prisma.engineerDocumentApproval.findFirst({
        where: { documentType, documentId: id },
        orderBy: { approvedAt: 'desc' },
      });
    const sourceFilePath = approvalTerakhir?.signedFilePath ?? item.fileUrl;
    const signedFilePath = await this.signing.buatPdfSigned(
      sourceFilePath,
      dto.placements,
      `project/${item.projectId}/engineer/${tipe}`,
    );
    const penempatanPertama = dto.placements[0];
    const penempatanAudit = dto.placements.map((placement) => ({
      ...placement,
      signatureFile: basename(placement.signatureFile),
    }));

    try {
      const hasil = await this.prisma.$transaction(async (tx) => {
        const itemSekarang = await this.delegate(tipe, tx).findUnique({
          where: { id },
        });

        if (
          !itemSekarang ||
          itemSekarang.status !== StatusApprovalEprom.PENDING
        ) {
          throw new BadRequestException('Item ini sudah direview sebelumnya');
        }

        const approval = await tx.engineerDocumentApproval.create({
          data: {
            documentId: id,
            documentType,
            projectId: item.projectId,
            approvedById: aktor.id,
            // Kolom tunggal dipertahankan agar data approval lama tetap kompatibel.
            signatureFile: basename(penempatanPertama.signatureFile),
            signaturePage: penempatanPertama.signaturePage,
            signatureXRatio: penempatanPertama.signatureXRatio,
            signatureYRatio: penempatanPertama.signatureYRatio,
            signatureWidthRatio: penempatanPertama.signatureWidthRatio,
            signatureHeightRatio: penempatanPertama.signatureHeightRatio,
            signaturePlacements: penempatanAudit,
            originalFilePath: item.fileUrl,
            sourceFilePath,
            signedFilePath,
          },
          include: { approvedBy: { select: { id: true, name: true } } },
        });
        const updated = await this.delegate(tipe, tx).update({
          where: { id },
          data: { status: StatusApprovalEprom.APPROVED, komentar: null },
        });

        return { updated, approval };
      });

      return {
        ...hasil.updated,
        effectiveFileUrl: hasil.approval.signedFilePath,
        latestApproval: hasil.approval,
      };
    } catch (error) {
      this.file.hapus(signedFilePath);
      throw error;
    }
  }

  /** Hapus item yang masih PENDING (salah unggah) — Owner atau Vendor pemilik project. */
  async hapus(aktor: AktorEprom, tipe: TipeEngineer, id: number) {
    const item = await this.itemAtauThrow(tipe, id);

    await this.akses.wajibAksesProject(aktor, item.projectId);

    if (item.status !== StatusApprovalEprom.PENDING) {
      throw new BadRequestException(
        'Item yang sudah direview tidak dapat dihapus',
      );
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
      'komisioning-alat-berat': 0,
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

  private async denganApproval(tipe: TipeEngineer, items: any[]) {
    if (items.length === 0) {
      return [];
    }

    const approvals = await this.prisma.engineerDocumentApproval.findMany({
      where: {
        documentType: DOCUMENT_TYPE[tipe],
        documentId: { in: items.map((item) => item.id) },
      },
      orderBy: { approvedAt: 'desc' },
      include: { approvedBy: { select: { id: true, name: true } } },
    });
    const terbaru = new Map<number, (typeof approvals)[number]>();

    approvals.forEach((approval) => {
      if (!terbaru.has(approval.documentId)) {
        terbaru.set(approval.documentId, approval);
      }
    });

    return items.map((item) => {
      const latestApproval = terbaru.get(item.id) ?? null;

      return {
        ...item,
        effectiveFileUrl: latestApproval?.signedFilePath ?? item.fileUrl,
        latestApproval,
      };
    });
  }
}
