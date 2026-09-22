'use client';

// ==================================================
// FILE: frontend/src/app/civil/electric-kip/layout.tsx
// FUNGSI: Shell modul Electric-KIP (Kartu Inspeksi Peralatan) - sidebar
// navigasi (Dashboard + Daftar KIP). Rute publik kip-scan/kip/publik/:kode
// TIDAK dipengaruhi layout ini (halaman terpisah, tanpa auth).
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
import styles from './electric-kip.module.css';

const MENU_ELECTRIC_KIP: ModuleShellMenuItem[] = [
  { label: 'Dashboard', href: '/civil/electric-kip/dashboard', initial: 'DB' },
  { label: 'Daftar KIP', href: '/civil/electric-kip/daftar', initial: 'KIP' },
];

export default function LayoutElectricKip({ children }: { children: ReactNode }) {
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

    if (!hasAccess(stored, ACCESS_KEYS.CIVIL_ELECTRIC_KIP)) {
      router.replace('/civil');
      return;
    }

    setUser(stored);
  }, [router]);

  if (!user) {
    return <main className={styles.loading}>Memuat modul Electric-KIP...</main>;
  }

  return (
    <ModuleShell
      title="Electric-KIP"
      subtitle="Civil - GA MEP"
      deptBadge={{ text: 'CV', color: '#e0752a', soft: '#fff0e4' }}
      menuItems={MENU_ELECTRIC_KIP}
      backHref="/civil"
      backLabel="Kembali ke CIVIL"
    >
      <main className={styles.body}>{children}</main>
    </ModuleShell>
  );
}
