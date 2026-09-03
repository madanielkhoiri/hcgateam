// ==================================================
// FILE: backend/src/inventory/inventory-akses.service.ts
// FUNGSI: Batasi siapa yang boleh mengubah stok — sensitif karena tiap
// perubahan tercatat sebagai deviasi (indikasi stok hilang/tidak tercatat).
// ==================================================

import { ForbiddenException, Injectable } from '@nestjs/common';
import { InventoryScope, UserRole } from '@prisma/client';

const ROLE_BOLEH_EDIT_STOK: UserRole[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD];

@Injectable()
export class InventoryAksesService {
  /** Dipakai InventoryService (GENERAL, tanpa konsep scope) & dashboard deviasi. */
  wajibBolehEditStok(role: UserRole): void {
    if (!ROLE_BOLEH_EDIT_STOK.includes(role)) {
      throw new ForbiddenException('Hanya Admin atau Section Head yang boleh mengubah stok');
    }
  }

  /**
   * Dipakai InventoryAreaService — Tim Elektrik boleh mengubah stok pada
   * scope ELECTRIC (inventory milik mereka sendiri), tapi tetap tidak boleh
   * menyentuh stok GENERAL/MESS.
   */
  wajibBolehEditStokArea(role: UserRole, scope: InventoryScope): void {
    if (scope === InventoryScope.ELECTRIC && role === UserRole.ELEKTRIK) {
      return;
    }

    this.wajibBolehEditStok(role);
  }
}
