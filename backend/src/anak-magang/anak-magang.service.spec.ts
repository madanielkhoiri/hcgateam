import { NotFoundException } from '@nestjs/common';
import { StatusAnakMagang } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AnakMagangService } from './anak-magang.service';

function anakMagangFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, nama: 'Budi', status: StatusAnakMagang.AKTIF, ...overrides };
}

function buatService(overrides: { item?: unknown } = {}) {
  const findMany = jest.fn().mockResolvedValue([]);
  const findUnique = jest
    .fn()
    .mockResolvedValue('item' in overrides ? overrides.item : anakMagangFixture());
  const create = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const update = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));

  const prisma = {
    anakMagang: { findMany, findUnique, create, update },
  } as unknown as PrismaService;

  const service = new AnakMagangService(prisma);

  return { service, prisma, findMany, findUnique, create, update };
}

describe('AnakMagangService.daftar', () => {
  it('tanpa filter kalau status dan cari kosong', async () => {
    const { service, findMany } = buatService();

    await service.daftar({});

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('menerapkan filter status', async () => {
    const { service, findMany } = buatService();

    await service.daftar({ status: StatusAnakMagang.NONAKTIF });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: StatusAnakMagang.NONAKTIF } }),
    );
  });

  it('menerapkan pencarian nama/nrp (case-insensitive)', async () => {
    const { service, findMany } = buatService();

    await service.daftar({ cari: 'budi' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { nama: { contains: 'budi', mode: 'insensitive' } },
            { nrp: { contains: 'budi', mode: 'insensitive' } },
          ],
        },
      }),
    );
  });

  it('menggabungkan filter status dan cari sekaligus', async () => {
    const { service, findMany } = buatService();

    await service.daftar({ status: StatusAnakMagang.AKTIF, cari: 'budi' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: StatusAnakMagang.AKTIF,
          OR: expect.any(Array),
        }),
      }),
    );
  });
});

describe('AnakMagangService.detail', () => {
  it('melempar NotFoundException kalau data tidak ada', async () => {
    const { service } = buatService({ item: null });

    await expect(service.detail(1)).rejects.toThrow(NotFoundException);
  });

  it('mengembalikan data kalau ditemukan', async () => {
    const { service } = buatService();

    const hasil = await service.detail(1);

    expect(hasil).toEqual(anakMagangFixture());
  });
});

describe('AnakMagangService.buat', () => {
  it('nama di-trim dan status default AKTIF', async () => {
    const { service, create } = buatService();

    await service.buat({ nama: '  Budi  ' } as any);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ nama: 'Budi', status: StatusAnakMagang.AKTIF }),
      }),
    );
  });

  it('memakai status yang diberikan kalau ada', async () => {
    const { service, create } = buatService();

    await service.buat({ nama: 'Budi', status: StatusAnakMagang.NONAKTIF } as any);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: StatusAnakMagang.NONAKTIF }) }),
    );
  });

  it('field teks kosong disimpan sebagai null, field yang tidak diisi tidak ikut dikirim', async () => {
    const { service, create } = buatService();

    await service.buat({ nama: 'Budi', universitas: '', jurusan: 'Sipil' } as any);

    const data = create.mock.calls[0][0].data;

    expect(data.universitas).toBeNull();
    expect(data.jurusan).toBe('Sipil');
    expect(data).not.toHaveProperty('departemen');
  });

  it('field tanggal kosong disimpan sebagai null', async () => {
    const { service, create } = buatService();

    await service.buat({ nama: 'Budi', tanggalLahir: '' } as any);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ tanggalLahir: null }) }),
    );
  });

  it('field tanggal yang diisi dikonversi ke Date', async () => {
    const { service, create } = buatService();

    await service.buat({ nama: 'Budi', tanggalMulai: '2026-01-15' } as any);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tanggalMulai: new Date('2026-01-15') }),
      }),
    );
  });
});

describe('AnakMagangService.ubah', () => {
  it('melempar NotFoundException kalau data tidak ada', async () => {
    const { service } = buatService({ item: null });

    await expect(service.ubah(1, { nama: 'Budi' } as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('hanya mengubah field yang diberikan', async () => {
    const { service, update } = buatService();

    await service.ubah(1, { jurusan: 'Elektro' } as any);

    expect(update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { jurusan: 'Elektro' },
    });
  });

  it('nama diubah dan di-trim kalau diberikan', async () => {
    const { service, update } = buatService();

    await service.ubah(1, { nama: '  Budi Baru  ' } as any);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ nama: 'Budi Baru' }) }),
    );
  });
});
