'use client';

// ==================================================
// FILE: frontend/src/app/hc/ir/layout.tsx
// FUNGSI: Shell modul PORTAL IR (guard akses) - sidebar navigasi tetap
// lewat ModuleShell, pola sama dengan modul HC lain (MCU, Tugas Dinas,
// Anak Magang, Helpdesk).
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
import styles from './ir.module.css';

const MENU_IR: ModuleShellMenuItem[] = [
  { label: 'Dashboard', href: '/hc/ir/dashboard', initial: 'DB' },
  { label: 'Upload Dokumen', href: '/hc/ir/dokumen', initial: 'DK' },
  { label: 'Aspirasi Karyawan', href: '/hc/ir/aspirasi', initial: 'AS' },
  { label: 'IR Course', href: '/hc/ir/course', initial: 'CO' },
];

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type KonteksIr = {
  user: PortalUser;
};

const IrContext = createContext<KonteksIr | null>(null);

export function useIr(): KonteksIr {
  const konteks = useContext(IrContext);

  if (!konteks) {
    throw new Error('useIr harus dipakai di dalam layout PORTAL IR');
  }

  return konteks;
}

export default function LayoutIr({ children }: { children: ReactNode }) {
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

      if (!hasAccess(sekarang, ACCESS_KEYS.HC_IR)) {
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
    return <main style={{ padding: 42, textAlign: 'center', color: '#7688a0' }}>Memuat modul PORTAL IR...</main>;
  }

  return (
    <IrContext.Provider value={{ user }}>
      <ModuleShell
        title="PORTAL IR"
        subtitle="Human Capital"
        deptBadge={{ text: 'HC', color: '#0868f6', soft: '#eaf2ff' }}
        menuItems={MENU_IR}
        backHref="/hc"
        backLabel="Kembali ke HC"
      >
        <main className={styles.body}>{children}</main>
      </ModuleShell>
    </IrContext.Provider>
  );
}
