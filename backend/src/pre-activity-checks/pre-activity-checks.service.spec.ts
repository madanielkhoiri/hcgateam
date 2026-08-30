import { NotFoundException } from '@nestjs/common';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { PreActivityChecksService } from './pre-activity-checks.service';

function rowFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    job_name: 'Pekerjaan A',
    jsa_image: null,
    checklist_image: null,
    height_permit_image: null,
    socialization_photo: null,
    executor_signature: null,
    supervisor_signature: null,
    ...overrides,
  };
}

function buatService(overrides: { row?: unknown; create?: jest.Mock; update?: jest.Mock; deleteFn?: jest.Mock } = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const update = overrides.update ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const deleteFn = overrides.deleteFn ?? jest.fn().mockResolvedValue({});

  const prisma = {
    preActivityCheck: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue('row' in overrides ? overrides.row : rowFixture()),
      create,
      update,
      delete: deleteFn,
    },
  } as unknown as PrismaService;

  const service = new PreActivityChecksService(prisma);

  return { service, prisma, create, update, deleteFn };
}

const actor = { id: 9, username: 'budi' };

describe('PreActivityChecksService.findAll — filter', () => {
  it('tanpa filter mengirim where kosong', async () => {
    const { service, prisma } = buatService();

    await service.findAll();

    expect(prisma.preActivityCheck.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('search di-trim dan diterapkan OR ke 4 kolom', async () => {
    const { service, prisma } = buatService();

    await service.findAll('  pekerjaan  ');

    const where = (prisma.preActivityCheck.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.OR).toHaveLength(4);
    expect(where.OR[0]).toEqual({ job_name: { contains: 'pekerjaan', mode: 'insensitive' } });
  });

  it('month+year membuat rentang satu bulan', async () => {
    const { service, prisma } = buatService();

    await service.findAll(undefined, 3, 2026);

    const where = (prisma.preActivityCheck.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.activityDate).toEqual({ gte: new Date(2026, 2, 1), lt: new Date(2026, 3, 1) });
  });

  it('year saja (tanpa month) membuat rentang satu tahun penuh', async () => {
    const { service, prisma } = buatService();

    await service.findAll(undefined, undefined, 2026);

    const where = (prisma.preActivityCheck.findMany as jest.Mock).mock.calls[0][0].where;
    expect(where.activityDate).toEqual({ gte: new Date(2026, 0, 1), lt: new Date(2027, 0, 1) });
  });
});

describe('PreActivityChecksService.findOne', () => {
  it('melempar NotFoundException kalau data tidak ada', async () => {
    const { service } = buatService({ row: null });

    await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
  });
});

describe('PreActivityChecksService.create', () => {
  const dtoDasar = { jobName: '  Pekerjaan A  ', activityDate: '2026-01-05' };

  it('trim job_name dan konversi activityDate', async () => {
    const { service, create } = buatService();

    await service.create(dtoDasar as any, actor);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ job_name: 'Pekerjaan A', activityDate: new Date('2026-01-05') }) }),
    );
  });

  it('field opsional kosong disimpan sebagai null', async () => {
    const { service, create } = buatService();

    await service.create({ ...dtoDasar, workLocationText: '   ' } as any, actor);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ work_location_text: null }) }),
    );
  });

  it('health_check_status default "Aman" kalau tidak diisi', async () => {
    const { service, create } = buatService();

    await service.create(dtoDasar as any, actor);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ health_check_status: 'Aman' }) }),
    );
  });

  it('pic default string kosong kalau coordinatorName tidak diisi', async () => {
    const { service, create } = buatService();

    await service.create(dtoDasar as any, actor);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ pic: '' }) }));
  });

  it('executor_signature fallback ke coordinatorSignPath kalau executorSignaturePath kosong', async () => {
    const { service, create } = buatService();

    await service.create({ ...dtoDasar, coordinatorSignPath: 'uploads/sign1.png' } as any, actor);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ executor_signature: 'uploads/sign1.png' }) }),
    );
  });

  it('supervisor_signature fallback ke supervisorSignPath kalau supervisorSignaturePath kosong', async () => {
    const { service, create } = buatService();

    await service.create({ ...dtoDasar, supervisorSignPath: 'uploads/sign2.png' } as any, actor);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ supervisor_signature: 'uploads/sign2.png' }) }),
    );
  });

  it('createdBy diisi dari id aktor', async () => {
    const { service, create } = buatService();

    await service.create(dtoDasar as any, actor);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ createdBy: 9 }) }));
  });

  describe('serialisasi documentationPaths / socialization_photo', () => {
    it('array documentationPaths di-JSON-kan, entri kosong difilter', async () => {
      const { service, create } = buatService();

      await service.create({ ...dtoDasar, documentationPaths: ['a.jpg', '  ', 'b.jpg'] } as any, actor);

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ socialization_photo: JSON.stringify(['a.jpg', 'b.jpg']) }) }),
      );
    });

    it('array kosong menghasilkan null', async () => {
      const { service, create } = buatService();

      await service.create({ ...dtoDasar, documentationPaths: [] } as any, actor);

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ socialization_photo: null }) }),
      );
    });

    it('documentationPaths diprioritaskan di atas socializationPhoto legacy', async () => {
      const { service, create } = buatService();

      await service.create(
        { ...dtoDasar, documentationPaths: ['baru.jpg'], socializationPhoto: 'lama.jpg' } as any,
        actor,
      );

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ socialization_photo: JSON.stringify(['baru.jpg']) }) }),
      );
    });

    it('socializationPhoto legacy berupa satu path dibungkus jadi array JSON', async () => {
      const { service, create } = buatService();

      await service.create({ ...dtoDasar, socializationPhoto: 'lama.jpg' } as any, actor);

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ socialization_photo: JSON.stringify(['lama.jpg']) }) }),
      );
    });

    it('socializationPhoto legacy yang sudah berupa JSON array string diparse ulang', async () => {
      const { service, create } = buatService();

      await service.create({ ...dtoDasar, socializationPhoto: JSON.stringify(['x.jpg', 'y.jpg']) } as any, actor);

      expect(create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ socialization_photo: JSON.stringify(['x.jpg', 'y.jpg']) }) }),
      );
    });
  });
});

