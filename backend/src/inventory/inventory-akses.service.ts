// ==================================================
// FILE: backend/src/inventory/inventory-akses.service.ts
// FUNGSI: Batasi siapa yang boleh mengubah stok — sensitif karena tiap
// perubahan tercatat sebagai deviasi (indikasi stok hilang/tidak tercatat).
// ==================================================

import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

const ROLE_BOLEH_EDIT_STOK: UserRole[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN, UserRole.SECTION_HEAD];

@Injectable()
export class InventoryAksesService {
  wajibBolehEditStok(role: UserRole): void {
    if (!ROLE_BOLEH_EDIT_STOK.includes(role)) {
      throw new ForbiddenException('Hanya Admin atau Section Head yang boleh mengubah stok');
    }
  }
}
