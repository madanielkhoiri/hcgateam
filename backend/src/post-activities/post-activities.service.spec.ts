import { BadRequestException, NotFoundException } from '@nestjs/common';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { PostActivitiesService } from './post-activities.service';

function rowFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    workName: 'PEKERJAAN A',
    startTime: '08:00',
    endTime: '17:00',
    photoPaths: ['uploads/post-activities/a.jpg', 'uploads/post-activities/b.jpg'],
    ...overrides,
  };
}

function buatService(overrides: { row?: unknown; create?: jest.Mock; update?: jest.Mock; deleteFn?: jest.Mock; count?: number } = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const update = overrides.update ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const deleteFn = overrides.deleteFn ?? jest.fn().mockResolvedValue({});
  const findMany = jest.fn().mockResolvedValue([]);
  const count = jest.fn().mockResolvedValue(overrides.count ?? 0);

  const prisma = {
    postActivity: {
      findMany,
      findUnique: jest.fn().mockResolvedValue('row' in overrides ? overrides.row : rowFixture()),
      count,
      create,
      update,
      delete: deleteFn,
    },
    $transaction: jest.fn((queries: any[]) => Promise.all(queries)),
  } as unknown as PrismaService;

  const service = new PostActivitiesService(prisma);

  return { service, prisma, create, update, deleteFn, findMany, count };
}

const actor = { id: 9, name: 'Budi', username: 'budi' };

describe('PostActivitiesService.findAll — pagination & filter', () => {
  it('page dan limit dijaga dalam batas wajar (min 1, limit maks 100)', async () => {
    const { service, findMany } = buatService();

    await service.findAll({ page: -5, limit: 500 });

    expect(findMany.mock.calls[0][0].skip).toBe(0);
    expect(findMany.mock.calls[0][0].take).toBe(100);
  });

  it('limit default 10 dan page default 1 kalau tidak diisi', async () => {
    const { service, findMany } = buatService();

    await service.findAll({});

    expect(findMany.mock.calls[0][0].skip).toBe(0);
    expect(findMany.mock.calls[0][0].take).toBe(10);
  });

  it('search diterapkan OR ke workName dan nama creator', async () => {
    const { service, findMany } = buatService();

    await service.findAll({ search: '  galian  ' });

    const where = findMany.mock.calls[0][0].where;
    expect(where.OR).toEqual([
      { workName: { contains: 'galian', mode: 'insensitive' } },
      { creator: { name: { contains: 'galian', mode: 'insensitive' } } },
    ]);
  });

  it('month+year membuat rentang satu bulan (UTC)', async () => {
    const { service, findMany } = buatService();

    await service.findAll({ month: 3, year: 2026 });

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

  it('totalPages dihitung dari total/limit, minimal 1', async () => {
    const { service } = buatService({ count: 25 });

    const hasil = await service.findAll({ limit: 10 });

    expect(hasil.pagination).toEqual({ page: 1, limit: 10, total: 25, totalPages: 3 });
  });

  it('totalPages minimal 1 walau total 0', async () => {
    const { service } = buatService({ count: 0 });

    const hasil = await service.findAll({});

    expect(hasil.pagination.totalPages).toBe(1);
  });
});

describe('PostActivitiesService.findOne', () => {
  it('melempar NotFoundException kalau data tidak ada', async () => {
    const { service } = buatService({ row: null });

    await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
  });
});

describe('PostActivitiesService.create', () => {
  const dtoDasar = { activityDate: '2026-01-05', startTime: '08:00', endTime: '17:00', workName: '  galian  ', progressPercent: 50 };

  it('menolak kalau jam selesai <= jam mulai', async () => {
    const { service } = buatService();

    await expect(
      service.create({ ...dtoDasar, startTime: '17:00', endTime: '08:00' } as any, ['a.jpg'], actor),
    ).rejects.toThrow('Jam selesai harus lebih besar dari jam mulai');
  });

  it('menolak tanpa foto sama sekali', async () => {
    const { service } = buatService();

    await expect(service.create(dtoDasar as any, [], actor)).rejects.toThrow('Minimal satu foto wajib diunggah');
  });

  it('workName di-trim dan uppercase', async () => {
    const { service, create } = buatService();

    await service.create(dtoDasar as any, ['a.jpg'], actor);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ workName: 'GALIAN' }) }),
    );
  });

  it('coordinatorCount/carpenterCount/helperCount default 1 kalau tidak diisi', async () => {
    const { service, create } = buatService();

    await service.create(dtoDasar as any, ['a.jpg'], actor);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ coordinatorCount: 1, carpenterCount: 1, helperCount: 1 }) }),
    );
  });

  it('approverName default "ARIEF RAHIM" kalau tidak diisi', async () => {
    const { service, create } = buatService();

    await service.create(dtoDasar as any, ['a.jpg'], actor);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ approverName: 'ARIEF RAHIM' }) }),
    );
  });

  it('createdBy diisi dari id aktor', async () => {
    const { service, create } = buatService();

    await service.create(dtoDasar as any, ['a.jpg'], actor);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ createdBy: 9 }) }));
  });
});

