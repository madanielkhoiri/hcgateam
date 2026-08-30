import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { KipAksesService } from './kip-akses.service';

describe('KipAksesService', () => {
  const akses = new KipAksesService();

  it.each([UserRole.ELEKTRIK, UserRole.ADMIN, UserRole.SUPER_ADMIN])(
    'mengizinkan role %s melakukan ceklis',
    (role) => {
      expect(() => akses.wajibElektrik(role)).not.toThrow();
    },
  );

  it.each([UserRole.SECTION_HEAD, UserRole.VENDOR, UserRole.KARYAWAN])(
    'menolak role %s dengan ForbiddenException',
    (role) => {
      expect(() => akses.wajibElektrik(role)).toThrow(ForbiddenException);
    },
  );
});
