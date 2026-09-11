'use client';

// ==================================================
// FILE: frontend/src/app/ga/housekeeping-indoor/dashboard/page.tsx
// FUNGSI: Dashboard modul Housekeeping Indoor - halaman pertama begitu
// masuk sidebar modul. Statistik + grafik pakai komponen reusable
// (StatCardRow, AnimatedLineChart, SimplePieChart).
// ==================================================

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StatCardRow, type StatCard } from '@/components/module-shell/stat-card-row';
import AnimatedLineChart from '@/components/dashboard-charts/animated-line-chart';
import SimplePieChart from '@/components/dashboard-charts/simple-pie-chart';
import {
  HousekeepingIndoorApiError,
  LABEL_LOKASI_HOUSEKEEPING_INDOOR,
  LokasiHousekeepingIndoor,
  RingkasanHousekeepingIndoor,
  TrenDashboardHousekeepingIndoor,
  housekeepingIndoorApi,
} from '@/lib/housekeeping-indoor-api';
import styles from '../housekeeping-indoor.module.css';

const NAMA_BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const WARNA_LOKASI: Record<LokasiHousekeepingIndoor, string> = {
  OFFICE: '#0d9488',
  PLANT: '#0891b2',
  CSA_GIBSON: '#f17c16',
  VIEW_POINT: '#6748df',
  CSA_MONTE_BARU: '#079669',
  CSA_MONTE_BARU_SUPPORT: '#b02031',
};

export default function DashboardHousekeepingIndoorPage() {
  const [ringkasan, setRingkasan] = useState<RingkasanHousekeepingIndoor | null>(null);
  const [tren, setTren] = useState<TrenDashboardHousekeepingIndoor | null>(null);
  const [error, setError] = useState('');
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let aktif = true;

    Promise.all([housekeepingIndoorApi.ringkasan(), housekeepingIndoorApi.trenDanLokasi()])
      .then(([dataRingkasan, dataTren]) => {
        if (aktif) {
          setRingkasan(dataRingkasan);
          setTren(dataTren);
        }
      })
      .catch((err) => {
        if (aktif) {
          setError(err instanceof HousekeepingIndoorApiError ? err.message : 'Dashboard gagal dimuat');
        }
      })
      .finally(() => {
        if (aktif) setMemuat(false);
      });

    return () => {
      aktif = false;
    };
  }, []);

  const statCards: StatCard[] = ringkasan
    ? [
        {
          label: 'Laporan Bulan Ini',
          value: ringkasan.totalLaporanBulanIni,
          initial: 'LB',
          iconBg: '#e8f8f6',
          iconColor: '#0d7d75',
        },
        {
          label: 'Foto Terkumpul Bulan Ini',
          value: ringkasan.totalFotoBulanIni,
          initial: 'FT',
          iconBg: '#eaf2ff',
          iconColor: '#0868f6',
        },
        {
          label: 'Lokasi Dilaporkan Hari Ini',
          value: `${ringkasan.lokasiDilaporkanHariIni} / ${ringkasan.totalLokasi}`,
          trend:
            ringkasan.lokasiDilaporkanHariIni < ringkasan.totalLokasi
              ? 'Masih ada lokasi belum dilaporkan'
              : 'Seluruh lokasi sudah dilaporkan',
          trendColor:
            ringkasan.lokasiDilaporkanHariIni < ringkasan.totalLokasi ? '#946200' : '#079669',
          initial: 'LH',
          iconBg: '#fff4d2',
          iconColor: '#946200',
        },
        {
          label: 'Total Laporan Keseluruhan',
          value: ringkasan.totalLaporanKeseluruhan,
          initial: 'TL',
          iconBg: '#f1f5f9',
          iconColor: '#385675',
        },
      ]
    : [];

  const dataTrenChart =
    tren?.trenBulanan.map((item) => ({
      label: NAMA_BULAN[item.bulan - 1],
      value: item.total,
    })) ?? [];

  const dataLokasi =
    tren?.breakdownLokasi.map((item) => ({
      label: LABEL_LOKASI_HOUSEKEEPING_INDOOR[item.lokasi],
      value: item.total,
      color: WARNA_LOKASI[item.lokasi],
    })) ?? [];

  return (
    <>
      <div className={styles.breadcrumb}>
        <Link href="/ga">GA</Link>
        <span>/</span>
        <strong>Housekeeping Indoor</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <Sparkles size={28} />
          </span>

          <div>
            <h1>Dashboard Housekeeping Indoor</h1>
            <p>
              Ringkasan laporan kebersihan per lokasi — jumlah laporan &amp; foto bulan
              berjalan, serta tren dan sebaran lokasi sepanjang tahun.
            </p>
          </div>
        </div>
      </div>

      {error && <p className={styles.pageError}>{error}</p>}

      {memuat ? (
        <p style={{ color: '#6d83a0', fontSize: 13 }}>Memuat dashboard...</p>
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
              title="Tren Laporan Kebersihan per Bulan"
              subtitle={`Jumlah laporan masuk, tahun ${tren?.tahun ?? ''}`}
              data={dataTrenChart}
              accent="green"
            />
            <SimplePieChart
              title="Sebaran Laporan per Lokasi"
              subtitle={`Tahun ${tren?.tahun ?? ''}`}
              data={dataLokasi}
              satuan="laporan"
            />
          </div>
        </>
      )}
    </>
  );
}
