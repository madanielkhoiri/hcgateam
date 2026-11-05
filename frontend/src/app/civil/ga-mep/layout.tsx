'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ModuleShell, type ModuleShellMenuItem } from '@/components/module-shell/module-shell';
import {
  ACCESS_KEYS,
  clearSession,
  getAccessToken,
  getStoredUser,
  hasAccess,
  type PortalUser,
} from '@/lib/access-control';
import styles from './ga-mep.module.css';

const MENU: ModuleShellMenuItem[] = [
  {
    label: 'Daily Activity',
    href: '/civil/ga-mep/daily-activity',
    initial: 'DA',
  },
];

export default function GaMepLayout({ children }: { children: ReactNode }) {
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

    if (!hasAccess(stored, ACCESS_KEYS.CIVIL_GA_MEP)) {
      router.replace('/civil');
      return;
    }

    setUser(stored);
  }, [router]);

  if (!user) return <main className={styles.loading}>Memuat GA MEP...</main>;

  return (
    <ModuleShell
      title="GA MEP"
      subtitle="Mechanical, Electrical & Plumbing"
      deptBadge={{ text: 'MEP', color: '#0783a8', soft: '#e5f7fb' }}
      menuItems={MENU}
      backHref="/civil"
      backLabel="Kembali ke CIVIL"
    >
      <main className={styles.body}>{children}</main>
    </ModuleShell>
  );
}
