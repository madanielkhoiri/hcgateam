'use client';

// ==================================================
// FILE: frontend/src/app/ga/housekeeping-indoor/page.tsx
// FUNGSI: Root modul Housekeeping Indoor - redirect ke dashboard
// (halaman pertama begitu masuk sidebar modul, lihat dashboard/page.tsx)
// ==================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HousekeepingIndoorRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/ga/housekeeping-indoor/dashboard');
  }, [router]);

  return null;
}
