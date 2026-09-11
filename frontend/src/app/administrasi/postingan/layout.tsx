'use client';

// ==================================================
// FILE: frontend/src/app/administrasi/postingan/layout.tsx
// FUNGSI: Shell modul Postingan (guard akses + sidebar navigasi)
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

const MENU_POSTINGAN: ModuleShellMenuItem[] = [
  { label: 'Dashboard', href: '/administrasi/postingan/dashboard', initial: 'DB' },
  { label: 'Kelola Postingan', href: '/administrasi/postingan/kelola', initial: 'KL' },
];

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export default function LayoutPostingan({ children }: { children: ReactNode }) {
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

      if (!hasAccess(sekarang, ACCESS_KEYS.ADMINISTRASI_POSTINGAN)) {
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
    return <main style={{ padding: 40, color: '#6d83a0' }}>Memuat modul Postingan...</main>;
  }

  return (
    <ModuleShell
      title="Postingan"
      subtitle="Administrasi"
      deptBadge={{ text: 'AD', color: '#6748df', soft: '#f4f0ff' }}
      menuItems={MENU_POSTINGAN}
      backHref="/administrasi"
      backLabel="Kembali ke Administrasi"
    >
      {children}
    </ModuleShell>
  );
}
