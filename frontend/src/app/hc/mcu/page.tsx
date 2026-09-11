'use client';

// ==================================================
// FILE: frontend/src/app/hc/mcu/page.tsx
// FUNGSI: Root modul MCU - redirect ke dashboard (halaman pertama
// begitu masuk sidebar MCU, lihat hc/mcu/dashboard/page.tsx).
// ==================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function McuRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/hc/mcu/dashboard');
  }, [router]);

  return null;
}
