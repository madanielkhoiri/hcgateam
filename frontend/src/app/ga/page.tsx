'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Building2,
  ClipboardList,
  Construction,
  FileText,
  HardHat,
  ShieldCheck,
  Truck,
  UtensilsCrossed,
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
import styles from './ga.module.css';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type GaMenu = {
  title: string;
  description: string;
  status: string;
  href?: string;
  icon: React.ElementType;
  variant: string;
  accessKey: string;
};

const gaMenus: GaMenu[] = [
  {
    title: 'Inventory',
    description:
      'Pengelolaan master barang, barang masuk, barang keluar, dan stok Inventory Infras, Mess, serta Electric.',
    status: '12 menu tersedia',
    href: '/ga/inventory/dashboard-inventory',
    icon: Boxes,
    variant: 'inventoryCard',
    accessKey: ACCESS_KEYS.GA_INVENTORY,
  },
  {
    title: 'Pekerjaan',
    description:
      'Pengelolaan Work Order dan dokumen Serah Terima Pekerjaan.',
    status: '2 menu tersedia',
    href: '/ga/inventory/work-order',
    icon: ClipboardList,
    variant: 'workCard',
    accessKey: ACCESS_KEYS.GA_PEKERJAAN,
  },
  {
    title: 'Aktivitas Harian',
    description:
      'Pencatatan Daily Activity serta kegiatan pemotongan rumput.',
    status: '2 menu tersedia',
    href: '/ga/inventory/daily-report',
    icon: FileText,
    variant: 'dailyCard',
    accessKey: ACCESS_KEYS.GA_AKTIVITAS_HARIAN,
  },
  {
    title: 'Project',
    description:
      'Dokumentasi Pre-Activity Check dan laporan Post Activity pekerjaan project.',
    status: '2 menu tersedia',
    href: '/ga/inventory/pre-activity-check',
    icon: HardHat,
    variant: 'projectCard',
    accessKey: ACCESS_KEYS.GA_PROJECT,
  },
  {
    title: 'Safety Meeting',
    description:
      'Pencatatan kegiatan P5M beserta materi, peserta, dan dokumentasi.',
    status: '1 menu tersedia',
    href: '/ga/inventory/p5m',
    icon: ShieldCheck,
    variant: 'safetyCard',
    accessKey: ACCESS_KEYS.GA_SAFETY_MEETING,
  },
  {
    title: 'Transport',
    description:
      'Pengelolaan data transportasi, bahan bakar, kilometer, dan laporan kendaraan.',
    status: '2 menu tersedia',
    href: '/ga/transport/dashboard',
    icon: Truck,
    variant: 'transportCard',
    accessKey: ACCESS_KEYS.GA_TRANSPORT,
  },
  {
    title: 'Order Pack Meal',
    description:
      'Pemesanan konsumsi tamu dengan nomor order otomatis, rincian jenis order, dan form approved.',
    status: 'CRUD tersedia',
    href: '/ga/order-pack-meal',
    icon: UtensilsCrossed,
    variant: 'orderMealCard',
    accessKey: ACCESS_KEYS.GA_ORDER_PACK_MEAL,
  },
  {
    title: 'General Service',
    description:
      'Layanan umum dan pengelolaan fasilitas untuk pengembangan berikutnya.',
    status: 'Belum tersedia',
    icon: Construction,
    variant: 'generalCard',
    accessKey: ACCESS_KEYS.GA_GENERAL_SERVICE,
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

  const visibleMenus = useMemo(
    () => gaMenus.filter((menu) => hasAccess(user, menu.accessKey)),
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

          <div className={styles.categoryGrid}>
            {visibleMenus.map((menu) => {
              const Icon = menu.icon;
              const cardClass = `${styles.categoryCard} ${styles[menu.variant]}`;
              const content = (
                <>
                  <span className={styles.categoryIcon}>
                    <Icon size={34} />
                  </span>

                  <div className={styles.categoryContent}>
                    <h2>{menu.title}</h2>
                    <p>{menu.description}</p>
                    <span className={styles.cardStatus}>{menu.status}</span>
                  </div>

                  {menu.href ? (
                    <ArrowRight className={styles.cardArrow} size={23} />
                  ) : null}
                </>
              );

              return menu.href ? (
                <Link key={menu.title} href={menu.href} className={cardClass}>
                  {content}
                </Link>
              ) : (
                <article key={menu.title} className={cardClass}>
                  {content}
                </article>
              );
            })}
          </div>
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
