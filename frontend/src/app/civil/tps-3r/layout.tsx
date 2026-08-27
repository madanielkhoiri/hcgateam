'use client';

// ==================================================
// FILE: frontend/src/app/civil/tps-3r/layout.tsx
// FUNGSI: Shell sidebar TPS 3R (Civil Infras) - Dashboard & Tabel Laporan
// ==================================================

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ChevronLeft, Gauge, Menu, Recycle, Table2, UsersRound, X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import {
  ACCESS_KEYS,
  clearSession,
  formatRole,
  getAccessToken,
  getStoredUser,
  hasAccess,
  type PortalUser,
} from '@/lib/access-control';
import styles from '../project/project-layout.module.css';

const navItems = [
  { label: 'Dashboard', href: '/civil/tps-3r/dashboard', icon: Gauge },
  { label: 'Tabel Laporan', href: '/civil/tps-3r/tabel', icon: Table2 },
];

export default function Tps3rLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    const stored = getStoredUser();

    if (!token || !stored) {
      clearSession();
      router.replace('/login');
      return;
    }

    if (!hasAccess(stored, ACCESS_KEYS.CIVIL_TPS3R)) {
      router.replace('/civil');
      return;
    }

    setUser(stored);
  }, [router]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  if (!user) {
    return <main className={styles.loading}>Memuat modul TPS 3R...</main>;
  }

  return (
    <div className={styles.shell}>
      <aside className={`${styles.sidebar} ${mobileSidebarOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <Link href="/civil/tps-3r/dashboard" className={styles.brand}>
            <span className={styles.brandLogo}>
              <Recycle size={22} />
            </span>
            <span className={styles.brandText}>TPS 3R</span>
          </Link>

          <button
            type="button"
            className={styles.mobileClose}
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Tutup sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className={styles.navigation}>
          <Link href="/civil" className={styles.backLink}>
            <ChevronLeft size={18} />
            <span>Pilihan Civil</span>
          </Link>

          <div className={styles.navLabel}>TPS 3R</div>

          {navItems.map((item) => {
            const ItemIcon = item.icon;
            const isActive = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.navItem} ${isActive ? styles.navItemActive : ''}`}
              >
                <ItemIcon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      {mobileSidebarOpen && (
        <button
          type="button"
          className={styles.mobileOverlay}
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Tutup sidebar"
        />
      )}

      <section className={styles.contentArea}>
        <header className={styles.topHeader}>
          <div className={styles.topHeaderLeft}>
            <button
              type="button"
              className={styles.mobileMenuButton}
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Buka menu"
            >
              <Menu size={22} />
            </button>

            <div>
              <span>Selamat datang, {user.name}</span>
              <strong>TPS 3R</strong>
            </div>
          </div>

          <div className={styles.topHeaderRight}>
            <div className={styles.profile}>
              <span className={styles.profileAvatar}>
                <UsersRound size={20} />
              </span>
              <div>
                <strong>{user.name}</strong>
                <span>{formatRole(user.role)}</span>
              </div>
            </div>
          </div>
        </header>

        <div className={styles.pageContent}>{children}</div>
      </section>
    </div>
  );
}
