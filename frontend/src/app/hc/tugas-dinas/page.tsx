'use client';

// ==================================================
// FILE: frontend/src/app/hc/tugas-dinas/page.tsx
// FUNGSI: Root modul Form Tugas Dinas - redirect ke dashboard (halaman
// pertama begitu masuk sidebar Tugas Dinas, lihat hc/tugas-dinas/dashboard/page.tsx).
// ==================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TugasDinasRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/hc/tugas-dinas/dashboard');
  }, [router]);

  return null;
}