describe('PostActivitiesService.update', () => {
  it('melempar NotFoundException kalau data tidak ada', async () => {
    const { service } = buatService({ row: null });

    await expect(service.update(1, {} as any, [], [])).rejects.toThrow(NotFoundException);
  });

  it('pakai startTime/endTime lama sebagai fallback validasi kalau tidak dikirim', async () => {
    const { service } = buatService({ row: rowFixture({ startTime: '17:00', endTime: '08:00' }) });

    await expect(service.update(1, {} as any, ['a.jpg'], [])).rejects.toThrow(
      'Jam selesai harus lebih besar dari jam mulai',
    );
  });

  it('menolak kalau hasil akhir foto kosong (tidak ada retained maupun foto baru)', async () => {
    const { service } = buatService();

    await expect(service.update(1, {} as any, [], [])).rejects.toThrow('Minimal satu foto wajib tersedia');
  });

  it('hanya mempertahankan foto lama yang ada di retainedPhotoPaths', async () => {
    const { service, update } = buatService();

    await service.update(1, {} as any, [], ['uploads/post-activities/a.jpg']);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ photoPaths: ['uploads/post-activities/a.jpg'] }) }),
    );
  });

  it('menggabungkan foto retained dengan foto baru', async () => {
    const { service, update } = buatService();

    await service.update(1, {} as any, ['uploads/post-activities/c.jpg'], ['uploads/post-activities/a.jpg']);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ photoPaths: ['uploads/post-activities/a.jpg', 'uploads/post-activities/c.jpg'] }),
      }),
    );
  });

  it('eveningWeather membawa serta update coordinator/carpenter/helper/approver, kalau tidak dikirim field itu tidak berubah', async () => {
    const { service, update } = buatService();

    await service.update(1, { eveningWeather: 'CERAH', coordinatorCount: 2 } as any, [], ['uploads/post-activities/a.jpg']);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ eveningWeather: 'CERAH', coordinatorCount: 2, approverName: 'ARIEF RAHIM' }) }),
    );
  });

  it('tanpa eveningWeather, coordinatorCount TIDAK ikut diupdate walau dikirim di dto (perilaku saat ini)', async () => {
    const { service, update } = buatService();

    await service.update(1, { coordinatorCount: 5 } as any, [], ['uploads/post-activities/a.jpg']);

    expect(update.mock.calls[0][0].data.coordinatorCount).toBeUndefined();
  });

  it('menghapus file foto yang tidak lagi dipakai (best-effort, real fs)', async () => {
    const cwdAwal = process.cwd();
    const direktoriUji = mkdtempSync(join(tmpdir(), 'post-activity-'));
    mkdirSync(join(direktoriUji, 'uploads', 'post-activities'), { recursive: true });
    const filePath = join(direktoriUji, 'uploads', 'post-activities', 'b.jpg');
    writeFileSync(filePath, 'dummy');
    process.chdir(direktoriUji);

    try {
      const { service } = buatService({
        row: rowFixture({ photoPaths: ['uploads/post-activities/a.jpg', 'uploads/post-activities/b.jpg'] }),
      });

      await service.update(1, {} as any, [], ['uploads/post-activities/a.jpg']);

      expect(existsSync(filePath)).toBe(false);
    } finally {
      process.chdir(cwdAwal);
      rmSync(direktoriUji, { recursive: true, force: true });
    }
  });
});

describe('PostActivitiesService.remove', () => {
  it('melempar NotFoundException kalau data tidak ada', async () => {
    const { service } = buatService({ row: null });

    await expect(service.remove(1)).rejects.toThrow(NotFoundException);
  });

  it('berhasil hapus record walau file fisik tidak ada', async () => {
    const { service, deleteFn } = buatService();

    const hasil = await service.remove(1);

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});
