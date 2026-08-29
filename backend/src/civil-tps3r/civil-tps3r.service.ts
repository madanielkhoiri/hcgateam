// ==================================================
// FILE: backend/src/civil-tps3r/civil-tps3r.service.ts
// FUNGSI: Laporan timbangan sampah TPS 3R (Civil Infras) — satu
// laporan mencakup Organik, Non Organik, Guna Ulang/Reuse,
// Daur Ulang/Recycle, dan Residu sekaligus (kg).
// ==================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BuatLaporanTps3rDto, UbahLaporanTps3rDto } from './dto/tps3r.dto';
import type { AktorPostingan } from '../postingan/postingan-aktor';

@Injectable()
export class CivilTps3rService {
  constructor(private readonly prisma: PrismaService) {}

  async daftar(bulan?: number, tahun?: number) {
    const rentang = rentangTanggal(bulan, tahun);

    return this.prisma.laporanTps3r.findMany({
      where: rentang ? { tanggal: rentang } : undefined,
      include: { createdBy: { select: { id: true, name: true, nrp: true } } },
      orderBy: [{ tanggal: 'desc' }, { id: 'desc' }],
    });
  }

  async ringkasan(bulan?: number, tahun?: number) {
    const rentang = rentangTanggal(bulan, tahun);

    const hasil = await this.prisma.laporanTps3r.aggregate({
      where: rentang ? { tanggal: rentang } : undefined,
      _sum: {
        beratOrganik: true,
        beratNonOrganik: true,
        beratReuse: true,
        beratRecycle: true,
        beratResidu: true,
      },
      _count: { _all: true },
    });

    return {
      totalLaporan: hasil._count._all,
      totalOrganik: hasil._sum.beratOrganik ?? 0,
      totalNonOrganik: hasil._sum.beratNonOrganik ?? 0,
      totalReuse: hasil._sum.beratReuse ?? 0,
      totalRecycle: hasil._sum.beratRecycle ?? 0,
      totalResidu: hasil._sum.beratResidu ?? 0,
    };
  }

  /** Total setoran sampah per bulan (semua kategori dijumlah) selama satu tahun — untuk grafik tren naik/turun. */
  async trenBulanan(tahun: number) {
    const awal = new Date(Date.UTC(tahun, 0, 1));
    const akhir = new Date(Date.UTC(tahun + 1, 0, 1));

    const rows = await this.prisma.laporanTps3r.findMany({
      where: { tanggal: { gte: awal, lt: akhir } },
      select: {
        tanggal: true,
        beratOrganik: true,
        beratNonOrganik: true,
        beratReuse: true,
        beratRecycle: true,
        beratResidu: true,
      },
    });

    const totalPerBulan = Array.from({ length: 12 }, () => 0);

    for (const row of rows) {
      const indexBulan = row.tanggal.getUTCMonth();
      const total =
        row.beratOrganik +
        row.beratNonOrganik +
        row.beratReuse +
        row.beratRecycle +
        row.beratResidu;

      totalPerBulan[indexBulan] += total;
    }

    return totalPerBulan.map((totalKg, index) => ({ bulan: index + 1, totalKg }));
  }

  async buat(aktor: AktorPostingan, dto: BuatLaporanTps3rDto) {
    return this.prisma.laporanTps3r.create({
      data: {
        tanggal: new Date(`${dto.tanggal}T00:00:00.000Z`),
        beratOrganik: dto.beratOrganik,
        beratNonOrganik: dto.beratNonOrganik,
        beratReuse: dto.beratReuse,
        beratRecycle: dto.beratRecycle,
        beratResidu: dto.beratResidu,
        createdById: aktor.id,
      },
      include: { createdBy: { select: { id: true, name: true, nrp: true } } },
    });
  }

  async ubah(id: number, dto: UbahLaporanTps3rDto) {
    await this.wajibAda(id);

    return this.prisma.laporanTps3r.update({
      where: { id },
      data: {
        ...(dto.tanggal !== undefined
          ? { tanggal: new Date(`${dto.tanggal}T00:00:00.000Z`) }
          : {}),
        ...(dto.beratOrganik !== undefined ? { beratOrganik: dto.beratOrganik } : {}),
        ...(dto.beratNonOrganik !== undefined ? { beratNonOrganik: dto.beratNonOrganik } : {}),
        ...(dto.beratReuse !== undefined ? { beratReuse: dto.beratReuse } : {}),
        ...(dto.beratRecycle !== undefined ? { beratRecycle: dto.beratRecycle } : {}),
        ...(dto.beratResidu !== undefined ? { beratResidu: dto.beratResidu } : {}),
      },
      include: { createdBy: { select: { id: true, name: true, nrp: true } } },
    });
  }

  async hapus(id: number) {
    await this.wajibAda(id);
    await this.prisma.laporanTps3r.delete({ where: { id } });
    return { message: 'Laporan berhasil dihapus' };
  }

  private async wajibAda(id: number) {
    const data = await this.prisma.laporanTps3r.findUnique({ where: { id } });
    if (!data) {
      throw new NotFoundException('Laporan tidak ditemukan');
    }
    return data;
  }
}

function rentangTanggal(bulan?: number, tahun?: number) {
  if (!tahun) {
    return undefined;
  }

  const startMonth = bulan ? bulan - 1 : 0;
  const awal = new Date(Date.UTC(tahun, startMonth, 1));
  const akhir = bulan
    ? new Date(Date.UTC(tahun, bulan, 1))
    : new Date(Date.UTC(tahun + 1, 0, 1));

  return { gte: awal, lt: akhir };
}
