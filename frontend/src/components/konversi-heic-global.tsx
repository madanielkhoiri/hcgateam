"use client";

// Memasang konversi foto HEIC -> JPG untuk semua upload (lihat lib/heic-upload.ts).
// Dipasang saat modul dimuat di browser supaya aktif sebelum halaman mana pun upload.

import { pasangKonversiHeicGlobal } from "@/lib/heic-upload";

pasangKonversiHeicGlobal();

export function KonversiHeicGlobal() {
  return null;
}
