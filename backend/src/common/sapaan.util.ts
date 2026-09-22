// ==================================================
// FILE: backend/src/common/sapaan.util.ts
// FUNGSI: Sapaan otomatis "Bapak"/"Ibu" untuk notifikasi WA (tiket &
// travel) berdasarkan gender karyawan. Kalau gender belum diisi,
// fallback ke "Bapak/Ibu" (netral) supaya notifikasi tetap terkirim.
// ==================================================

import { GenderKaryawan } from '@prisma/client';

export function sapaanKaryawan(gender: GenderKaryawan | null | undefined): string {
  if (gender === GenderKaryawan.LAKI_LAKI) return 'Bapak';
  if (gender === GenderKaryawan.PEREMPUAN) return 'Ibu';
  return 'Bapak/Ibu';
}
