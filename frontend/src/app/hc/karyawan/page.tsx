'use client';

// ==================================================
// FILE: frontend/src/app/hc/karyawan/page.tsx
// FUNGSI: Root modul Database Karyawan - redirect ke dashboard (halaman
// pertama begitu masuk sidebar Karyawan, lihat hc/karyawan/dashboard/page.tsx).
// ==================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KaryawanRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/hc/karyawan/dashboard');
  }, [router]);

  return null;
}
