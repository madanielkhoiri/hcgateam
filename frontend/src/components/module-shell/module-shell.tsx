'use client';

// ==================================================
// FILE: frontend/src/components/module-shell/module-shell.tsx
// FUNGSI: Sidebar navigasi generik dipakai SEMUA modul yang tadinya
// tanpa peta menu tetap (MCU, IR, Karyawan, Tugas Dinas, dst). Struktur
// & ukuran di-copy dari pola sidebar yang sudah ada (ga/inventory,
// civil/project) supaya konsisten - JANGAN diubah per modul, cukup
// beda menuItems/warna departemen lewat props.
//
// Di layar mobile (<768px) sidebar kolom disembunyikan dan diganti top
// bar (judul modul) + bottom nav (4 menu utama, tampil terus di bawah
// layar) + drawer (menu lengkap, dibuka lewat tombol "Lainnya" kalau
// menu-nya lebih dari 4). Modul yang sudah punya navigasi mobile
// sendiri (mis. Deklarasi Dinas dengan bottom-nav) bisa set
// hideMobileNav supaya tidak dobel.
//
// PENTING: ini cuma shell TAMPILAN. Auth-check/role-context per modul
// (kalau ada, mis. McuContext di hc/mcu/layout.tsx) tetap dikelola di
// layout.tsx masing-masing modul - ModuleShell cuma bungkus visualnya.
// ==================================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import styles from './module-shell.module.css';

export type ModuleShellMenuItem = {
  label: string;
  href: string;
  initial: string;
  /** Pakai kalau href item ini adalah prefix dari href item lain di menu
   * yang sama (mis. "Beranda" di /modul dan sub-halaman lain juga di
   * /modul/*) - tanpa ini, item tsb akan ikut aktif di semua sub-halaman. */
  exact?: boolean;
};

export type ModuleShellDeptBadge = {
  text: string;
  color: string;
  soft: string;
};

type ModuleShellProps = {
  title: string;
  subtitle?: string;
  deptBadge: ModuleShellDeptBadge;
  menuItems: ModuleShellMenuItem[];
  backHref: string;
  backLabel?: string;
  /** Set true kalau modul ini sudah punya navigasi mobile sendiri (mis.
   * bottom-nav Deklarasi Dinas) supaya top bar + drawer bawaan tidak
   * ikut dirender dan menumpuk dengan punya modul. */
  hideMobileNav?: boolean;
  children: ReactNode;
};

