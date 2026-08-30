import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { AuditLogService } from '../audit/audit-log.service';
import { AuthService } from './auth.service';

function buatUser(overrides: Partial<{ isActive: boolean; passwordHash: string }> = {}) {
  return {
    id: 1,
    name: 'Budi',
    username: 'budi',
    nrp: '12345',
    role: 'ADMIN',
    accessKeys: [],
    vendorId: null,
    isActive: overrides.isActive ?? true,
    passwordHash: overrides.passwordHash ?? '',
  };
}

function buatService(usersOverrides: Partial<UsersService> = {}) {
  const usersService = {
    findByIdentifier: jest.fn(),
    findById: jest.fn(),
    findByIdWithPassword: jest.fn(),
    updateProfile: jest.fn(),
    updatePassword: jest.fn(),
    ...usersOverrides,
  } as unknown as UsersService;
  const jwtService = {
    signAsync: jest.fn().mockResolvedValue('token-palsu'),
  } as unknown as JwtService;
  const auditLog = { catat: jest.fn().mockResolvedValue(undefined) } as unknown as AuditLogService;
  const service = new AuthService(usersService, jwtService, auditLog);

  return { service, usersService, jwtService, auditLog };
}

describe('AuthService.login', () => {
  it('menolak kalau username tidak ditemukan, dan mencatat audit log LOGIN_GAGAL', async () => {
    const { service, usersService, auditLog } = buatService({
      findByIdentifier: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.login({ username: 'siapa', password: 'rahasia123' }, '203.0.113.9'),
    ).rejects.toThrow(UnauthorizedException);
    expect(usersService.findByIdentifier).toHaveBeenCalledWith('siapa');
    expect(auditLog.catat).toHaveBeenCalledWith(
      expect.objectContaining({ aksi: 'LOGIN_GAGAL', alamatIp: '203.0.113.9' }),
    );
  });

  it('menolak kalau akun tidak aktif', async () => {
    const { service } = buatService({
      findByIdentifier: jest.fn().mockResolvedValue(buatUser({ isActive: false })),
    });

    await expect(
      service.login({ username: 'budi', password: 'rahasia123' }),
    ).rejects.toThrow('Akun tidak aktif');
  });

  it('menolak kalau password salah', async () => {
    const passwordHash = await bcrypt.hash('password-benar', 4);
    const { service } = buatService({
      findByIdentifier: jest.fn().mockResolvedValue(buatUser({ passwordHash })),
    });

    await expect(
      service.login({ username: 'budi', password: 'password-salah' }),
    ).rejects.toThrow('Username / NRP / Email atau password salah');
  });

  it('berhasil login, mengembalikan accessToken, dan mencatat audit log LOGIN_BERHASIL', async () => {
    const passwordHash = await bcrypt.hash('password-benar', 4);
    const { service, jwtService, auditLog } = buatService({
      findByIdentifier: jest.fn().mockResolvedValue(buatUser({ passwordHash })),
    });

    const hasil = await service.login(
      { username: 'budi', password: 'password-benar' },
      '203.0.113.9',
    );

    expect(jwtService.signAsync).toHaveBeenCalledWith(
      expect.objectContaining({ sub: 1, username: 'budi' }),
    );
    expect(hasil).toMatchObject({ message: 'Login berhasil', accessToken: 'token-palsu' });
    expect(auditLog.catat).toHaveBeenCalledWith(
      expect.objectContaining({ aksi: 'LOGIN_BERHASIL', actorId: 1, alamatIp: '203.0.113.9' }),
    );
  });
});

describe('AuthService.changePassword', () => {
  it('menolak kalau konfirmasi password baru tidak sama', async () => {
    const { service } = buatService();

    await expect(
      service.changePassword(1, {
        currentPassword: 'lama12345',
        newPassword: 'baru123456',
        confirmPassword: 'beda123456',
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('menolak kalau password baru sama dengan password lama', async () => {
    const { service } = buatService();

    await expect(
      service.changePassword(1, {
        currentPassword: 'samasaja123',
        newPassword: 'samasaja123',
        confirmPassword: 'samasaja123',
      }),
    ).rejects.toThrow('Password baru harus berbeda dari password lama');
  });

  it('menolak kalau password lama yang dimasukkan salah', async () => {
    const passwordHash = await bcrypt.hash('password-asli', 4);
    const { service } = buatService({
      findByIdWithPassword: jest.fn().mockResolvedValue(buatUser({ passwordHash })),
    });

    await expect(
      service.changePassword(1, {
        currentPassword: 'password-ngasal',
        newPassword: 'baru123456',
        confirmPassword: 'baru123456',
      }),
    ).rejects.toThrow('Password lama salah');
  });

  it('berhasil ubah password kalau semua validasi lolos', async () => {
    const passwordHash = await bcrypt.hash('password-asli', 4);
    const updatePassword = jest.fn().mockResolvedValue({ message: 'Password berhasil diubah' });
    const { service, usersService } = buatService({
      findByIdWithPassword: jest.fn().mockResolvedValue(buatUser({ passwordHash })),
      updatePassword,
    });

    await service.changePassword(1, {
      currentPassword: 'password-asli',
      newPassword: 'baru123456',
      confirmPassword: 'baru123456',
    });

    expect(usersService.updatePassword).toHaveBeenCalledWith(1, expect.any(String));
    const hashBaru = updatePassword.mock.calls[0][1];
    expect(await bcrypt.compare('baru123456', hashBaru)).toBe(true);
  });
});
