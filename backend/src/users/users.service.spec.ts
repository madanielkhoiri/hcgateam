import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { UsersService } from './users.service';

function prismaError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('error prisma', {
    code,
    clientVersion: '7.8.0',
    meta,
  });
}

function buatService(prismaOverrides: Record<string, unknown> = {}) {
  const prisma = {
    user: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    ...prismaOverrides,
  } as unknown as PrismaService;
  const auditLog = { catat: jest.fn().mockResolvedValue(undefined) } as unknown as AuditLogService;
  const service = new UsersService(prisma, auditLog);

  return { service, prisma, auditLog };
}

const AKTOR_KARYAWAN = { id: 1, role: UserRole.KARYAWAN };
const AKTOR_ADMIN = { id: 1, role: UserRole.ADMIN };

describe('UsersService — hak akses admin', () => {
  it('findAll menolak aktor yang bukan Admin/Section Head', async () => {
    const { service } = buatService();

    await expect(service.findAll(AKTOR_KARYAWAN)).rejects.toThrow(ForbiddenException);
  });

  it('getAccessCatalog menolak aktor yang bukan Admin/Section Head', () => {
    const { service } = buatService();

    expect(() => service.getAccessCatalog(AKTOR_KARYAWAN)).toThrow(ForbiddenException);
  });

  it('getAccessCatalog mengembalikan katalog untuk aktor Admin', () => {
    const { service } = buatService();

    expect(() => service.getAccessCatalog(AKTOR_ADMIN)).not.toThrow();
  });
});

describe('UsersService.update — proteksi akun sendiri', () => {
  it('menolak admin menonaktifkan akun sendiri', async () => {
    const { service, prisma } = buatService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1, role: UserRole.ADMIN });

    await expect(
      service.update(1, { isActive: false } as any, AKTOR_ADMIN),
    ).rejects.toThrow('Admin tidak dapat menonaktifkan akun sendiri');
  });

  it('menolak admin mengganti role akun sendiri ke role lain', async () => {
    const { service, prisma } = buatService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 1, role: UserRole.ADMIN });

    await expect(
      service.update(1, { role: UserRole.KARYAWAN } as any, AKTOR_ADMIN),
    ).rejects.toThrow('Admin tidak dapat mengganti role akun sendiri');
  });
});

describe('UsersService.update — cabut sesi otomatis', () => {
  it('mencabut sesi (set tokenValidAfter) kalau password diganti admin', async () => {
    const { service, prisma } = buatService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 2, role: UserRole.KARYAWAN, isActive: true });

    await service.update(2, { password: 'passwordbaru123' } as any, AKTOR_ADMIN);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tokenValidAfter: expect.any(Date) }),
      }),
    );
  });

  it('mencabut sesi kalau akun (bukan diri sendiri) dinonaktifkan', async () => {
    const { service, prisma } = buatService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 2, role: UserRole.KARYAWAN, isActive: true });

    await service.update(2, { isActive: false } as any, AKTOR_ADMIN);

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tokenValidAfter: expect.any(Date) }),
      }),
    );
  });

  it('TIDAK mencabut sesi untuk perubahan biasa (mis. ganti nama saja)', async () => {
    const { service, prisma } = buatService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 2, role: UserRole.KARYAWAN, isActive: true });

    await service.update(2, { name: 'Nama Baru' } as any, AKTOR_ADMIN);

    const dataDikirim = (prisma.user.update as jest.Mock).mock.calls[0][0].data;
    expect(dataDikirim).not.toHaveProperty('tokenValidAfter');
  });
});

describe('UsersService.cabutSesi', () => {
  it('menolak aktor yang bukan Admin/Section Head', async () => {
    const { service } = buatService();

    await expect(service.cabutSesi(2, AKTOR_KARYAWAN)).rejects.toThrow(ForbiddenException);
  });

  it('melempar NotFoundException kalau akun tidak ada', async () => {
    const { service, prisma } = buatService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.cabutSesi(99, AKTOR_ADMIN)).rejects.toThrow('Pengguna tidak ditemukan');
  });

  it('berhasil mencabut sesi dan mencatat audit log USER_SESI_DICABUT', async () => {
    const { service, prisma, auditLog } = buatService();
    (prisma.user.findUnique as jest.Mock).mockResolvedValue({ id: 2, name: 'Budi', username: 'budi' });

    const hasil = await service.cabutSesi(2, AKTOR_ADMIN);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 2 },
      data: { tokenValidAfter: expect.any(Date) },
    });
    expect(auditLog.catat).toHaveBeenCalledWith(
      expect.objectContaining({ aksi: 'USER_SESI_DICABUT', entitas: 'User', entitasId: 2 }),
    );
    expect(hasil.message).toMatch(/berhasil dicabut/i);
  });
});

describe('UsersService.remove — proteksi akun sendiri & error mapping', () => {
  it('menolak admin menghapus akun sendiri', async () => {
    const { service } = buatService();

    await expect(service.remove(1, AKTOR_ADMIN)).rejects.toThrow(
      'Admin tidak dapat menghapus akun sendiri',
    );
  });

  it('mengubah error Prisma P2003 (masih punya relasi) jadi pesan yang ramah', async () => {
    const { service, prisma } = buatService();
    (prisma.user.delete as jest.Mock).mockRejectedValue(prismaError('P2003'));

    await expect(service.remove(2, AKTOR_ADMIN)).rejects.toThrow(
      /tidak dapat dihapus/i,
    );
  });
});

describe('UsersService.create — error mapping duplikat', () => {
  it('mengubah error Prisma P2002 pada email jadi pesan "Email sudah digunakan"', async () => {
    const { service, prisma } = buatService();
    (prisma.user.create as jest.Mock).mockRejectedValue(
      prismaError('P2002', { target: ['email'] }),
    );

    await expect(
      service.create(
        {
          name: 'Budi',
          username: 'budi',
          password: 'rahasia123',
          role: UserRole.KARYAWAN,
          email: 'dipakai@contoh.com',
        } as any,
        AKTOR_ADMIN,
      ),
    ).rejects.toThrow(new BadRequestException('Email sudah digunakan'));
  });

  it('mengubah error Prisma P2002 pada username jadi pesan default "Username sudah digunakan"', async () => {
    const { service, prisma } = buatService();
    (prisma.user.create as jest.Mock).mockRejectedValue(
      prismaError('P2002', { target: ['username'] }),
    );

    await expect(
      service.create(
        { name: 'Budi', username: 'dipakai', password: 'rahasia123', role: UserRole.KARYAWAN } as any,
        AKTOR_ADMIN,
      ),
    ).rejects.toThrow('Username sudah digunakan');
  });
});
