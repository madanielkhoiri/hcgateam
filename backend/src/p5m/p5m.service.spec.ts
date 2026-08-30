import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { P5mService } from './p5m.service';

function rowFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, topic: 'K3', ...overrides };
}

function buatService(overrides: { row?: unknown; create?: jest.Mock; update?: jest.Mock; deleteFn?: jest.Mock; count?: number } = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const update = overrides.update ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const deleteFn = overrides.deleteFn ?? jest.fn().mockResolvedValue({});
  const findMany = jest.fn().mockResolvedValue([]);
  const count = jest.fn().mockResolvedValue(overrides.count ?? 0);

  const prisma = {
    p5mMeeting: {
      findMany,
      findUnique: jest.fn().mockResolvedValue('row' in overrides ? overrides.row : rowFixture()),
      count,
      create,
      update,
      delete: deleteFn,
    },
    $transaction: jest.fn((queries: any[]) => Promise.all(queries)),
  } as unknown as PrismaService;

  const service = new P5mService(prisma);

  return { service, prisma, create, update, deleteFn, findMany, count };
}

describe('P5mService.findAll — pagination & filter', () => {
  it('page & limit dijaga dalam batas wajar', async () => {
    const { service, findMany } = buatService();

    await service.findAll({ page: -1, limit: 500 });

    expect(findMany.mock.calls[0][0].skip).toBe(0);
    expect(findMany.mock.calls[0][0].take).toBe(100);
  });

  it('search diterapkan OR ke 4 kolom', async () => {
    const { service, findMany } = buatService();

    await service.findAll({ search: '  k3  ' });

    const where = findMany.mock.calls[0][0].where;
    expect(where.OR).toHaveLength(4);
    expect(where.OR[0]).toEqual({ topic: { contains: 'k3', mode: 'insensitive' } });
  });

  it('year+month membuat rentang satu bulan UTC', async () => {
    const { service, findMany } = buatService();

    await service.findAll({ year: 2026, month: 3 });

    const where = findMany.mock.calls[0][0].where;
    expect(where.activityDate).toEqual({
      gte: new Date(Date.UTC(2026, 2, 1)),
      lt: new Date(Date.UTC(2026, 3, 1)),
    });
  });

  it('year saja membuat rentang satu tahun penuh', async () => {
    const { service, findMany } = buatService();

    await service.findAll({ year: 2026 });

    const where = findMany.mock.calls[0][0].where;
    expect(where.activityDate).toEqual({
      gte: new Date(Date.UTC(2026, 0, 1)),
      lt: new Date(Date.UTC(2027, 0, 1)),
    });
  });

  it('totalPages minimal 1', async () => {
    const { service } = buatService({ count: 0 });

    const hasil = await service.findAll({});

    expect(hasil.pagination.totalPages).toBe(1);
  });
});

describe('P5mService.findOne', () => {
  it('melempar NotFoundException kalau data tidak ada', async () => {
    const { service } = buatService({ row: null });

    await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
  });
});

describe('P5mService.create', () => {
  const dtoDasar = {
    activityDate: '2026-01-05',
    location: '  Site A  ',
    speaker: '  Budi  ',
    participants: '  Semua Karyawan  ',
    topic: '  K3  ',
  };

  it('trim seluruh field teks', async () => {
    const { service, create } = buatService();

    await service.create(dtoDasar as any, 9);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ location: 'Site A', speaker: 'Budi', participants: 'Semua Karyawan', topic: 'K3' }),
      }),
    );
  });

  it('supervisors di-dedup dan entri kosong difilter', async () => {
    const { service, create } = buatService();

    await service.create({ ...dtoDasar, supervisors: ['Budi', '  ', 'Budi', 'Siti'] } as any, 9);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ supervisors: ['Budi', 'Siti'] }) }),
    );
  });

  it('supervisorName (kolom lama) diisi dari supervisor pertama, string kosong kalau tidak ada supervisor', async () => {
    const { service, create } = buatService();

    await service.create(dtoDasar as any, 9);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ supervisorName: '' }) }),
    );
  });

  it('documentationPaths dibatasi maksimal 4 dan entri kosong difilter', async () => {
    const { service, create } = buatService();

    await service.create({ ...dtoDasar, documentationPaths: ['a', ' ', 'b', 'c', 'd', 'e'] } as any, 9);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ documentationPaths: ['a', 'b', 'c', 'd'] }) }),
    );
  });

  it('notes kosong disimpan null', async () => {
    const { service, create } = buatService();

    await service.create({ ...dtoDasar, notes: '   ' } as any, 9);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ notes: null }) }));
  });

  it('kolom lama (startTime/endTime/participantNames/supervisorSignPath) tetap diisi demi kompatibilitas', async () => {
    const { service, create } = buatService();

    await service.create(dtoDasar as any, 9);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ startTime: '00:00', endTime: null, participantNames: [], supervisorSignPath: null }),
      }),
    );
  });
});

describe('P5mService.update', () => {
  it('melempar NotFoundException kalau data tidak ada', async () => {
    const { service } = buatService({ row: null });

    await expect(service.update(1, { topic: 'X' } as any)).rejects.toThrow(NotFoundException);
  });

  it('hanya mengubah field yang eksplisit dikirim', async () => {
    const { service, update } = buatService();

    await service.update(1, { topic: '  Baru  ' } as any);

    expect(update).toHaveBeenCalledWith({ where: { id: 1 }, data: { topic: 'Baru' }, include: expect.anything() });
  });

  it('mengubah supervisors juga memperbarui supervisorName (kolom lama)', async () => {
    const { service, update } = buatService();

    await service.update(1, { supervisors: ['Siti', 'Budi'] } as any);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { supervisors: ['Siti', 'Budi'], supervisorName: 'Siti' } }),
    );
  });
});

describe('P5mService.remove', () => {
  it('melempar NotFoundException kalau data tidak ada', async () => {
    const { service } = buatService({ row: null });

    await expect(service.remove(1)).rejects.toThrow(NotFoundException);
  });

  it('berhasil menghapus data', async () => {
    const { service, deleteFn } = buatService();

    const hasil = await service.remove(1);

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});
