// ==================================================
// FILE: backend/src/auth/require-access-key.decorator.ts
// FUNGSI: Tandai controller/route butuh salah satu accessKey berikut
// (dicek otomatis oleh JwtAuthGuard). ADMIN/SUPER_ADMIN/SECTION_HEAD
// tetap lolos otomatis tanpa accessKey (lihat jwt-auth.guard.ts).
//
// Taruh decorator ini PERSIS di controller/route yang dilindungi — bukan
// di daftar terpisah — supaya siapa pun yang menambah route baru di file
// yang sama langsung lihat pola ini dan ikut memberi proteksi yang sama,
// tanpa perlu ingat mengubah file lain.
// ==================================================

import { SetMetadata } from '@nestjs/common';

export const REQUIRE_ACCESS_KEY = 'requireAccessKey';

export const RequireAccessKey = (...keys: string[]) =>
  SetMetadata(REQUIRE_ACCESS_KEY, keys);
