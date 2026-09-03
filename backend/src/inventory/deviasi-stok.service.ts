// ==================================================
// FILE: backend/src/inventory/deviasi-stok.service.ts
// FUNGSI: Catat & tampilkan riwayat deviasi stok — setiap kali stok
// diedit langsung (bukan lewat barang masuk/keluar) dan angkanya
// berubah, dicatat sebagai KURANG (stok hilang) atau LEBIH (stok tidak
// tercatat lewat barang masuk).
// ==================================================

import { Injectable } from '@nestjs/common';
import { JenisDeviasiStok, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DeviasiStokService {
  constructor(private readonly prisma: PrismaService) {}

  /** Dipanggil di dalam transaksi yang sama dengan update stok, supaya konsisten. */
  async catatJikaBerubah(
    tx: Prisma.TransactionClient,
    itemId: number,
    stokLama: number,
    stokBaru: number,
    aktorId: number,
  ) {
    const selisih = stokBaru - stokLama;

    if (selisih === 0) {
      return;
    }

    await tx.deviasiStok.create({
      data: {
        itemId,
        stokLama,
        stokBaru,
        selisih,
        jenis: selisih < 0 ? JenisDeviasiStok.KURANG : JenisDeviasiStok.LEBIH,
        diubahOleh: aktorId,
      },
    });
  }

  /** Dashboard deviasi — bulan opsional (kosong = semua bulan dalam tahun terpilih). */
  async rekap(bulan?: number, tahun?: number) {
    const sekarang = new Date();
    const tahunDipilih = tahun ?? sekarang.getFullYear();

    const rentangAwal = bulan ? new Date(tahunDipilih, bulan - 1, 1) : new Date(tahunDipilih, 0, 1);
    const rentangAkhir = bulan ? new Date(tahunDipilih, bulan, 1) : new Date(tahunDipilih + 1, 0, 1);

    const [daftar, perBulan] = await Promise.all([
      this.prisma.deviasiStok.findMany({
        where: { createdAt: { gte: rentangAwal, lt: rentangAkhir } },
        include: {
          item: { select: { code: true, name: true, inventoryScope: true, unit: true, category: true } },
          pengubah: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.hitungPerBulan(tahunDipilih),
    ]);

    return {
      bulan: bulan ?? null,
      tahun: tahunDipilih,
      totalDeviasi: daftar.length,
      totalKurang: daftar.filter((item) => item.jenis === JenisDeviasiStok.KURANG).length,
      totalLebih: daftar.filter((item) => item.jenis === JenisDeviasiStok.LEBIH).length,
      daftar: daftar.map((item) => ({
        id: item.id,
        kodeBarang: item.item.code,
        namaBarang: item.item.name,
        area: item.item.inventoryScope,
        satuan: item.item.unit,
        stokLama: item.stokLama,
        stokBaru: item.stokBaru,
        selisih: item.selisih,
        jenis: item.jenis,
        diubahOleh: item.pengubah.name,
        createdAt: item.createdAt,
      })),
      perBulan,
    };
  }

  /** Breakdown 12 bulan untuk grafik dashboard — selalu satu tahun penuh, lepas dari filter bulan yang dipilih. */
  private async hitungPerBulan(tahun: number) {
    const awal = new Date(tahun, 0, 1);
    const akhir = new Date(tahun + 1, 0, 1);

    const data = await this.prisma.deviasiStok.findMany({
      where: { createdAt: { gte: awal, lt: akhir } },
      select: { jenis: true, createdAt: true },
    });

    const hasil: Array<{ bulan: number; label: string; kurang: number; lebih: number }> = [];

    for (let bulan = 0; bulan < 12; bulan += 1) {
      const punyaBulanIni = data.filter((item) => item.createdAt.getMonth() === bulan);

      hasil.push({
        bulan: bulan + 1,
        label: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(new Date(tahun, bulan, 1)),
        kurang: punyaBulanIni.filter((item) => item.jenis === JenisDeviasiStok.KURANG).length,
        lebih: punyaBulanIni.filter((item) => item.jenis === JenisDeviasiStok.LEBIH).length,
      });
    }

    return hasil;
  }
}
