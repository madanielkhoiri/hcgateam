// ==================================================
// FILE: backend/src/audit/audit-akses.service.ts
// FUNGSI: Penjaga peran khusus — hanya Admin/Super Admin/Section Head yang
// boleh melihat audit log (data paling sensitif di sistem, tidak digantung
// ke sistem accessKey biasa yang bisa di-grant bebas).
// ==================================================

import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

const ROLE_BOLEH_LIHAT_AUDIT: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.SECTION_HEAD,
];

@Injectable()
export class AuditAksesService {
  wajibAdmin(role: UserRole): void {
    if (!ROLE_BOLEH_LIHAT_AUDIT.includes(role)) {
      throw new ForbiddenException('Audit log hanya dapat diakses Admin/Super Admin/Section Head');
    }
  }
}
