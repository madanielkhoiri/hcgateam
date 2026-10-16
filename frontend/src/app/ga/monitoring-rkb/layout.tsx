'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import { ACCESS_KEYS, getAccessToken, getStoredUser, hasAccess } from '@/lib/access-control';
import { ModuleShell } from '@/components/module-shell/module-shell';

export default function MonitoringRkbLayout({ children }: { children: ReactNode }) {
  const router = useRouter(); const [siap, setSiap] = useState(false);
  useEffect(() => { const token = getAccessToken(); const user = getStoredUser(); if (!token || !user) { router.replace('/login'); return; } if (!hasAccess(user, ACCESS_KEYS.GA_MONITORING_RKB)) { router.replace('/ga'); return; } setSiap(true); }, [router]);
  if (!siap) return <main style={{ padding: 32 }}>Memuat Monitoring RKB...</main>;
  return <ModuleShell title="Monitoring RKB" subtitle="General Affairs" deptBadge={{ text: 'GA', color: '#0868f6', soft: '#eaf2ff' }} menuItems={[{ label: 'Dashboard', href: '/ga/monitoring-rkb/dashboard', initial: 'DB' }, { label: 'Daftar RKB', href: '/ga/monitoring-rkb', initial: 'RKB' }]} backHref="/ga" backLabel="Kembali ke GA">{children}</ModuleShell>;
}
