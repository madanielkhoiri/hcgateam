'use client';

// ==================================================
// FILE: frontend/src/components/module-shell/mobile-bottom-nav.tsx
// FUNGSI: Bottom nav mobile generik - versi lepas dari ModuleShell,
// dipakai modul lama yang sudah punya sidebar+drawer sendiri (GA
// Inventory, GA Transport, Civil Project, Civil TPS-3R) supaya
// tampilan navigasi bawahnya seragam dengan modul lain (badge inisial
// 2-huruf, warna departemen) tanpa perlu bongkar sidebar yang sudah
// jalan. Sengaja TIDAK menangani buka/tutup drawer - itu tetap punya
// masing-masing modul lewat tombol hamburger yang sudah ada.
// ==================================================

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './module-shell.module.css';

export type MobileBottomNavItem = {
  label: string;
  href: string;
  initial: string;
  exact?: boolean;
};

type MobileBottomNavProps = {
  items: MobileBottomNavItem[];
  deptColor: string;
  deptSoft: string;
  max?: number;
};

export function MobileBottomNav({ items, deptColor, deptSoft, max = 5 }: MobileBottomNavProps) {
  const pathname = usePathname();
  const visible = items.slice(0, max);

  if (visible.length === 0) {
    return null;
  }

  return (
    <nav className={styles.mobileBottomNav}>
      {visible.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname?.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={styles.mobileBottomNavItem}
            style={active ? { background: deptSoft } : undefined}
          >
            <span
              className={styles.mobileBottomNavBadge}
              style={active ? { background: deptColor, color: '#ffffff' } : undefined}
            >
              {item.initial}
            </span>
            <span
              className={styles.mobileBottomNavLabel}
              style={active ? { color: deptColor } : undefined}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
