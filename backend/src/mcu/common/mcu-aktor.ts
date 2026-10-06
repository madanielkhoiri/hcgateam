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

    const user = request.user;
    // Di modul MCU, Section Head dan Group Leader mengikuti alur mandiri
    // yang sama seperti Karyawan (bukan peran administratif MCU).
    if (
      user.role === UserRole.SECTION_HEAD ||
      user.role === UserRole.GRUP_LEADER ||
      user.role === UserRole.GRUP_LEADER_IR ||
      user.role === UserRole.GRUP_LEADER_GA ||
      user.role === UserRole.GRUP_LEADER_RND
    ) {
      return { ...user, role: UserRole.KARYAWAN };
    }
    if (user.role === UserRole.GRUP_LEADER_COMBEN) {
      return { ...user, role: UserRole.HC };
    }
    return user;
  },
);
