import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TravelAksesService } from './travel-akses.service';

function buatService(overrides: {
  karyawanTertaut?: unknown;
  akun?: unknown;
  karyawanByNik?: unknown;
  driver?: unknown;
  update?: jest.Mock;
} = {}) {
  const update = overrides.update ?? jest.fn(({ data, where }) => Promise.resolve({ id: where.id, ...data }));

  const prisma = {
    karyawan: {
      findUnique: jest.fn().mockImplementation(({ where }: any) => {
        if (where.akunId !== undefined) {
          return Promise.resolve('karyawanTertaut' in overrides ? overrides.karyawanTertaut : null);
        }
        return Promise.resolve('karyawanByNik' in overrides ? overrides.karyawanByNik : null);
      }),
      update,
    },
    user: {
      findUnique: jest.fn().mockResolvedValue('akun' in overrides ? overrides.akun : { nrp: '12345', username: 'budi' }),
    },
    driver: {
      findFirst: jest.fn().mockResolvedValue('driver' in overrides ? overrides.driver : null),
    },
  } as unknown as PrismaService;

  const service = new TravelAksesService(prisma);

  return { service, prisma, update };
}

describe('TravelAksesService.karyawanDariAkun', () => {
  it('mengembalikan karyawan yang sudah tertaut tanpa mencari ulang', async () => {
    const { service } = buatService({ karyawanTertaut: { id: 1, akunId: 9 } });

    const hasil = await service.karyawanDariAkun(9);

    expect(hasil).toEqual({ id: 1, akunId: 9 });
  });

  it('mencocokkan NIK dari nrp akun kalau belum tertaut, lalu menautkan otomatis', async () => {
    const { service, update } = buatService({
      karyawanTertaut: null,
      akun: { nrp: '12345', username: 'lain' },
      karyawanByNik: { id: 2, nik: '12345', akunId: null },
    });

    await service.karyawanDariAkun(9);

    expect(update).toHaveBeenCalledWith({ where: { id: 2 }, data: { akunId: 9 } });
  });

  it('fallback ke username akun kalau nrp kosong', async () => {
    const { service, prisma } = buatService({
      karyawanTertaut: null,
      akun: { nrp: null, username: 'nik999' },
      karyawanByNik: { id: 2, nik: 'nik999', akunId: null },
    });

    await service.karyawanDariAkun(9);

    expect(prisma.karyawan.findUnique).toHaveBeenCalledWith({ where: { nik: 'nik999' } });
  });

  it('melempar NotFoundException kalau karyawan tidak ditemukan lewat NIK', async () => {
    const { service } = buatService({ karyawanTertaut: null, karyawanByNik: null });

    await expect(service.karyawanDariAkun(9)).rejects.toThrow(NotFoundException);
  });

  it('melempar NotFoundException kalau karyawan yang cocok sudah tertaut ke akun lain', async () => {
    const { service } = buatService({ karyawanTertaut: null, karyawanByNik: { id: 2, nik: '12345', akunId: 999 } });

    await expect(service.karyawanDariAkun(9)).rejects.toThrow(NotFoundException);
  });
});

describe('TravelAksesService.driverDariAkun', () => {
  it('melempar NotFoundException kalau akun tidak tertaut ke driver', async () => {
    const { service } = buatService({ driver: null });

    await expect(service.driverDariAkun(9)).rejects.toThrow(NotFoundException);
  });

  it('mengembalikan driver yang tertaut', async () => {
    const { service } = buatService({ driver: { id: 5 } });

    await expect(service.driverDariAkun(9)).resolves.toEqual({ id: 5 });
  });
});

describe('TravelAksesService.wajibPemilikTrip', () => {
  const service = buatService().service;

  it('menolak kalau driver aktor bukan pemilik trip', () => {
    expect(() => service.wajibPemilikTrip(1, 2)).toThrow(ForbiddenException);
  });

  it('mengizinkan kalau driver aktor adalah pemilik trip', () => {
    expect(() => service.wajibPemilikTrip(1, 1)).not.toThrow();
  });
});
