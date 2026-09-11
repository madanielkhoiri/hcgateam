// ==================================================
// FILE: backend/src/kip/kip-dashboard.service.ts
// FUNGSI: Ringkasan & tren untuk dashboard modul KIP (Kartu Inspeksi
// Peralatan) — dipakai halaman civil/electric-kip/dashboard.
// TIDAK menyentuh rute publik kip-scan/kip/publik/:kode.
// ==================================================

import { Injectable } from '@nestjs/common';
import { StatusChecklistKip } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class KipDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Angka ringkas kartu dashboard: total KIP, lokasi terpakai, checklist bulan berjalan, dan yang terlewat. */
  async ringkasan() {
    const sekarang = new Date();
    const bulanIni = sekarang.getMonth() + 1;
    const tahunIni = sekarang.getFullYear();
    const skorSekarang = tahunIni * 12 + bulanIni;

    const [totalKip, lokasiUnik, semuaChecklist] = await Promise.all([
      this.prisma.kip.count(),
      this.prisma.kip.groupBy({ by: ['lokasi'] }),
      this.prisma.kipChecklistBulan.findMany({
        select: { bulan: true, status: true, kip: { select: { tahun: true } } },
      }),
    ]);

    let checklistSudahBulanIni = 0;
    let checklistBelumBulanIni = 0;
    let checklistTerlewat = 0;

    for (const baris of semuaChecklist) {
      const skorBaris = baris.kip.tahun * 12 + baris.bulan;

      if (skorBaris === skorSekarang) {
        if (baris.status === StatusChecklistKip.SUDAH) {
          checklistSudahBulanIni += 1;
        } else {
          checklistBelumBulanIni += 1;
        }
      } else if (skorBaris < skorSekarang && baris.status === StatusChecklistKip.BELUM) {
        checklistTerlewat += 1;
      }
    }

    return {
      totalKip,
      lokasiTerpakai: lokasiUnik.length,
      checklistSudahBulanIni,
      checklistBelumBulanIni,
      checklistTerlewat,
    };
  }

  /** Tren jumlah checklist SUDAH per bulan (tahun berjalan, berdasar tahun siklus KIP-nya) + breakdown status checklist tahun berjalan. */
  async trenDanStatus() {
    const tahun = new Date().getFullYear();

    const [checklistSudahTahunIni, sudah, belum] = await Promise.all([
      this.prisma.kipChecklistBulan.findMany({
        where: { status: StatusChecklistKip.SUDAH, kip: { tahun } },
        select: { bulan: true },
      }),
      this.prisma.kipChecklistBulan.count({
        where: { status: StatusChecklistKip.SUDAH, kip: { tahun } },
      }),
      this.prisma.kipChecklistBulan.count({
        where: { status: StatusChecklistKip.BELUM, kip: { tahun } },
      }),
    ]);

    const totalPerBulan = Array.from({ length: 12 }, () => 0);

    for (const baris of checklistSudahTahunIni) {
      totalPerBulan[baris.bulan - 1] += 1;
    }

    return {
      tahun,
      trenBulanan: totalPerBulan.map((total, index) => ({ bulan: index + 1, total })),
      statusChecklist: { sudah, belum },
    };
  }
}
