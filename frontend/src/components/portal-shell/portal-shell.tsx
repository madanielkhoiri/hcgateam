'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  KeyRound,
  type LucideIcon,
  Menu,
  PanelLeftClose,
  UserCog,
  UsersRound,
  ScrollText,
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
import { WebPushPrompt } from '../web-push-prompt';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

const ADMIN_ONLY_ROLES = [
  'ADMIN', 'SUPER_ADMIN', 'SECTION_HEAD',
  'GRUP_LEADER_IR', 'GRUP_LEADER_COMBEN', 'GRUP_LEADER_GA', 'GRUP_LEADER_RND',
];

function bolehAksesAdminOnly(role?: string): boolean {
  return Boolean(role && ADMIN_ONLY_ROLES.includes(role));
}

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
  const [profileOpen, setProfileOpen] = useState(false);
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

        if (adminOnly && !bolehAksesAdminOnly(latestUser.role)) {
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
        if (adminOnly && !bolehAksesAdminOnly(storedUser.role)) {
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
    <>
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
              <img src="/logos/hcga-connect.png" alt="HCGA Connect" />
            </span>
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

          <div className={styles.headerProfile} onClick={() => setProfileOpen((open) => !open)} role="button" tabIndex={0}>
            <span className={styles.profileAvatar}>
              <UsersRound size={21} />
            </span>
            <div>
              <strong>{user.name}</strong>
              <span>{user.jabatan || formatRole(user.role)}</span>
            </div>
            <ChevronRight className={profileOpen ? styles.profileArrowOpen : styles.profileArrow} size={18} />
            {profileOpen && (
              <div className={styles.profileDropdown}>
                <div className={styles.profileDropdownHeader}><UsersRound size={22} /><span><strong>{user.name}</strong><small>{user.jabatan || formatRole(user.role)}</small></span></div>
                <div className={styles.profileDivider} />
                <Link href="/dashboard" onClick={() => setProfileOpen(false)}><UserCog size={18} /><span><strong>Akun Saya</strong><small>Edit nama dan username</small></span></Link>
                {ADMIN_ONLY_ROLES.includes(user.role) && <Link href="/admin/manajemen-akun" onClick={() => setProfileOpen(false)}><UsersRound size={18} /><span><strong>Manajemen Akun</strong><small>Atur role dan akses menu akun</small></span></Link>}
                {ADMIN_ONLY_ROLES.includes(user.role) && <Link href="/admin/audit-log" onClick={() => setProfileOpen(false)}><ScrollText size={18} /><span><strong>Audit Log</strong><small>Riwayat siapa mengubah apa</small></span></Link>}
                <Link href="/dashboard" onClick={() => setProfileOpen(false)}><KeyRound size={18} /><span><strong>Ubah Password</strong><small>Perbarui keamanan akun</small></span></Link>
                <div className={styles.profileDivider} />
                <button type="button" className={styles.logoutDropdown} onClick={() => { clearSession(); router.replace('/'); }}><span><strong>Keluar</strong><small>Kembali ke halaman login</small></span></button>
              </div>
            )}
          </div>
        </header>

        <div className={styles.pageContent}>{children}</div>
      </section>
    </div>
    <WebPushPrompt />
    </>
  );
}


