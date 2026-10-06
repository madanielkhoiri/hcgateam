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
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { EngineerDocumentType, StatusApprovalEprom } from '@prisma/client';
import { existsSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { EpromFileService } from '../common/eprom-file.service';
import { AktorEprom } from '../common/eprom-aktor';
import { EpromEngineerSigningService } from './eprom-engineer-signing.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';

export const TIPE_ENGINEER = [
  'shop-drawing',
  'material-approval',
  'metode-pekerjaan',
  'sertifikasi-pekerjaan',
  'peralatan-list',
  'komisioning-alat-berat',
  'checklist-tahapan',
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
  'checklist-tahapan': 'namaTahap',
};

const LABEL_TIPE: Record<TipeEngineer, string> = {
  'shop-drawing': 'Shop Drawing',
  'material-approval': 'Material Approval',
  'metode-pekerjaan': 'Metode Pekerjaan',
  'sertifikasi-pekerjaan': 'Sertifikasi Pekerjaan',
  'peralatan-list': 'Daftar Peralatan',
  'komisioning-alat-berat': 'Komisioning Alat Berat',
  'checklist-tahapan': 'Checklist Tahapan Pekerjaan',
};

const DOCUMENT_TYPE: Record<TipeEngineer, EngineerDocumentType> = {
  'shop-drawing': EngineerDocumentType.SHOP_DRAWING,
  'material-approval': EngineerDocumentType.MATERIAL_APPROVAL,
  'metode-pekerjaan': EngineerDocumentType.METODE_PEKERJAAN,
  'sertifikasi-pekerjaan': EngineerDocumentType.SERTIFIKASI_PEKERJAAN,
  'peralatan-list': EngineerDocumentType.DAFTAR_PERALATAN,
  'komisioning-alat-berat': EngineerDocumentType.KOMISIONING_ALAT_BERAT,
  'checklist-tahapan': EngineerDocumentType.CHECKLIST_TAHAPAN,
};

export class BuatEngineerDto {
  @Type(() => Number)
  @IsInt()
  projectId: number;

  @IsOptional()
  @IsString()
  nama?: string;
}

export class UbahEngineerDto {
  @IsString()
  @IsNotEmpty()
  nama: string;
}

export class ReviewEngineerDto {
  @IsIn(['REJECTED'])
  status: 'REJECTED';

  @IsString()
  komentar: string;

  @IsOptional() @IsArray() annotations?: unknown[];
  @IsOptional() @IsArray() textAnnotations?: unknown[];
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

export class EngineerInkAnnotationDto {
  @IsInt()
  @Min(1)
  page: number;

  @IsString()
  color: string;

  @IsNumber()
  width: number;

  @IsString()
  points: string;
}
export class EngineerTextAnnotationDto {
  @IsInt() @Min(1) page: number;
  @IsString() text: string;
  @IsNumber() x: number;
  @IsNumber() y: number;
  @IsNumber() rotation: number;
  @IsNumber() size: number;
}

export class ApproveEngineerDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => EngineerSignaturePlacementDto)
  placements: EngineerSignaturePlacementDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EngineerInkAnnotationDto)
  annotations?: EngineerInkAnnotationDto[];
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EngineerTextAnnotationDto)
  textAnnotations?: EngineerTextAnnotationDto[];
}

