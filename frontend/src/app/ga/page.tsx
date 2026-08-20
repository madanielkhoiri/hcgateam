'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Boxes,
  Building2,
  Construction,
  FileText,
  GlassWater,
  HardHat,
  Home,
  Scissors,
  TreePine,
  Truck,
  UsersRound,
  UtensilsCrossed,
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
import styles from './ga.module.css';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

const gaTree: MenuTreeNode[] = [
  {
    key: 'GA_INVENTORY',
    title: 'Inventory',
    description:
      'Pengelolaan master barang, barang masuk, barang keluar, dan stok Inventory Infras, Mess, serta Electric.',
    status: '12 menu tersedia',
    href: '/ga/inventory/dashboard-inventory',
    icon: Boxes,
    accessKey: ACCESS_KEYS.GA_INVENTORY,
    accent: '#07984c',
    soft: '#e4f7ec',
  },
  {
    key: 'GA_AKTIVITAS_HARIAN',
    title: 'Aktivitas Harian',
    description: 'Pencatatan Daily Activity serta kegiatan pemotongan rumput.',
    status: '2 menu tersedia',
    href: '/ga/inventory/daily-report',
    icon: FileText,
    accessKey: ACCESS_KEYS.GA_AKTIVITAS_HARIAN,
    accent: '#7a4ce0',
    soft: '#f0ebff',
  },
  {
    key: 'GA_PROJECT',
    title: 'Project',
    description:
      'Dokumentasi Pre-Activity Check dan laporan Post Activity pekerjaan project.',
    status: '2 menu tersedia',
    href: '/ga/inventory/pre-activity-check',
    icon: HardHat,
    accessKey: ACCESS_KEYS.GA_PROJECT,
    accent: '#d97706',
    soft: '#fff2df',
  },
  {
    key: 'GA_TRANSPORT_SECTION',
    title: 'Transport',
    description: 'Pengelolaan data transportasi dan kendaraan.',
    icon: Truck,
    accessKey: ACCESS_KEYS.GA_TRANSPORT_SECTION,
    accent: '#0783a8',
    soft: '#e5f7fb',
    children: [
      {
        key: 'GA_TRANSPORT',
        title: 'Transport',
        description:
          'Pengelolaan data transportasi, bahan bakar, kilometer, dan laporan kendaraan.',
        status: '2 menu tersedia',
        href: '/ga/transport/dashboard',
        icon: Truck,
        accessKey: ACCESS_KEYS.GA_TRANSPORT,
        accent: '#0783a8',
        soft: '#e5f7fb',
      },
    ],
  },
  {
    key: 'GA_GENERAL_SERVICE',
    title: 'GS (General Service)',
    description: 'Housekeeping dan Packmeal.',
    icon: Construction,
    accessKey: ACCESS_KEYS.GA_GENERAL_SERVICE,
    accent: '#e86600',
    soft: '#fff0e4',
    children: [
      {
        key: 'GA_GS_HOUSEKEEPING',
        title: 'Housekeeping',
        description: 'Indoor dan Outdoor.',
        icon: Home,
        accessKey: ACCESS_KEYS.GA_GS_HOUSEKEEPING,
        accent: '#e86600',
        soft: '#fff0e4',
        children: [
          {
            key: 'GA_GS_HOUSEKEEPING_INDOOR',
            title: 'Indoor',
            description: 'Belum tersedia.',
            status: 'Belum tersedia',
            icon: Home,
            accessKey: ACCESS_KEYS.GA_GS_HOUSEKEEPING_INDOOR,
            accent: '#e86600',
            soft: '#fff0e4',
          },
          {
            key: 'GA_GS_HOUSEKEEPING_OUTDOOR',
            title: 'Outdoor',
            description: 'Potong Rumput.',
            icon: TreePine,
            accessKey: ACCESS_KEYS.GA_GS_HOUSEKEEPING_OUTDOOR,
            accent: '#0b9d4d',
            soft: '#e6f7ec',
            children: [
              {
                key: 'GA_POTONG_RUMPUT',
                title: 'Potong Rumput',
                description: 'Pencatatan kegiatan pemotongan rumput area kerja.',
                status: 'Tersedia',
                href: '/ga/inventory/potong-rumput',
                icon: Scissors,
                accessKey: ACCESS_KEYS.GA_AKTIVITAS_HARIAN,
                accent: '#0b9d4d',
                soft: '#e6f7ec',
              },
            ],
          },
        ],
      },
      {
        key: 'GA_GS_PACKMEAL',
        title: 'Packmeal',
        description: 'Catering dan Air Minum.',
        icon: UtensilsCrossed,
        accessKey: ACCESS_KEYS.GA_GS_PACKMEAL,
        accent: '#9a4fd1',
        soft: '#f5eaff',
        children: [
          {
            key: 'GA_GS_PACKMEAL_CATERING',
            title: 'Catering',
            description: 'Order Pack Meal.',
            icon: UtensilsCrossed,
            accessKey: ACCESS_KEYS.GA_GS_PACKMEAL_CATERING,
            accent: '#9a4fd1',
            soft: '#f5eaff',
            children: [
              {
                key: 'GA_ORDER_PACK_MEAL',
                title: 'Order Pack Meal',
                description:
                  'Pemesanan konsumsi tamu dengan nomor order otomatis, rincian jenis order, dan form approved.',
                status: 'CRUD tersedia',
                href: '/ga/order-pack-meal',
                icon: UtensilsCrossed,
                accessKey: ACCESS_KEYS.GA_ORDER_PACK_MEAL,
                accent: '#9a4fd1',
                soft: '#f5eaff',
              },
            ],
          },
          {
            key: 'GA_GS_PACKMEAL_AIR_MINUM',
            title: 'Air Minum',
            description: 'Belum tersedia.',
            status: 'Belum tersedia',
            icon: GlassWater,
            accessKey: ACCESS_KEYS.GA_GS_PACKMEAL_AIR_MINUM,
            accent: '#0868f6',
            soft: '#eaf2ff',
          },
        ],
      },
    ],
  },
];

export default function GaPage() {
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

      if (!hasAccess(current, ACCESS_KEYS.GA)) {
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
    return <main className={styles.page}>Memuat pilihan GA...</main>;
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
              <Building2 size={31} />
            </span>
            <div>
              <h1>GA (General Affair)</h1>
              <p>Pilih layanan dan pengelolaan data General Affair.</p>
            </div>
          </div>

          <MenuTree nodes={gaTree} bolehLihat={bolehLihat} />
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
