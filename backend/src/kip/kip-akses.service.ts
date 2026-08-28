// ==================================================
// FILE: backend/src/kip/kip-akses.service.ts
// FUNGSI: Penjaga peran khusus checklist KIP (Tim Elektrik / Admin)
// ==================================================

import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

const ROLE_BOLEH_CEKLIS: UserRole[] = [UserRole.ELEKTRIK, UserRole.ADMIN, UserRole.SUPER_ADMIN];

@Injectable()
export class KipAksesService {
  wajibElektrik(role: UserRole): void {
    if (!ROLE_BOLEH_CEKLIS.includes(role)) {
      throw new ForbiddenException('Ceklis KIP hanya boleh dilakukan oleh Tim Elektrik atau Admin');
    }
  }
}
