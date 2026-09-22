import { StatusKerja } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DatabaseKaryawanDashboardService } from './database-karyawan-dashboard.service';

describe('DatabaseKaryawanDashboardService.ringkasan', () => {
  it('mengembalikan angka kartu dashboard dari tabel karyawan', async () => {
    const prisma = {
      karyawan: {
        count: jest
          .fn()
          .mockResolvedValueOnce(50)
          .mockResolvedValueOnce(45)
          .mockResolvedValueOnce(30),
        findMany: jest
          .fn()
          .mockResolvedValue([{ departemenId: 1 }, { departemenId: 2 }]),
      },
    } as unknown as PrismaService;
    const service = new DatabaseKaryawanDashboardService(prisma);

    const hasil = await service.ringkasan();

    expect(hasil).toEqual({
      totalKaryawan: 50,
      karyawanAktif: 45,
      jumlahDepartemen: 2,
      waTerdaftar: 30,
    });
  });
});

describe('DatabaseKaryawanDashboardService.tren', () => {
  it('menjumlahkan karyawan baru per bulan (tahun berjalan) dan breakdown status kerja', async () => {
    const tahunIni = new Date().getUTCFullYear();

    const findMany = jest.fn().mockResolvedValue([
      { createdAt: new Date(Date.UTC(tahunIni, 1, 5)) },
      { createdAt: new Date(Date.UTC(tahunIni, 1, 20)) },
      { createdAt: new Date(Date.UTC(tahunIni, 6, 1)) },
    ]);
    const count = jest
      .fn()
      .mockResolvedValueOnce(40)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(2);

    const prisma = {
      karyawan: { findMany, count },
    } as unknown as PrismaService;
    const service = new DatabaseKaryawanDashboardService(prisma);

    const hasil = await service.tren();

    expect(hasil.tahun).toBe(tahunIni);
    expect(hasil.trenBulanan).toHaveLength(12);
    expect(hasil.trenBulanan[1]).toEqual({ bulan: 2, total: 2 });
    expect(hasil.trenBulanan[6]).toEqual({ bulan: 7, total: 1 });
    expect(hasil.trenBulanan[0]).toEqual({ bulan: 1, total: 0 });
    expect(hasil.breakdownStatus).toEqual([
      { status: StatusKerja.AKTIF, total: 40 },
      { status: StatusKerja.DIRUMAHKAN, total: 8 },
      { status: StatusKerja.RESIGN, total: 2 },
    ]);
  });
});
