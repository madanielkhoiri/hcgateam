'use client';

// ==================================================
// FILE: frontend/src/app/hc/ir/page.tsx
// FUNGSI: Root modul PORTAL IR - redirect ke dashboard (halaman pertama
// begitu masuk sidebar IR, lihat hc/ir/dashboard/page.tsx).
// ==================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function IrRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/hc/ir/dashboard');
  }, [router]);

  return null;
}
