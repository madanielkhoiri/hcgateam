'use client';

// ==================================================
// FILE: frontend/src/app/administrasi/form-download/layout.tsx
// FUNGSI: Shell modul Form Download (guard akses + sidebar navigasi) -
// menyamakan tampilan dengan modul Administrasi lain (CSR, Dokumentasi,
// Postingan) yang sudah pakai ModuleShell.
// ==================================================

import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
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

const MENU_FORM_DOWNLOAD: ModuleShellMenuItem[] = [
  { label: 'Form Download', href: '/administrasi/form-download', initial: 'FD' },
];

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export default function LayoutFormDownload({ children }: { children: ReactNode }) {
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

      if (!hasAccess(sekarang, ACCESS_KEYS.ADMINISTRASI_FORM)) {
        router.replace('/administrasi');
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
    return <main style={{ padding: 40, color: '#6d83a0' }}>Memuat modul Form Download...</main>;
  }

  return (
    <ModuleShell
      title="Form Download"
      subtitle="Administrasi"
      deptBadge={{ text: 'AD', color: '#6748df', soft: '#f4f0ff' }}
      menuItems={MENU_FORM_DOWNLOAD}
      backHref="/administrasi"
      backLabel="Kembali ke Administrasi"
    >
      {children}
    </ModuleShell>
  );
}
