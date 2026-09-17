'use client';

// ==================================================
// FILE: frontend/src/app/ga/transport/travel/page.tsx
// FUNGSI: Root modul Travel - redirect ke dashboard (halaman pertama
// begitu masuk sidebar Travel). Daftar travel dipindah ke
// travel/daftar/page.tsx.
// ==================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TravelRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/ga/transport/travel/dashboard');
  }, [router]);

  return null;
}
