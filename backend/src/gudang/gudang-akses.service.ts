// ==================================================
// FILE: backend/src/gudang/gudang-akses.service.ts
// FUNGSI: Batasi siapa yang boleh checkout lewat alur self-order Gudang —
// role Gudang (rumah utamanya), plus Section Head/Admin yang boleh pakai
// sebagai cara cepat input barang keluar.
// ==================================================

import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

const ROLE_BOLEH_GUDANG: UserRole[] = [
  UserRole.GUDANG,
  UserRole.SECTION_HEAD,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
];

@Injectable()
export class GudangAksesService {
  wajibGudang(role: UserRole): void {
    if (!ROLE_BOLEH_GUDANG.includes(role)) {
      throw new ForbiddenException(
        'Hanya Staff Gudang, Section Head, atau Admin yang dapat mengambil barang lewat menu ini',
      );
    }
  }
}
