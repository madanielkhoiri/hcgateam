'use client';

// ==================================================
// FILE: frontend/src/app/civil/pengaduan/layout.tsx
// FUNGSI: Shell modul Pengaduan Layanan (CIVIL) - sidebar navigasi
// (Aduan Layanan + Rekap Performa). Komponen inti PengaduanLayananPage &
// RekapPerformaPage (dipakai bareng HC/GA/CIVIL) TIDAK diubah - layout
// ini cuma bungkus visual + guard akses awal, sisanya tetap ditangani
// komponen inti masing-masing (termasuk redirect role Rekap Performa).
// ==================================================

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import {
  ACCESS_KEYS,
  clearSession,
  getAccessToken,
  getStoredUser,
  hasAccess,
  type PortalUser,
} from '@/lib/access-control';
import { ModuleShell, type ModuleShellMenuItem } from '@/components/module-shell/module-shell';
import styles from './pengaduan-shell.module.css';

const MENU_PENGADUAN: ModuleShellMenuItem[] = [
  { label: 'Aduan Layanan', href: '/civil/pengaduan', initial: 'AL' },
  { label: 'Rekap Performa', href: '/civil/pengaduan/rekap', initial: 'RP' },
];

export default function LayoutPengaduanCivil({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    const stored = getStoredUser();

    if (!token || !stored) {
      clearSession();
      router.replace('/login');
      return;
    }

    if (!hasAccess(stored, ACCESS_KEYS.CIVIL)) {
      router.replace('/civil');
      return;
    }

    setUser(stored);
  }, [router]);

  if (!user) {
    return <main className={styles.loading}>Memuat modul Pengaduan Layanan...</main>;
  }

  return (
    <ModuleShell
      title="Pengaduan Layanan"
      subtitle="Civil"
      deptBadge={{ text: 'CV', color: '#e0752a', soft: '#fff0e4' }}
      menuItems={MENU_PENGADUAN}
      backHref="/civil"
      backLabel="Kembali ke CIVIL"
    >
      {children}
    </ModuleShell>
  );
}
