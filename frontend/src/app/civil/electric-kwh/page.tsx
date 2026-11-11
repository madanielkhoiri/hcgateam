'use client';

// Root modul Perhitungan KWH - redirect ke dashboard (pola sama dengan Electric-KIP).

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ElectricKwhRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/civil/electric-kwh/dashboard');
  }, [router]);

  return null;
}