export function ModuleShell({
  title,
  subtitle,
  deptBadge,
  menuItems,
  backHref,
  backLabel = 'Kembali',
  hideMobileNav = false,
  children,
}: ModuleShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  function isActive(item: ModuleShellMenuItem) {
    return item.exact
      ? pathname === item.href
      : pathname === item.href || pathname?.startsWith(`${item.href}/`);
  }

  const BOTTOM_NAV_MAX = 4;
  const bottomNavItems = menuItems.slice(0, BOTTOM_NAV_MAX);
  const overflowItems = menuItems.slice(BOTTOM_NAV_MAX);
  const overflowActive = overflowItems.some(isActive);

  function renderNavItems(onNavigate?: () => void) {
    return menuItems.map((item) => {
      const active = isActive(item);

      return (
        <Link
          key={item.href}
          href={item.href}
          onClick={onNavigate}
          className={styles.navItem}
          style={
            active
              ? { background: deptBadge.soft, color: deptBadge.color }
              : undefined
          }
          title={collapsed ? item.label : undefined}
        >
          <span
            className={styles.navBadge}
            style={
              active
                ? { background: deptBadge.color, color: '#ffffff' }
                : undefined
            }
          >
            {item.initial}
          </span>
          {!collapsed && <span>{item.label}</span>}
        </Link>
      );
    });
  }

  return (
    <div className={`${styles.shell} ${collapsed ? styles.shellCollapsed : ''}`}>
      <aside className={`${styles.sidebar} ${collapsed ? styles.sidebarCollapsed : ''}`}>
        <div className={styles.sidebarHeader}>
          <div
            className={styles.brandLogo}
            style={{ background: deptBadge.color }}
          >
            {deptBadge.text}
          </div>
          {!collapsed && (
            <div className={styles.brandText}>
              <strong>{title}</strong>
              {subtitle && <span>{subtitle}</span>}
            </div>
          )}
        </div>

        <nav className={styles.navigation}>
          {!collapsed && <span className={styles.navigationLabel}>Menu</span>}
          {renderNavItems()}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link href={backHref} className={styles.backLink} title={collapsed ? backLabel : undefined}>
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
            {!collapsed && <span>{backLabel}</span>}
          </Link>

          <button
            type="button"
            className={styles.collapseButton}
            onClick={() => setCollapsed((current) => !current)}
            aria-label={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
          >
            <svg
              viewBox="0 0 24 24"
              width="14"
              height="14"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ transform: collapsed ? 'rotate(180deg)' : undefined }}
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
            {!collapsed && <span>Ciutkan</span>}
          </button>
        </div>
      </aside>

      {!hideMobileNav && (
        <div className={styles.mobileTopBar}>
          <div className={styles.mobileBrandLogo} style={{ background: deptBadge.color }}>
            {deptBadge.text}
          </div>

          <div className={styles.mobileBrandText}>
            <strong>{title}</strong>
            {subtitle && <span>{subtitle}</span>}
          </div>
        </div>
      )}

      {!hideMobileNav && (
        <nav className={styles.mobileBottomNav}>
          {bottomNavItems.map((item) => {
            const active = isActive(item);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={styles.mobileBottomNavItem}
                style={active ? { background: deptBadge.soft } : undefined}
              >
                <span
                  className={styles.mobileBottomNavBadge}
                  style={
                    active
                      ? { background: deptBadge.color, color: '#ffffff' }
                      : undefined
                  }
                >
                  {item.initial}
                </span>
                <span
                  className={styles.mobileBottomNavLabel}
                  style={active ? { color: deptBadge.color } : undefined}
                >
                  {item.label}
                </span>
              </Link>
            );
          })}

          {overflowItems.length > 0 && (
            <button
              type="button"
              className={styles.mobileBottomNavItem}
              style={overflowActive ? { background: deptBadge.soft } : undefined}
              onClick={() => setDrawerOpen(true)}
            >
              <span
                className={styles.mobileBottomNavBadge}
                style={
                  overflowActive
                    ? { background: deptBadge.color, color: '#ffffff' }
                    : undefined
                }
              >
                <svg width="14" height="14" viewBox="0 0 24 24">
                  <circle cx="5" cy="12" r="2" fill="currentColor" />
                  <circle cx="12" cy="12" r="2" fill="currentColor" />
                  <circle cx="19" cy="12" r="2" fill="currentColor" />
                </svg>
              </span>
              <span
                className={styles.mobileBottomNavLabel}
                style={overflowActive ? { color: deptBadge.color } : undefined}
              >
                Lainnya
              </span>
            </button>
          )}
        </nav>
      )}

      {!hideMobileNav && drawerOpen && (
        <>
          <button
            type="button"
            className={styles.drawerScrim}
            aria-label="Tutup menu"
            onClick={() => setDrawerOpen(false)}
          />

          <aside className={styles.drawerPanel}>
            <div className={styles.sidebarHeader}>
              <div className={styles.brandLogo} style={{ background: deptBadge.color }}>
                {deptBadge.text}
              </div>
              <div className={styles.brandText} style={{ flex: 1 }}>
                <strong>{title}</strong>
                {subtitle && <span>{subtitle}</span>}
              </div>
              <button
                type="button"
                className={styles.drawerCloseButton}
                onClick={() => setDrawerOpen(false)}
                aria-label="Tutup menu"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#63758d" strokeWidth={2.6} strokeLinecap="round">
                  <line x1="5" y1="5" x2="19" y2="19" />
                  <line x1="19" y1="5" x2="5" y2="19" />
                </svg>
              </button>
            </div>

            <nav className={styles.navigation}>
              <span className={styles.navigationLabel}>Menu</span>
              {renderNavItems(() => setDrawerOpen(false))}
            </nav>

            <div className={styles.sidebarFooter}>
              <Link href={backHref} className={styles.backLink} onClick={() => setDrawerOpen(false)}>
                <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={2.3} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
                <span>{backLabel}</span>
              </Link>
            </div>
          </aside>
        </>
      )}

      <div className={styles.contentArea}>{children}</div>
    </div>
  );
}
