// ==================================================
// FILE: backend/src/helpdesk/dashboard/helpdesk-dashboard.service.ts
// FUNGSI: Ringkasan & tren untuk dashboard Helpdesk Center - dipakai
// halaman /hc/helpdesk/dashboard. Visibilitas data mengikuti aturan yang
// sama dengan HelpdeskService (Admin/Admin HC melihat semua tiket, akun
// lain hanya tiket buatannya sendiri).
// ==================================================

import { Injectable } from '@nestjs/common';
import { Prisma, StatusTiketHelpdesk, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

const DAFTAR_STATUS = Object.values(StatusTiketHelpdesk);

type AktorHelpdesk = {
  id: number;
  role: UserRole;
};

@Injectable()
export class HelpdeskDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  private isPic(aktor: AktorHelpdesk): boolean {
    return aktor.role === UserRole.ADMIN || aktor.role === UserRole.SUPER_ADMIN;
  }

  private lingkup(aktor: AktorHelpdesk): Prisma.TiketHelpdeskWhereInput {
    return this.isPic(aktor) ? {} : { pembuatId: aktor.id };
  }

  /** Angka ringkas untuk kartu dashboard Helpdesk Center. */
  async ringkasan(aktor: AktorHelpdesk) {
    const lingkup = this.lingkup(aktor);

    const [totalTiket, terbuka, diproses, selesai] = await Promise.all([
      this.prisma.tiketHelpdesk.count({ where: lingkup }),
      this.prisma.tiketHelpdesk.count({
        where: { ...lingkup, status: StatusTiketHelpdesk.TERBUKA },
      }),
      this.prisma.tiketHelpdesk.count({
        where: { ...lingkup, status: StatusTiketHelpdesk.DIPROSES },
      }),
      this.prisma.tiketHelpdesk.count({
        where: { ...lingkup, status: StatusTiketHelpdesk.SELESAI },
      }),
    ]);

    return { totalTiket, terbuka, diproses, selesai };
  }

  /** Tren tiket dibuat per bulan (tahun berjalan) + breakdown status. */
  async tren(aktor: AktorHelpdesk) {
    const tahun = new Date().getUTCFullYear();
    const awal = new Date(Date.UTC(tahun, 0, 1));
    const akhir = new Date(Date.UTC(tahun + 1, 0, 1));
    const lingkup = this.lingkup(aktor);

    const [tiket, breakdown] = await Promise.all([
      this.prisma.tiketHelpdesk.findMany({
        where: { ...lingkup, dibuatPada: { gte: awal, lt: akhir } },
        select: { dibuatPada: true },
      }),
      Promise.all(
        DAFTAR_STATUS.map((status) =>
          this.prisma.tiketHelpdesk
            .count({ where: { ...lingkup, status } })
            .then((total) => ({ status, total })),
        ),
      ),
    ]);

    const totalPerBulan = Array.from({ length: 12 }, () => 0);

    for (const item of tiket) {
      totalPerBulan[item.dibuatPada.getUTCMonth()] += 1;
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
