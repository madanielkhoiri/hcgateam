'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Building,
  ClipboardList,
  Droplet,
  FolderKanban,
  HardHat,
  MessageSquareText,
  Plug,
  QrCode,
  Recycle,
  UsersRound,
  Zap,
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
import { ambilRingkasanApproval, type RingkasanApproval } from '@/lib/approval-summary-api';
import styles from './civil.module.css';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

function buatCivilTree(approval: RingkasanApproval | null): MenuTreeNode[] {
  return [
  {
    key: 'CIVIL_GA_MEP',
    title: 'GA MEP',
    description: 'Mechanical, Electrical & Plumbing.',
    icon: Zap,
    accessKey: ACCESS_KEYS.CIVIL_GA_MEP,
    accent: '#0783a8',
    soft: '#e5f7fb',
    children: [
      {
        key: 'CIVIL_ELECTRIC',
        title: 'Electric',
        description: 'Inventory Electric.',
        icon: Zap,
        accessKey: ACCESS_KEYS.CIVIL_ELECTRIC,
        accent: '#d97706',
        soft: '#fff2df',
        children: [
          {
            key: 'CIVIL_INVENTORY_ELECTRIC',
            title: 'Inventory Electric',
            description:
              'Master barang, barang masuk, barang keluar, dan stok Inventory Electric.',
            status: 'Tersedia',
            href: '/ga/inventory/civil-electric/dashboard',
            icon: Plug,
            accessKey: ACCESS_KEYS.CIVIL_INVENTORY_ELECTRIC,
            accent: '#d97706',
            soft: '#fff2df',
          },
          {
            key: 'CIVIL_ELECTRIC_KIP',
            title: 'KIP',
            description: 'Kartu Inspeksi Peralatan — scan barcode, kartu 3D, checklist bulanan.',
            status: 'Tersedia',
            href: '/civil/electric-kip',
            icon: QrCode,
            accessKey: ACCESS_KEYS.CIVIL_ELECTRIC_KIP,
            accent: '#d97706',
            soft: '#fff2df',
          },
        ],
      },
      {
        key: 'CIVIL_AIR',
        title: 'Air',
        description: 'Belum tersedia.',
        status: 'Belum tersedia',
        icon: Droplet,
        accessKey: ACCESS_KEYS.CIVIL_AIR,
        accent: '#0868f6',
        soft: '#eaf2ff',
      },
    ],
  },
  {
    key: 'CIVIL_INFRAS',
    title: 'CIVIL INFRAS',
    description: 'Project dan Work Order Infrastruktur.',
    icon: Building,
    accessKey: ACCESS_KEYS.CIVIL_INFRAS,
    accent: '#07984c',
    soft: '#e4f7ec',
    children: [
      {
        key: 'CIVIL_PROJECT',
        title: 'PROJECT',
        description: 'e-ProM: Tender, Kontrak, dan Project Area.',
        status: 'Tersedia',
        href: '/civil/project',
        icon: FolderKanban,
        accessKey: ACCESS_KEYS.CIVIL_PROJECT,
        accent: '#7a4ce0',
        soft: '#f0ebff',
        pendingCount: approval?.eprom,
      },
      {
        key: 'CIVIL_WO_INFRAS',
        title: 'WO INFRAS',
        description: 'Work Order dan Serah Terima Pekerjaan.',
        icon: ClipboardList,
        accessKey: ACCESS_KEYS.CIVIL_WO_INFRAS,
        accent: '#d53535',
        soft: '#ffeded',
        children: [
          {
            key: 'GA_PEKERJAAN',
            title: 'Pekerjaan',
            description:
              'Pengelolaan Work Order dan dokumen Serah Terima Pekerjaan.',
            status: 'Tersedia',
            href: '/ga/inventory/work-order',
            icon: HardHat,
            accessKey: ACCESS_KEYS.GA_PEKERJAAN,
            accent: '#d53535',
            soft: '#ffeded',
            pendingCount: approval?.workOrders,
          },
        ],
      },
      {
        key: 'CIVIL_TPS3R',
        title: 'TPS 3R',
        description:
          'Laporan timbangan sampah Organik, Non Organik, Guna Ulang/Reuse, Daur Ulang/Recycle, dan Residu (kg).',
        status: 'Tersedia',
        href: '/civil/tps-3r/dashboard',
        icon: Recycle,
        accessKey: ACCESS_KEYS.CIVIL_TPS3R,
        accent: '#0a8a5c',
        soft: '#e2f7ee',
      },
    ],
  },
  {
    key: 'CIVIL_PENGADUAN',
    title: 'Pengaduan Layanan',
    description: 'Beri rating dan masukan atas pelayanan tim Civil.',
    status: 'Tersedia',
    href: '/civil/pengaduan',
    icon: MessageSquareText,
    accessKey: ACCESS_KEYS.CIVIL,
    accent: '#ef476f',
    soft: '#ffe4ec',
  },
  ];
}

export default function CivilPage() {
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [approval, setApproval] = useState<RingkasanApproval | null>(null);

  useEffect(() => {
    void ambilRingkasanApproval().then(setApproval);
  }, []);

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

      if (!hasAccess(current, ACCESS_KEYS.CIVIL)) {
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

  const civilTree = useMemo(() => buatCivilTree(approval), [approval]);

  if (!user) {
    return <main className={styles.page}>Memuat pilihan CIVIL...</main>;
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.brand}>
          <span className={styles.brandLogo}>
            <UsersRound size={24} />
          </span>
          <strong>ONE FOR ALL</strong>
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
            <span className={styles.civilIcon}>
              <Building size={31} />
            </span>
            <div>
              <h1>CIVIL</h1>
              <p>Pilih layanan dan pengelolaan data CIVIL.</p>
            </div>
          </div>

          <MenuTree nodes={civilTree} bolehLihat={bolehLihat} />
        </div>
      </section>

      <footer className={styles.footer}>
        <span>© 2026 ONE FOR ALL. Semua hak dilindungi.</span>
        <span>|</span>
        <span>Portal Internal</span>
        <span>|</span>
        <span>v1.0.0</span>
      </footer>
    </main>
  );
}
