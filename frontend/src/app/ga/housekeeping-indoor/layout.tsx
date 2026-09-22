'use client';

// ==================================================
// FILE: frontend/src/app/ga/housekeeping-indoor/layout.tsx
// FUNGSI: Shell modul Housekeeping Indoor (guard akses + sidebar ModuleShell)
// ==================================================

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ACCESS_KEYS, getAccessToken, getStoredUser, hasAccess } from '@/lib/access-control';
import { ModuleShell, type ModuleShellMenuItem } from '@/components/module-shell/module-shell';
import styles from './housekeeping-indoor.module.css';

const MENU_HOUSEKEEPING_INDOOR: ModuleShellMenuItem[] = [
  { label: 'Dashboard', href: '/ga/housekeeping-indoor/dashboard', initial: 'DB' },
  { label: 'Laporan', href: '/ga/housekeeping-indoor/laporan', initial: 'LP' },
];

export default function LayoutHousekeepingIndoor({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [siap, setSiap] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    const user = getStoredUser();

    if (!token || !user) {
      router.replace('/login');
      return;
    }

    if (!hasAccess(user, ACCESS_KEYS.GA_GS_HOUSEKEEPING_INDOOR)) {
      router.replace('/ga');
      return;
    }

    setSiap(true);
  }, [router]);

  if (!siap) {
    return <main className={styles.moduleMemuat}>Memuat modul Housekeeping Indoor...</main>;
  }

  return (
    <ModuleShell
      title="Housekeeping Indoor"
      subtitle="General Affairs"
      deptBadge={{ text: 'GA', color: '#0a9f59', soft: '#e8f8ef' }}
      menuItems={MENU_HOUSEKEEPING_INDOOR}
      backHref="/ga"
      backLabel="Kembali ke GA"
    >
      <main className={styles.moduleBody}>{children}</main>
    </ModuleShell>
  );
}
