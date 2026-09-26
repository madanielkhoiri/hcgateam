// ==================================================
// FILE: backend/src/housekeeping-indoor/housekeeping-indoor.service.ts
// FUNGSI: Laporan kebersihan Housekeeping Indoor (log biasa, tanpa approval)
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LokasiHousekeepingIndoor } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { hasilHalaman, paramHalaman } from '../common/pagination.util';
import { HousekeepingIndoorFileService } from './housekeeping-indoor-file.service';
import { BuatHousekeepingIndoorDto, UbahHousekeepingIndoorDto } from './dto/housekeeping-indoor.dto';

@Injectable()
export class HousekeepingIndoorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly file: HousekeepingIndoorFileService,
  ) {}

  async daftar(filter: {
    lokasi?: LokasiHousekeepingIndoor;
    bulan?: number;
    tahun?: number;
    halaman?: string;
    ukuranHalaman?: string;
  } = {}) {
    // Filter bulan/tahun dipindah ke sini (dulu di frontend, cuma memfilter
    // baris yang sudah termuat) supaya tetap benar walau daftarnya dipaginate.
    const tahunEfektif = filter.tahun ?? (filter.bulan ? new Date().getUTCFullYear() : undefined);
    const rentangTanggal = tahunEfektif
      ? {
          gte: new Date(Date.UTC(tahunEfektif, filter.bulan ? filter.bulan - 1 : 0, 1)),
          lt: filter.bulan
            ? new Date(Date.UTC(tahunEfektif, filter.bulan, 1))
            : new Date(Date.UTC(tahunEfektif + 1, 0, 1)),
        }
      : undefined;

    const where = {
      ...(filter.lokasi ? { lokasi: filter.lokasi } : {}),
      ...(rentangTanggal ? { createdAt: rentangTanggal } : {}),
    };
    const param = paramHalaman(filter.halaman, filter.ukuranHalaman);

    const [data, total] = await Promise.all([
      this.prisma.housekeepingIndoor.findMany({
        where,
        include: {
          foto: true,
          pengirim: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: param.skip,
        take: param.take,
      }),
      this.prisma.housekeepingIndoor.count({ where }),
    ]);

    return hasilHalaman(data, total, param);
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

  /** Ubah metadata laporan (lokasi & nama petugas). Foto tidak diubah. */
  async ubah(id: number, dto: UbahHousekeepingIndoorDto) {
    const laporan = await this.prisma.housekeepingIndoor.findUnique({ where: { id } });

    if (!laporan) {
      throw new NotFoundException('Laporan tidak ditemukan');
    }

    const namaPetugas = dto.namaPetugas?.trim();

    if (dto.namaPetugas !== undefined && !namaPetugas) {
      throw new BadRequestException('Nama petugas tidak boleh kosong');
    }

    return this.prisma.housekeepingIndoor.update({
      where: { id },
      data: {
        ...(dto.lokasi !== undefined ? { lokasi: dto.lokasi } : {}),
        ...(namaPetugas !== undefined ? { namaPetugas } : {}),
      },
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
