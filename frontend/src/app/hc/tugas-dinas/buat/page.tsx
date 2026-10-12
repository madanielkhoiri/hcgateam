'use client';

// ==================================================
// FILE: frontend/src/app/hc/tugas-dinas/buat/page.tsx
// FUNGSI: Menu "STD" - tabel STD biasa (tanpa akomodasi) + popup tambah.
// ==================================================

import { TugasDinasDaftar } from '@/components/tugas-dinas/tugas-dinas-daftar';

export default function BuatTugasDinasPage() {
  return <TugasDinasDaftar withAkomodasi={false} />;
}
