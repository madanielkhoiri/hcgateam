'use client';

// ==================================================
// FILE: frontend/src/app/hc/tugas-dinas/buat-akomodasi/page.tsx
// FUNGSI: Menu "STD Akomodasi" - Surat Tugas Dinas dengan tambahan field
// penginapan/transportasi/laundry, terpisah dari menu STD biasa.
// ==================================================

import { TugasDinasBuatForm } from '@/components/tugas-dinas/tugas-dinas-buat-form';

export default function BuatTugasDinasAkomodasiPage() {
  return <TugasDinasBuatForm withAkomodasi={true} />;
}
