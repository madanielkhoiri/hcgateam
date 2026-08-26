// ==================================================
// FILE: backend/src/drive/drive.service.ts
// FUNGSI: Folder & file ala Google Drive untuk card Administrasi
// (CSR, Form Download) - generik, tidak terikat Tender/Vendor.
// Kelola: Admin/Admin HC/Admin Comben/Section Head. Lihat & unduh:
// seluruh akun ber-akses card terkait.
// ==================================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ScopeDrive } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DriveFileService } from './drive-file.service';
import { AktorPostingan, bolehKelolaPostingan } from '../postingan/postingan-aktor';

const SCOPE_VALID = Object.values(ScopeDrive);

@Injectable()
export class DriveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly file: DriveFileService,
  ) {}

  private wajibKelola(aktor: AktorPostingan): void {
    if (!bolehKelolaPostingan(aktor)) {
      throw new ForbiddenException(
        'Aksi ini hanya dapat dilakukan oleh Admin/Admin HC/Admin Comben/Section Head',
      );
    }
  }

  private validasiScope(scope: string): ScopeDrive {
    if (!SCOPE_VALID.includes(scope as ScopeDrive)) {
      throw new BadRequestException('Scope drive tidak valid');
    }

    return scope as ScopeDrive;
  }

  async isiFolder(scope: string, parentFolderId?: number) {
    const scopeValid = this.validasiScope(scope);

    const [folders, files] = await Promise.all([
      this.prisma.driveFolder.findMany({
        where: { scope: scopeValid, parentFolderId: parentFolderId ?? null },
        orderBy: { namaFolder: 'asc' },
      }),
      parentFolderId
        ? this.prisma.driveFile.findMany({
            where: { folderId: parentFolderId },
            include: { uploadedBy: { select: { id: true, name: true, nrp: true } } },
            orderBy: { uploadedAt: 'desc' },
          })
        : Promise.resolve([]),
    ]);

    return { folders, files };
  }

  private async folderOrThrow(id: number) {
    const folder = await this.prisma.driveFolder.findUnique({ where: { id } });

    if (!folder) {
      throw new NotFoundException('Folder tidak ditemukan');
    }

    return folder;
  }

  async buatFolder(
    aktor: AktorPostingan,
    scope: string,
    namaFolder: string,
    parentFolderId?: number,
  ) {
    this.wajibKelola(aktor);

    let scopeValid = this.validasiScope(scope);

    if (parentFolderId) {
      const parent = await this.folderOrThrow(parentFolderId);
      scopeValid = parent.scope;
    }

    if (!namaFolder?.trim()) {
      throw new BadRequestException('Nama folder wajib diisi');
    }

    return this.prisma.driveFolder.create({
      data: {
        scope: scopeValid,
        namaFolder: namaFolder.trim(),
        parentFolderId: parentFolderId ?? null,
      },
    });
  }

  async ubahFolder(aktor: AktorPostingan, id: number, namaFolder: string) {
    this.wajibKelola(aktor);
    await this.folderOrThrow(id);

    if (!namaFolder?.trim()) {
      throw new BadRequestException('Nama folder tidak boleh kosong');
    }

    return this.prisma.driveFolder.update({
      where: { id },
      data: { namaFolder: namaFolder.trim() },
    });
  }

  /** Kumpulkan path fisik semua file di dalam satu folder + subfoldernya (rekursif). */
  private async kumpulkanFileDalamFolder(folderId: number): Promise<string[]> {
    const [files, subfolders] = await Promise.all([
      this.prisma.driveFile.findMany({
        where: { folderId },
        select: { urlFile: true },
      }),
      this.prisma.driveFolder.findMany({
        where: { parentFolderId: folderId },
        select: { id: true },
      }),
    ]);

    const subPaths = await Promise.all(
      subfolders.map((sub) => this.kumpulkanFileDalamFolder(sub.id)),
    );

    return [...files.map((f) => f.urlFile), ...subPaths.flat()];
  }

  async hapusFolder(aktor: AktorPostingan, id: number) {
    this.wajibKelola(aktor);
    await this.folderOrThrow(id);

    const paths = await this.kumpulkanFileDalamFolder(id);

    await this.prisma.driveFolder.delete({ where: { id } });

    for (const path of paths) {
      this.file.hapus(path);
    }

    return { message: 'Folder berhasil dihapus' };
  }

  async unggahFile(
    aktor: AktorPostingan,
    folderId: number,
    file: Express.Multer.File,
  ) {
    this.wajibKelola(aktor);
    await this.folderOrThrow(folderId);

    const urlFile = this.file.simpan(file);

    return this.prisma.driveFile.create({
      data: {
        folderId,
        namaFile: file.originalname,
        urlFile,
        uploadedById: aktor.id,
      },
      include: { uploadedBy: { select: { id: true, name: true, nrp: true } } },
    });
  }

  async hapusFile(aktor: AktorPostingan, id: number) {
    this.wajibKelola(aktor);

    const item = await this.prisma.driveFile.findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException('File tidak ditemukan');
    }

    await this.prisma.driveFile.delete({ where: { id } });
    this.file.hapus(item.urlFile);

    return { message: 'File berhasil dihapus' };
  }
}
