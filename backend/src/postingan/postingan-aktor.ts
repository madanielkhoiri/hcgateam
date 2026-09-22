// ==================================================
// FILE: backend/src/postingan/postingan-aktor.ts
// FUNGSI: Tipe & decorator aktor yang sedang login pada modul Postingan
// ==================================================

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export type AktorPostingan = {
  id: number;
  role: UserRole;
  /** Diisi otomatis dari JWT (lihat auth/jwt.strategy.ts) — opsional di tipe ini
   * karena tidak semua pemakai AktorPostingan butuh accessKeys, tapi field-nya
   * selalu ada di runtime karena decorator Aktor() meneruskan request.user apa adanya. */
  accessKeys?: string[];
};

export const Aktor = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AktorPostingan => {
    const request = context
      .switchToHttp()
      .getRequest<{ user: AktorPostingan }>();

    return request.user;
  },
);

/** Kelola Postingan: Admin, Admin HC, Admin Comben, Section Head. */
const ROLE_KELOLA_POSTINGAN: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN_COMBEN,
  UserRole.SECTION_HEAD,
];

export function bolehKelolaPostingan(aktor: AktorPostingan): boolean {
  return ROLE_KELOLA_POSTINGAN.includes(aktor.role);
}
