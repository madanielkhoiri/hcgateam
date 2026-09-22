import { StatusAnakMagang } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AnakMagangDashboardService } from './anak-magang-dashboard.service';

describe('AnakMagangDashboardService.ringkasan', () => {
  it('mengembalikan angka kartu dashboard dari tabel anak magang', async () => {
    const count = jest
      .fn()
      .mockResolvedValueOnce(20)
      .mockResolvedValueOnce(15)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(3);
    const prisma = { anakMagang: { count } } as unknown as PrismaService;
    const service = new AnakMagangDashboardService(prisma);

    const hasil = await service.ringkasan();

    expect(hasil).toEqual({
      totalAnakMagang: 20,
      aktif: 15,
      nonAktif: 5,
      berakhirBulanIni: 3,
    });
  });
});

describe('AnakMagangDashboardService.tren', () => {
  it('menjumlahkan anak magang mulai per bulan (tahun berjalan) dan breakdown status', async () => {
    const tahunIni = new Date().getUTCFullYear();

    const findMany = jest.fn().mockResolvedValue([
      { tanggalMulai: new Date(Date.UTC(tahunIni, 7, 1)) },
      { tanggalMulai: new Date(Date.UTC(tahunIni, 7, 10)) },
      { tanggalMulai: null },
    ]);
    const count = jest.fn().mockResolvedValueOnce(15).mockResolvedValueOnce(5);

    const prisma = {
      anakMagang: { findMany, count },
    } as unknown as PrismaService;
    const service = new AnakMagangDashboardService(prisma);

    const hasil = await service.tren();

    expect(hasil.tahun).toBe(tahunIni);
    expect(hasil.trenBulanan[7]).toEqual({ bulan: 8, total: 2 });
    expect(hasil.trenBulanan[0]).toEqual({ bulan: 1, total: 0 });
    expect(hasil.breakdownStatus).toEqual([
      { status: StatusAnakMagang.AKTIF, total: 15 },
      { status: StatusAnakMagang.NONAKTIF, total: 5 },
    ]);
  });
});
