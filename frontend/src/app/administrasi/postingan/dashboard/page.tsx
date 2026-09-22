'use client';

// ==================================================
// FILE: frontend/src/app/administrasi/postingan/dashboard/page.tsx
// FUNGSI: Dashboard modul Postingan - halaman pertama begitu masuk
// sidebar Postingan. Statistik + grafik pakai komponen reusable
// (StatCardRow, AnimatedLineChart, SimplePieChart).
// ==================================================

import Link from 'next/link';
import { ArrowRight, Megaphone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StatCardRow, type StatCard } from '@/components/module-shell/stat-card-row';
import AnimatedLineChart from '@/components/dashboard-charts/animated-line-chart';
import SimplePieChart from '@/components/dashboard-charts/simple-pie-chart';
import { postinganApi, type RingkasanPostingan, type TrenPostingan } from '@/lib/postingan-api';
import styles from '@/app/hc/ir/ir.module.css';

const NAMA_BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export default function DashboardPostinganPage() {
  const [ringkasan, setRingkasan] = useState<RingkasanPostingan | null>(null);
  const [tren, setTren] = useState<TrenPostingan | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let aktif = true;

    Promise.all([postinganApi.ringkasan(), postinganApi.tren()])
      .then(([dataRingkasan, dataTren]) => {
        if (aktif) {
          setRingkasan(dataRingkasan);
          setTren(dataTren);
        }
      })
      .catch((error: Error) => {
        if (aktif) setGalat(error.message);
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
          label: 'Total Postingan',
          value: ringkasan.total,
          initial: 'TP',
          iconBg: '#f4f0ff',
          iconColor: '#6748df',
        },
        {
          label: 'Tampil di Beranda',
          value: ringkasan.tampilBeranda,
          initial: 'TB',
          iconBg: '#e4f7ec',
          iconColor: '#07984c',
        },
        {
          label: 'Tersembunyi',
          value: ringkasan.tersembunyi,
          initial: 'TS',
          iconBg: '#f1f5f9',
          iconColor: '#64748b',
        },
        {
          label: 'Postingan Bulan Ini',
          value: ringkasan.postinganBulanIni,
          trend: ringkasan.postinganBulanIni > 0 ? 'Aktivitas bulan berjalan' : undefined,
          trendColor: '#0868f6',
          initial: 'BI',
          iconBg: '#eaf2ff',
          iconColor: '#0868f6',
        },
      ]
    : [];

  const dataTrenChart =
    tren?.trenBulanan.map((item) => ({
      label: NAMA_BULAN[item.bulan - 1],
      value: item.total,
    })) ?? [];

  const dataTipeMedia = tren
    ? [
        { label: 'Poster', value: tren.tipeMedia.poster, color: '#6748df' },
        { label: 'Video', value: tren.tipeMedia.video, color: '#f17c16' },
      ]
    : [];

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <Megaphone size={26} />
          </span>

          <div>
            <h1>Dashboard Postingan</h1>
            <p>Ringkasan poster & video informasi carousel beranda.</p>
          </div>
        </div>
      </div>

      {galat && <div className={`${styles.alert} ${styles.alertError}`}>{galat}</div>}

      {memuat ? (
        <div className={styles.loadingState}>Memuat dashboard Postingan...</div>
      ) : (
        <>
          <StatCardRow cards={statCards} />

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)',
              gap: 16,
              alignItems: 'start',
            }}
          >
            <AnimatedLineChart
              title="Tren Postingan Dibuat per Bulan"
              subtitle={`Jumlah postingan baru, tahun ${tren?.tahun ?? ''}`}
              data={dataTrenChart}
              accent="purple"
            />
            <SimplePieChart
              title="Tipe Media"
              subtitle={`Tahun ${tren?.tahun ?? ''}`}
              data={dataTipeMedia}
              satuan="postingan"
            />
          </div>
        </>
      )}

      <Link
        href="/administrasi/postingan/kelola"
        className={styles.linkBtn}
        style={{ alignSelf: 'flex-start', marginTop: 4 }}
      >
        Kelola Postingan
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
