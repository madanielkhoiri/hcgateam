'use client';

// ==================================================
// FILE: frontend/src/app/hc/tugas-dinas/buat/page.tsx
// FUNGSI: Menu "Buat Tugas Dinas" (STD biasa, tanpa field akomodasi).
// ==================================================

import { TugasDinasBuatForm } from '@/components/tugas-dinas/tugas-dinas-buat-form';

export default function BuatTugasDinasPage() {
  return <TugasDinasBuatForm withAkomodasi={false} />;
}
