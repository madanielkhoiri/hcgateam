// ==================================================
// FILE: backend/src/database-karyawan/dashboard/database-karyawan-dashboard.service.ts
// FUNGSI: Ringkasan & tren untuk dashboard Database Karyawan - dipakai
// halaman /hc/karyawan/dashboard.
// ==================================================

import { Injectable } from '@nestjs/common';
import { StatusKerja } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const DAFTAR_STATUS_KERJA = Object.values(StatusKerja);

@Injectable()
export class DatabaseKaryawanDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Angka ringkas untuk kartu dashboard Database Karyawan. */
  async ringkasan() {
    const [totalKaryawan, karyawanAktif, departemen, waTerdaftar] =
      await Promise.all([
        this.prisma.karyawan.count(),
        this.prisma.karyawan.count({ where: { statusKerja: StatusKerja.AKTIF } }),
        this.prisma.karyawan.findMany({
          select: { departemenId: true },
          distinct: ['departemenId'],
        }),
        this.prisma.karyawan.count({ where: { waTerdaftar: true } }),
      ]);

    return {
      totalKaryawan,
      karyawanAktif,
      jumlahDepartemen: departemen.length,
      waTerdaftar,
    };
  }

  /** Tren karyawan baru per bulan (tahun berjalan) + breakdown status kerja. */
  async tren() {
    const tahun = new Date().getUTCFullYear();
    const awal = new Date(Date.UTC(tahun, 0, 1));
    const akhir = new Date(Date.UTC(tahun + 1, 0, 1));

    const [karyawanBaru, breakdown] = await Promise.all([
      this.prisma.karyawan.findMany({
        where: { createdAt: { gte: awal, lt: akhir } },
        select: { createdAt: true },
      }),
      Promise.all(
        DAFTAR_STATUS_KERJA.map((statusKerja) =>
          this.prisma.karyawan
            .count({ where: { statusKerja } })
            .then((total) => ({ status: statusKerja, total })),
        ),
      ),
    ]);

    const totalPerBulan = Array.from({ length: 12 }, () => 0);

    for (const item of karyawanBaru) {
      totalPerBulan[item.createdAt.getUTCMonth()] += 1;
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
