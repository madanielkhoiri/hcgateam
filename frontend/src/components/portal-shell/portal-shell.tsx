'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  type LucideIcon,
  Menu,
  PanelLeftClose,
  UserCog,
  UsersRound,
  UtensilsCrossed,
  X,
} from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import {
  clearSession,
  formatRole,
  getAccessToken,
  getStoredUser,
  hasAccess,
  type PortalUser,
  saveStoredUser,
} from '@/lib/access-control';
import styles from './portal-shell.module.css';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type PortalMenuIcon = 'utensils-crossed' | 'user-cog';

const MENU_ICONS = {
  'utensils-crossed': UtensilsCrossed,
  'user-cog': UserCog,
} satisfies Record<PortalMenuIcon, LucideIcon>;

type PortalMenuItem = {
  label: string;
  href: string;
  icon: PortalMenuIcon;
};

type PortalShellProps = {
  children: ReactNode;
  areaLabel: string;
  title: string;
  menuLabel: string;
  menuItems: PortalMenuItem[];
  backHref?: string;
  backLabel?: string;
  requiredAccessKey?: string;
  adminOnly?: boolean;
};

export default function PortalShell({
  children,
  areaLabel,
  title,
  menuLabel,
  menuItems,
  backHref,
  backLabel,
  requiredAccessKey,
  adminOnly = false,
}: PortalShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      const token = getAccessToken();
      const storedUser = getStoredUser();

      if (!token || !storedUser) {
        clearSession();
        router.replace('/login');
        return;
      }

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

        const latestUser = response.ok
          ? ((await response.json()) as PortalUser)
          : storedUser;

        if (adminOnly && latestUser.role !== 'ADMIN') {
          router.replace('/dashboard');
          return;
        }

        if (
          requiredAccessKey &&
          !hasAccess(latestUser, requiredAccessKey)
        ) {
          router.replace('/dashboard');
          return;
        }

        saveStoredUser(latestUser);
        if (active) {
          setUser(latestUser);
        }
      } catch {
        if (adminOnly && storedUser.role !== 'ADMIN') {
          router.replace('/dashboard');
          return;
        }

        if (
          requiredAccessKey &&
          !hasAccess(storedUser, requiredAccessKey)
        ) {
          router.replace('/dashboard');
          return;
        }

        if (active) {
          setUser(storedUser);
        }
      }
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [adminOnly, requiredAccessKey, router]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  if (!user) {
    return <main className={styles.loading}>Memuat halaman...</main>;
  }

  return (
    <div
      className={`${styles.shell} ${
        sidebarCollapsed ? styles.shellCollapsed : ''
      }`}
    >
      <aside
        className={`${styles.sidebar} ${
          sidebarCollapsed ? styles.sidebarCollapsed : ''
        } ${mobileSidebarOpen ? styles.sidebarMobileOpen : ''}`}
      >
        <div className={styles.sidebarHeader}>
          <Link href="/dashboard" className={styles.brand}>
            <span className={styles.brandLogo}>
              <UsersRound size={23} />
            </span>
            {!sidebarCollapsed && (
              <span className={styles.brandText}>HCGA TEAM</span>
            )}
          </Link>

          <button
            type="button"
            className={styles.mobileCloseButton}
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Tutup sidebar"
          >
            <X size={21} />
          </button>
        </div>

        <nav className={styles.navigation}>
          <Link href="/dashboard" className={styles.mainNavigationItem}>
            <Home size={20} />
            {!sidebarCollapsed && <span>Dashboard</span>}
          </Link>

          {backHref && (
            <Link href={backHref} className={styles.mainNavigationItem}>
              <ChevronLeft size={20} />
              {!sidebarCollapsed && <span>{backLabel ?? 'Kembali'}</span>}
            </Link>
          )}

          {!sidebarCollapsed && (
            <div className={styles.navigationLabel}>
              MENU {menuLabel.toUpperCase()}
            </div>
          )}

          {menuItems.map((item) => {
            const Icon = MENU_ICONS[item.icon];
            const activeItem = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`${styles.menuItem} ${
                  activeItem ? styles.menuItemActive : ''
                }`}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon size={20} />
                {!sidebarCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <button
            type="button"
            className={styles.collapseButton}
            onClick={() => setSidebarCollapsed((current) => !current)}
          >
            {sidebarCollapsed ? (
              <ChevronRight size={20} />
            ) : (
              <>
                <PanelLeftClose size={20} />
                <span>Perkecil Sidebar</span>
              </>
            )}
          </button>
        </div>
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
              <Menu size={23} />
            </button>

            <div>
              <span>{areaLabel}</span>
              <strong>{title}</strong>
            </div>
          </div>

          <div className={styles.headerProfile}>
            <span className={styles.profileAvatar}>
              <UsersRound size={21} />
            </span>
            <div>
              <strong>{user.name}</strong>
              <span>{formatRole(user.role)}</span>
            </div>
          </div>
        </header>

        <div className={styles.pageContent}>{children}</div>
      </section>
    </div>
  );
}
