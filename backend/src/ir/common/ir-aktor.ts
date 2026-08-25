// ==================================================
// FILE: backend/src/ir/common/ir-aktor.ts
// FUNGSI: Tipe & decorator aktor yang sedang login pada modul PORTAL IR
// ==================================================

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export type AktorIr = {
  id: number;
  nama: string;
  nrp: string | null;
  role: UserRole;
};

export const Aktor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AktorIr => {
    const request = context.switchToHttp().getRequest<{ user: AktorIr }>();

    return request.user;
  },
);
