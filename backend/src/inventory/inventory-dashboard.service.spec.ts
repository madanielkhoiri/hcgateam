import { BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryDashboardService } from './inventory-dashboard.service';

function buatService(overrides: {
  stocks?: { quantity: number }[];
  stockInsFromPeriodStart?: { date: Date; quantity: number }[];
  stockOutsFromPeriodStart?: { date: Date; quantity: number }[];
  stockInsSelectedMonth?: { date: Date; quantity: number }[];
  stockOutsSelectedMonth?: { date: Date; quantity: number }[];
  totalItems?: number;
} = {}) {
  const prisma = {
    inventoryStock: { findMany: jest.fn().mockResolvedValue(overrides.stocks ?? []) },
    stockIn: {
      findMany: jest.fn()
        .mockResolvedValueOnce(overrides.stockInsFromPeriodStart ?? [])
        .mockResolvedValueOnce(overrides.stockInsSelectedMonth ?? []),
    },
    stockOut: {
      findMany: jest.fn()
        .mockResolvedValueOnce(overrides.stockOutsFromPeriodStart ?? [])
        .mockResolvedValueOnce(overrides.stockOutsSelectedMonth ?? []),
    },
    item: { count: jest.fn().mockResolvedValue(overrides.totalItems ?? 0) },
  } as unknown as PrismaService;

  const service = new InventoryDashboardService(prisma);

  return { service, prisma };
}

describe('InventoryDashboardService.getDashboard — validasi parameter', () => {
  it('menolak scope tidak valid', async () => {
    const { service } = buatService();

    await expect(service.getDashboard('KANTIN', '1', '2026')).rejects.toThrow(BadRequestException);
  });

  it('menolak bulan di luar 1-12', async () => {
    const { service } = buatService();

    await expect(service.getDashboard('MESS', '0', '2026')).rejects.toThrow('Bulan tidak valid');
    await expect(service.getDashboard('MESS', '13', '2026')).rejects.toThrow('Bulan tidak valid');
  });

  it('menolak tahun di luar rentang 2000-2200', async () => {
    const { service } = buatService();

    await expect(service.getDashboard('MESS', '1', '1999')).rejects.toThrow('Tahun tidak valid');
    await expect(service.getDashboard('MESS', '1', '2201')).rejects.toThrow('Tahun tidak valid');
  });
});

describe('InventoryDashboardService.getDashboard — rekonstruksi saldo & grafik', () => {
  it('menghitung stok awal periode dari stok sekarang dikurangi masuk lalu ditambah keluar setelah awal periode', async () => {
    const { service } = buatService({
      stocks: [{ quantity: 50 }, { quantity: 30 }], // currentStock = 80
      stockInsFromPeriodStart: [{ date: new Date('2026-01-15'), quantity: 20 }],
      stockOutsFromPeriodStart: [{ date: new Date('2026-01-20'), quantity: 10 }],
      stockInsSelectedMonth: [
        { date: new Date('2026-01-05T00:00:00Z'), quantity: 5 },
        { date: new Date('2026-01-10T00:00:00Z'), quantity: 15 },
      ],
      stockOutsSelectedMonth: [{ date: new Date('2026-01-05T00:00:00Z'), quantity: 3 }],
      totalItems: 7,
    });

    const hasil = await service.getDashboard('MESS', '1', '2026');

    expect(hasil.summary.currentStock).toBe(80);
    expect(hasil.summary.totalStockIn).toBe(20);
    expect(hasil.summary.totalStockOut).toBe(3);
    expect(hasil.summary.transactionDays).toBe(2);
    expect(hasil.summary.totalItems).toBe(7);

    // runningStock awal periode = 80 - 20 + 10 = 70
    expect(hasil.chart).toEqual([
      { date: '2026-01-05', stockIn: 5, stockOut: 3, stock: 72, hasTransaction: true },
      { date: '2026-01-10', stockIn: 15, stockOut: 0, stock: 87, hasTransaction: true },
    ]);
  });

  it('menggabungkan stockIn dan stockOut pada tanggal yang sama ke satu baris chart', async () => {
    const { service } = buatService({
      stockInsSelectedMonth: [{ date: new Date('2026-01-05T00:00:00Z'), quantity: 10 }],
      stockOutsSelectedMonth: [{ date: new Date('2026-01-05T00:00:00Z'), quantity: 4 }],
    });

    const hasil = await service.getDashboard('MESS', '1', '2026');

    expect(hasil.chart).toHaveLength(1);
    expect(hasil.chart[0]).toEqual(expect.objectContaining({ date: '2026-01-05', stockIn: 10, stockOut: 4 }));
  });

  it('mengurutkan chart berdasarkan tanggal menaik walau data masuk tidak berurutan', async () => {
    const { service } = buatService({
      stockInsSelectedMonth: [
        { date: new Date('2026-01-20T00:00:00Z'), quantity: 1 },
        { date: new Date('2026-01-05T00:00:00Z'), quantity: 1 },
      ],
    });

    const hasil = await service.getDashboard('MESS', '1', '2026');

    expect(hasil.chart.map((c) => c.date)).toEqual(['2026-01-05', '2026-01-20']);
  });

  it('stok pada chart tidak pernah negatif (dibatasi minimal 0)', async () => {
    const { service } = buatService({
      stocks: [],
      stockOutsSelectedMonth: [{ date: new Date('2026-01-05T00:00:00Z'), quantity: 50 }],
    });

    const hasil = await service.getDashboard('MESS', '1', '2026');

    expect(hasil.chart[0].stock).toBe(0);
  });

  it('mengembalikan chart kosong kalau tidak ada transaksi sama sekali di bulan tersebut', async () => {
    const { service } = buatService();

    const hasil = await service.getDashboard('MESS', '1', '2026');

    expect(hasil.chart).toEqual([]);
    expect(hasil.summary.transactionDays).toBe(0);
  });
});
