import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CivilTps3rService } from './civil-tps3r.service';

function laporanFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, tanggal: new Date('2026-03-10T00:00:00.000Z'), ...overrides };
}

function buatService(overrides: {
  laporan?: unknown;
  aggregate?: jest.Mock;
  findManyTren?: jest.Mock;
  deleteFn?: jest.Mock;
} = {}) {
  const findUnique = jest
    .fn()
    .mockResolvedValue('laporan' in overrides ? overrides.laporan : laporanFixture());
  const create = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const update = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const deleteFn = overrides.deleteFn ?? jest.fn().mockResolvedValue({});
  const findMany = overrides.findManyTren ?? jest.fn().mockResolvedValue([]);
  const aggregate =
    overrides.aggregate ??
    jest.fn().mockResolvedValue({
      _sum: {
        beratOrganik: null,
        beratReuse: null,
        beratRecycle: null,
        beratResidu: null,
        sampahTerkelola: null,
      },
      _count: { _all: 0 },
    });

  const count = jest.fn().mockResolvedValue(0);

  const prisma = {
    laporanTps3r: {
      findMany,
      findUnique,
      create,
      update,
      delete: deleteFn,
      aggregate,
      count,
    },
    sampahTerkelolaTps3r: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { beratOrganik: null, beratReuse: null, beratRecycle: null, beratResidu: null } }),
      findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn(),
    },
    fotoPenyerahanTps3r: { findMany: jest.fn().mockResolvedValue([]), findUnique: jest.fn(), create: jest.fn(), delete: jest.fn() },
  } as unknown as PrismaService;

  const service = new CivilTps3rService(prisma);

  return { service, prisma, findMany, findUnique, create, update, deleteFn, aggregate, count };
}

describe('CivilTps3rService.daftar', () => {
  it('tanpa filter kalau tahun tidak diberikan', async () => {
    const { service, findMany } = buatService();

    await service.daftar();

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: undefined }));
  });

  it('rentang satu tahun penuh kalau cuma tahun yang diberikan', async () => {
    const { service, findMany } = buatService();

    await service.daftar(undefined, 2026);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tanggal: {
            gte: new Date(Date.UTC(2026, 0, 1)),
            lt: new Date(Date.UTC(2027, 0, 1)),
          },
        },
      }),
    );
  });

  it('rentang satu bulan kalau bulan dan tahun diberikan', async () => {
    const { service, findMany } = buatService();

    await service.daftar(3, 2026);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tanggal: {
            gte: new Date(Date.UTC(2026, 2, 1)),
            lt: new Date(Date.UTC(2026, 3, 1)),
          },
        },
      }),
    );
  });
});

describe('CivilTps3rService.ringkasan', () => {
  it('default 0 kalau belum ada laporan sama sekali', async () => {
    const { service } = buatService();

    const hasil = await service.ringkasan();

    expect(hasil).toEqual({
      totalLaporan: 0,
      totalOrganik: 0,
      totalReuse: 0,
      totalRecycle: 0,
      totalResidu: 0,
      terkelolaOrganik: 0,
      terkelolaReuse: 0,
      terkelolaRecycle: 0,
      terkelolaResidu: 0,
    });
  });

  it('meneruskan hasil sum kalau ada data', async () => {
    const aggregate = jest.fn().mockResolvedValue({
      _sum: {
        beratOrganik: 10,
        beratReuse: 5,
        beratRecycle: 3,
        beratResidu: 2,
        sampahTerkelola: 8,
      },
      _count: { _all: 4 },
    });
    const { service } = buatService({ aggregate });

    const hasil = await service.ringkasan(3, 2026);

    expect(hasil).toEqual({
      totalLaporan: 4,
      totalOrganik: 10,
      totalReuse: 5,
      totalRecycle: 3,
      totalResidu: 2,
      terkelolaOrganik: 0,
      terkelolaReuse: 0,
      terkelolaRecycle: 0,
      terkelolaResidu: 0,
    });
  });
});

describe('CivilTps3rService.trenBulanan', () => {
  it('menjumlahkan total kg per bulan dari seluruh kategori', async () => {
    const findManyTren = jest.fn().mockResolvedValue([
      {
        tanggal: new Date(Date.UTC(2026, 0, 5)),
        beratOrganik: 1,
        beratReuse: 1,
        beratRecycle: 1,
        beratResidu: 1,
        sampahTerkelola: 4,
      },
      {
        tanggal: new Date(Date.UTC(2026, 0, 20)),
        beratOrganik: 2,
        beratReuse: 0,
        beratRecycle: 0,
        beratResidu: 0,
        sampahTerkelola: 2,
      },
      {
        tanggal: new Date(Date.UTC(2026, 5, 1)),
        beratOrganik: 10,
        beratReuse: 0,
        beratRecycle: 0,
        beratResidu: 0,
        sampahTerkelola: 5,
      },
    ]);
    const { service } = buatService({ findManyTren });

    const hasil = await service.trenBulanan(2026);

    expect(hasil).toHaveLength(12);
    expect(hasil[0]).toEqual({ bulan: 1, organik: 3, reuse: 1, recycle: 1, residu: 1 });
    expect(hasil[5]).toEqual({ bulan: 6, organik: 10, reuse: 0, recycle: 0, residu: 0 });
    expect(hasil[1]).toEqual({ bulan: 2, organik: 0, reuse: 0, recycle: 0, residu: 0 });
  });

  it('mengambil rentang satu tahun penuh (UTC)', async () => {
    const { service, findMany } = buatService();

    await service.trenBulanan(2026);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tanggal: {
            gte: new Date(Date.UTC(2026, 0, 1)),
            lt: new Date(Date.UTC(2027, 0, 1)),
          },
        },
      }),
    );
  });
});

describe('CivilTps3rService.buat', () => {
  it('menyimpan laporan dengan tanggal ISO dan createdById dari aktor', async () => {
    const { service, create } = buatService();

    await service.buat({ id: 9 } as any, {
      tanggal: '2026-03-10',
      beratOrganik: 1,
      beratReuse: 3,
      beratRecycle: 4,
      beratResidu: 5,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tanggal: new Date('2026-03-10T00:00:00.000Z'),
          beratOrganik: 1,
          beratNonOrganik: 0,
          beratReuse: 3,
          beratRecycle: 4,
          beratResidu: 5,
          sampahTerkelola: 0,
          createdById: 9,
        }),
      }),
    );
  });
});

describe('CivilTps3rService.ubah', () => {
  it('melempar NotFoundException kalau laporan tidak ada', async () => {
    const { service } = buatService({ laporan: null });

    await expect(service.ubah(1, { beratOrganik: 5 } as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('hanya mengubah field yang diberikan', async () => {
    const { service, update } = buatService();

    await service.ubah(1, { beratOrganik: 7 } as any);

    expect(update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { beratOrganik: 7 },
      include: { createdBy: { select: { id: true, name: true, nrp: true } } },
    });
  });

  it('mengubah tanggal kalau diberikan', async () => {
    const { service, update } = buatService();

    await service.ubah(1, { tanggal: '2026-05-01' } as any);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { tanggal: new Date('2026-05-01T00:00:00.000Z') },
      }),
    );
  });
});

describe('CivilTps3rService.hapus', () => {
  it('melempar NotFoundException kalau laporan tidak ada', async () => {
    const { service } = buatService({ laporan: null });

    await expect(service.hapus(1)).rejects.toThrow(NotFoundException);
  });

  it('berhasil menghapus laporan', async () => {
    const { service, deleteFn } = buatService();

    const hasil = await service.hapus(1);

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});
