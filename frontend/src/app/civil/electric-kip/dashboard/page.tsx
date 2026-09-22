'use client';

// ==================================================
// FILE: frontend/src/app/civil/electric-kip/dashboard/page.tsx
// FUNGSI: Dashboard modul Electric-KIP - halaman pertama begitu masuk
// sidebar Electric-KIP. Statistik + grafik pakai komponen reusable
// (StatCardRow, AnimatedLineChart, SimplePieChart).
// ==================================================

import Link from 'next/link';
import { QrCode } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StatCardRow, type StatCard } from '@/components/module-shell/stat-card-row';
import AnimatedLineChart from '@/components/dashboard-charts/animated-line-chart';
import SimplePieChart from '@/components/dashboard-charts/simple-pie-chart';
import { kipApi, KipApiError, type RingkasanKip, type TrenDashboardKip } from '@/lib/kip-api';
import styles from '../electric-kip.module.css';

const NAMA_BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export default function DashboardElectricKipPage() {
  const [ringkasan, setRingkasan] = useState<RingkasanKip | null>(null);
  const [tren, setTren] = useState<TrenDashboardKip | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let aktif = true;

    Promise.all([kipApi.ringkasanDashboard(), kipApi.trenDashboard()])
      .then(([dataRingkasan, dataTren]) => {
        if (aktif) {
          setRingkasan(dataRingkasan);
          setTren(dataTren);
        }
      })
      .catch((error: unknown) => {
        if (aktif) {
          setGalat(error instanceof KipApiError ? error.message : 'Dashboard KIP gagal dimuat');
        }
      })
      .finally(() => {
        if (aktif) {
          setMemuat(false);
        }
      });

    return () => {
      aktif = false;
    };
  }, []);

  const statCards: StatCard[] = ringkasan
    ? [
        {
          label: 'Total KIP Terdaftar',
          value: ringkasan.totalKip,
          initial: 'KP',
          iconBg: '#fff2df',
          iconColor: '#d97706',
        },
        {
          label: 'Lokasi Terpakai',
          value: ringkasan.lokasiTerpakai,
          initial: 'LK',
          iconBg: '#eaf2ff',
          iconColor: '#0868f6',
        },
        {
          label: 'Checklist Bulan Ini Selesai',
          value: ringkasan.checklistSudahBulanIni,
          initial: 'OK',
          iconBg: '#e4f7ec',
          iconColor: '#07984c',
        },
        {
          label: 'Checklist Terlewat',
          value: ringkasan.checklistTerlewat,
          trend: ringkasan.checklistTerlewat > 0 ? 'Perlu segera diceklis' : undefined,
          trendColor: '#b02031',
          initial: 'TL',
          iconBg: '#fff0f3',
          iconColor: '#b02031',
        },
      ]
    : [];

  const dataTrenChart =
    tren?.trenBulanan.map((item) => ({
      label: NAMA_BULAN[item.bulan - 1],
      value: item.total,
    })) ?? [];

  const dataStatus = tren
    ? [
        { label: 'Sudah Diceklis', value: tren.statusChecklist.sudah, color: '#07984c' },
        { label: 'Belum Diceklis', value: tren.statusChecklist.belum, color: '#e0752a' },
      ]
    : [];

  return (
    <>
      <div className={styles.breadcrumb}>
        <Link href="/civil">CIVIL</Link>
        <span>/</span>
        <strong>Electric-KIP</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <QrCode size={28} />
          </span>

          <div>
            <h1>Dashboard Electric-KIP</h1>
            <p>
              Ringkasan Kartu Inspeksi Peralatan (KIP) - jumlah kartu terdaftar,
              lokasi terpakai, dan progres checklist bulanan Tim Elektrik.
            </p>
          </div>
        </div>
      </div>

      {galat ? <p className={styles.error}>{galat}</p> : null}

      {memuat ? (
        <p className={styles.memuat}>Memuat dashboard Electric-KIP...</p>
      ) : (
        <>
          <StatCardRow cards={statCards} />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)',
              gap: 16,
              margin: '20px 0',
              alignItems: 'start',
            }}
          >
            <AnimatedLineChart
              title="Tren Checklist Selesai per Bulan"
              subtitle={`Jumlah checklist bulanan berstatus SUDAH, tahun ${tren?.tahun ?? ''}`}
              data={dataTrenChart}
              accent="orange"
            />
            <SimplePieChart
              title="Status Checklist Tahun Berjalan"
              subtitle={`Tahun ${tren?.tahun ?? ''}`}
              data={dataStatus}
              satuan="checklist"
            />
          </div>
        </>
      )}
    </>
  );
}
