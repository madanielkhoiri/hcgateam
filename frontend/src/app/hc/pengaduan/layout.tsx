'use client';

// ==================================================
// FILE: frontend/src/app/hc/pengaduan/layout.tsx
// FUNGSI: Shell modul Pengaduan Layanan HC (guard akses + sidebar).
// PENTING: komponen inti (PengaduanLayananPage, RekapPerformaPage) dipakai
// bersama HC/GA/CIVIL dan TIDAK diubah di sini - layout ini cuma bungkus
// visual (ModuleShell) di atas 2 halaman yang sudah ada + 1 halaman
// dashboard baru yang reuse data ringkasan dari pengaduan-layanan-api.ts.
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

const MENU_PENGADUAN: ModuleShellMenuItem[] = [
  { label: 'Dashboard', href: '/hc/pengaduan/dashboard', initial: 'DB' },
  { label: 'Aduan Layanan', href: '/hc/pengaduan', initial: 'AL' },
  { label: 'Rekap Performa', href: '/hc/pengaduan/rekap', initial: 'RP' },
];

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type KonteksPengaduan = {
  user: PortalUser;
};

const PengaduanContext = createContext<KonteksPengaduan | null>(null);

export function usePengaduan(): KonteksPengaduan {
  const konteks = useContext(PengaduanContext);

  if (!konteks) {
    throw new Error('usePengaduan harus dipakai di dalam layout Pengaduan Layanan');
  }

  return konteks;
}

export default function LayoutPengaduan({ children }: { children: ReactNode }) {
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

      if (!hasAccess(sekarang, ACCESS_KEYS.HC)) {
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
    return <main style={{ padding: 32 }}>Memuat modul Pengaduan Layanan...</main>;
  }

  return (
    <PengaduanContext.Provider value={{ user }}>
      <ModuleShell
        title="Pengaduan Layanan"
        subtitle="Human Capital"
        deptBadge={{ text: 'HC', color: '#0868f6', soft: '#eaf2ff' }}
        menuItems={MENU_PENGADUAN}
        backHref="/hc"
        backLabel="Kembali ke HC"
      >
        {children}
      </ModuleShell>
    </PengaduanContext.Provider>
  );
}
