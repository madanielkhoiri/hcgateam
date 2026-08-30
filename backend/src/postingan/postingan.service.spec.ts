import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { TipePostingan, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AktorPostingan } from './postingan-aktor';
import { PostinganFileService } from './postingan-file.service';
import { PostinganService } from './postingan.service';

function aktor(role: UserRole): AktorPostingan {
  return { id: 9, role };
}

function postinganFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, judul: 'Postingan A', tipe: TipePostingan.POSTER, urlMedia: 'postingan/a.jpg', ...overrides };
}

function buatService(overrides: { postingan?: unknown; create?: jest.Mock; update?: jest.Mock; deleteFn?: jest.Mock } = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const update = overrides.update ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const deleteFn = overrides.deleteFn ?? jest.fn().mockResolvedValue({});

  const prisma = {
    postingan: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue('postingan' in overrides ? overrides.postingan : postinganFixture()),
      create,
      update,
      delete: deleteFn,
    },
  } as unknown as PrismaService;

  const file = {
    simpanPoster: jest.fn().mockReturnValue('postingan/poster-baru.jpg'),
    simpanVideo: jest.fn().mockReturnValue('postingan/video-baru.mp4'),
    hapus: jest.fn(),
  } as unknown as PostinganFileService;

  const service = new PostinganService(prisma, file);

  return { service, prisma, file, create, update, deleteFn };
}

describe('PostinganService.untukBeranda', () => {
  it('hanya mengambil postingan dengan tampilBeranda true', async () => {
    const { service, prisma } = buatService();

    await service.untukBeranda();

    expect(prisma.postingan.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tampilBeranda: true } }),
    );
  });
});

describe('PostinganService.unggah', () => {
  it('menolak role selain kelola', async () => {
    const { service } = buatService();

    await expect(
      service.unggah(aktor(UserRole.KARYAWAN), 'Judul', undefined, 'POSTER', undefined, undefined, {} as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('menolak judul kosong', async () => {
    const { service } = buatService();

    await expect(
      service.unggah(aktor(UserRole.ADMIN), '   ', undefined, 'POSTER', undefined, undefined, {} as any),
    ).rejects.toThrow('Judul postingan wajib diisi');
  });

  it('menolak tipe tidak valid', async () => {
    const { service } = buatService();

    await expect(
      service.unggah(aktor(UserRole.ADMIN), 'Judul', undefined, 'SALAH', undefined, undefined, {} as any),
    ).rejects.toThrow('Tipe postingan tidak valid');
  });

  it('memakai simpanVideo untuk tipe VIDEO dan simpanPoster untuk POSTER', async () => {
    const { service, file } = buatService();
    const dummyFile = { originalname: 'a.mp4' } as Express.Multer.File;

    await service.unggah(aktor(UserRole.ADMIN), 'Judul', undefined, 'VIDEO', undefined, undefined, dummyFile);

    expect(file.simpanVideo).toHaveBeenCalled();
    expect(file.simpanPoster).not.toHaveBeenCalled();
  });

  it('tampilBeranda default true kecuali dikirim string "false"', async () => {
    const { service, create } = buatService();
    const dummyFile = { originalname: 'a.jpg' } as Express.Multer.File;

    await service.unggah(aktor(UserRole.ADMIN), 'Judul', undefined, 'POSTER', undefined, undefined, dummyFile);
    expect(create.mock.calls[0][0].data.tampilBeranda).toBe(true);

    await service.unggah(aktor(UserRole.ADMIN), 'Judul', undefined, 'POSTER', 'false', undefined, dummyFile);
    expect(create.mock.calls[1][0].data.tampilBeranda).toBe(false);

    await service.unggah(aktor(UserRole.ADMIN), 'Judul', undefined, 'POSTER', 'true', undefined, dummyFile);
    expect(create.mock.calls[2][0].data.tampilBeranda).toBe(true);
  });

  it('urutan default 0 kalau tidak dikirim', async () => {
    const { service, create } = buatService();
    const dummyFile = { originalname: 'a.jpg' } as Express.Multer.File;

    await service.unggah(aktor(UserRole.ADMIN), 'Judul', undefined, 'POSTER', undefined, undefined, dummyFile);

    expect(create.mock.calls[0][0].data.urutan).toBe(0);
  });

  it('urutan dikonversi ke number kalau dikirim', async () => {
    const { service, create } = buatService();
    const dummyFile = { originalname: 'a.jpg' } as Express.Multer.File;

    await service.unggah(aktor(UserRole.ADMIN), 'Judul', undefined, 'POSTER', undefined, '5', dummyFile);

    expect(create.mock.calls[0][0].data.urutan).toBe(5);
  });

  it('deskripsi kosong disimpan null', async () => {
    const { service, create } = buatService();
    const dummyFile = { originalname: 'a.jpg' } as Express.Multer.File;

    await service.unggah(aktor(UserRole.ADMIN), 'Judul', '   ', 'POSTER', undefined, undefined, dummyFile);

    expect(create.mock.calls[0][0].data.deskripsi).toBeNull();
  });
});

describe('PostinganService.ubah', () => {
  it('menolak role selain kelola', async () => {
    const { service } = buatService();

    await expect(service.ubah(aktor(UserRole.KARYAWAN), 1, {})).rejects.toThrow(ForbiddenException);
  });

  it('melempar NotFoundException kalau postingan tidak ada', async () => {
    const { service } = buatService({ postingan: null });

    await expect(service.ubah(aktor(UserRole.ADMIN), 1, {})).rejects.toThrow(NotFoundException);
  });

  it('hanya mengubah field yang eksplisit dikirim', async () => {
    const { service, update } = buatService();

    await service.ubah(aktor(UserRole.ADMIN), 1, { tampilBeranda: false });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: { tampilBeranda: false } }),
    );
  });
});

describe('PostinganService.hapus', () => {
  it('menolak role selain kelola', async () => {
    const { service } = buatService();

    await expect(service.hapus(aktor(UserRole.KARYAWAN), 1)).rejects.toThrow(ForbiddenException);
  });

  it('melempar NotFoundException kalau postingan tidak ada', async () => {
    const { service } = buatService({ postingan: null });

    await expect(service.hapus(aktor(UserRole.ADMIN), 1)).rejects.toThrow(NotFoundException);
  });

  it('berhasil menghapus postingan dan file medianya', async () => {
    const { service, deleteFn, file } = buatService();

    const hasil = await service.hapus(aktor(UserRole.ADMIN), 1);

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(file.hapus).toHaveBeenCalledWith('postingan/a.jpg');
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});