@Injectable()
export class EpromEngineerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: EpromAksesService,
    private readonly file: EpromFileService,
    private readonly signing: EpromEngineerSigningService,
    private readonly whatsapp: WhatsappService,
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
      case 'checklist-tahapan':
        return client.checklistKonstruksi;
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

    const nama = namaField ? dto.nama!.trim() : null;
    const revisiSebelumnya = namaField && nama
      ? await this.delegate(tipe).count({ where: { projectId, [namaField]: nama } })
      : 0;
    const originalFileName = file?.originalname
      ? this.namaFileRevisi(file.originalname, revisiSebelumnya)
      : null;
    const fileUrl = file
      ? this.file.simpanDokumen(file, `project/${projectId}/engineer/${tipe}`)
      : null;

    const hasil = await this.delegate(tipe).create({
      data: {
        projectId,
        fileUrl,
        originalFileName,
        ...(namaField ? { [namaField]: nama } : {}),
      },
    });

    await this.notifikasiUpload(tipe, projectId, aktor.id);

    return hasil;
  }

  private namaFileRevisi(namaFile: string, revisi: number): string {
    if (revisi < 1) return namaFile;
    const ekstensi = extname(namaFile);
    const dasar = namaFile.slice(0, namaFile.length - ekstensi.length).replace(/-R\d+$/i, '');
    return `${dasar}-R${String(revisi).padStart(2, '0')}${ekstensi}`;
  }

  /** Notifikasi WA ke Owner setiap ada upload baru di salah satu sub-menu Engineer. */
  private async notifikasiUpload(tipe: TipeEngineer, projectId: number, aktorId: number) {
    if (!this.whatsapp.aktif) {
      return;
    }

    const nomorOwner = process.env.WA_OWNER_NUMBER;

    if (!nomorOwner) {
      return;
    }

    const [project, pengunggah] = await Promise.all([
      this.prisma.project.findUnique({
        where: { id: projectId },
        select: { namaProject: true },
      }),
      this.prisma.user.findUnique({
        where: { id: aktorId },
        select: { name: true },
      }),
    ]);

    const pesan =
      `Ada upload ${LABEL_TIPE[tipe]} baru di project ${project?.namaProject ?? '-'} oleh ${pengunggah?.name ?? '-'}. ` +
      `Cek di HCGA CONNECT ya.`;

    await this.whatsapp.kirim(nomorOwner, pesan);
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

    if (!dto.komentar?.trim()) {
      throw new BadRequestException('Alasan penolakan wajib diisi');
    }

    let reviewedFilePath: string | undefined;
    if (item.fileUrl?.toLowerCase().endsWith('.pdf') && (dto.annotations?.length || dto.textAnnotations?.length)) {
      reviewedFilePath = await this.signing.buatPdfReview(item.fileUrl, (dto.annotations ?? []) as any, (dto.textAnnotations ?? []) as any, `project/${item.projectId}/engineer/${tipe}`);
    }
    return this.delegate(tipe).update({
      where: { id },
      data: {
        status: StatusApprovalEprom.REJECTED,
        komentar: dto.komentar.trim(),
        ...(reviewedFilePath ? { fileUrl: reviewedFilePath } : {}),
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
    // Approval pertama tidak diberi label. Untuk upload ulang setelah reject,
    // cari dokumen lama dengan pekerjaan/nama yang sama agar label revisinya
    // tetap berlanjut walaupun upload vendor membuat record baru.
    const namaField = FIELD_NAMA[tipe];
    const itemLama = namaField
      ? await this.delegate(tipe).findMany({
          where: {
            projectId: item.projectId,
            status: StatusApprovalEprom.REJECTED,
            [namaField]: (item as any)[namaField],
            id: { not: id },
          },
          select: { id: true },
        })
      : [];
    const documentIds = [id, ...itemLama.map((row: any) => row.id)];
    const jumlahApprovalSebelumnya = this.prisma.engineerDocumentApproval.count
      ? await this.prisma.engineerDocumentApproval.count({
          where: { documentType, projectId: item.projectId, documentId: { in: documentIds } },
        })
      : 0;
    const revision = jumlahApprovalSebelumnya;
    const tanggalApproval = new Date();
    const signedFilePath = await this.signing.buatPdfSigned(
      sourceFilePath,
      dto.placements,
      `project/${item.projectId}/engineer/${tipe}`,
      tanggalApproval,
      dto.annotations ?? [],
      dto.textAnnotations ?? [],
      revision,
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

        if (!itemSekarang) throw new BadRequestException('Item tidak ditemukan');

        const approval = await tx.engineerDocumentApproval.create({
          data: {
            documentId: id,
            documentType,
            projectId: item.projectId,
            approvedById: aktor.id,
            approvedAt: tanggalApproval,
            adaTandaTangan: true,
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

  /** Approve tanpa menempel tanda tangan — dipakai untuk dokumen non-PDF atau saat tanda tangan memang tidak diperlukan. */
  async approveTanpaTandaTangan(aktor: AktorEprom, tipe: TipeEngineer, id: number) {
    this.akses.wajibOwner(aktor);

    const item = await this.itemAtauThrow(tipe, id);

    if (!item.fileUrl) {
      throw new BadRequestException('Dokumen belum diunggah');
    }

    const documentType = DOCUMENT_TYPE[tipe];

    const hasil = await this.prisma.$transaction(async (tx) => {
      const itemSekarang = await this.delegate(tipe, tx).findUnique({
        where: { id },
      });

      if (!itemSekarang) throw new BadRequestException('Item tidak ditemukan');

      const approval = await tx.engineerDocumentApproval.create({
        data: {
          documentId: id,
          documentType,
          projectId: item.projectId,
          approvedById: aktor.id,
          adaTandaTangan: false,
          originalFilePath: item.fileUrl!,
          sourceFilePath: item.fileUrl!,
          signedFilePath: item.fileUrl!,
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
  }

  /** Ubah nama item yang masih PENDING (salah ketik) — Owner atau Vendor pemilik project. File tidak diganti. */
  async ubah(aktor: AktorEprom, tipe: TipeEngineer, id: number, dto: UbahEngineerDto) {
    const item = await this.itemAtauThrow(tipe, id);

    await this.akses.wajibAksesProject(aktor, item.projectId);

    const namaField = FIELD_NAMA[tipe];

    if (!namaField) {
      throw new BadRequestException(`${LABEL_TIPE[tipe]} tidak memiliki data yang dapat diubah`);
    }

    const nama = dto.nama?.trim();

    if (!nama) {
      throw new BadRequestException(`Nama wajib diisi untuk ${LABEL_TIPE[tipe]}`);
    }

    return this.delegate(tipe).update({ where: { id }, data: { [namaField]: nama } });
  }

  /** Hapus item yang masih PENDING (salah unggah) — Owner atau Vendor pemilik project. */
  async hapus(aktor: AktorEprom, tipe: TipeEngineer, id: number) {
    const item = await this.itemAtauThrow(tipe, id);

    await this.akses.wajibAksesProject(aktor, item.projectId);

    await this.delegate(tipe).delete({ where: { id } });

    if (item.fileUrl) {
      this.file.hapus(item.fileUrl);
    }

    return { message: 'Item berhasil dihapus' };
  }

  /** Ringkasan jumlah PENDING per tipe untuk badge notifikasi (bagian 3.2). */
  async ringkasanPending(aktor: AktorEprom, projectId: number) {
    await this.akses.wajibAksesProject(aktor, projectId);

    const hasil: Record<string, number> = {
      'shop-drawing': 0,
      'material-approval': 0,
      'metode-pekerjaan': 0,
      'sertifikasi-pekerjaan': 0,
      'peralatan-list': 0,
      'komisioning-alat-berat': 0,
    };

    await Promise.all(
      TIPE_ENGINEER.filter((tipe) => tipe !== 'checklist-tahapan').map(async (tipe) => {
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

      const signedPath = latestApproval?.signedFilePath;
      const signedExists = Boolean(
        signedPath && existsSync(join(process.cwd(), 'uploads', signedPath)),
      );

      return {
        ...item,
        effectiveFileUrl: signedExists ? signedPath : item.fileUrl,
        latestApproval,
      };
    });
  }
}
