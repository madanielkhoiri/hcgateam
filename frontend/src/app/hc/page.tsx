'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  FileText,
  HeartHandshake,
  HeartPulse,
  LifeBuoy,
  Scale,
  UsersRound,
  UserCircle2,
  Wallet,
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
import styles from './hc.module.css';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

const hcTree: MenuTreeNode[] = [
  {
    key: 'HC_IR',
    title: 'IR',
    description: 'Industrial Relations - belum tersedia.',
    status: 'Belum tersedia',
    icon: Scale,
    accessKey: ACCESS_KEYS.HC_IR,
    accent: '#0783a8',
    soft: '#e5f7fb',
  },
  {
    key: 'HC_RND',
    title: 'R & D',
    description: 'Research & Development.',
    icon: HeartHandshake,
    accessKey: ACCESS_KEYS.HC_RND,
    accent: '#d97706',
    soft: '#fff2df',
    children: [
      {
        key: 'HC_DEKLARASI',
        title: 'Deklarasi Dinas',
        description:
          'Aplikasi pengelolaan deklarasi perjalanan dinas dan uang operasional.',
        status: 'Tersedia',
        href: '/hc/deklarasi-dinas',
        icon: FileText,
        accessKey: ACCESS_KEYS.HC_DEKLARASI,
        accent: '#d97706',
        soft: '#fff2df',
      },
    ],
  },
  {
    key: 'HC_COMBEN',
    title: 'Comben & Benefit',
    description: 'Compensation & Benefit.',
    icon: Wallet,
    accessKey: ACCESS_KEYS.HC_COMBEN,
    accent: '#07984c',
    soft: '#e4f7ec',
    children: [
      {
        key: 'HC_MCU',
        title: 'MCU Periodik',
        description:
          'Monitoring Medical Check Up periodik: jadwal, hasil, rekomendasi FIT/Follow Up, sampai induksi ulang.',
        status: 'Tersedia',
        href: '/hc/mcu',
        icon: HeartPulse,
        accessKey: ACCESS_KEYS.HC_MCU,
        accent: '#07984c',
        soft: '#e4f7ec',
      },
      {
        key: 'HC_HELPDESK',
        title: 'Helpdesk Center',
        description:
          'Pelaporan kendala, tiket, dan riwayat penyelesaian oleh Admin/Admin HC.',
        status: 'Tersedia',
        href: '/hc/helpdesk',
        icon: LifeBuoy,
        accessKey: ACCESS_KEYS.HC_HELPDESK,
        accent: '#c2410c',
        soft: '#ffeee4',
      },
    ],
  },
];

export default function HcPage() {
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

      if (!hasAccess(current, ACCESS_KEYS.HC)) {
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
    return <main className={styles.page}>Memuat pilihan HC...</main>;
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
            <span className={styles.gaIcon}>
              <UserCircle2 size={31} />
            </span>
            <div>
              <h1>HC (Human Capital)</h1>
              <p>Pilih layanan dan pengelolaan data Human Capital.</p>
            </div>
          </div>

          <MenuTree nodes={hcTree} bolehLihat={bolehLihat} />
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
