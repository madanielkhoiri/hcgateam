'use client';

// ==================================================
// FILE: frontend/src/app/civil/electric-kwh/layout.tsx
// FUNGSI: Shell modul Perhitungan KWH - sidebar (Dashboard + Data KWH).
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
import styles from './electric-kwh.module.css';

const MENU_KWH: ModuleShellMenuItem[] = [
  { label: 'Dashboard', href: '/civil/electric-kwh/dashboard', initial: 'DB' },
  { label: 'Data KWH', href: '/civil/electric-kwh/data', initial: 'KWH' },
];

export default function LayoutElectricKwh({ children }: { children: ReactNode }) {
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

    if (!hasAccess(stored, ACCESS_KEYS.CIVIL_ELECTRIC_KWH)) {
      router.replace('/civil');
      return;
    }

    setUser(stored);
  }, [router]);

  if (!user) {
    return <main className={styles.loading}>Memuat modul Perhitungan KWH...</main>;
  }

  return (
    <ModuleShell
      title="Perhitungan KWH"
      subtitle="Civil - GA MEP"
      deptBadge={{ text: 'CV', color: '#e0752a', soft: '#fff0e4' }}
      menuItems={MENU_KWH}
      backHref="/civil"
      backLabel="Kembali ke CIVIL"
    >
      <main className={styles.body}>{children}</main>
    </ModuleShell>
  );
}
