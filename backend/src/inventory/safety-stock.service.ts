// ==================================================
// FILE: backend/src/inventory/safety-stock.service.ts
// FUNGSI: Analisa Safety Stock & rekomendasi order bulanan per barang,
// dihitung dari riwayat Barang Keluar (pemakaian) & Barang Masuk harian.
//
// Rumus (periodic review, order sebulan sekali):
//   rata-rata harian (d)   = total keluar / jumlah hari periode
//   simpangan harian (σ)   = standar deviasi pemakaian harian (hari tanpa keluar = 0)
//   Safety Stock (SS)      = Z × σ × √LeadTime
//   Titik Order (ROP)      = d × LeadTime + SS
//   Rekomendasi Order      = d × (30 + LeadTime) + SS − stok saat ini   (minimal 0)
// Z dari service level: 90% = 1,28 · 95% = 1,65 · 98% = 2,05 · 99% = 2,33.
// ==================================================

import { BadRequestException, Injectable } from '@nestjs/common';
import { InventoryScope } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export const NILAI_Z: Record<number, number> = { 90: 1.28, 95: 1.65, 98: 2.05, 99: 2.33 };
const HARI_SIKLUS_ORDER = 30;
const WITA_MS = 8 * 60 * 60 * 1000;
const HARI_MS = 24 * 60 * 60 * 1000;

export type StatusSafetyStock = 'KRITIS' | 'PERLU_ORDER' | 'AMAN' | 'TIDAK_BERGERAK';

export type HasilHitung = {
  totalKeluar: number;
  totalMasuk: number;
  hariAdaKeluar: number;
  rataHarian: number;
  maksHarian: number;
  simpanganHarian: number;
  kebutuhanBulanan: number;
  safetyStock: number;
  titikOrder: number;
  rekomendasiOrder: number;
  /** Stok cukup untuk berapa hari (null = tidak ada pemakaian). */
  hariTahan: number | null;
  status: StatusSafetyStock;
};

const bulat2 = (n: number) => Math.round(n * 100) / 100;

/**
 * Hitung safety stock satu barang.
 * @param keluarHarian pemakaian per hari selama periode (panjang = jumlah hari, 0 bila tidak ada).
 */
export function hitungSafetyStock(params: {
  keluarHarian: number[];
  totalMasuk: number;
  stok: number;
  leadTime: number;
  z: number;
}): HasilHitung {
  const { keluarHarian, totalMasuk, stok, leadTime, z } = params;
  const hari = Math.max(1, keluarHarian.length);
  const totalKeluar = keluarHarian.reduce((t, n) => t + n, 0);
  const rata = totalKeluar / hari;
  const varian = keluarHarian.reduce((t, n) => t + (n - rata) ** 2, 0) / hari;
  const sigma = Math.sqrt(varian);

  const safetyStock = Math.ceil(z * sigma * Math.sqrt(leadTime));
  const titikOrder = Math.ceil(rata * leadTime + safetyStock);
  const kebutuhanBulanan = Math.ceil(rata * HARI_SIKLUS_ORDER);
  const target = Math.ceil(rata * (HARI_SIKLUS_ORDER + leadTime) + safetyStock);
  const rekomendasiOrder = totalKeluar > 0 ? Math.max(0, target - stok) : 0;

  let status: StatusSafetyStock;
  if (totalKeluar === 0) status = 'TIDAK_BERGERAK';
  else if (stok <= safetyStock) status = 'KRITIS';
  else if (stok <= titikOrder) status = 'PERLU_ORDER';
  else status = 'AMAN';

  return {
    totalKeluar,
    totalMasuk,
    hariAdaKeluar: keluarHarian.filter((n) => n > 0).length,
    rataHarian: bulat2(rata),
    maksHarian: keluarHarian.reduce((m, n) => Math.max(m, n), 0),
    simpanganHarian: bulat2(sigma),
    kebutuhanBulanan,
    safetyStock,
    titikOrder,
    rekomendasiOrder,
    hariTahan: rata > 0 ? Math.floor(stok / rata) : null,
    status,
  };
}

const kunciHari = (d: Date) => d.toISOString().slice(0, 10);

@Injectable()
export class SafetyStockService {
  constructor(private readonly prisma: PrismaService) {}

  private parseScope(value: string): InventoryScope {
    const mentah = String(value ?? '').trim().toUpperCase();
    const scope = mentah === 'INFRAS' ? InventoryScope.GENERAL : mentah;
    if (!(Object.values(InventoryScope) as string[]).includes(scope)) {
      throw new BadRequestException('Tipe inventory hanya Infras, Mess, atau Electric');
    }
    return scope as InventoryScope;
  }

