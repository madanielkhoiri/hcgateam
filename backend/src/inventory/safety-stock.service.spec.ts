import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { hitungSafetyStock, SafetyStockService } from './safety-stock.service';

describe('hitungSafetyStock', () => {
  it('pemakaian rata tanpa variasi -> safety stock 0, order = kebutuhan 30+LT hari dikurangi stok', () => {
    const hasil = hitungSafetyStock({ keluarHarian: new Array(30).fill(2), totalMasuk: 0, stok: 20, leadTime: 7, z: 1.65 });

    expect(hasil.rataHarian).toBe(2);
    expect(hasil.simpanganHarian).toBe(0);
    expect(hasil.safetyStock).toBe(0);
    expect(hasil.titikOrder).toBe(14); // 2 x 7
    expect(hasil.kebutuhanBulanan).toBe(60);
    expect(hasil.rekomendasiOrder).toBe(54); // 2 x 37 - 20
    expect(hasil.hariTahan).toBe(10);
    expect(hasil.status).toBe('AMAN');
  });

  it('pemakaian naik-turun -> safety stock = Z x σ x √LT (dibulatkan ke atas)', () => {
    // 0 dan 10 bergantian: rata 5, σ 5
    const deret = Array.from({ length: 10 }, (_, i) => (i % 2 ? 10 : 0));
    const hasil = hitungSafetyStock({ keluarHarian: deret, totalMasuk: 0, stok: 100, leadTime: 4, z: 1.65 });

    expect(hasil.simpanganHarian).toBe(5);
    expect(hasil.safetyStock).toBe(Math.ceil(1.65 * 5 * 2)); // 17
    expect(hasil.titikOrder).toBe(5 * 4 + 17);
    expect(hasil.maksHarian).toBe(10);
    expect(hasil.hariAdaKeluar).toBe(5);
  });

  it('status KRITIS bila stok <= safety stock, PERLU_ORDER bila <= titik order', () => {
    const deret = Array.from({ length: 10 }, (_, i) => (i % 2 ? 10 : 0));
    expect(hitungSafetyStock({ keluarHarian: deret, totalMasuk: 0, stok: 17, leadTime: 4, z: 1.65 }).status).toBe('KRITIS');
    expect(hitungSafetyStock({ keluarHarian: deret, totalMasuk: 0, stok: 30, leadTime: 4, z: 1.65 }).status).toBe('PERLU_ORDER');
  });

  it('barang tanpa pemakaian -> TIDAK_BERGERAK, tidak perlu order', () => {
    const hasil = hitungSafetyStock({ keluarHarian: new Array(30).fill(0), totalMasuk: 5, stok: 0, leadTime: 7, z: 1.65 });

    expect(hasil.status).toBe('TIDAK_BERGERAK');
    expect(hasil.rekomendasiOrder).toBe(0);
    expect(hasil.hariTahan).toBeNull();
  });

  it('stok berlebih -> rekomendasi order 0 (tidak negatif)', () => {
    const hasil = hitungSafetyStock({ keluarHarian: new Array(30).fill(1), totalMasuk: 0, stok: 500, leadTime: 7, z: 1.65 });
    expect(hasil.rekomendasiOrder).toBe(0);
  });
});

describe('hitungSafetyStock — pola JARANG (keluar tidak menentu)', () => {
  // 120 hari, keluar 2x: hari ke-10 sebanyak 6, hari ke-70 sebanyak 10 -> jarak rata-rata 60 hari
  const deret = () => {
    const d = new Array(120).fill(0);
    d[10] = 6;
    d[70] = 10;
    return d;
  };

  it('dikenali JARANG; safety stock = titik order = pemakaian terbesar sekali keluar', () => {
    const hasil = hitungSafetyStock({ keluarHarian: deret(), totalMasuk: 0, stok: 4, leadTime: 7, z: 1.65 });

    expect(hasil.pola).toBe('JARANG');
    expect(hasil.intervalHari).toBe(60);
    expect(hasil.rataPerKeluar).toBe(8);
    expect(hasil.safetyStock).toBe(10);
    expect(hasil.titikOrder).toBe(10);
    expect(hasil.rekomendasiOrder).toBe(6); // 10 - 4
    expect(hasil.status).toBe('KRITIS'); // 4 < rata-rata sekali keluar (8)
    expect(hasil.hariTahan).toBeNull();
    expect(hasil.cukupUntukKali).toBe(0);
  });

  it('stok antara rata-rata dan terbesar -> PERLU_ORDER; stok >= terbesar -> AMAN tanpa order', () => {
    expect(hitungSafetyStock({ keluarHarian: deret(), totalMasuk: 0, stok: 8, leadTime: 7, z: 1.65 }).status).toBe('PERLU_ORDER');

    const aman = hitungSafetyStock({ keluarHarian: deret(), totalMasuk: 0, stok: 10, leadTime: 7, z: 1.65 });
    expect(aman.status).toBe('AMAN');
    expect(aman.rekomendasiOrder).toBe(0);
    expect(aman.cukupUntukKali).toBe(1);
  });

  it('pemakaian tiap minggu tetap RUTIN (pakai rumus statistik)', () => {
    const mingguan = Array.from({ length: 56 }, (_, i) => (i % 7 === 0 ? 5 : 0));
    expect(hitungSafetyStock({ keluarHarian: mingguan, totalMasuk: 0, stok: 50, leadTime: 7, z: 1.65 }).pola).toBe('RUTIN');
  });
});

