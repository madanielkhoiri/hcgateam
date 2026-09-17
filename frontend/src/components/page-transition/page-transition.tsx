'use client';

// ==================================================
// FILE: frontend/src/components/page-transition/page-transition.tsx
// FUNGSI: Bungkus konten supaya tiap kali route berubah, konten baru
// masuk dengan animasi (fade + naik sedikit) - bukan langsung "loncat"
// tanpa transisi. Dipakai di root layout (perpindahan modul/departemen)
// dan di ModuleShell (perpindahan sub-halaman dalam satu modul, tanpa
// ikut me-remount sidebar/drawer karena cuma membungkus children-nya).
// ==================================================

import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import styles from './page-transition.module.css';

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div key={pathname} className={styles.enter}>
      {children}
    </div>
  );
}
