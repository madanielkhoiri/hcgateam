import { StatusSuratTugas, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SuratTugasDinasDashboardService } from './surat-tugas-dinas-dashboard.service';

describe('SuratTugasDinasDashboardService.ringkasan', () => {
  it('menghitung angka kartu dashboard tanpa filter untuk SH/PJO/Admin', async () => {
    const count = jest
      .fn()
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(4);
    const prisma = { suratTugasDinas: { count } } as unknown as PrismaService;
    const service = new SuratTugasDinasDashboardService(prisma);

    const hasil = await service.ringkasan({ id: 1, role: UserRole.SECTION_HEAD });

    expect(hasil).toEqual({
      totalSurat: 10,
      menungguSh: 3,
      menungguPjo: 2,
      disetujui: 4,
    });
    expect(count).toHaveBeenNthCalledWith(1, { where: {} });
  });

  it('membatasi lingkup ke surat buatan sendiri untuk role biasa', async () => {
    const count = jest.fn().mockResolvedValue(0);
    const prisma = { suratTugasDinas: { count } } as unknown as PrismaService;
    const service = new SuratTugasDinasDashboardService(prisma);

    await service.ringkasan({ id: 7, role: UserRole.KARYAWAN });

    expect(count).toHaveBeenNthCalledWith(1, { where: { dibuatOlehId: 7 } });
  });
});

describe('SuratTugasDinasDashboardService.tren', () => {
  it('menjumlahkan surat per bulan (tahun berjalan) dan breakdown status', async () => {
    const tahunIni = new Date().getUTCFullYear();

    const findMany = jest.fn().mockResolvedValue([
      { createdAt: new Date(Date.UTC(tahunIni, 2, 1)) },
      { createdAt: new Date(Date.UTC(tahunIni, 2, 15)) },
    ]);
    const count = jest
      .fn()
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(6)
      .mockResolvedValueOnce(1);

    const prisma = {
      suratTugasDinas: { findMany, count },
    } as unknown as PrismaService;
    const service = new SuratTugasDinasDashboardService(prisma);

    const hasil = await service.tren({ id: 1, role: UserRole.ADMIN });

    expect(hasil.tahun).toBe(tahunIni);
    expect(hasil.trenBulanan[2]).toEqual({ bulan: 3, total: 2 });
    expect(hasil.trenBulanan[0]).toEqual({ bulan: 1, total: 0 });
    expect(hasil.breakdownStatus).toEqual([
      { status: StatusSuratTugas.MENUNGGU_SH, total: 5 },
      { status: StatusSuratTugas.MENUNGGU_PJO, total: 3 },
      { status: StatusSuratTugas.DISETUJUI, total: 6 },
      { status: StatusSuratTugas.DITOLAK, total: 1 },
    ]);
  });
});
