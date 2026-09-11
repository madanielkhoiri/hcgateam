'use client';

// ==================================================
// FILE: frontend/src/app/hc/surat-balasan-magang/layout.tsx
// FUNGSI: Shell modul Surat Balasan Magang (guard akses + sidebar)
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
import styles from '../anak-magang/anak-magang.module.css';

const MENU_SURAT_BALASAN: ModuleShellMenuItem[] = [
  { label: 'Dashboard', href: '/hc/surat-balasan-magang/dashboard', initial: 'DB' },
  { label: 'Daftar Surat', href: '/hc/surat-balasan-magang/daftar', initial: 'DS' },
  { label: 'Buat Surat', href: '/hc/surat-balasan-magang/buat', initial: 'BS' },
];

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type KonteksSuratBalasan = {
  user: PortalUser;
};

const SuratBalasanContext = createContext<KonteksSuratBalasan | null>(null);

export function useSuratBalasan(): KonteksSuratBalasan {
  const konteks = useContext(SuratBalasanContext);

  if (!konteks) {
    throw new Error(
      'useSuratBalasan harus dipakai di dalam layout Surat Balasan Magang',
    );
  }

  return konteks;
}

export default function LayoutSuratBalasanMagang({
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

      if (!hasAccess(sekarang, ACCESS_KEYS.HC_SURAT_BALASAN_MAGANG)) {
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
      <main className={styles.memuat}>Memuat modul Surat Balasan Magang...</main>
    );
  }

  return (
    <SuratBalasanContext.Provider value={{ user }}>
      <ModuleShell
        title="Surat Balasan Magang"
        subtitle="Human Capital"
        deptBadge={{ text: 'HC', color: '#0868f6', soft: '#eaf2ff' }}
        menuItems={MENU_SURAT_BALASAN}
        backHref="/hc"
        backLabel="Kembali ke HC"
      >
        <main className={styles.body}>{children}</main>
      </ModuleShell>
    </SuratBalasanContext.Provider>
  );
}
