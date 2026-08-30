import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { wajibPenyetujuDeklarasi } from './deklarasi-akses.bantuan';

describe('wajibPenyetujuDeklarasi', () => {
  it.each([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD])(
    'mengizinkan role %s menyetujui/verifikasi Deklarasi Dinas',
    (role) => {
      expect(() => wajibPenyetujuDeklarasi(role)).not.toThrow();
    },
  );

  it.each([UserRole.KARYAWAN, UserRole.ADMIN_COMBEN, UserRole.GRUP_LEADER, UserRole.PJO])(
    'menolak role %s dengan ForbiddenException',
    (role) => {
      expect(() => wajibPenyetujuDeklarasi(role)).toThrow(ForbiddenException);
    },
  );
});
