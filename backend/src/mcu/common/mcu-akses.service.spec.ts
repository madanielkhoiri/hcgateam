import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { McuAksesService } from './mcu-akses.service';
import { AktorMcu } from './mcu-aktor';

function aktor(role: UserRole, id = 1): AktorMcu {
  return { id, role, username: 'test' };
}

describe('McuAksesService.peranAktor / punyaPeran', () => {
  const akses = new McuAksesService({} as any);

  it.each([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD])(
    'role portal super (%s) dianggap memegang SEMUA peran MCU sekaligus',
    (role) => {
      const peran = akses.peranAktor(aktor(role));

      expect(peran).toEqual(
        expect.arrayContaining([
          UserRole.KARYAWAN,
          UserRole.ADMIN_DEPT,
          UserRole.HC,
          UserRole.DOKTER,
          UserRole.SHE,
          UserRole.KLINIK,
        ]),
      );
    },
  );

  it('akun MCU biasa (mis. HC) cuma memegang role-nya sendiri, bukan semua', () => {
    const peran = akses.peranAktor(aktor(UserRole.HC));

    expect(peran).toEqual([UserRole.HC]);
  });

  it('punyaPeran true untuk role portal super walau diminta peran spesifik (mis. DOKTER)', () => {
    expect(akses.punyaPeran(aktor(UserRole.ADMIN), UserRole.DOKTER)).toBe(true);
  });

  it('punyaPeran false untuk akun MCU biasa yang diminta peran lain', () => {
    expect(akses.punyaPeran(aktor(UserRole.HC), UserRole.DOKTER)).toBe(false);
  });
});

describe('McuAksesService.wajibPeran', () => {
  const akses = new McuAksesService({} as any);

  it('tidak melempar error kalau role cocok', () => {
    expect(() => akses.wajibPeran(aktor(UserRole.DOKTER), UserRole.DOKTER)).not.toThrow();
  });

  it('melempar ForbiddenException kalau role tidak cocok', () => {
    expect(() => akses.wajibPeran(aktor(UserRole.KARYAWAN), UserRole.DOKTER)).toThrow(
      ForbiddenException,
    );
  });

  it('pesan error menyebutkan label peran yang diminta', () => {
    expect(() => akses.wajibPeran(aktor(UserRole.KARYAWAN), UserRole.HC)).toThrow(
      'Aksi ini hanya dapat dilakukan oleh akun HC',
    );
  });
});

describe('McuAksesService.tipePengunggah', () => {
  const akses = new McuAksesService({} as any);

  it.each([
    [UserRole.HC, 'HC'],
    [UserRole.KLINIK, 'KLINIK_TERKONEKSI'],
    [UserRole.ADMIN_DEPT, 'ADMIN_DEPT'],
    [UserRole.KARYAWAN, 'KARYAWAN'],
  ])('role %s -> tipe pengunggah %s', (role, tipeDiharapkan) => {
    expect(akses.tipePengunggah(aktor(role))).toBe(tipeDiharapkan);
  });
});

describe('McuAksesService.wajibBolehLihatFileMedis', () => {
  const akses = new McuAksesService({} as any);

  it.each([UserRole.HC, UserRole.DOKTER])(
    'mengizinkan role %s membuka file medis mentah',
    (role) => {
      expect(() => akses.wajibBolehLihatFileMedis(aktor(role))).not.toThrow();
    },
  );

  it.each([UserRole.KARYAWAN, UserRole.ADMIN_DEPT, UserRole.KLINIK, UserRole.SHE])(
    'menolak role %s membuka file medis mentah (kerahasiaan medis)',
    (role) => {
      expect(() => akses.wajibBolehLihatFileMedis(aktor(role))).toThrow(ForbiddenException);
    },
  );
});

describe('McuAksesService.wajibDepartemenSendiri', () => {
  it('HC bebas lintas departemen (tidak perlu query database)', async () => {
    const akses = new McuAksesService({} as any);

    await expect(akses.wajibDepartemenSendiri(aktor(UserRole.HC), 99)).resolves.toBeUndefined();
  });

  it('Admin Dept ditolak kalau departemenId bukan yang dia pegang', async () => {
    const prisma = {
      departemen: { findMany: jest.fn().mockResolvedValue([{ id: 1, namaDepartemen: 'GA' }]) },
    };
    const akses = new McuAksesService(prisma as any);

    await expect(akses.wajibDepartemenSendiri(aktor(UserRole.ADMIN_DEPT), 99)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('Admin Dept diizinkan untuk departemen yang memang dia pegang', async () => {
    const prisma = {
      departemen: { findMany: jest.fn().mockResolvedValue([{ id: 5, namaDepartemen: 'GA' }]) },
    };
    const akses = new McuAksesService(prisma as any);

    await expect(akses.wajibDepartemenSendiri(aktor(UserRole.ADMIN_DEPT), 5)).resolves.toBeUndefined();
  });
});
