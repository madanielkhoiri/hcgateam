import { StatusChecklistKip } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { KipDashboardService } from './kip-dashboard.service';

describe('KipDashboardService.ringkasan', () => {
  it('menghitung total KIP, lokasi terpakai, dan status checklist bulan berjalan (berdasar skor tahun*12+bulan)', async () => {
    const sekarang = new Date();
    const bulanIni = sekarang.getMonth() + 1;
    const tahunIni = sekarang.getFullYear();

    const count = jest.fn().mockResolvedValue(5);
    const groupBy = jest.fn().mockResolvedValue([{ lokasi: 'GUDANG_1' }, { lokasi: 'GUDANG_2' }]);
    const findMany = jest.fn().mockResolvedValue([
      // Bulan ini, SUDAH
      { bulan: bulanIni, status: StatusChecklistKip.SUDAH, kip: { tahun: tahunIni } },
      // Bulan ini, BELUM
      { bulan: bulanIni, status: StatusChecklistKip.BELUM, kip: { tahun: tahunIni } },
      { bulan: bulanIni, status: StatusChecklistKip.BELUM, kip: { tahun: tahunIni } },
      // Bulan lalu (tahun sama atau tahun lalu bila bulanIni = 1), BELUM -> terlewat
      { bulan: 1, status: StatusChecklistKip.BELUM, kip: { tahun: tahunIni - 1 } },
      // Bulan depan (belum jadwalnya) - tidak dihitung sama sekali
      { bulan: bulanIni, status: StatusChecklistKip.BELUM, kip: { tahun: tahunIni + 5 } },
    ]);

    const prisma = {
      kip: { count, groupBy },
      kipChecklistBulan: { findMany },
    } as unknown as PrismaService;
    const service = new KipDashboardService(prisma);

    const hasil = await service.ringkasan();

    expect(hasil).toEqual({
      totalKip: 5,
      lokasiTerpakai: 2,
      checklistSudahBulanIni: 1,
      checklistBelumBulanIni: 2,
      checklistTerlewat: 1,
    });
  });
});

describe('KipDashboardService.trenDanStatus', () => {
  it('menjumlahkan checklist SUDAH per bulan (tahun berjalan) dan breakdown status checklist tahun berjalan', async () => {
    const tahunIni = new Date().getFullYear();

    const findMany = jest.fn().mockResolvedValue([
      { bulan: 1 },
      { bulan: 1 },
      { bulan: 6 },
    ]);
    const count = jest.fn().mockResolvedValueOnce(10).mockResolvedValueOnce(4);

    const prisma = {
      kipChecklistBulan: { findMany, count },
    } as unknown as PrismaService;
    const service = new KipDashboardService(prisma);

    const hasil = await service.trenDanStatus();

    expect(hasil.tahun).toBe(tahunIni);
    expect(hasil.trenBulanan).toHaveLength(12);
    expect(hasil.trenBulanan[0]).toEqual({ bulan: 1, total: 2 });
    expect(hasil.trenBulanan[5]).toEqual({ bulan: 6, total: 1 });
    expect(hasil.trenBulanan[1]).toEqual({ bulan: 2, total: 0 });
    expect(hasil.statusChecklist).toEqual({ sudah: 10, belum: 4 });
  });
});
