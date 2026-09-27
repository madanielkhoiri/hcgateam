import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { OrderPackMealMiningService } from './order-pack-meal-mining.service';

describe('OrderPackMealMiningService', () => {
  function setup() {
    const findMany = jest.fn().mockResolvedValue([]);
    const upsert = jest.fn(({ create }) => Promise.resolve({ id: 1, ...create }));
    const findUnique = jest.fn().mockResolvedValue({ id: 1 });
    const remove = jest.fn().mockResolvedValue({ id: 1 });
    const prisma = {
      miningPackMealEntry: { findMany, upsert, findUnique, delete: remove },
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    } as unknown as PrismaService;

    return {
      service: new OrderPackMealMiningService(prisma),
      findMany,
      upsert,
      findUnique,
      remove,
    };
  }

  const entry = {
    date: '2026-09-01',
    area: 'PRODUKSI CSA MONTE BARU',
    rosterLunch: 157,
    rosterDinner: 140,
    rosterSpecialMeal: 0,
    rosterSpecialSnack: 0,
    additionalLunch: 20,
    additionalDinner: 23,
    additionalSpecialMeal: 0,
    additionalSpecialSnack: 0,
  };

  it('memfilter data berdasarkan awal dan akhir periode bulan', async () => {
    const { service, findMany } = setup();

    await service.findByMonth('2026-09');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          date: {
            gte: new Date('2026-09-01T00:00:00.000Z'),
            lt: new Date('2026-10-01T00:00:00.000Z'),
          },
        },
      }),
    );
  });

  it('menolak format periode yang tidak valid', async () => {
    const { service } = setup();
    await expect(service.findByMonth('September')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('menyimpan massal dengan upsert per tanggal dan area', async () => {
    const { service, upsert } = setup();

    await service.saveMany({ entries: [entry] }, { id: 9 });

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          date_area: {
            date: new Date('2026-09-01T00:00:00.000Z'),
            area: 'PRODUKSI CSA MONTE BARU',
          },
        },
        create: expect.objectContaining({
          createdBy: 9,
          orderedBy: 'GA PPA MINING',
          rosterLunch: 157,
          additionalLunch: 20,
        }),
      }),
    );
  });

  it('menolak dua baris dengan tanggal dan area yang sama', async () => {
    const { service, upsert } = setup();

    await expect(
      service.saveMany(
        { entries: [entry, { ...entry, area: 'produksi csa monte baru' }] },
        { id: 9 },
      ),
    ).rejects.toThrow(BadRequestException);
    expect(upsert).not.toHaveBeenCalled();
  });

  it('menghapus data yang ditemukan', async () => {
    const { service, remove } = setup();
    await expect(service.remove(1)).resolves.toEqual({
      message: 'Data Pack Meal Mining berhasil dihapus',
    });
    expect(remove).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('menolak hapus bila data tidak ditemukan', async () => {
    const { service, findUnique } = setup();
    findUnique.mockResolvedValueOnce(null);
    await expect(service.remove(99)).rejects.toThrow(NotFoundException);
  });
});
