'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  ChevronLeft,
  Fuel,
  Home,
  Menu,
  PanelLeftClose,
  Truck,
  UsersRound,
  X,
} from 'lucide-react';
import { ReactNode, useEffect, useState } from 'react';
import {
  ACCESS_KEYS,
  clearSession,
  formatRole,
  getAccessToken,
  getStoredUser,
  hasAccess,
  type PortalUser,
} from '@/lib/access-control';
import styles from './transport-layout.module.css';

const menus = [
  {
    label: 'Dashboard Transportasi',
    href: '/ga/transport/dashboard',
    icon: BarChart3,
  },
  { label: 'Transportasi', href: '/ga/transport/data', icon: Fuel },
];

export default function TransportLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => setMobileOpen(false), [pathname]);

  useEffect(() => {
    const token = getAccessToken();
    const storedUser = getStoredUser();

    if (!token || !storedUser) {
      clearSession();
      router.replace('/login');
      return;
    }

    if (!hasAccess(storedUser, ACCESS_KEYS.GA_TRANSPORT)) {
      router.replace('/ga');
      return;
    }

    setUser(storedUser);
  }, [router]);

  return (
    <div className={styles.shell}>
      <aside
        className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''} ${
          mobileOpen ? styles.mobileOpen : ''
        }`}
      >
        <div className={styles.brand}>
          <span>
            <UsersRound size={24} />
          </span>
          {!collapsed && <strong>HCGA TEAM</strong>}
          <button
            className={styles.closeMobile}
            onClick={() => setMobileOpen(false)}
          >
            <X />
          </button>
        </div>
        <nav>
          <Link href="/dashboard" className={styles.simple}>
            <Home size={20} />
            {!collapsed && <span>Dashboard</span>}
          </Link>
          <Link href="/ga" className={styles.simple}>
            <ChevronLeft size={20} />
            {!collapsed && <span>Pilihan GA</span>}
          </Link>
          {!collapsed && <p className={styles.caption}>MENU TRANSPORT</p>}
          {menus.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`${styles.menu} ${
                pathname === href ? styles.active : ''
              }`}
            >
              <Icon size={20} />
              {!collapsed && <span>{label}</span>}
            </Link>
          ))}
        </nav>
        <button
          className={styles.collapse}
          onClick={() => setCollapsed((value) => !value)}
        >
          <PanelLeftClose size={19} />
          {!collapsed && <span>Perkecil Sidebar</span>}
        </button>
      </aside>
      {mobileOpen && (
        <button
          className={styles.backdrop}
          onClick={() => setMobileOpen(false)}
          aria-label="Tutup sidebar"
        />
      )}
      <div className={styles.contentWrap}>
        <header className={styles.topbar}>
          <button
            className={styles.mobileMenu}
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </button>
          <div>
            <small>GA</small>
            <strong>Transport</strong>
          </div>
          <div className={styles.user}>
            <span>
              <UsersRound size={20} />
            </span>
            <div>
              <strong>{user?.name ?? 'Pengguna'}</strong>
              <small>{formatRole(user?.role)}</small>
            </div>
          </div>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}
