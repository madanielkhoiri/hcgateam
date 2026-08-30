// ==================================================
// FILE: backend/src/deklarasi-dinas/bantuan/deklarasi-akses.bantuan.ts
// FUNGSI: Penjaga role untuk aksi approve/verifikasi Deklarasi Dinas
// (pengajuan, nota, saldo). Sebelumnya endpoint-endpoint ini TIDAK
// mengecek role sama sekali — siapa pun yang punya akses ke modul
// Deklarasi Dinas (accessKey HC_DEKLARASI) bisa memverifikasi/menyetujui,
// bukan cuma yang seharusnya berwenang.
// ==================================================

import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

export const ROLE_PENYETUJU_DEKLARASI: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.SECTION_HEAD,
];

/** Lempar 403 kalau role akun bukan salah satu penyetuju Deklarasi Dinas. */
export function wajibPenyetujuDeklarasi(role: UserRole): void {
  if (!ROLE_PENYETUJU_DEKLARASI.includes(role)) {
    throw new ForbiddenException(
      'Aksi ini hanya dapat dilakukan oleh Admin/Admin HC/Section Head',
    );
  }
}
