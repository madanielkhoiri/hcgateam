'use client';

// ==================================================
// FILE: frontend/src/app/hc/helpdesk/layout.tsx
// FUNGSI: Shell modul Helpdesk Center (guard akses + info PIC)
// ==================================================

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LifeBuoy, UsersRound } from 'lucide-react';
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  ACCESS_KEYS,
  clearSession,
  formatRole,
  getAccessToken,
  getStoredUser,
  hasAccess,
  saveStoredUser,
  type PortalUser,
} from '@/lib/access-control';
import styles from './helpdesk.module.css';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type KonteksHelpdesk = {
  user: PortalUser;
  isPic: boolean;
};

const HelpdeskContext = createContext<KonteksHelpdesk | null>(null);

export function useHelpdesk(): KonteksHelpdesk {
  const konteks = useContext(HelpdeskContext);

  if (!konteks) {
    throw new Error('useHelpdesk harus dipakai di dalam layout Helpdesk');
  }

  return konteks;
}

export default function LayoutHelpdesk({
  children,
}: {
  children: ReactNode;
}) {
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);

  useEffect(() => {
    let aktif = true;

    async function muat() {
      const token = getAccessToken();
      const tersimpan = getStoredUser();

      if (!token || !tersimpan) {
        clearSession();
        router.replace('/login');
        return;
      }

      let sekarang = tersimpan;

      try {
        const response = await fetch(`${API_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (response.status === 401) {
          clearSession();
          router.replace('/login');
          return;
        }

        if (response.ok) {
          sekarang = (await response.json()) as PortalUser;
          saveStoredUser(sekarang);
        }
      } catch {
        // Pakai sesi terakhir bila backend sementara tidak terjangkau.
      }

      if (!hasAccess(sekarang, ACCESS_KEYS.HC_HELPDESK)) {
        router.replace('/hc');
        return;
      }

      if (aktif) {
        setUser(sekarang);
      }
    }

    void muat();

    return () => {
      aktif = false;
    };
  }, [router]);

  if (!user) {
    return (
      <main className={styles.memuat}>Memuat modul Helpdesk Center...</main>
    );
  }

  const konteks: KonteksHelpdesk = {
    user,
    isPic: user.role === 'ADMIN' || user.role === 'SUPER_ADMIN',
  };

  return (
    <HelpdeskContext.Provider value={konteks}>
      <div className={styles.shell}>
        <header className={styles.topbar}>
          <Link href="/hc/helpdesk" className={styles.brand}>
            <span className={styles.brandLogo}>
              <LifeBuoy size={20} />
            </span>
            Helpdesk Center
          </Link>

          <div className={styles.profile}>
            <span className={styles.profileIcon}>
              <UsersRound size={20} />
            </span>
            <div className={styles.akun}>
              <strong>{user.name}</strong>
              <span>{formatRole(user.role)}</span>
            </div>
          </div>
        </header>

        <main className={styles.body}>{children}</main>
      </div>
    </HelpdeskContext.Provider>
  );
}
