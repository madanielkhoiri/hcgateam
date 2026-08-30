import { NotFoundException } from '@nestjs/common';
import { LokasiHousekeepingIndoor } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { HousekeepingIndoorFileService } from './housekeeping-indoor-file.service';
import { HousekeepingIndoorService } from './housekeeping-indoor.service';

function laporanFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, foto: [{ fileUrl: 'housekeeping-indoor/laporan-1/a.jpg' }], ...overrides };
}

function buatService(overrides: {
  laporan?: unknown;
  create?: jest.Mock;
  createManyFail?: boolean;
  deleteFn?: jest.Mock;
} = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const deleteFn = overrides.deleteFn ?? jest.fn().mockResolvedValue({});
  const createMany = overrides.createManyFail
    ? jest.fn().mockRejectedValue(new Error('DB error'))
    : jest.fn().mockResolvedValue({});

  const prisma = {
    housekeepingIndoor: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue('laporan' in overrides ? overrides.laporan : laporanFixture()),
      create,
      delete: deleteFn,
    },
    housekeepingIndoorFoto: {
      createMany,
    },
  } as unknown as PrismaService;

  const file = {
    simpan: jest.fn((f: any) => `housekeeping-indoor/laporan-1/${f.originalname}`),
    hapus: jest.fn(),
  } as unknown as HousekeepingIndoorFileService;

  const service = new HousekeepingIndoorService(prisma, file);

  return { service, prisma, file, create, deleteFn, createMany };
}

describe('HousekeepingIndoorService.daftar', () => {
  it('menerapkan filter lokasi kalau diberikan', async () => {
    const { service, prisma } = buatService();

    await service.daftar(LokasiHousekeepingIndoor.OFFICE);

    expect(prisma.housekeepingIndoor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { lokasi: LokasiHousekeepingIndoor.OFFICE } }),
    );
  });

  it('tanpa filter kalau lokasi tidak diberikan', async () => {
    const { service, prisma } = buatService();

    await service.daftar();

    expect(prisma.housekeepingIndoor.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: undefined }),
    );
  });
});

describe('HousekeepingIndoorService.buat', () => {
  const dtoDasar = { lokasi: LokasiHousekeepingIndoor.OFFICE, namaPetugas: '  Budi  ' };

  it('namaPetugas di-trim', async () => {
    const { service, create } = buatService();

    await service.buat(dtoDasar as any, [], 9);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ namaPetugas: 'Budi' }) }));
  });

  it('berhasil tanpa foto', async () => {
    const { service, file } = buatService();

    await service.buat(dtoDasar as any, [], 9);

    expect(file.simpan).not.toHaveBeenCalled();
  });

  it('berhasil menyimpan banyak foto sekaligus', async () => {
    const { service, createMany } = buatService();
    const files = [{ originalname: 'a.jpg' }, { originalname: 'b.jpg' }] as Express.Multer.File[];

    await service.buat(dtoDasar as any, files, 9);

    expect(createMany).toHaveBeenCalledWith({
      data: [
        { laporanId: 1, fileUrl: 'housekeeping-indoor/laporan-1/a.jpg' },
        { laporanId: 1, fileUrl: 'housekeeping-indoor/laporan-1/b.jpg' },
      ],
    });
  });

  it('rollback: menghapus file yang sudah tersimpan DAN laporan yang baru dibuat kalau createMany foto gagal', async () => {
    const { service, file, deleteFn } = buatService({ createManyFail: true });
    const files = [{ originalname: 'a.jpg' }] as Express.Multer.File[];

    await expect(service.buat(dtoDasar as any, files, 9)).rejects.toThrow('DB error');

    expect(file.hapus).toHaveBeenCalledWith('housekeeping-indoor/laporan-1/a.jpg');
    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});

describe('HousekeepingIndoorService.hapus', () => {
  it('melempar NotFoundException kalau laporan tidak ada', async () => {
    const { service } = buatService({ laporan: null });

    await expect(service.hapus(1)).rejects.toThrow(NotFoundException);
  });

  it('berhasil hapus laporan dan seluruh foto terkait', async () => {
    const { service, deleteFn, file } = buatService({
      laporan: laporanFixture({ foto: [{ fileUrl: 'a.jpg' }, { fileUrl: 'b.jpg' }] }),
    });

    const hasil = await service.hapus(1);

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(file.hapus).toHaveBeenCalledTimes(2);
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});