describe('PreActivityChecksService.update', () => {
  it('melempar NotFoundException kalau data tidak ada', async () => {
    const { service } = buatService({ row: null });

    await expect(service.update(1, { jobName: 'X' } as any)).rejects.toThrow(NotFoundException);
  });

  it('hanya mengubah field yang eksplisit dikirim', async () => {
    const { service, update } = buatService();

    await service.update(1, { jobName: '  Baru  ' } as any);

    expect(update).toHaveBeenCalledWith({ where: { id: 1 }, data: { job_name: 'Baru' }, include: expect.anything() });
  });

  it('documentationPaths tanpa key socializationPhoto TIDAK memicu update field foto (perilaku saat ini)', async () => {
    const { service, update } = buatService();

    await service.update(1, { documentationPaths: ['a.jpg'] } as any);

    expect(update.mock.calls[0][0].data.socialization_photo).toBeUndefined();
  });

  it('mengirim socializationPhoto memicu update dan memakai documentationPaths kalau keduanya ada', async () => {
    const { service, update } = buatService();

    await service.update(1, { socializationPhoto: 'lama.jpg', documentationPaths: ['baru.jpg'] } as any);

    expect(update.mock.calls[0][0].data.socialization_photo).toBe(JSON.stringify(['baru.jpg']));
  });
});

describe('PreActivityChecksService.remove', () => {
  it('melempar NotFoundException kalau data tidak ada', async () => {
    const { service } = buatService({ row: null });

    await expect(service.remove(1)).rejects.toThrow(NotFoundException);
  });

  it('berhasil hapus record walau file fisik tidak ada (tidak melempar error)', async () => {
    const { service, deleteFn } = buatService({ row: rowFixture({ jsa_image: 'uploads/tidak-ada.jpg' }) });

    const hasil = await service.remove(1);

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });

  it('menghapus file fisik yang benar-benar ada di direktori uploads', async () => {
    const cwdAwal = process.cwd();
    const direktoriUji = mkdtempSync(join(tmpdir(), 'pre-activity-'));
    mkdirSync(join(direktoriUji, 'uploads', 'pre-activity'), { recursive: true });
    const filePath = join(direktoriUji, 'uploads', 'pre-activity', 'jsa.jpg');
    writeFileSync(filePath, 'dummy');
    process.chdir(direktoriUji);

    try {
      const { service } = buatService({ row: rowFixture({ jsa_image: 'uploads/pre-activity/jsa.jpg' }) });

      await service.remove(1);

      expect(existsSync(filePath)).toBe(false);
    } finally {
      process.chdir(cwdAwal);
      rmSync(direktoriUji, { recursive: true, force: true });
    }
  });
});
