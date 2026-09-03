import { ForbiddenException } from '@nestjs/common';
import { InventoryScope, UserRole } from '@prisma/client';
import { InventoryAksesService } from './inventory-akses.service';

describe('InventoryAksesService.wajibBolehEditStok', () => {
  const akses = new InventoryAksesService();

  it.each([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD])(
    'mengizinkan role %s mengubah stok',
    (role) => {
      expect(() => akses.wajibBolehEditStok(role)).not.toThrow();
    },
  );

  it.each([UserRole.KARYAWAN, UserRole.GRUP_LEADER, UserRole.VENDOR, UserRole.FA, UserRole.ELEKTRIK])(
    'menolak role %s dengan ForbiddenException',
    (role) => {
      expect(() => akses.wajibBolehEditStok(role)).toThrow(ForbiddenException);
    },
  );
});

describe('InventoryAksesService.wajibBolehEditStokArea', () => {
  const akses = new InventoryAksesService();

  it.each([UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD])(
    'mengizinkan role %s mengubah stok di scope apapun',
    (role) => {
      expect(() => akses.wajibBolehEditStokArea(role, InventoryScope.GENERAL)).not.toThrow();
      expect(() => akses.wajibBolehEditStokArea(role, InventoryScope.MESS)).not.toThrow();
      expect(() => akses.wajibBolehEditStokArea(role, InventoryScope.ELECTRIC)).not.toThrow();
    },
  );

  it('mengizinkan ELEKTRIK mengubah stok scope ELECTRIC (inventory milik mereka sendiri)', () => {
    expect(() => akses.wajibBolehEditStokArea(UserRole.ELEKTRIK, InventoryScope.ELECTRIC)).not.toThrow();
  });

  it.each([InventoryScope.GENERAL, InventoryScope.MESS])(
    'tetap menolak ELEKTRIK mengubah stok scope %s',
    (scope) => {
      expect(() => akses.wajibBolehEditStokArea(UserRole.ELEKTRIK, scope)).toThrow(ForbiddenException);
    },
  );

  it.each([UserRole.KARYAWAN, UserRole.FA, UserRole.VENDOR])(
    'menolak role %s di semua scope',
    (role) => {
      expect(() => akses.wajibBolehEditStokArea(role, InventoryScope.ELECTRIC)).toThrow(ForbiddenException);
      expect(() => akses.wajibBolehEditStokArea(role, InventoryScope.GENERAL)).toThrow(ForbiddenException);
    },
  );
});
