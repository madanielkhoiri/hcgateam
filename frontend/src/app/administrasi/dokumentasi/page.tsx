'use client';

// ==================================================
// FILE: frontend/src/app/administrasi/dokumentasi/page.tsx
// FUNGSI: Root modul Dokumentasi - redirect ke dashboard (halaman
// pertama begitu masuk sidebar Dokumentasi, lihat dashboard/page.tsx).
// ==================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DokumentasiRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/administrasi/dokumentasi/dashboard');
  }, [router]);

  return null;
}
