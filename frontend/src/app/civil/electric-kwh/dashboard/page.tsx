'use client';

// ==================================================
// FILE: frontend/src/app/civil/electric-kwh/dashboard/page.tsx
// FUNGSI: Dashboard Perhitungan KWH - pemakaian bulan berjalan (stand bulan
// ini dikurangi stand bulan lalu), perbandingan bulan lalu, tren tahunan,
// dan porsi pemakaian per meter.
// ==================================================

import Link from 'next/link';
import { Gauge } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StatCardRow, type StatCard } from '@/components/module-shell/stat-card-row';
import AnimatedLineChart from '@/components/dashboard-charts/animated-line-chart';
import SimplePieChart from '@/components/dashboard-charts/simple-pie-chart';
import { kwhApi, KwhApiError, type RingkasanKwh, type TrenKwh } from '@/lib/kwh-api';
import styles from '../electric-kwh.module.css';

const NAMA_BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const NAMA_BULAN_PANJANG = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];
const WARNA_PIE = ['#d97706', '#0868f6', '#07984c', '#7a4ce0', '#e0752a', '#0783a8', '#b02031', '#64748b'];

const format = (n: number) => n.toLocaleString('id-ID', { maximumFractionDigits: 2 });

export default function DashboardKwhPage() {
  const [ringkasan, setRingkasan] = useState<RingkasanKwh | null>(null);
  const [tren, setTren] = useState<TrenKwh | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let aktif = true;

    Promise.all([kwhApi.ringkasan(), kwhApi.tren()])
      .then(([dataRingkasan, dataTren]) => {
        if (aktif) {
          setRingkasan(dataRingkasan);
          setTren(dataTren);
        }
      })
      .catch((error: unknown) => {
        if (aktif) setGalat(error instanceof KwhApiError ? error.message : 'Dashboard KWH gagal dimuat');
      })
      .finally(() => {
        if (aktif) setMemuat(false);
      });

    return () => {
      aktif = false;
    };
  }, []);

  const namaBulanIni = ringkasan ? NAMA_BULAN_PANJANG[ringkasan.bulan - 1] : '';

  const statCards: StatCard[] = ringkasan
    ? [
        {
          label: `Pemakaian ${namaBulanIni} (kWh)`,
          value: format(ringkasan.pemakaianBulanIni),
          trend:
            ringkasan.selisihPersen === null
              ? undefined
              : `${ringkasan.selisihPersen > 0 ? '+' : ''}${format(ringkasan.selisihPersen)}% dari bulan lalu`,
          trendColor: ringkasan.selisihPersen !== null && ringkasan.selisihPersen > 0 ? '#b02031' : '#07984c',
          initial: 'KWH',
          iconBg: '#fff2df',
          iconColor: '#d97706',
        },
        {
          label: 'Pemakaian Bulan Lalu (kWh)',
          value: format(ringkasan.pemakaianBulanLalu),
          initial: 'LL',
          iconBg: '#eaf2ff',
          iconColor: '#0868f6',
        },
        {
          label: 'Meter Aktif',
          value: ringkasan.totalMeter,
          initial: 'MT',
          iconBg: '#e4f7ec',
          iconColor: '#07984c',
        },
        {
          label: 'Belum Dicatat Bulan Ini',
          value: ringkasan.meterBelumDicatatBulanIni,
          trend: ringkasan.meterBelumDicatatBulanIni > 0 ? 'Catat tiap tanggal 1 di atas pukul 10.00' : undefined,
          trendColor: '#b02031',
          initial: '!',
          iconBg: '#fff0f3',
          iconColor: '#b02031',
        },
      ]
    : [];

  const dataTrenChart =
    tren?.trenBulanan.map((item) => ({ label: NAMA_BULAN[item.bulan - 1], value: item.total })) ?? [];

  const dataMeter =
    tren?.perMeter.map((item, index) => ({
      label: item.nama,
      value: item.total,
      color: WARNA_PIE[index % WARNA_PIE.length],
    })) ?? [];

  return (
    <>
      <div className={styles.breadcrumb}>
        <Link href="/civil">CIVIL</Link>
        <span>/</span>
        <strong>Perhitungan KWH</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <Gauge size={28} />
          </span>

          <div>
            <h1>Dashboard Perhitungan KWH</h1>
            <p>
              Pemakaian listrik dihitung dari stand meter bulan berjalan dikurangi bulan lalu.
              Pencatatan dilakukan setiap tanggal 1, di atas pukul 10.00 WITA.
            </p>
          </div>
        </div>
      </div>

      {galat ? <p className={styles.error}>{galat}</p> : null}

      {memuat ? (
        <p className={styles.memuat}>Memuat dashboard Perhitungan KWH...</p>
      ) : (
        <>
          <StatCardRow cards={statCards} />

          <div className={styles.chartGrid}>
            <AnimatedLineChart
              title="Pemakaian KWH per Bulan"
              subtitle={`Total pemakaian semua meter, tahun ${tren?.tahun ?? ''}`}
              data={dataTrenChart}
              accent="orange"
            />
            <SimplePieChart
              title={`Pemakaian per Meter - ${namaBulanIni}`}
              subtitle={`Tahun ${tren?.tahun ?? ''}`}
              data={dataMeter}
              satuan="kWh"
            />
          </div>
        </>
      )}
    </>
  );
}
