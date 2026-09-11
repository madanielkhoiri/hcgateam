'use client';

// ==================================================
// FILE: frontend/src/app/hc/surat-penolakan-magang/page.tsx
// FUNGSI: Root modul Surat Penolakan Magang - redirect ke dashboard
// (halaman pertama begitu masuk sidebar, lihat dashboard/page.tsx).
// Daftar surat yang sebelumnya di sini sudah dipindah ke daftar/page.tsx.
// ==================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SuratPenolakanMagangRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/hc/surat-penolakan-magang/dashboard');
  }, [router]);

  return null;
}
