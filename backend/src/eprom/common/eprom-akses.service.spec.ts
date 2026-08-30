import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AktorEprom } from './eprom-aktor';
import { EpromAksesService } from './eprom-akses.service';

function aktor(role: UserRole, overrides: Partial<AktorEprom> = {}): AktorEprom {
  return { id: 1, username: 'test', role, ...overrides };
}

function buatService(overrides: { project?: unknown; vendor?: unknown } = {}) {
  const prisma = {
    project: {
      findUnique: jest.fn().mockResolvedValue('project' in overrides ? overrides.project : null),
    },
    vendor: {
      findUnique: jest.fn().mockResolvedValue('vendor' in overrides ? overrides.vendor : null),
    },
  } as unknown as PrismaService;

  const service = new EpromAksesService(prisma);

  return { service, prisma };
}

describe('EpromAksesService.isOwner / isVendor', () => {
  const service = buatService().service;

  it.each([UserRole.OWNER, UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD])(
    'role %s dianggap setara Owner',
    (role) => {
      expect(service.isOwner(aktor(role))).toBe(true);
    },
  );

  it('role VENDOR bukan Owner', () => {
    expect(service.isOwner(aktor(UserRole.VENDOR))).toBe(false);
  });

  it('role VENDOR terdeteksi sebagai vendor', () => {
    expect(service.isVendor(aktor(UserRole.VENDOR))).toBe(true);
  });

  it('role OWNER bukan vendor', () => {
    expect(service.isVendor(aktor(UserRole.OWNER))).toBe(false);
  });
});

describe('EpromAksesService.wajibOwner / wajibVendor', () => {
  const service = buatService().service;

  it('wajibOwner melempar ForbiddenException untuk role VENDOR', () => {
    expect(() => service.wajibOwner(aktor(UserRole.VENDOR))).toThrow(ForbiddenException);
  });

  it('wajibOwner lolos untuk role ADMIN', () => {
    expect(() => service.wajibOwner(aktor(UserRole.ADMIN))).not.toThrow();
  });

  it('wajibVendor melempar ForbiddenException untuk role OWNER', () => {
    expect(() => service.wajibVendor(aktor(UserRole.OWNER))).toThrow(ForbiddenException);
  });

  it('wajibVendor lolos untuk role VENDOR', () => {
    expect(() => service.wajibVendor(aktor(UserRole.VENDOR))).not.toThrow();
  });
});

describe('EpromAksesService.wajibVendorSendiri', () => {
  const service = buatService().service;

  it('Owner boleh lintas vendor manapun', async () => {
    await expect(service.wajibVendorSendiri(aktor(UserRole.ADMIN), 99)).resolves.toBeUndefined();
  });

  it('menolak role selain OWNER/VENDOR (mis. KARYAWAN)', async () => {
    await expect(service.wajibVendorSendiri(aktor(UserRole.KARYAWAN), 1)).rejects.toThrow(ForbiddenException);
  });

  it('menolak Vendor yang mengakses vendorId milik vendor lain', async () => {
    await expect(
      service.wajibVendorSendiri(aktor(UserRole.VENDOR, { vendorId: 1 }), 2),
    ).rejects.toThrow('Akun Vendor hanya dapat mengelola datanya sendiri');
  });

  it('mengizinkan Vendor mengakses vendorId miliknya sendiri', async () => {
    await expect(
      service.wajibVendorSendiri(aktor(UserRole.VENDOR, { vendorId: 1 }), 1),
    ).resolves.toBeUndefined();
  });
});

describe('EpromAksesService.vendorDariAkun', () => {
  it('mengembalikan null kalau aktor tidak punya vendorId', async () => {
    const { service } = buatService();

    const hasil = await service.vendorDariAkun(aktor(UserRole.OWNER));

    expect(hasil).toBeNull();
  });

  it('mengembalikan data vendor kalau aktor punya vendorId', async () => {
    const { service, prisma } = buatService({ vendor: { id: 5, namaVendor: 'PT X' } });

    const hasil = await service.vendorDariAkun(aktor(UserRole.VENDOR, { vendorId: 5 }));

    expect(prisma.vendor.findUnique).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(hasil).toEqual({ id: 5, namaVendor: 'PT X' });
  });
});

describe('EpromAksesService.wajibAksesProject', () => {
  it('Owner boleh mengakses project manapun tanpa query', async () => {
    const { service, prisma } = buatService();

    await expect(service.wajibAksesProject(aktor(UserRole.OWNER), 1)).resolves.toBeUndefined();
    expect(prisma.project.findUnique).not.toHaveBeenCalled();
  });

  it('menolak role selain OWNER/VENDOR', async () => {
    const { service } = buatService();

    await expect(service.wajibAksesProject(aktor(UserRole.KARYAWAN), 1)).rejects.toThrow(ForbiddenException);
  });

  it('menolak Vendor kalau project tidak ditemukan', async () => {
    const { service } = buatService({ project: null });

    await expect(
      service.wajibAksesProject(aktor(UserRole.VENDOR, { vendorId: 1 }), 1),
    ).rejects.toThrow('Akun Vendor hanya dapat mengelola project miliknya sendiri');
  });

  it('menolak Vendor kalau project milik vendor lain (via kontrak.vendorId)', async () => {
    const { service } = buatService({ project: { kontrak: { vendorId: 2 } } });

    await expect(
      service.wajibAksesProject(aktor(UserRole.VENDOR, { vendorId: 1 }), 1),
    ).rejects.toThrow(ForbiddenException);
  });

  it('mengizinkan Vendor mengakses project dari kontrak miliknya sendiri', async () => {
    const { service } = buatService({ project: { kontrak: { vendorId: 1 } } });

    await expect(
      service.wajibAksesProject(aktor(UserRole.VENDOR, { vendorId: 1 }), 1),
    ).resolves.toBeUndefined();
  });
});
