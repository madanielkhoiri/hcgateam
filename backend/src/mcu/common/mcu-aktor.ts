// ==================================================
// FILE: backend/src/mcu/common/mcu-aktor.ts
// FUNGSI: Tipe & decorator aktor yang sedang login pada modul MCU
// ==================================================

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export type AktorMcu = {
  id: number;
  username: string | null;
  role: UserRole;
  accessKeys?: string[];
};

export const Aktor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AktorMcu => {
    const request = context.switchToHttp().getRequest<{ user: AktorMcu }>();

    return request.user;
  },
);
