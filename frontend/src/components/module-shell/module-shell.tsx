'use client';

// ==================================================
// FILE: frontend/src/components/module-shell/module-shell.tsx
// FUNGSI: Sidebar navigasi generik dipakai SEMUA modul yang tadinya
// tanpa peta menu tetap (MCU, IR, Karyawan, Tugas Dinas, dst). Struktur
// & ukuran di-copy dari pola sidebar yang sudah ada (ga/inventory,
// civil/project) supaya konsisten - JANGAN diubah per modul, cukup
// beda menuItems/warna departemen lewat props.
//
// PENTING: ini cuma shell TAMPILAN. Auth-check/role-context per modul
// (kalau ada, mis. McuContext di hc/mcu/layout.tsx) tetap dikelola di
// layout.tsx masing-masing modul - ModuleShell cuma bungkus visualnya.
// ==================================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
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
  children: ReactNode;
};

export function ModuleShell({
  title,
  subtitle,
  deptBadge,
  menuItems,
  backHref,
  backLabel = 'Kembali',
  children,
}: ModuleShellProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

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

          {menuItems.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname?.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
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
          })}
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

      <div className={styles.contentArea}>{children}</div>
    </div>
  );
}
