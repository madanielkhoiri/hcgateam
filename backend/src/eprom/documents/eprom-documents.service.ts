// ==================================================
// FILE: backend/src/eprom/documents/eprom-documents.service.ts
// FUNGSI: Folder & file ala Google Drive, dipakai bersama oleh
// Upload Dokumen Tender dan Legalitas Vendor.
// Referensi: alur-workflow-tender-kontrak-project-area.md bagian 4.1.1 & 4.2.2
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { IsEnum, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ScopeDocumentFolder, TipeFileEprom } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { EpromFileService } from '../common/eprom-file.service';
import { AktorEprom } from '../common/eprom-aktor';

export class BuatFolderDto {
  @IsEnum(ScopeDocumentFolder)
  scope: ScopeDocumentFolder;

  @IsOptional()
  @IsInt()
  tenderId?: number;

  @IsOptional()
  @IsInt()
  vendorId?: number;

  @IsString()
  @IsNotEmpty()
  namaFolder: string;

  @IsOptional()
  @IsInt()
  parentFolderId?: number;
}

@Injectable()
export class EpromDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: EpromAksesService,
    private readonly file: EpromFileService,
  ) {}

  private async wajibAksesFolder(
    aktor: AktorEprom,
    folder: { scope: ScopeDocumentFolder; tenderId: number | null; vendorId: number | null },
  ): Promise<void> {
    if (folder.scope === ScopeDocumentFolder.TENDER_DOKUMEN) {
      this.akses.wajibOwner(aktor);
      return;
    }

    if (!folder.vendorId) {
      this.akses.wajibOwner(aktor);
      return;
    }

    await this.akses.wajibVendorSendiri(aktor, folder.vendorId);
  }

  async isiFolder(
    aktor: AktorEprom,
    filter: {
      scope: ScopeDocumentFolder;
      tenderId?: number;
      vendorId?: number;
      parentFolderId?: number | null;
    },
  ) {
    await this.wajibAksesFolder(aktor, {
      scope: filter.scope,
      tenderId: filter.tenderId ?? null,
      vendorId: filter.vendorId ?? null,
    });

    const [folders, files] = await Promise.all([
      this.prisma.documentFolder.findMany({
        where: {
          scope: filter.scope,
          tenderId: filter.tenderId ?? undefined,
          vendorId: filter.vendorId ?? undefined,
          parentFolderId: filter.parentFolderId ?? null,
        },
        orderBy: { namaFolder: 'asc' },
      }),
      filter.parentFolderId
        ? this.prisma.fileUpload.findMany({
            where: { folderId: filter.parentFolderId },
            include: { uploadedBy: { select: { id: true, name: true } } },
            orderBy: { uploadedAt: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    return { folders, files };
  }

  private async folderOrThrow(id: number) {
    const folder = await this.prisma.documentFolder.findUnique({
      where: { id },
    });

    if (!folder) {
      throw new NotFoundException('Folder tidak ditemukan');
    }

    return folder;
  }

  async buatFolder(aktor: AktorEprom, dto: BuatFolderDto) {
    let scope = dto.scope;
    let tenderId = dto.tenderId ?? null;
    let vendorId = dto.vendorId ?? null;

    if (dto.parentFolderId) {
      const parent = await this.folderOrThrow(dto.parentFolderId);
      scope = parent.scope;
      tenderId = parent.tenderId;
      vendorId = parent.vendorId;
    }

    await this.wajibAksesFolder(aktor, { scope, tenderId, vendorId });

    if (scope === ScopeDocumentFolder.TENDER_DOKUMEN && !tenderId) {
      throw new BadRequestException('tenderId wajib diisi untuk folder Upload Dokumen Tender');
    }

    if (scope === ScopeDocumentFolder.LEGALITAS_VENDOR && !vendorId) {
      throw new BadRequestException('vendorId wajib diisi untuk folder Legalitas Vendor');
    }

    return this.prisma.documentFolder.create({
      data: {
        scope,
        tenderId,
        vendorId,
        namaFolder: dto.namaFolder.trim(),
        parentFolderId: dto.parentFolderId ?? null,
      },
    });
  }

  /** Ganti nama folder — Owner only (sama seperti hapusFolder). */
  async ubahFolder(aktor: AktorEprom, folderId: number, namaFolder: string) {
    this.akses.wajibOwner(aktor);

    await this.folderOrThrow(folderId);

    if (!namaFolder.trim()) {
      throw new BadRequestException('Nama folder tidak boleh kosong');
    }

    return this.prisma.documentFolder.update({
      where: { id: folderId },
      data: { namaFolder: namaFolder.trim() },
    });
  }

  async unggahFile(
    aktor: AktorEprom,
    folderId: number,
    file: Express.Multer.File,
    tipe?: TipeFileEprom,
  ) {
    const folder = await this.folderOrThrow(folderId);
    await this.wajibAksesFolder(aktor, folder);

    const tipeFile = tipe ?? this.file.tebakTipe(file.originalname);
    const scopeDir =
      folder.scope === ScopeDocumentFolder.TENDER_DOKUMEN
        ? `tender/${folder.tenderId}`
        : `vendor/${folder.vendorId}`;

    const urlFile = this.file.simpan(file, scopeDir, tipeFile);

    return this.prisma.fileUpload.create({
      data: {
        folderId,
        namaFile: file.originalname,
        tipeFile,
        urlFile,
        uploadedById: aktor.id,
      },
    });
  }

  async fileUntukDiunduh(aktor: AktorEprom, fileId: number) {
    const item = await this.prisma.fileUpload.findUnique({
      where: { id: fileId },
      include: { folder: true },
    });

    if (!item) {
      throw new NotFoundException('File tidak ditemukan');
    }

    await this.wajibAksesFolder(aktor, item.folder);

    return { item, absolutePath: this.file.resolveAbsolut(item.urlFile) };
  }

  async fileBanyakUntukDiunduh(aktor: AktorEprom, fileIds: number[]) {
    const hasil = await Promise.all(
      fileIds.map((id) => this.fileUntukDiunduh(aktor, id)),
    );

    return hasil;
  }

  /**
   * Semua file di seluruh folder (dan subfoldernya) untuk satu tender/vendor
   * sekaligus — dipakai tombol "Download Semua Dokumen" di root folder,
   * tidak perlu buka folder satu-satu.
   */
  async semuaFileUntukDiunduh(
    aktor: AktorEprom,
    filter: { scope: ScopeDocumentFolder; tenderId?: number; vendorId?: number },
  ) {
    await this.wajibAksesFolder(aktor, {
      scope: filter.scope,
      tenderId: filter.tenderId ?? null,
      vendorId: filter.vendorId ?? null,
    });

    const rootFolders = await this.prisma.documentFolder.findMany({
      where: {
        scope: filter.scope,
        tenderId: filter.tenderId ?? undefined,
        vendorId: filter.vendorId ?? undefined,
        parentFolderId: null,
      },
      select: { id: true, namaFolder: true },
    });

    const items = (
      await Promise.all(
        rootFolders.map((folder) =>
          this.kumpulkanItemDalamFolder(folder.id, `${folder.namaFolder}/`),
        ),
      )
    ).flat();

    if (items.length === 0) {
      throw new NotFoundException('Belum ada file untuk diunduh');
    }

    return items.map((item) => ({
      item,
      absolutePath: this.file.resolveAbsolut(item.urlFile),
    }));
  }

  /**
   * Kumpulkan seluruh file (nama, path fisik, dan nama entri zip yang
   * mencerminkan struktur folder) di dalam satu folder + subfoldernya (rekursif).
   */
  private async kumpulkanItemDalamFolder(
    folderId: number,
    prefix = '',
  ): Promise<{ namaFile: string; urlFile: string; namaEntriZip: string }[]> {
    const [files, subfolders] = await Promise.all([
      this.prisma.fileUpload.findMany({
        where: { folderId },
        select: { namaFile: true, urlFile: true },
      }),
      this.prisma.documentFolder.findMany({
        where: { parentFolderId: folderId },
        select: { id: true, namaFolder: true },
      }),
    ]);

    const subItems = await Promise.all(
      subfolders.map((sub) =>
        this.kumpulkanItemDalamFolder(sub.id, `${prefix}${sub.namaFolder}/`),
      ),
    );

    return [
      ...files.map((f) => ({ ...f, namaEntriZip: `${prefix}${f.namaFile}` })),
      ...subItems.flat(),
    ];
  }

  /** Hapus folder (beserta subfolder & file di dalamnya) — Owner only. */
  async hapusFolder(aktor: AktorEprom, folderId: number) {
    this.akses.wajibOwner(aktor);

    const folder = await this.folderOrThrow(folderId);
    const files = await this.kumpulkanFileDalamFolder(folderId);

    await this.prisma.documentFolder.delete({ where: { id: folder.id } });

    for (const path of files) {
      this.file.hapus(path);
    }

    return { message: 'Folder berhasil dihapus' };
  }

  /** Kumpulkan path fisik semua file di dalam satu folder + subfoldernya (rekursif). */
  private async kumpulkanFileDalamFolder(folderId: number): Promise<string[]> {
    const items = await this.kumpulkanItemDalamFolder(folderId);
    return items.map((item) => item.urlFile);
  }

  /** Hapus satu file — Owner only. */
  async hapusFile(aktor: AktorEprom, fileId: number) {
    this.akses.wajibOwner(aktor);

    const item = await this.prisma.fileUpload.findUnique({ where: { id: fileId } });

    if (!item) {
      throw new NotFoundException('File tidak ditemukan');
    }

    await this.prisma.fileUpload.delete({ where: { id: fileId } });
    this.file.hapus(item.urlFile);

    return { message: 'File berhasil dihapus' };
  }
}
