// ==================================================
// FILE: backend/src/anak-magang/dashboard/anak-magang-dashboard.service.ts
// FUNGSI: Ringkasan & tren untuk dashboard Database Anak Magang - dipakai
// halaman /hc/anak-magang/dashboard.
// ==================================================

import { Injectable } from '@nestjs/common';
import { StatusAnakMagang } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const DAFTAR_STATUS = Object.values(StatusAnakMagang);

@Injectable()
export class AnakMagangDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Angka ringkas untuk kartu dashboard Database Anak Magang. */
  async ringkasan() {
    const sekarang = new Date();
    const awalBulan = new Date(Date.UTC(sekarang.getUTCFullYear(), sekarang.getUTCMonth(), 1));
    const awalBulanBerikutnya = new Date(
      Date.UTC(sekarang.getUTCFullYear(), sekarang.getUTCMonth() + 1, 1),
    );

    const [total, aktif, nonAktif, berakhirBulanIni] = await Promise.all([
      this.prisma.anakMagang.count(),
      this.prisma.anakMagang.count({ where: { status: StatusAnakMagang.AKTIF } }),
      this.prisma.anakMagang.count({ where: { status: StatusAnakMagang.NONAKTIF } }),
      this.prisma.anakMagang.count({
        where: { tanggalSelesai: { gte: awalBulan, lt: awalBulanBerikutnya } },
      }),
    ]);

    return { totalAnakMagang: total, aktif, nonAktif, berakhirBulanIni };
  }

  /** Tren anak magang mulai per bulan (tahun berjalan, berdasar tanggalMulai) + breakdown status. */
  async tren() {
    const tahun = new Date().getUTCFullYear();
    const awal = new Date(Date.UTC(tahun, 0, 1));
    const akhir = new Date(Date.UTC(tahun + 1, 0, 1));

    const [mulai, breakdown] = await Promise.all([
      this.prisma.anakMagang.findMany({
        where: { tanggalMulai: { gte: awal, lt: akhir } },
        select: { tanggalMulai: true },
      }),
      Promise.all(
        DAFTAR_STATUS.map((status) =>
          this.prisma.anakMagang
            .count({ where: { status } })
            .then((total) => ({ status, total })),
        ),
      ),
    ]);

    const totalPerBulan = Array.from({ length: 12 }, () => 0);

    for (const item of mulai) {
      if (item.tanggalMulai) {
        totalPerBulan[item.tanggalMulai.getUTCMonth()] += 1;
      }
    }

    return {
      tahun,
      trenBulanan: totalPerBulan.map((total, index) => ({
        bulan: index + 1,
        total,
      })),
      breakdownStatus: breakdown,
    };
  }
}
