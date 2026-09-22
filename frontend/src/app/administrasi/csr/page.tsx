'use client';

// ==================================================
// FILE: frontend/src/app/administrasi/csr/page.tsx
// FUNGSI: Root modul CSR - redirect ke dashboard (halaman pertama
// begitu masuk sidebar CSR, lihat dashboard/page.tsx).
// ==================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function CsrRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/administrasi/csr/dashboard');
  }, [router]);

  return null;
}
