import { PrismaService } from '../../prisma/prisma.service';
import { IrDashboardService } from './ir-dashboard.service';

describe('IrDashboardService.ringkasan', () => {
  it('mengembalikan angka kartu dashboard dari masing-masing tabel PORTAL IR', async () => {
    const prisma = {
      dokumenIr: { count: jest.fn().mockResolvedValue(12) },
      aspirasiPertanyaan: { count: jest.fn().mockResolvedValue(3) },
      irCourseVideo: { count: jest.fn().mockResolvedValue(5) },
      aspirasiJawaban: { count: jest.fn().mockResolvedValue(40) },
    } as unknown as PrismaService;
    const service = new IrDashboardService(prisma);

    const hasil = await service.ringkasan();

    expect(hasil).toEqual({
      totalDokumen: 12,
      pertanyaanAktif: 3,
      totalVideo: 5,
      totalJawaban: 40,
    });
  });
});

describe('IrDashboardService.tren', () => {
  it('menjumlahkan dokumen per bulan (tahun berjalan) dan breakdown kategori', async () => {
    const tahunIni = new Date().getUTCFullYear();

    const findMany = jest.fn().mockResolvedValue([
      { createdAt: new Date(Date.UTC(tahunIni, 0, 5)) },
      { createdAt: new Date(Date.UTC(tahunIni, 0, 20)) },
      { createdAt: new Date(Date.UTC(tahunIni, 3, 1)) },
    ]);
    const count = jest
      .fn()
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(2);

    const prisma = {
      dokumenIr: { findMany, count },
    } as unknown as PrismaService;
    const service = new IrDashboardService(prisma);

    const hasil = await service.tren();

    expect(hasil.tahun).toBe(tahunIni);
    expect(hasil.trenBulanan).toHaveLength(12);
    expect(hasil.trenBulanan[0]).toEqual({ bulan: 1, total: 2 });
    expect(hasil.trenBulanan[3]).toEqual({ bulan: 4, total: 1 });
    expect(hasil.trenBulanan[1]).toEqual({ bulan: 2, total: 0 });
    expect(hasil.breakdownKategori).toEqual([
      { kategori: 'SK', total: 6 },
      { kategori: 'IM', total: 4 },
      { kategori: 'FORM', total: 2 },
    ]);
  });
});
