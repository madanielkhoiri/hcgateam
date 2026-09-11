'use client';

// ==================================================
// FILE: frontend/src/app/hc/helpdesk/page.tsx
// FUNGSI: Root modul Helpdesk Center - redirect ke dashboard (halaman
// pertama begitu masuk sidebar, lihat hc/helpdesk/dashboard/page.tsx).
// Daftar tiket dipindah ke hc/helpdesk/daftar/page.tsx.
// ==================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HelpdeskRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/hc/helpdesk/dashboard');
  }, [router]);

  return null;
}
