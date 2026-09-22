'use client';

// ==================================================
// FILE: frontend/src/app/hc/anak-magang/page.tsx
// FUNGSI: Root modul Database Anak Magang - redirect ke dashboard
// (halaman pertama begitu masuk sidebar Anak Magang). Daftar & form
// anak magang sudah pindah ke dashboard/page.tsx.
// ==================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AnakMagangRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/hc/anak-magang/dashboard');
  }, [router]);

  return null;
}
