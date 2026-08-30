import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { AktorEprom } from '../common/eprom-aktor';
import { EpromVendorService } from './eprom-vendor.service';

function aktor(role: UserRole, overrides: Partial<AktorEprom> = {}): AktorEprom {
  return { id: 1, username: 'test', role, ...overrides };
}

function vendorFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, namaVendor: 'PT A', email: null, noTelepon: null, ...overrides };
}

function buatService(overrides: {
  vendor?: unknown;
  hapusFindUnique?: unknown;
  update?: jest.Mock;
  deleteFn?: jest.Mock;
  userFindUnique?: unknown;
  userUpdate?: jest.Mock;
} = {}) {
  const update = overrides.update ?? jest.fn(({ data }) => Promise.resolve({ ...(vendorFixture() as object), ...data }));
  const deleteFn = overrides.deleteFn ?? jest.fn().mockResolvedValue({});
  const userUpdate = overrides.userUpdate ?? jest.fn().mockResolvedValue({});
  const create = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));

  const prisma = {
    vendor: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockImplementation(() =>
        Promise.resolve('hapusFindUnique' in overrides ? overrides.hapusFindUnique : ('vendor' in overrides ? overrides.vendor : vendorFixture())),
      ),
      create,
      update,
      delete: deleteFn,
    },
    user: {
      findUnique: jest.fn().mockResolvedValue('userFindUnique' in overrides ? overrides.userFindUnique : { id: 5 }),
      update: userUpdate,
    },
  } as unknown as PrismaService;

  const akses = new EpromAksesService(prisma);
  const service = new EpromVendorService(prisma, akses);

  return { service, prisma, update, deleteFn, userUpdate, create };
}

describe('EpromVendorService.detail', () => {
  it('melempar NotFoundException kalau vendor tidak ada', async () => {
    const { service } = buatService({ vendor: null });

    await expect(service.detail(1)).rejects.toThrow(NotFoundException);
  });
});

describe('EpromVendorService.buat', () => {
  it('trim nama & telepon, email kosong jadi null', async () => {
    const { service, create } = buatService();

    await service.buat({ namaVendor: '  PT A  ', email: '', noTelepon: ' 0812 ' } as any);

    expect(create).toHaveBeenCalledWith({
      data: { namaVendor: 'PT A', email: null, noTelepon: '0812' },
    });
  });
});

describe('EpromVendorService.ubah', () => {
  it('melempar NotFoundException kalau vendor tidak ada', async () => {
    const { service } = buatService({ vendor: null });

    await expect(service.ubah(1, {} as any, true)).rejects.toThrow(NotFoundException);
  });

  it('menolak akun non-Owner mengubah legalitasStatus', async () => {
    const { service } = buatService();

    await expect(service.ubah(1, { legalitasStatus: 'LENGKAP' } as any, false)).rejects.toThrow(
      'Status legalitas hanya dapat diubah oleh Owner',
    );
  });

  it('menolak akun non-Owner mengubah statusAktif', async () => {
    const { service } = buatService();

    await expect(service.ubah(1, { statusAktif: false } as any, false)).rejects.toThrow(
      'Status aktif hanya dapat diubah oleh Owner',
    );
  });

  it('mengizinkan akun Vendor mengubah profil kontaknya sendiri', async () => {
    const { service, update } = buatService();

    await service.ubah(1, { namaVendor: '  PT B  ' } as any, false);

    expect(update).toHaveBeenCalledWith({ where: { id: 1 }, data: { namaVendor: 'PT B' } });
  });

  it('mengizinkan Owner mengubah legalitasStatus dan statusAktif', async () => {
    const { service, update } = buatService();

    await service.ubah(1, { legalitasStatus: 'LENGKAP', statusAktif: false } as any, true);

    expect(update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { legalitasStatus: 'LENGKAP', statusAktif: false },
    });
  });
});

describe('EpromVendorService.hapus', () => {
  it('melempar NotFoundException kalau vendor tidak ada', async () => {
    const { service } = buatService({ hapusFindUnique: null });

    await expect(service.hapus(1)).rejects.toThrow(NotFoundException);
  });

  it('menolak hapus vendor yang sudah punya Kontrak', async () => {
    const { service } = buatService({ hapusFindUnique: { id: 1, _count: { kontrak: 1, undanganTender: 0, sph: 0 } } });

    await expect(service.hapus(1)).rejects.toThrow('sudah memiliki Kontrak');
  });

  it('menolak hapus vendor yang sudah pernah diundang Tender', async () => {
    const { service } = buatService({ hapusFindUnique: { id: 1, _count: { kontrak: 0, undanganTender: 1, sph: 0 } } });

    await expect(service.hapus(1)).rejects.toThrow('sudah pernah diundang');
  });

  it('menolak hapus vendor yang sudah mengirim SPH', async () => {
    const { service } = buatService({ hapusFindUnique: { id: 1, _count: { kontrak: 0, undanganTender: 0, sph: 1 } } });

    await expect(service.hapus(1)).rejects.toThrow('sudah mengirim SPH');
  });

  it('berhasil hapus vendor yang belum terpakai sama sekali', async () => {
    const { service, deleteFn } = buatService({ hapusFindUnique: { id: 1, _count: { kontrak: 0, undanganTender: 0, sph: 0 } } });

    const hasil = await service.hapus(1);

    expect(deleteFn).toHaveBeenCalled();
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});

describe('EpromVendorService.klaimAkun', () => {
  it('menolak role selain VENDOR', async () => {
    const { service } = buatService();

    await expect(service.klaimAkun(aktor(UserRole.OWNER), 1)).rejects.toThrow('Aksi ini hanya dapat dilakukan oleh akun Vendor');
  });

  it('menolak akun yang sudah tertaut ke vendor lain', async () => {
    const { service } = buatService();

    await expect(service.klaimAkun(aktor(UserRole.VENDOR, { vendorId: 5 }), 1)).rejects.toThrow(
      'sudah tertaut ke sebuah vendor',
    );
  });

  it('melempar NotFoundException kalau vendor tujuan tidak ada', async () => {
    const { service } = buatService({ vendor: null });

    await expect(service.klaimAkun(aktor(UserRole.VENDOR, { vendorId: null }), 1)).rejects.toThrow(NotFoundException);
  });

  it('berhasil menautkan akun ke vendor pilihannya', async () => {
    const { service, prisma } = buatService();

    await service.klaimAkun(aktor(UserRole.VENDOR, { vendorId: null, id: 7 }), 1);

    expect(prisma.user.update).toHaveBeenCalledWith({ where: { id: 7 }, data: { vendorId: 1 } });
  });
});

describe('EpromVendorService.tautkanUser', () => {
  it('melempar NotFoundException kalau vendor tidak ada', async () => {
    const { service } = buatService({ vendor: null });

    await expect(service.tautkanUser(1, { userId: 5 } as any)).rejects.toThrow(NotFoundException);
  });

  it('melempar NotFoundException kalau akun pengguna tidak ada', async () => {
    const { service } = buatService({ userFindUnique: null });

    await expect(service.tautkanUser(1, { userId: 5 } as any)).rejects.toThrow('Akun pengguna tidak ditemukan');
  });

  it('berhasil menautkan user ke vendor', async () => {
    const { service, userUpdate } = buatService();

    await service.tautkanUser(1, { userId: 5 } as any);

    expect(userUpdate).toHaveBeenCalledWith({ where: { id: 5 }, data: { vendorId: 1 } });
  });
});
