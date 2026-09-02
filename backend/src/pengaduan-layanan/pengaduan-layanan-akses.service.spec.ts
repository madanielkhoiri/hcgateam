import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PengaduanLayananAksesService } from './pengaduan-layanan-akses.service';

describe('PengaduanLayananAksesService', () => {
  const akses = new PengaduanLayananAksesService();

  it.each([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD])(
    'mengizinkan role %s melihat rekap performa',
    (role) => {
      expect(() => akses.wajibBolehLihatRekap(role)).not.toThrow();
    },
  );

  it.each([UserRole.KARYAWAN, UserRole.VENDOR, UserRole.GRUP_LEADER, UserRole.FA])(
    'menolak role %s dengan ForbiddenException',
    (role) => {
      expect(() => akses.wajibBolehLihatRekap(role)).toThrow(ForbiddenException);
    },
  );
});