describe('hitungSafetyStock — pola SANGAT_JARANG (> 90 hari sekali)', () => {
  // 365 hari, keluar 2x (hari ke-20: 3, hari ke-250: 5) -> jarak rata-rata ±183 hari
  const deret = () => {
    const d = new Array(365).fill(0);
    d[20] = 3;
    d[250] = 5;
    return d;
  };

  it('tanpa cadangan: titik order = rata-rata sekali keluar, tidak pernah Kritis', () => {
    const habis = hitungSafetyStock({ keluarHarian: deret(), totalMasuk: 0, stok: 0, leadTime: 7, z: 1.65 });

    expect(habis.pola).toBe('SANGAT_JARANG');
    expect(habis.safetyStock).toBe(0);
    expect(habis.titikOrder).toBe(4);
    expect(habis.rekomendasiOrder).toBe(4);
    expect(habis.status).toBe('PERLU_ORDER');
    expect(habis.indeksTerakhir).toBe(250);

    const cukup = hitungSafetyStock({ keluarHarian: deret(), totalMasuk: 0, stok: 4, leadTime: 7, z: 1.65 });
    expect(cukup.status).toBe('AMAN');
    expect(cukup.rekomendasiOrder).toBe(0);
  });

  it('baru 1x keluar -> jarak ditandai minimal', () => {
    const d = new Array(200).fill(0);
    d[5] = 2;
    const hasil = hitungSafetyStock({ keluarHarian: d, totalMasuk: 0, stok: 1, leadTime: 7, z: 1.65 });
    expect(hasil.pola).toBe('SANGAT_JARANG');
    expect(hasil.intervalMinimal).toBe(true);
  });
});

describe('SafetyStockService.analisa', () => {
  function buat(data: {
    items?: unknown[];
    keluar?: { itemId: number; date: Date; quantity: number }[];
    masuk?: { itemId: number; date: Date; quantity: number }[];
    pertama?: Date | null;
  }) {
    const prisma = {
      item: { findMany: jest.fn().mockResolvedValue(data.items ?? []) },
      stockOut: {
        findFirst: jest.fn().mockResolvedValue(data.pertama ? { date: data.pertama } : null),
        findMany: jest.fn().mockResolvedValue(data.keluar ?? []),
      },
      stockIn: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue(data.masuk ?? []),
      },
    } as unknown as PrismaService;
    return new SafetyStockService(prisma);
  }

  it('menolak scope & lead time tidak valid', async () => {
    await expect(buat({}).analisa('KANTIN')).rejects.toThrow(BadRequestException);
    await expect(buat({}).analisa('MESS', '3', '0')).rejects.toThrow('Lead time harus 1 - 90 hari');
  });

  it('periode dimulai dari transaksi pertama bila lebih baru dari jendela analisa', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-23T04:00:00Z')); // 23 Nov WITA
    try {
      const service = buat({
        pertama: new Date('2026-11-14T00:00:00Z'),
        items: [{ id: 1, code: 'A', name: 'Sarung tangan', unit: 'PC', category: 'APD', lokasiGudang: null, stock: { quantity: 3 } }],
        keluar: [
          { itemId: 1, date: new Date('2026-11-14T00:00:00Z'), quantity: 5 },
          { itemId: 1, date: new Date('2026-11-20T00:00:00Z'), quantity: 5 },
        ],
        masuk: [{ itemId: 1, date: new Date('2026-11-14T00:00:00Z'), quantity: 20 }],
      });

      const hasil = await service.analisa('INFRAS', '3', '7', '95');

      expect(hasil.periode).toEqual({ awal: '2026-11-14', akhir: '2026-11-23', jumlahHari: 10, dibatasiTransaksiPertama: true });
      expect(hasil.items[0]).toMatchObject({ totalKeluar: 10, totalMasuk: 20, rataHarian: 1, stok: 3 });
      expect(hasil.items[0].perBulan).toEqual([{ bulan: '2026-11', masuk: 20, keluar: 10 }]);
      expect(hasil.ringkasan.totalBarang).toBe(1);
      expect(hasil.items[0]).toMatchObject({ terakhirKeluar: '2026-11-20', hariSejakTerakhir: 3 });
    } finally {
      jest.useRealTimers();
    }
  });

  it('default periode = semua data sejak transaksi pertama + perkiraan keluar berikutnya', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-11-23T04:00:00Z'));
    try {
      const service = buat({
        pertama: new Date('2025-11-24T00:00:00Z'),
        items: [{ id: 1, code: 'B', name: 'Genset part', unit: 'PC', category: 'LAIN', lokasiGudang: null, stock: { quantity: 0 } }],
        keluar: [
          { itemId: 1, date: new Date('2026-01-10T00:00:00Z'), quantity: 2 },
          { itemId: 1, date: new Date('2026-07-10T00:00:00Z'), quantity: 2 },
        ],
      });

      const hasil = await service.analisa('MESS');

      expect(hasil.parameter.periodeBulan).toBe(0);
      expect(hasil.periode).toMatchObject({ awal: '2025-11-24', jumlahHari: 365 });
      // 365 hari / 2x keluar = ±183 hari sekali -> sangat jarang
      expect(hasil.items[0]).toMatchObject({
        pola: 'SANGAT_JARANG',
        intervalHari: 183,
        terakhirKeluar: '2026-07-10',
        perkiraanBerikutnya: '2027-01-09',
        status: 'PERLU_ORDER',
        rekomendasiOrder: 2,
      });
      expect(hasil.ringkasan.polaSangatJarang).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
