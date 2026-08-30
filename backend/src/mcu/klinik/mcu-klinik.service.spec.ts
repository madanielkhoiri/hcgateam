import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { McuKlinikService } from './mcu-klinik.service';

function klinikFixture(overrides: Partial<{ terkoneksi: boolean; akunId: number | null }> = {}) {
  return {
    id: 1,
    namaKlinik: 'Klinik A',
    terkoneksi: overrides.terkoneksi ?? false,
    akunId: 'akunId' in overrides ? overrides.akunId : null,
    statusAktif: true,
  };
}

function buatService(overrides: {
  klinik?: unknown;
  create?: jest.Mock;
  update?: jest.Mock;
  hapusFindUnique?: unknown;
  deleteFn?: jest.Mock;
} = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const update = overrides.update ?? jest.fn(({ data }) => Promise.resolve({ ...(klinikFixture() as object), ...data }));
  const deleteFn = overrides.deleteFn ?? jest.fn().mockResolvedValue({});

  const prisma = {
    klinik: {
      findUnique: jest.fn().mockResolvedValue(
        'hapusFindUnique' in overrides ? overrides.hapusFindUnique : ('klinik' in overrides ? overrides.klinik : klinikFixture()),
      ),
      create,
      update,
      delete: deleteFn,
    },
  } as unknown as PrismaService;

  const service = new McuKlinikService(prisma);

  return { service, create, update, deleteFn };
}

describe('McuKlinikService.buat', () => {
  it('menolak klinik terkoneksi tanpa akunId', async () => {
    const { service } = buatService();

    await expect(service.buat({ namaKlinik: 'Klinik B', terkoneksi: true } as any)).rejects.toThrow(
      'Klinik terkoneksi wajib memiliki akun untuk submit hasil',
    );
  });

  it('mengizinkan klinik tidak terkoneksi tanpa akunId', async () => {
    const { service, create } = buatService();

    await service.buat({ namaKlinik: 'Klinik B', terkoneksi: false } as any);

    expect(create).toHaveBeenCalled();
  });

  it('berhasil membuat klinik terkoneksi lengkap dengan akunId', async () => {
    const { service, create } = buatService();

    await service.buat({ namaKlinik: 'Klinik B', terkoneksi: true, akunId: 5 } as any);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ terkoneksi: true, akunId: 5 }) }),
    );
  });
});

describe('McuKlinikService.ubah', () => {
  it('menolak jadi terkoneksi tanpa akunId (baik dari existing maupun dto)', async () => {
    const { service } = buatService({ klinik: klinikFixture({ terkoneksi: false, akunId: null }) });

    await expect(service.ubah(1, { terkoneksi: true } as any)).rejects.toThrow(
      'Klinik terkoneksi wajib memiliki akun untuk submit hasil',
    );
  });

  it('mengizinkan jadi terkoneksi kalau sudah punya akunId dari sebelumnya', async () => {
    const { service, update } = buatService({ klinik: klinikFixture({ terkoneksi: false, akunId: 9 }) });

    await service.ubah(1, { terkoneksi: true } as any);

    expect(update).toHaveBeenCalled();
  });

  it('mengizinkan set akunId sekaligus jadi terkoneksi dalam satu request', async () => {
    const { service, update } = buatService({ klinik: klinikFixture({ terkoneksi: false, akunId: null }) });

    await service.ubah(1, { terkoneksi: true, akunId: 9 } as any);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ terkoneksi: true, akunId: 9 }) }),
    );
  });
});

describe('McuKlinikService.hapus', () => {
  it('melempar NotFoundException kalau klinik tidak ada', async () => {
    const { service } = buatService({ hapusFindUnique: null });

    await expect(service.hapus(1)).rejects.toThrow(NotFoundException);
  });

  it('menolak hapus klinik yang sudah dipakai pada jadwal MCU', async () => {
    const { service } = buatService({ hapusFindUnique: { id: 1, _count: { jadwalMcu: 2 } } });

    await expect(service.hapus(1)).rejects.toThrow(/Nonaktifkan saja klinik ini/);
  });

  it('berhasil menghapus klinik yang belum pernah dipakai', async () => {
    const { service, deleteFn } = buatService({ hapusFindUnique: { id: 1, _count: { jadwalMcu: 0 } } });

    const hasil = await service.hapus(1);

    expect(deleteFn).toHaveBeenCalled();
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});
