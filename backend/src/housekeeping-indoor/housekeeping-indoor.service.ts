// ==================================================
// FILE: backend/src/housekeeping-indoor/housekeeping-indoor.service.ts
// FUNGSI: Laporan kebersihan Housekeeping Indoor (log biasa, tanpa approval)
// ==================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { LokasiHousekeepingIndoor } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HousekeepingIndoorFileService } from './housekeeping-indoor-file.service';
import { BuatHousekeepingIndoorDto } from './dto/housekeeping-indoor.dto';

@Injectable()
export class HousekeepingIndoorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly file: HousekeepingIndoorFileService,
  ) {}

  async daftar(lokasi?: LokasiHousekeepingIndoor) {
    return this.prisma.housekeepingIndoor.findMany({
      where: lokasi ? { lokasi } : undefined,
      include: {
        foto: true,
        pengirim: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async buat(dto: BuatHousekeepingIndoorDto, files: Express.Multer.File[], aktorId: number) {
    const laporan = await this.prisma.housekeepingIndoor.create({
      data: {
        lokasi: dto.lokasi,
        namaPetugas: dto.namaPetugas.trim(),
        createdBy: aktorId,
      },
    });

    if (files.length === 0) {
      return this.prisma.housekeepingIndoor.findUnique({
        where: { id: laporan.id },
        include: { foto: true, pengirim: { select: { id: true, name: true } } },
      });
    }

    const fileUrls: string[] = [];

    try {
      for (const file of files) {
        fileUrls.push(this.file.simpan(file, laporan.id));
      }

      await this.prisma.housekeepingIndoorFoto.createMany({
        data: fileUrls.map((fileUrl) => ({ laporanId: laporan.id, fileUrl })),
      });
    } catch (error) {
      fileUrls.forEach((fileUrl) => this.file.hapus(fileUrl));
      await this.prisma.housekeepingIndoor.delete({ where: { id: laporan.id } });
      throw error;
    }

    return this.prisma.housekeepingIndoor.findUnique({
      where: { id: laporan.id },
      include: { foto: true, pengirim: { select: { id: true, name: true } } },
    });
  }

  async hapus(id: number) {
    const laporan = await this.prisma.housekeepingIndoor.findUnique({
      where: { id },
      include: { foto: true },
    });

    if (!laporan) {
      throw new NotFoundException('Laporan tidak ditemukan');
    }

    await this.prisma.housekeepingIndoor.delete({ where: { id } });
    laporan.foto.forEach((f) => this.file.hapus(f.fileUrl));

    return { message: 'Laporan berhasil dihapus' };
  }
}
