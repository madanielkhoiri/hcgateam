'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, LayoutDashboard, ListChecks, Menu, X } from 'lucide-react';
import { type ReactNode, useEffect, useState } from 'react';
import { ACCESS_KEYS, clearSession, getAccessToken, getStoredUser, hasAccess, type PortalUser } from '@/lib/access-control';
import { ProfileMenu } from '@/components/profile-menu/profile-menu';
import styles from '../project/project-layout.module.css';

const nav = [
  { label: 'Dashboard', href: '/civil/monitoring-project-infrastruktur-tambang/dashboard', icon: LayoutDashboard },
  { label: 'Input Monitoring', href: '/civil/monitoring-project-infrastruktur-tambang', icon: ListChecks },
];

export default function MonitoringProjectTambangLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const stored = getStoredUser();
    if (!getAccessToken() || !stored) { clearSession(); router.replace('/login'); return; }
    if (!hasAccess(stored, ACCESS_KEYS.CIVIL_MONITORING_PROJECT_TAMBANG)) { router.replace('/civil'); return; }
    setUser(stored);
  }, [router]);

  useEffect(() => setSidebarOpen(false), [pathname]);
  if (!user) return <main className={styles.loading}>Memuat Monitoring Project...</main>;

  return <div className={styles.shell}>
    <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
      <div className={styles.sidebarHeader}>
        <Link href="/civil/monitoring-project-infrastruktur-tambang/dashboard" className={styles.brand}>
          <span className={styles.brandLogo}><ListChecks size={22} /></span>
          <span className={styles.brandText}>Monitoring Project</span>
        </Link>
        <button className={styles.mobileClose} onClick={() => setSidebarOpen(false)} aria-label="Tutup sidebar"><X size={20} /></button>
      </div>
      <nav className={styles.navigation}>
        <Link href="/civil" className={styles.backLink}><ArrowLeft size={18} /><span>Pilihan Civil</span></Link>
        <div className={styles.navLabel}>INFRASTRUKTUR TAMBANG</div>
        {nav.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return <Link key={item.href} href={item.href} className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}><Icon size={18} /><span>{item.label}</span></Link>;
        })}
      </nav>
    </aside>
    {sidebarOpen && <button className={styles.mobileOverlay} onClick={() => setSidebarOpen(false)} aria-label="Tutup sidebar" />}
    <section className={styles.contentArea}>
      <header className={styles.topHeader}>
        <div className={styles.topHeaderLeft}>
          <button className={styles.mobileMenuButton} onClick={() => setSidebarOpen(true)} aria-label="Buka menu"><Menu size={22} /></button>
          <div><span>Selamat datang, {user.name}</span><strong>Monitoring Project Infrastruktur Tambang</strong></div>
        </div>
        <div className={styles.topHeaderRight}><ProfileMenu user={user} /></div>
      </header>
      <div className={styles.pageContent}>{children}</div>
    </section>
  </div>;
}
