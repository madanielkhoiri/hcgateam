'use client';

// ==================================================
// FILE: frontend/src/app/ga/transport/tiket/page.tsx
// FUNGSI: Root modul Tiket - redirect ke dashboard (halaman pertama
// begitu masuk sidebar Tiket). Daftar tiket dipindah ke
// tiket/daftar/page.tsx.
// ==================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function TiketRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/ga/transport/tiket/dashboard');
  }, [router]);

  return null;
}
