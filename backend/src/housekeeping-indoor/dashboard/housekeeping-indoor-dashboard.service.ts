// ==================================================
// FILE: backend/src/housekeeping-indoor/dashboard/housekeeping-indoor-dashboard.service.ts
// FUNGSI: Ringkasan & tren untuk dashboard modul GA ▸ Housekeeping Indoor
// ==================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { LOKASI_HOUSEKEEPING_INDOOR } from '../dto/housekeeping-indoor.dto';

@Injectable()
export class HousekeepingIndoorDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Angka ringkas untuk kartu dashboard. */
  async ringkasan() {
    const sekarang = new Date();
    const awalBulan = new Date(Date.UTC(sekarang.getUTCFullYear(), sekarang.getUTCMonth(), 1));
    const awalBulanDepan = new Date(Date.UTC(sekarang.getUTCFullYear(), sekarang.getUTCMonth() + 1, 1));
    const awalHari = new Date(Date.UTC(sekarang.getUTCFullYear(), sekarang.getUTCMonth(), sekarang.getUTCDate()));
    const awalHariBerikutnya = new Date(awalHari.getTime() + 24 * 60 * 60 * 1000);

    const [totalLaporanBulanIni, totalFotoBulanIni, lokasiHariIni, totalLaporanKeseluruhan] =
      await Promise.all([
        this.prisma.housekeepingIndoor.count({
          where: { createdAt: { gte: awalBulan, lt: awalBulanDepan } },
        }),
        this.prisma.housekeepingIndoorFoto.count({
          where: { laporan: { createdAt: { gte: awalBulan, lt: awalBulanDepan } } },
        }),
        this.prisma.housekeepingIndoor.findMany({
          where: { createdAt: { gte: awalHari, lt: awalHariBerikutnya } },
          select: { lokasi: true },
          distinct: ['lokasi'],
        }),
        this.prisma.housekeepingIndoor.count(),
      ]);

    return {
      totalLaporanBulanIni,
      totalFotoBulanIni,
      lokasiDilaporkanHariIni: lokasiHariIni.length,
      totalLokasi: LOKASI_HOUSEKEEPING_INDOOR.length,
      totalLaporanKeseluruhan,
    };
  }

  /** Tren jumlah laporan per bulan (tahun berjalan) + breakdown per lokasi, untuk dashboard modul. */
  async trenDanLokasi() {
    const tahun = new Date().getUTCFullYear();
    const awal = new Date(Date.UTC(tahun, 0, 1));
    const akhir = new Date(Date.UTC(tahun + 1, 0, 1));

    const [laporanTahunIni, breakdownLokasi] = await Promise.all([
      this.prisma.housekeepingIndoor.findMany({
        where: { createdAt: { gte: awal, lt: akhir } },
        select: { createdAt: true },
      }),
      this.prisma.housekeepingIndoor.groupBy({
        by: ['lokasi'],
        where: { createdAt: { gte: awal, lt: akhir } },
        _count: { _all: true },
      }),
    ]);

    const totalPerBulan = Array.from({ length: 12 }, () => 0);

    for (const row of laporanTahunIni) {
      totalPerBulan[row.createdAt.getUTCMonth()] += 1;
    }

    return {
      tahun,
      trenBulanan: totalPerBulan.map((total, index) => ({
        bulan: index + 1,
        total,
      })),
      breakdownLokasi: breakdownLokasi.map((row) => ({
        lokasi: row.lokasi,
        total: row._count._all,
      })),
    };
  }
}
