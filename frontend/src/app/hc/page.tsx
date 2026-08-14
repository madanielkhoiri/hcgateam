'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  FileText,
  HeartPulse,
  UsersRound,
  UserCircle2,
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
import styles from './hc.module.css';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type HcMenu = {
  title: string;
  description: string;
  status: string;
  href?: string;
  icon: React.ElementType;
  variant: string;
  accessKey: string;
};

const hcMenus: HcMenu[] = [
  {
    title: 'Deklarasi Dinas',
    description:
      'Aplikasi pengelolaan deklarasi perjalanan dinas dan uang operasional.',
    status: 'Tersedia',
    href: '/hc/deklarasi-dinas',
    icon: FileText,
    variant: 'projectCard',
    accessKey: ACCESS_KEYS.HC,
  },
  {
    title: 'MCU Periodik',
    description:
      'Monitoring Medical Check Up periodik: jadwal, hasil, rekomendasi FIT/Follow Up, sampai induksi ulang.',
    status: 'Tersedia',
    href: '/hc/mcu',
    icon: HeartPulse,
    variant: 'inventoryCard',
    accessKey: ACCESS_KEYS.HC_MCU,
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

  const visibleMenus = useMemo(
    () => hcMenus.filter((menu) => hasAccess(user, menu.accessKey)),
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
