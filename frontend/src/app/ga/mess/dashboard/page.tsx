'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredUser } from '@/lib/access-control';
import { messApi, type MessTrend } from '@/lib/mess-monitoring-api';
import MultiLineChart from '@/components/dashboard-charts/multi-line-chart';
import SimplePieChart from '@/components/dashboard-charts/simple-pie-chart';
import styles from '../mess.module.css';
import ds from './dashboard.module.css';

type DashboardData = {
  totalRooms: number;
  done: number;
  skipped?: number;
  pending: number;
  totalOccupants: number;
  shifts: { PAGI: number; MALAM: number; CUTI: number };
};

type Periode = '7' | '14' | '30' | 'BULAN';
const PERIODE: Array<[Periode, string]> = [['7', '7 hari'], ['14', '14 hari'], ['30', '30 hari'], ['BULAN', 'Bulan ini']];

function dayWita(offsetDays = 0) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(Date.now() + offsetDays * 86_400_000));
}
function rentang(periode: Periode): [string, string] {
  const to = dayWita();
  if (periode === 'BULAN') return [`${to.slice(0, 8)}01`, to];
  return [dayWita(-(Number(periode) - 1)), to];
}
const labelTanggal = (key: string) => new Date(`${key}T00:00:00+08:00`).toLocaleDateString('id-ID', { timeZone: 'Asia/Makassar', day: '2-digit', month: 'short' });
function formatDuration(seconds?: number | null) {
  if (seconds === null || seconds === undefined) return '-';
  const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = Math.floor(seconds % 60);
  return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState('');
  const [periode, setPeriode] = useState<Periode>('7');
  const [trend, setTrend] = useState<MessTrend | null>(null);
  const [trendError, setTrendError] = useState('');
  const [trendLoading, setTrendLoading] = useState(false);

  const loadTrend = useCallback(async (p: Periode) => {
    setTrendLoading(true); setTrendError('');
    try { const [from, to] = rentang(p); setTrend(await messApi.trend(from, to)); }
    catch (caught) { setTrendError(caught instanceof Error ? caught.message : 'Gagal memuat grafik'); }
    finally { setTrendLoading(false); }
  }, []);

  useEffect(() => {
    if (getStoredUser()?.role === 'HOUSE_MAN') {
      router.replace('/ga/mess/operasional');
      return;
    }
    messApi.dashboard().then(setData).catch((caught) => setError(caught.message));
    void loadTrend('7');
  }, [router, loadTrend]);

  const ringkas = useMemo(() => {
    const daily = trend?.daily ?? [];
    const sum = (key: 'sudah' | 'tidak' | 'belum' | 'proses') => daily.reduce((total, d) => total + d[key], 0);
    const berdurasi = daily.filter((d) => d.rataRataDetik != null && d.sudah > 0);
    const totalDetik = berdurasi.reduce((total, d) => total + (d.rataRataDetik ?? 0) * d.sudah, 0);
    const kamarBerdurasi = berdurasi.reduce((total, d) => total + d.sudah, 0);
    const sudah = sum('sudah'); const tidak = sum('tidak'); const belum = sum('belum') + sum('proses');
    const semua = sudah + tidak + belum;
    return { sudah, tidak, belum, rata: kamarBerdurasi ? Math.round(totalDetik / kamarBerdurasi) : null, persen: semua ? Math.round(sudah / semua * 100) : 0 };
  }, [trend]);

  if (error) return <div className={styles.error}>{error}</div>;
  if (!data) return <p>Memuat dashboard...</p>;

  const maximum = Math.max(1, data.totalOccupants);
  const summary = [
    ['Total Kamar', data.totalRooms],
    ['Sudah Dibersihkan', data.done],
    ['Tidak Dibersihkan', data.skipped ?? 0],
    ['Belum Dibersihkan', data.pending],
    ['Total Penghuni', data.totalOccupants],
  ] as const;
  const shifts = [
    ['Shift Pagi', data.shifts.PAGI, '#2563eb'],
    ['Shift Malam', data.shifts.MALAM, '#d6b98c'],
    ['Cuti', data.shifts.CUTI, '#eab308'],
  ] as const;
  const daily = trend?.daily ?? [];

  return <>
    <header className={styles.heading}>
      <div><span>GENERAL AFFAIRS</span><h1>Dashboard Monitoring Mess</h1><p>Ringkasan hunian, shift, dan kebersihan kamar.</p></div>
    </header>

    <h2 className={ds.sectionTitle}>Hari Ini</h2>
    <section className={styles.cards}>
      {summary.map(([label, value]) => <article key={label}><small>{label}</small><strong>{value}</strong></article>)}
    </section>

    <div className={ds.sectionHead}>
      <div><h2 className={ds.sectionTitle}>Rekap Kebersihan</h2><p>{trend ? `${labelTanggal(trend.from)} – ${labelTanggal(trend.to)} (${trend.days} hari) · status akhir kamar per hari` : 'Memuat...'}</p></div>
      <div className={ds.periode}>
        {PERIODE.map(([value, label]) => <button key={value} className={periode === value ? ds.periodeOn : ''} disabled={trendLoading} onClick={() => { setPeriode(value); void loadTrend(value); }}>{label}</button>)}
      </div>
    </div>
    {trendError && <div className={styles.error}>{trendError}</div>}

    <section className={ds.periodCards}>
      <article className={ds.cardSudah}><small>Dibersihkan</small><strong>{ringkas.sudah}</strong><span>{ringkas.persen}% dari total kamar-hari</span></article>
      <article className={ds.cardTidak}><small>Tidak Dibersihkan</small><strong>{ringkas.tidak}</strong><span>dengan alasan</span></article>
      <article className={ds.cardBelum}><small>Belum Dibersihkan</small><strong>{ringkas.belum}</strong><span>tidak ada catatan</span></article>
      <article className={ds.cardDurasi}><small>Rata-rata Durasi</small><strong>{formatDuration(ringkas.rata)}</strong><span>per kamar dibersihkan</span></article>
    </section>

    <div className={ds.chartGrid}>
      <MultiLineChart
        title="Tren Kebersihan Harian"
        subtitle="Jumlah kamar per status setiap hari"
        satuan="kamar"
        labels={daily.map((d) => labelTanggal(d.day))}
        series={[
          { label: 'Dibersihkan', color: '#16a34a', values: daily.map((d) => d.sudah) },
          { label: 'Tidak Dibersihkan', color: '#f59e0b', values: daily.map((d) => d.tidak) },
          { label: 'Belum Dibersihkan', color: '#dc2626', values: daily.map((d) => d.belum + d.proses) },
        ]}
      />
      <SimplePieChart
        key={`${trend?.from}-${trend?.to}`}
        title="Komposisi Status"
        subtitle="Total kamar-hari pada periode"
        satuan="kamar"
        data={[
          { label: 'Dibersihkan', value: ringkas.sudah, color: '#16a34a' },
          { label: 'Tidak Dibersihkan', value: ringkas.tidak, color: '#f59e0b' },
          { label: 'Belum Dibersihkan', value: ringkas.belum, color: '#dc2626' },
        ]}
      />
    </div>

    <section className={styles.panel}>
      <h2>Komposisi Shift Penghuni</h2>
      {shifts.map(([name, value, color]) => <div className={styles.chartRow} key={name}><span>{name}</span><div><i style={{ width: `${value / maximum * 100}%`, background: color }} /></div><b>{value}</b></div>)}
    </section>
  </>;
}
