'use client';

// ==================================================
// FILE: frontend/src/app/ga/peminjaman-alat/layout.tsx
// FUNGSI: Shell modul Peminjaman Alat (GA) - sidebar seperti modul GA lain.
// Database Karyawan & QR, Master Alat, dan Riwayat hanya untuk Admin.
// ==================================================

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { clearSession, getAccessToken, getStoredUser, type PortalUser } from '@/lib/access-control';
import { ModuleShell, type ModuleShellMenuItem } from '@/components/module-shell/module-shell';
import { isAdminPeminjaman } from '@/components/tool-borrowing/akses';
import styles from '@/components/tool-borrowing/tool-borrowing.module.css';

const ROLE_BOLEH = ['GUDANG', 'SECTION_HEAD', 'ADMIN', 'SUPER_ADMIN', 'ELEKTRIK', 'GRUP_LEADER_GA'];

export default function LayoutPeminjamanAlat({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);

  useEffect(() => {
    const stored = getStoredUser();
    if (!getAccessToken() || !stored) {
      clearSession();
      router.replace('/login');
      return;
    }
    if (!ROLE_BOLEH.includes(stored.role)) {
      router.replace('/ga');
      return;
    }
    setUser(stored);
  }, [router]);

  const menu = useMemo<ModuleShellMenuItem[]>(() => {
    const dasar: ModuleShellMenuItem[] = [
      { label: 'Dashboard', href: '/ga/peminjaman-alat/dashboard', initial: 'DB' },
      { label: 'Monitoring Alat', href: '/ga/peminjaman-alat/monitoring', initial: 'MA' },
    ];
    if (!isAdminPeminjaman(user)) return dasar;
    return [
      ...dasar,
      { label: 'Database Karyawan & QR', href: '/ga/peminjaman-alat/karyawan', initial: 'QR' },
      { label: 'Master Alat', href: '/ga/peminjaman-alat/alat', initial: 'AL' },
      { label: 'Riwayat & Inspeksi', href: '/ga/peminjaman-alat/riwayat', initial: 'RW' },
    ];
  }, [user]);

  if (!user) return <main className={styles.shellLoading}>Memuat Peminjaman Alat...</main>;

  return (
    <ModuleShell
      title="Peminjaman Alat"
      subtitle="General Affairs"
      deptBadge={{ text: 'GA', color: '#0868f6', soft: '#eaf2ff' }}
      menuItems={menu}
      backHref={user.role === 'GUDANG' ? '/gudang' : '/ga'}
      backLabel={user.role === 'GUDANG' ? 'Kembali ke Gudang' : 'Kembali ke GA'}
    >
      <main className={styles.shellBody}>{children}</main>
    </ModuleShell>
  );
}