  async analisa(scopeValue: string, bulanRaw?: string, leadTimeRaw?: string, serviceLevelRaw?: string) {
    const scope = this.parseScope(scopeValue);

    const periodeBulan = [1, 3, 6, 12].includes(Number(bulanRaw)) ? Number(bulanRaw) : 3;
    const leadTime = Number(leadTimeRaw ?? 7);
    if (!Number.isInteger(leadTime) || leadTime < 1 || leadTime > 90) {
      throw new BadRequestException('Lead time harus 1 - 90 hari');
    }
    const serviceLevel = NILAI_Z[Number(serviceLevelRaw)] ? Number(serviceLevelRaw) : 95;
    const z = NILAI_Z[serviceLevel];

    // Hari ini (WITA) sebagai tanggal UTC 00:00, sama dengan kolom @db.Date.
    const sekarangWita = new Date(Date.now() + WITA_MS);
    const hariIni = new Date(Date.UTC(sekarangWita.getUTCFullYear(), sekarangWita.getUTCMonth(), sekarangWita.getUTCDate()));
    const awalJendela = new Date(Date.UTC(hariIni.getUTCFullYear(), hariIni.getUTCMonth() - periodeBulan, hariIni.getUTCDate() + 1));

    const [items, transaksiPertama, keluar, masuk] = await Promise.all([
      this.prisma.item.findMany({
        where: { inventoryScope: scope, isActive: true },
        select: { id: true, code: true, name: true, unit: true, category: true, lokasiGudang: true, stock: { select: { quantity: true } } },
        orderBy: { name: 'asc' },
      }),
      Promise.all([
        this.prisma.stockOut.findFirst({ where: { item: { inventoryScope: scope } }, orderBy: { date: 'asc' }, select: { date: true } }),
        this.prisma.stockIn.findFirst({ where: { item: { inventoryScope: scope } }, orderBy: { date: 'asc' }, select: { date: true } }),
      ]),
      this.prisma.stockOut.findMany({
        where: { date: { gte: awalJendela, lte: hariIni }, item: { inventoryScope: scope } },
        select: { itemId: true, date: true, quantity: true },
      }),
      this.prisma.stockIn.findMany({
        where: { date: { gte: awalJendela, lte: hariIni }, item: { inventoryScope: scope } },
        select: { itemId: true, date: true, quantity: true },
      }),
    ]);

    // Periode dimulai dari transaksi pertama bila aplikasi baru dipakai (tidak dihitung hari kosong sebelumnya).
    const pertama = [transaksiPertama[0]?.date, transaksiPertama[1]?.date]
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime())[0];
    const awal = pertama && pertama > awalJendela ? pertama : awalJendela;
    const jumlahHari = Math.max(1, Math.round((hariIni.getTime() - awal.getTime()) / HARI_MS) + 1);
    const indeksHari = (d: Date) => Math.round((d.getTime() - awal.getTime()) / HARI_MS);

    // Bulan-bulan dalam periode untuk rincian per bulan.
    const daftarBulan: string[] = [];
    for (let d = new Date(Date.UTC(awal.getUTCFullYear(), awal.getUTCMonth(), 1)); d <= hariIni; d = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1))) {
      daftarBulan.push(kunciHari(d).slice(0, 7));
    }

    const harian = new Map<number, number[]>();
    const perBulan = new Map<number, Map<string, { masuk: number; keluar: number }>>();
    const totalMasuk = new Map<number, number>();
    const catatBulan = (itemId: number, d: Date, jenis: 'masuk' | 'keluar', qty: number) => {
      const peta = perBulan.get(itemId) ?? new Map<string, { masuk: number; keluar: number }>();
      const kunci = kunciHari(d).slice(0, 7);
      const isi = peta.get(kunci) ?? { masuk: 0, keluar: 0 };
      isi[jenis] += qty;
      peta.set(kunci, isi);
      perBulan.set(itemId, peta);
    };

    for (const row of keluar) {
      const i = indeksHari(row.date);
      if (i < 0 || i >= jumlahHari) continue;
      const deret = harian.get(row.itemId) ?? new Array<number>(jumlahHari).fill(0);
      deret[i] += row.quantity;
      harian.set(row.itemId, deret);
      catatBulan(row.itemId, row.date, 'keluar', row.quantity);
    }
    for (const row of masuk) {
      if (indeksHari(row.date) < 0) continue;
      totalMasuk.set(row.itemId, (totalMasuk.get(row.itemId) ?? 0) + row.quantity);
      catatBulan(row.itemId, row.date, 'masuk', row.quantity);
    }

    const kosong = new Array<number>(jumlahHari).fill(0);
    const hasil = items.map((item) => {
      const stok = item.stock?.quantity ?? 0;
      const hitung = hitungSafetyStock({
        keluarHarian: harian.get(item.id) ?? kosong,
        totalMasuk: totalMasuk.get(item.id) ?? 0,
        stok,
        leadTime,
        z,
      });
      const peta = perBulan.get(item.id);
      return {
        itemId: item.id,
        code: item.code,
        name: item.name,
        unit: item.unit,
        category: item.category,
        lokasiGudang: item.lokasiGudang,
        stok,
        ...hitung,
        perBulan: daftarBulan.map((bulan) => ({ bulan, masuk: peta?.get(bulan)?.masuk ?? 0, keluar: peta?.get(bulan)?.keluar ?? 0 })),
      };
    });

    const hitungStatus = (status: StatusSafetyStock) => hasil.filter((h) => h.status === status).length;

    return {
      scope,
      parameter: { periodeBulan, leadTime, serviceLevel, z },
      periode: { awal: kunciHari(awal), akhir: kunciHari(hariIni), jumlahHari, dibatasiTransaksiPertama: awal > awalJendela },
      ringkasan: {
        totalBarang: hasil.length,
        kritis: hitungStatus('KRITIS'),
        perluOrder: hitungStatus('PERLU_ORDER'),
        aman: hitungStatus('AMAN'),
        tidakBergerak: hitungStatus('TIDAK_BERGERAK'),
        barangDiorder: hasil.filter((h) => h.rekomendasiOrder > 0).length,
      },
      items: hasil,
    };
  }
}
