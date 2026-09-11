'use client';

// ==================================================
// FILE: frontend/src/app/hc/tugas-dinas/layout.tsx
// FUNGSI: Shell modul Form Tugas Dinas (guard akses)
// ==================================================

import { useRouter } from 'next/navigation';
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
  getAccessToken,
  getStoredUser,
  hasAccess,
  saveStoredUser,
  type PortalUser,
} from '@/lib/access-control';
import { ModuleShell, type ModuleShellMenuItem } from '@/components/module-shell/module-shell';
import styles from './tugas-dinas.module.css';

const MENU_TUGAS_DINAS: ModuleShellMenuItem[] = [
  { label: 'Dashboard', href: '/hc/tugas-dinas/dashboard', initial: 'DB' },
];

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type KonteksTugasDinas = {
  user: PortalUser;
};

const TugasDinasContext = createContext<KonteksTugasDinas | null>(null);

export function useTugasDinas(): KonteksTugasDinas {
  const konteks = useContext(TugasDinasContext);

  if (!konteks) {
    throw new Error('useTugasDinas harus dipakai di dalam layout Tugas Dinas');
  }

  return konteks;
}

export default function LayoutTugasDinas({
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

      if (!hasAccess(sekarang, ACCESS_KEYS.HC_TUGAS_DINAS)) {
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
      <main className={styles.memuat}>Memuat modul Form Tugas Dinas...</main>
    );
  }

  return (
    <TugasDinasContext.Provider value={{ user }}>
      <ModuleShell
        title="Form Tugas Dinas"
        subtitle="Human Capital"
        deptBadge={{ text: 'HC', color: '#0868f6', soft: '#eaf2ff' }}
        menuItems={MENU_TUGAS_DINAS}
        backHref="/hc"
        backLabel="Kembali ke HC"
      >
        <main className={styles.body}>{children}</main>
      </ModuleShell>
    </TugasDinasContext.Provider>
  );
}