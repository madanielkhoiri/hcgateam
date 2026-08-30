import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PenggunaService } from './pengguna.service';

function penggunaFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    nrp: '12345',
    name: 'Budi',
    email: 'budi@x.com',
    phoneNumber: '0812',
    role: 'KARYAWAN',
    isActive: true,
    ticketCode: 'ABC',
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-02'),
    ...overrides,
  };
}

function buatService(overrides: { findMany?: unknown[]; findUnique?: unknown } = {}) {
  const prisma = {
    user: {
      findMany: jest.fn().mockResolvedValue(overrides.findMany ?? [penggunaFixture()]),
      findUnique: jest.fn().mockResolvedValue('findUnique' in overrides ? overrides.findUnique : penggunaFixture()),
    },
  } as unknown as PrismaService;

  const service = new PenggunaService(prisma);

  return { service, prisma };
}

describe('PenggunaService.ambilSemuaPengguna', () => {
  it('memformat field pengguna ke snake_case bahasa Indonesia', async () => {
    const { service } = buatService();

    const [hasil] = await service.ambilSemuaPengguna();

    expect(hasil).toEqual({
      id: 1,
      nrp: '12345',
      nama: 'Budi',
      email: 'budi@x.com',
      nomor_telepon: '0812',
      role: 'KARYAWAN',
      aktif: true,
      kode_tiket: 'ABC',
      dibuat_pada: new Date('2026-01-01'),
      diperbarui_pada: new Date('2026-01-02'),
    });
  });

  it('diurutkan terbaru dulu (query orderBy createdAt desc)', async () => {
    const { service, prisma } = buatService();

    await service.ambilSemuaPengguna();

    expect(prisma.user.findMany).toHaveBeenCalledWith({ orderBy: { createdAt: 'desc' } });
  });
});

describe('PenggunaService.ambilPenggunaBerdasarkanId', () => {
  it('melempar NotFoundException kalau pengguna tidak ada', async () => {
    const { service } = buatService({ findUnique: null });

    await expect(service.ambilPenggunaBerdasarkanId(99)).rejects.toThrow(NotFoundException);
  });

  it('mengembalikan pengguna yang diformat', async () => {
    const { service } = buatService();

    const hasil = await service.ambilPenggunaBerdasarkanId(1);

    expect(hasil.nama).toBe('Budi');
  });
});
