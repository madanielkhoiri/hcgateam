// ==================================================
// FILE: backend/src/surat-tugas-dinas/dashboard/surat-tugas-dinas-dashboard.service.ts
// FUNGSI: Ringkasan & tren untuk dashboard Form Tugas Dinas - dipakai
// halaman /hc/tugas-dinas/dashboard. Visibilitas data mengikuti aturan
// yang sama dengan SuratTugasDinasService.daftar (SH/PJO/Admin melihat
// semua surat, akun lain hanya surat buatannya sendiri).
// ==================================================

import { Injectable } from '@nestjs/common';
import { Prisma, StatusSuratTugas, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const DAFTAR_STATUS = Object.values(StatusSuratTugas);

type AktorSurat = {
  id: number;
  role: UserRole;
};

@Injectable()
export class SuratTugasDinasDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private bolehLihatSemua(aktor: AktorSurat): boolean {
    return (
      aktor.role === UserRole.ADMIN ||
      aktor.role === UserRole.SUPER_ADMIN ||
      aktor.role === UserRole.SECTION_HEAD ||
      aktor.role === UserRole.PJO
    );
  }

  private lingkup(aktor: AktorSurat): Prisma.SuratTugasDinasWhereInput {
    return this.bolehLihatSemua(aktor) ? {} : { dibuatOlehId: aktor.id };
  }

  /** Angka ringkas untuk kartu dashboard Form Tugas Dinas. */
  async ringkasan(aktor: AktorSurat) {
    const lingkup = this.lingkup(aktor);

    const [totalSurat, menungguSh, menungguPjo, disetujui] =
      await Promise.all([
        this.prisma.suratTugasDinas.count({ where: lingkup }),
        this.prisma.suratTugasDinas.count({
          where: { ...lingkup, status: StatusSuratTugas.MENUNGGU_SH },
        }),
        this.prisma.suratTugasDinas.count({
          where: { ...lingkup, status: StatusSuratTugas.MENUNGGU_PJO },
        }),
        this.prisma.suratTugasDinas.count({
          where: { ...lingkup, status: StatusSuratTugas.DISETUJUI },
        }),
      ]);

    return { totalSurat, menungguSh, menungguPjo, disetujui };
  }

  /** Tren surat dibuat per bulan (tahun berjalan) + breakdown status. */
  async tren(aktor: AktorSurat) {
    const tahun = new Date().getUTCFullYear();
    const awal = new Date(Date.UTC(tahun, 0, 1));
    const akhir = new Date(Date.UTC(tahun + 1, 0, 1));
    const lingkup = this.lingkup(aktor);

    const [surat, breakdown] = await Promise.all([
      this.prisma.suratTugasDinas.findMany({
        where: { ...lingkup, createdAt: { gte: awal, lt: akhir } },
        select: { createdAt: true },
      }),
      Promise.all(
        DAFTAR_STATUS.map((status) =>
          this.prisma.suratTugasDinas
            .count({ where: { ...lingkup, status } })
            .then((total) => ({ status, total })),
        ),
      ),
    ]);

    const totalPerBulan = Array.from({ length: 12 }, () => 0);

    for (const item of surat) {
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
