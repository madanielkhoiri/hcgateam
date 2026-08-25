'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  BookOpen,
  Download,
  HandHeart,
  Megaphone,
  ShieldCheck,
  UsersRound,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import {
  ACCESS_KEYS,
  clearSession,
  formatRole,
  getAccessToken,
  getStoredUser,
  hasAccess,
  type PortalUser,
  saveStoredUser,
} from '@/lib/access-control';
import { MenuTree, type MenuTreeNode } from '@/components/menu-tree/menu-tree';
import styles from './administrasi.module.css';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

const administrasiTree: MenuTreeNode[] = [
  {
    key: 'ADMINISTRASI_POSTINGAN',
    title: 'Postingan',
    description:
      'Kelola poster/video informasi yang tampil di carousel beranda seluruh akun.',
    status: 'Tersedia',
    href: '/administrasi/postingan',
    icon: Megaphone,
    accessKey: ACCESS_KEYS.ADMINISTRASI_POSTINGAN,
    accent: '#c2410c',
    soft: '#ffeee4',
  },
  {
    key: 'ADMINISTRASI_DOKUMENTASI',
    title: 'Dokumentasi',
    description: 'Belum tersedia.',
    status: 'Belum tersedia',
    icon: BookOpen,
    accessKey: ACCESS_KEYS.ADMINISTRASI_DOKUMENTASI,
    accent: '#7a4ce0',
    soft: '#f0ebff',
  },
  {
    key: 'GA_SAFETY_MEETING',
    title: 'P5M / Safety Meeting',
    description: 'Pencatatan kegiatan P5M beserta materi, peserta, dan dokumentasi.',
    status: 'Tersedia',
    href: '/ga/inventory/p5m',
    icon: ShieldCheck,
    accessKey: ACCESS_KEYS.GA_SAFETY_MEETING,
    accent: '#d53535',
    soft: '#ffeded',
  },
  {
    key: 'ADMINISTRASI_FORM',
    title: 'Form Download',
    description: 'Belum tersedia, form-form yang dapat diunduh.',
    status: 'Belum tersedia',
    icon: Download,
    accessKey: ACCESS_KEYS.ADMINISTRASI_FORM,
    accent: '#0868f6',
    soft: '#eaf2ff',
  },
  {
    key: 'ADMINISTRASI_CSR',
    title: 'CSR',
    description: 'Belum tersedia.',
    status: 'Belum tersedia',
    icon: HandHeart,
    accessKey: ACCESS_KEYS.ADMINISTRASI_CSR,
    accent: '#07984c',
    soft: '#e4f7ec',
  },
];

export default function AdministrasiPage() {
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const token = getAccessToken();
      const stored = getStoredUser();

      if (!token || !stored) {
        clearSession();
        router.replace('/login');
        return;
      }

      let current = stored;

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
          current = (await response.json()) as PortalUser;
          saveStoredUser(current);
        }
      } catch {
        // Gunakan data login terakhir saat backend sementara tidak terjangkau.
      }

      if (!hasAccess(current, ACCESS_KEYS.ADMINISTRASI)) {
        router.replace('/dashboard');
        return;
      }

      if (active) {
        setUser(current);
      }
    }

    void loadUser();

    return () => {
      active = false;
    };
  }, [router]);

  const bolehLihat = useMemo(
    () => (accessKey: string) => hasAccess(user, accessKey),
    [user],
  );

  if (!user) {
    return <main className={styles.page}>Memuat pilihan Administrasi...</main>;
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.brand}>
          <span className={styles.brandLogo}>
            <UsersRound size={24} />
          </span>
          <strong>HCGA TEAM</strong>
        </Link>

        <div className={styles.profile}>
          <span className={styles.profileIcon}>
            <UsersRound size={22} />
          </span>
          <div>
            <strong>{user.name}</strong>
            <span>{formatRole(user.role)}</span>
          </div>
        </div>
      </header>

      <section className={styles.main}>
        <div className={styles.container}>
          <Link href="/dashboard" className={styles.backButton}>
            <ArrowLeft size={18} />
            Kembali ke Dashboard
          </Link>

          <div className={styles.titleSection}>
            <span className={styles.administrasiIcon}>
              <BookOpen size={31} />
            </span>
            <div>
              <h1>ADMINISTRASI</h1>
              <p>Dokumentasi, safety meeting, form unduhan, dan CSR.</p>
            </div>
          </div>

          <MenuTree nodes={administrasiTree} bolehLihat={bolehLihat} />
        </div>
      </section>

      <footer className={styles.footer}>
        <span>© 2026 HCGA TEAM. Semua hak dilindungi.</span>
        <span>|</span>
        <span>Portal Internal</span>
        <span>|</span>
        <span>v1.0.0</span>
      </footer>
    </main>
  );
}
