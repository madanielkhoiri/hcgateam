'use client';

// ==================================================
// FILE: frontend/src/app/civil/electric-kip/page.tsx
// FUNGSI: Root modul Electric-KIP - redirect ke dashboard (halaman
// pertama begitu masuk sidebar Electric-KIP, lihat dashboard/page.tsx
// dan daftar/page.tsx - pola persis hc/mcu/page.tsx).
// ==================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ElectricKipRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/civil/electric-kip/dashboard');
  }, [router]);

  return null;
}
