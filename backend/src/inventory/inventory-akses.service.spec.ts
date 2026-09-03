import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { InventoryAksesService } from './inventory-akses.service';

describe('InventoryAksesService', () => {
  const akses = new InventoryAksesService();

  it.each([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD])(
    'mengizinkan role %s mengubah stok',
    (role) => {
      expect(() => akses.wajibBolehEditStok(role)).not.toThrow();
    },
  );

  it.each([UserRole.KARYAWAN, UserRole.GRUP_LEADER, UserRole.VENDOR, UserRole.FA])(
    'menolak role %s dengan ForbiddenException',
    (role) => {
      expect(() => akses.wajibBolehEditStok(role)).toThrow(ForbiddenException);
    },
  );
});
