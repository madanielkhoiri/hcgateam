'use client';

// ==================================================
// FILE: frontend/src/app/hc/tugas-dinas/buat-akomodasi/page.tsx
// FUNGSI: Menu "STD Akomodasi" - tabel STD Akomodasi + popup tambah,
// terpisah dari menu STD biasa.
// ==================================================

import { TugasDinasDaftar } from '@/components/tugas-dinas/tugas-dinas-daftar';

export default function BuatTugasDinasAkomodasiPage() {
  return <TugasDinasDaftar withAkomodasi={true} />;
}
