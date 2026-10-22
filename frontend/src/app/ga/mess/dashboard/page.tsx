'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '@/lib/access-control';
import { messApi } from '@/lib/mess-monitoring-api';
import styles from '../mess.module.css';

type DashboardData = {
  totalRooms: number;
  done: number;
  pending: number;
  totalOccupants: number;
  shifts: { PAGI: number; MALAM: number; CUTI: number };
};

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (getStoredUser()?.role === 'HOUSE_MAN') {
      router.replace('/ga/mess/operasional');
      return;
    }
    messApi.dashboard().then(setData).catch((caught) => setError(caught.message));
  }, [router]);

  if (error) return <div className={styles.error}>{error}</div>;
  if (!data) return <p>Memuat dashboard...</p>;

  const maximum = Math.max(1, data.totalOccupants);
  const summary = [
    ['Total Kamar', data.totalRooms],
    ['Sudah Dibersihkan', data.done],
    ['Belum Dibersihkan', data.pending],
    ['Total Penghuni', data.totalOccupants],
  ] as const;
  const shifts = [
    ['Shift Pagi', data.shifts.PAGI, '#2563eb'],
    ['Shift Malam', data.shifts.MALAM, '#d6b98c'],
    ['Cuti', data.shifts.CUTI, '#eab308'],
  ] as const;

  return <>
    <header className={styles.heading}>
      <div><span>GENERAL AFFAIRS</span><h1>Dashboard Monitoring Mess</h1><p>Ringkasan hunian, shift, dan kebersihan kamar hari ini.</p></div>
    </header>
    <section className={styles.cards}>
      {summary.map(([label, value]) => <article key={label}><small>{label}</small><strong>{value}</strong></article>)}
    </section>
    <section className={styles.panel}>
      <h2>Komposisi Shift Penghuni</h2>
      {shifts.map(([name, value, color]) => <div className={styles.chartRow} key={name}><span>{name}</span><div><i style={{ width: `${value / maximum * 100}%`, background: color }} /></div><b>{value}</b></div>)}
    </section>
  </>;
}
