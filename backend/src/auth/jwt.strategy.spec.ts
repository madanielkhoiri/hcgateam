import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { JwtStrategy } from './jwt.strategy';

function buatStrategy(usersOverrides: Partial<UsersService> = {}) {
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('rahasia-uji'),
  } as unknown as ConfigService;
  const usersService = {
    findByIdForAuth: jest.fn(),
    ...usersOverrides,
  } as unknown as UsersService;
  const strategy = new JwtStrategy(configService, usersService);

  return { strategy, usersService };
}

function buatUser(overrides: Partial<{ isActive: boolean; tokenValidAfter: Date | null }> = {}) {
  return {
    id: 1,
    username: 'budi',
    nrp: '12345',
    name: 'Budi',
    role: 'ADMIN',
    accessKeys: [],
    vendorId: null,
    driverId: null,
    isActive: overrides.isActive ?? true,
    tokenValidAfter: overrides.tokenValidAfter ?? null,
  };
}

describe('JwtStrategy.validate', () => {
  it('menolak kalau akun tidak ditemukan', async () => {
    const { strategy } = buatStrategy({ findByIdForAuth: jest.fn().mockResolvedValue(null) });

    await expect(strategy.validate({ sub: 1, username: 'budi', role: 'ADMIN' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('menolak kalau akun tidak aktif', async () => {
    const { strategy } = buatStrategy({
      findByIdForAuth: jest.fn().mockResolvedValue(buatUser({ isActive: false })),
    });

    await expect(strategy.validate({ sub: 1, username: 'budi', role: 'ADMIN' })).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('menolak token yang diterbitkan SEBELUM sesi dicabut (tokenValidAfter)', async () => {
    const dicabutPada = new Date('2026-01-01T10:00:00Z');
    const { strategy } = buatStrategy({
      findByIdForAuth: jest.fn().mockResolvedValue(buatUser({ tokenValidAfter: dicabutPada })),
    });
    const iatSebelumDicabut = Math.floor(new Date('2026-01-01T09:00:00Z').getTime() / 1000);

    await expect(
      strategy.validate({ sub: 1, username: 'budi', role: 'ADMIN', iat: iatSebelumDicabut }),
    ).rejects.toThrow('Sesi ini sudah tidak berlaku — silakan login ulang');
  });

  it('menerima token yang diterbitkan SETELAH sesi dicabut (login ulang)', async () => {
    const dicabutPada = new Date('2026-01-01T10:00:00Z');
    const { strategy } = buatStrategy({
      findByIdForAuth: jest.fn().mockResolvedValue(buatUser({ tokenValidAfter: dicabutPada })),
    });
    const iatSetelahDicabut = Math.floor(new Date('2026-01-01T11:00:00Z').getTime() / 1000);

    const hasil = await strategy.validate({
      sub: 1,
      username: 'budi',
      role: 'ADMIN',
      iat: iatSetelahDicabut,
    });

    expect(hasil).toMatchObject({ id: 1, username: 'budi' });
  });

  it('menerima token kalau akun belum pernah dicabut sesinya (tokenValidAfter null)', async () => {
    const { strategy } = buatStrategy({
      findByIdForAuth: jest.fn().mockResolvedValue(buatUser({ tokenValidAfter: null })),
    });

    const hasil = await strategy.validate({ sub: 1, username: 'budi', role: 'ADMIN', iat: 12345 });

    expect(hasil).toMatchObject({ id: 1, username: 'budi' });
  });
});
