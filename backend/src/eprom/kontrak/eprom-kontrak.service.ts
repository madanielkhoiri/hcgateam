// ==================================================
// FILE: backend/src/eprom/kontrak/eprom-kontrak.service.ts
// FUNGSI: Pembuatan Kontrak dari Pemenang Tender + membuka Project
// Referensi: alur-workflow-tender-kontrak-project-area.md bagian 4.2.1
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { StatusTender } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromFileService } from '../common/eprom-file.service';

export class BuatKontrakDto {
  @Type(() => Number)
  @IsInt()
  tenderId: number;

  @IsString()
  @IsNotEmpty()
  nomorKontrak: string;

  @IsDateString()
  tanggalMulai: string;

  @IsDateString()
  tanggalSelesai: string;
}

export class UbahKontrakDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  nomorKontrak?: string;

  @IsOptional()
  @IsDateString()
  tanggalMulai?: string;

  @IsOptional()
  @IsDateString()
  tanggalSelesai?: string;
}

export class BukaProjectDto {
  @IsString()
  @IsNotEmpty()
  namaProject: string;
}

@Injectable()
export class EpromKontrakService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly file: EpromFileService,
  ) {}

  async daftar() {
    return this.prisma.kontrak.findMany({
      include: {
        tender: { select: { id: true, namaTender: true } },
        vendor: { select: { id: true, namaVendor: true } },
        project: { select: { id: true, namaProject: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async detail(id: number) {
    const kontrak = await this.prisma.kontrak.findUnique({
      where: { id },
      include: {
        tender: true,
        vendor: true,
        project: true,
      },
    });

    if (!kontrak) {
      throw new NotFoundException('Kontrak tidak ditemukan');
    }

    return kontrak;
  }

  async buat(dto: BuatKontrakDto, file?: Express.Multer.File) {
    const tender = await this.prisma.tenderProcess.findUnique({
      where: { id: dto.tenderId },
      include: { sph: { where: { statusPemenang: true } }, kontrak: true },
    });

    if (!tender) {
      throw new NotFoundException('Tender tidak ditemukan');
    }

    if (tender.status !== StatusTender.SELESAI || tender.sph.length === 0) {
      throw new BadRequestException(
        'Tender belum memiliki pemenang, Kontrak belum dapat dibuat',
      );
    }

    if (tender.kontrak) {
      throw new BadRequestException('Kontrak untuk tender ini sudah dibuat');
    }

    if (new Date(dto.tanggalSelesai) < new Date(dto.tanggalMulai)) {
      throw new BadRequestException('Tanggal Selesai tidak boleh sebelum Tanggal Mulai');
    }

    const vendorId = tender.sph[0].vendorId;
    const fileKontrak = file
      ? this.file.simpanDokumen(file, `tender/${dto.tenderId}/kontrak`)
      : null;

    return this.prisma.kontrak.create({
      data: {
        tenderId: dto.tenderId,
        vendorId,
        nomorKontrak: dto.nomorKontrak.trim(),
        fileKontrak,
        tanggalMulai: new Date(dto.tanggalMulai),
        tanggalSelesai: new Date(dto.tanggalSelesai),
      },
    });
  }

  async ubah(id: number, dto: UbahKontrakDto, file?: Express.Multer.File) {
    const kontrak = await this.detail(id);

    const tanggalMulaiBaru = dto.tanggalMulai !== undefined ? new Date(dto.tanggalMulai) : kontrak.tanggalMulai;
    const tanggalSelesaiBaru =
      dto.tanggalSelesai !== undefined ? new Date(dto.tanggalSelesai) : kontrak.tanggalSelesai;

    if (tanggalSelesaiBaru < tanggalMulaiBaru) {
      throw new BadRequestException('Tanggal Selesai tidak boleh sebelum Tanggal Mulai');
    }

    const fileKontrak = file
      ? this.file.simpanDokumen(file, `tender/${kontrak.tenderId}/kontrak`)
      : undefined;

    return this.prisma.kontrak.update({
      where: { id },
      data: {
        ...(dto.nomorKontrak !== undefined ? { nomorKontrak: dto.nomorKontrak.trim() } : {}),
        ...(dto.tanggalMulai !== undefined ? { tanggalMulai: tanggalMulaiBaru } : {}),
        ...(dto.tanggalSelesai !== undefined ? { tanggalSelesai: tanggalSelesaiBaru } : {}),
        ...(fileKontrak !== undefined ? { fileKontrak } : {}),
      },
    });
  }

  async hapus(id: number) {
    const kontrak = await this.prisma.kontrak.findUnique({
      where: { id },
      include: { _count: { select: { project: true } } },
    });

    if (!kontrak) {
      throw new NotFoundException('Kontrak tidak ditemukan');
    }

    if (kontrak._count.project > 0) {
      throw new BadRequestException(
        'Kontrak ini sudah membuka Project, tidak dapat dihapus',
      );
    }

    await this.prisma.kontrak.delete({ where: { id } });

    return { message: 'Kontrak berhasil dihapus' };
  }

  async bukaProject(kontrakId: number, dto: BukaProjectDto) {
    await this.detail(kontrakId);

    return this.prisma.project.create({
      data: {
        kontrakId,
        namaProject: dto.namaProject.trim(),
      },
    });
  }
}
