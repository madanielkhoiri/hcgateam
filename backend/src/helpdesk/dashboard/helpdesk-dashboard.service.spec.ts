import { StatusTiketHelpdesk, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { HelpdeskDashboardService } from './helpdesk-dashboard.service';

describe('HelpdeskDashboardService.ringkasan', () => {
  it('menghitung angka kartu dashboard tanpa filter untuk Admin/Admin HC', async () => {
    const count = jest
      .fn()
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(15);
    const prisma = { tiketHelpdesk: { count } } as unknown as PrismaService;
    const service = new HelpdeskDashboardService(prisma);

    const hasil = await service.ringkasan({ id: 1, role: UserRole.ADMIN });

    expect(hasil).toEqual({ totalTiket: 30, terbuka: 10, diproses: 5, selesai: 15 });
    expect(count).toHaveBeenNthCalledWith(1, { where: {} });
  });

  it('membatasi lingkup ke tiket buatan sendiri untuk role biasa', async () => {
    const count = jest.fn().mockResolvedValue(0);
    const prisma = { tiketHelpdesk: { count } } as unknown as PrismaService;
    const service = new HelpdeskDashboardService(prisma);

    await service.ringkasan({ id: 9, role: UserRole.KARYAWAN });

    expect(count).toHaveBeenNthCalledWith(1, { where: { pembuatId: 9 } });
  });
});

describe('HelpdeskDashboardService.tren', () => {
  it('menjumlahkan tiket per bulan (tahun berjalan) dan breakdown status', async () => {
    const tahunIni = new Date().getUTCFullYear();

    const findMany = jest.fn().mockResolvedValue([
      { dibuatPada: new Date(Date.UTC(tahunIni, 4, 3)) },
      { dibuatPada: new Date(Date.UTC(tahunIni, 4, 12)) },
      { dibuatPada: new Date(Date.UTC(tahunIni, 9, 1)) },
    ]);
    const count = jest
      .fn()
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(2)
      .mockResolvedValueOnce(11);

    const prisma = {
      tiketHelpdesk: { findMany, count },
    } as unknown as PrismaService;
    const service = new HelpdeskDashboardService(prisma);

    const hasil = await service.tren({ id: 1, role: UserRole.SUPER_ADMIN });

    expect(hasil.tahun).toBe(tahunIni);
    expect(hasil.trenBulanan[4]).toEqual({ bulan: 5, total: 2 });
    expect(hasil.trenBulanan[9]).toEqual({ bulan: 10, total: 1 });
    expect(hasil.breakdownStatus).toEqual([
      { status: StatusTiketHelpdesk.TERBUKA, total: 7 },
      { status: StatusTiketHelpdesk.DIPROSES, total: 2 },
      { status: StatusTiketHelpdesk.SELESAI, total: 11 },
    ]);
  });
});
