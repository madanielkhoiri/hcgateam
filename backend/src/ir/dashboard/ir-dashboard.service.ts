// ==================================================
// FILE: backend/src/ir/dashboard/ir-dashboard.service.ts
// FUNGSI: Ringkasan & tren untuk dashboard PORTAL IR (Upload Dokumen,
// Aspirasi Karyawan, IR Course) - dipakai halaman /hc/ir/dashboard.
// ==================================================

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

const KATEGORI_DOKUMEN = ['SK', 'IM', 'FORM'] as const;

@Injectable()
export class IrDashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** Angka ringkas untuk kartu dashboard PORTAL IR. */
  async ringkasan() {
    const [totalDokumen, pertanyaanAktif, totalVideo, totalJawaban] =
      await Promise.all([
        this.prisma.dokumenIr.count(),
        this.prisma.aspirasiPertanyaan.count({ where: { aktif: true } }),
        this.prisma.irCourseVideo.count(),
        this.prisma.aspirasiJawaban.count(),
      ]);

    return { totalDokumen, pertanyaanAktif, totalVideo, totalJawaban };
  }

  /** Tren dokumen diunggah per bulan (tahun berjalan) + breakdown kategori dokumen. */
  async tren() {
    const tahun = new Date().getUTCFullYear();
    const awal = new Date(Date.UTC(tahun, 0, 1));
    const akhir = new Date(Date.UTC(tahun + 1, 0, 1));

    const [dokumen, breakdown] = await Promise.all([
      this.prisma.dokumenIr.findMany({
        where: { createdAt: { gte: awal, lt: akhir } },
        select: { createdAt: true },
      }),
      Promise.all(
        KATEGORI_DOKUMEN.map((kategori) =>
          this.prisma.dokumenIr
            .count({ where: { kategori } })
            .then((total) => ({ kategori, total })),
        ),
      ),
    ]);

    const totalPerBulan = Array.from({ length: 12 }, () => 0);

    for (const item of dokumen) {
      totalPerBulan[item.createdAt.getUTCMonth()] += 1;
    }

    return {
      tahun,
      trenBulanan: totalPerBulan.map((total, index) => ({
        bulan: index + 1,
        total,
      })),
      breakdownKategori: breakdown,
    };
  }
}
