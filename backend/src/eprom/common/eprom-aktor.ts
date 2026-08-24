// ==================================================
// FILE: backend/src/eprom/common/eprom-aktor.ts
// FUNGSI: Tipe & decorator aktor yang sedang login pada modul e-ProM
// ==================================================

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export type AktorEprom = {
  id: number;
  username: string | null;
  role: UserRole;
  vendorId?: number | null;
  accessKeys?: string[];
};

export const Aktor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AktorEprom => {
    const request = context.switchToHttp().getRequest<{ user: AktorEprom }>();

    return request.user;
  },
);
