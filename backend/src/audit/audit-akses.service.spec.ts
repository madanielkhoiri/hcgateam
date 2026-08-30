import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AuditAksesService } from './audit-akses.service';

describe('AuditAksesService', () => {
  const akses = new AuditAksesService();

  it.each([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD])(
    'mengizinkan role %s melihat audit log',
    (role) => {
      expect(() => akses.wajibAdmin(role)).not.toThrow();
    },
  );

  it.each([UserRole.KARYAWAN, UserRole.VENDOR, UserRole.ELEKTRIK, UserRole.GRUP_LEADER])(
    'menolak role %s dengan ForbiddenException',
    (role) => {
      expect(() => akses.wajibAdmin(role)).toThrow(ForbiddenException);
    },
  );
});
