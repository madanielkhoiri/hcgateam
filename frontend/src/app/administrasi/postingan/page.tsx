'use client';

// ==================================================
// FILE: frontend/src/app/administrasi/postingan/page.tsx
// FUNGSI: Root modul Postingan - redirect ke dashboard (halaman
// pertama begitu masuk sidebar Postingan, lihat dashboard/page.tsx).
// ==================================================

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PostinganRootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/administrasi/postingan/dashboard');
  }, [router]);

  return null;
}
