import { PrismaService } from '../../prisma/prisma.service';
import { HousekeepingIndoorDashboardService } from './housekeeping-indoor-dashboard.service';

describe('HousekeepingIndoorDashboardService.ringkasan', () => {
  it('mengembalikan seluruh angka kartu dashboard sesuai urutan query', async () => {
    const count = jest.fn()
      .mockResolvedValueOnce(4) // totalLaporanBulanIni
      .mockResolvedValueOnce(9); // totalLaporanKeseluruhan

    const prisma = {
      housekeepingIndoor: {
        count,
        findMany: jest.fn().mockResolvedValue([{ lokasi: 'OFFICE' }, { lokasi: 'PLANT' }]),
      },
      housekeepingIndoorFoto: {
        count: jest.fn().mockResolvedValue(17),
      },
    } as unknown as PrismaService;

    const service = new HousekeepingIndoorDashboardService(prisma);
    const hasil = await service.ringkasan();

    expect(hasil).toEqual({
      totalLaporanBulanIni: 4,
      totalFotoBulanIni: 17,
      lokasiDilaporkanHariIni: 2,
      totalLokasi: 6,
      totalLaporanKeseluruhan: 9,
    });
  });

  it('lokasiDilaporkanHariIni 0 kalau belum ada laporan hari ini', async () => {
    const prisma = {
      housekeepingIndoor: {
        count: jest.fn().mockResolvedValue(0),
        findMany: jest.fn().mockResolvedValue([]),
      },
      housekeepingIndoorFoto: {
        count: jest.fn().mockResolvedValue(0),
      },
    } as unknown as PrismaService;

    const service = new HousekeepingIndoorDashboardService(prisma);
    const hasil = await service.ringkasan();

    expect(hasil.lokasiDilaporkanHariIni).toBe(0);
    expect(hasil.totalLokasi).toBe(6);
  });
});

describe('HousekeepingIndoorDashboardService.trenDanLokasi', () => {
  it('menjumlahkan laporan per bulan (tahun berjalan) dan breakdown per lokasi', async () => {
    const tahunIni = new Date().getUTCFullYear();

    const findMany = jest.fn().mockResolvedValue([
      { createdAt: new Date(Date.UTC(tahunIni, 0, 10)) },
      { createdAt: new Date(Date.UTC(tahunIni, 0, 20)) },
      { createdAt: new Date(Date.UTC(tahunIni, 5, 5)) },
    ]);

    const groupBy = jest.fn().mockResolvedValue([
      { lokasi: 'OFFICE', _count: { _all: 5 } },
      { lokasi: 'PLANT', _count: { _all: 2 } },
    ]);

    const prisma = {
      housekeepingIndoor: { findMany, groupBy },
    } as unknown as PrismaService;

    const service = new HousekeepingIndoorDashboardService(prisma);
    const hasil = await service.trenDanLokasi();

    expect(hasil.tahun).toBe(tahunIni);
    expect(hasil.trenBulanan).toHaveLength(12);
    expect(hasil.trenBulanan[0]).toEqual({ bulan: 1, total: 2 });
    expect(hasil.trenBulanan[5]).toEqual({ bulan: 6, total: 1 });
    expect(hasil.trenBulanan[1]).toEqual({ bulan: 2, total: 0 });
    expect(hasil.breakdownLokasi).toEqual([
      { lokasi: 'OFFICE', total: 5 },
      { lokasi: 'PLANT', total: 2 },
    ]);
  });
});
