// ==================================================
// FILE: backend/src/ir/common/ir-akses.service.ts
// FUNGSI: Penjaga hak akses kelola vs lihat/isi pada Portal IR
// ==================================================

import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { AktorIr } from './ir-aktor';

/** Kelola penuh Portal IR (upload dokumen, buat pertanyaan, upload video). */
const ROLE_KELOLA_IR: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.SECTION_HEAD,
];

@Injectable()
export class IrAksesService {
  bolehKelola(aktor: AktorIr): boolean {
    return ROLE_KELOLA_IR.includes(aktor.role);
  }

  wajibKelola(aktor: AktorIr): void {
    if (!this.bolehKelola(aktor)) {
      throw new ForbiddenException(
        'Aksi ini hanya dapat dilakukan oleh Admin/Admin HC/Section Head',
      );
    }
  }
}
