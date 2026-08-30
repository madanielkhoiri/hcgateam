import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AktorIr } from './ir-aktor';
import { IrAksesService } from './ir-akses.service';

function aktor(role: UserRole): AktorIr {
  return { id: 1, nama: 'Test', nrp: '12345', role };
}

describe('IrAksesService', () => {
  const service = new IrAksesService();

  it.each([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD])(
    'role %s boleh kelola',
    (role) => {
      expect(service.bolehKelola(aktor(role))).toBe(true);
      expect(() => service.wajibKelola(aktor(role))).not.toThrow();
    },
  );

  it('role KARYAWAN tidak boleh kelola', () => {
    expect(service.bolehKelola(aktor(UserRole.KARYAWAN))).toBe(false);
  });

  it('wajibKelola melempar ForbiddenException untuk role yang tidak diizinkan', () => {
    expect(() => service.wajibKelola(aktor(UserRole.KARYAWAN))).toThrow(ForbiddenException);
  });
});
