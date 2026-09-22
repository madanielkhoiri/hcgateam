'use client';

// ==================================================
// FILE: frontend/src/app/hc/surat-balasan-magang/page.tsx
// FUNGSI: Root modul Surat Balasan Magang - redirect ke dashboard
// (halaman pertama begitu masuk sidebar, lihat dashboard/page.tsx).
// Daftar surat yang sebelumnya di sini sudah dipindah ke daftar/page.tsx.
// ==================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SuratBalasanMagangRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/hc/surat-balasan-magang/dashboard');
  }, [router]);

  return null;
}
