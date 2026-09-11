'use client';

// ==================================================
// FILE: frontend/src/app/administrasi/dokumentasi/dashboard/page.tsx
// FUNGSI: Dashboard modul Dokumentasi - halaman pertama begitu masuk
// sidebar Dokumentasi. Statistik + grafik pakai komponen reusable
// (StatCardRow, AnimatedLineChart, SimplePieChart).
// ==================================================

import Link from 'next/link';
import { ArrowRight, Images } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StatCardRow, type StatCard } from '@/components/module-shell/stat-card-row';
import AnimatedLineChart from '@/components/dashboard-charts/animated-line-chart';
import SimplePieChart from '@/components/dashboard-charts/simple-pie-chart';
import { albumApi, type RingkasanAlbum, type TrenAlbum } from '@/lib/album-api';
import styles from '@/app/hc/ir/ir.module.css';

const NAMA_BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export default function DashboardDokumentasiPage() {
  const [ringkasan, setRingkasan] = useState<RingkasanAlbum | null>(null);
  const [tren, setTren] = useState<TrenAlbum | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let aktif = true;

    Promise.all([albumApi.ringkasan(), albumApi.tren()])
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
          label: 'Total Album',
          value: ringkasan.totalAlbum,
          initial: 'AL',
          iconBg: '#f4f0ff',
          iconColor: '#6748df',
        },
        {
          label: 'Total Foto',
          value: ringkasan.totalFoto,
          initial: 'FT',
          iconBg: '#eaf2ff',
          iconColor: '#0868f6',
        },
        {
          label: 'Album Bulan Ini',
          value: ringkasan.albumBulanIni,
          trend: ringkasan.albumBulanIni > 0 ? 'Aktivitas bulan berjalan' : undefined,
          trendColor: '#07984c',
          initial: 'BI',
          iconBg: '#e4f7ec',
          iconColor: '#07984c',
        },
        {
          label: 'Kontributor',
          value: ringkasan.totalKontributor,
          initial: 'KT',
          iconBg: '#fff4d2',
          iconColor: '#946200',
        },
      ]
    : [];

  const dataTrenChart =
    tren?.trenBulanan.map((item) => ({
      label: NAMA_BULAN[item.bulan - 1],
      value: item.total,
    })) ?? [];

  const dataStatusAlbum = ringkasan
    ? [
        { label: 'Berisi Foto', value: ringkasan.albumBerisiFoto, color: '#6748df' },
        { label: 'Kosong', value: ringkasan.albumKosong, color: '#d8e4f2' },
      ]
    : [];

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <Images size={26} />
          </span>

          <div>
            <h1>Dashboard Dokumentasi</h1>
            <p>Ringkasan album foto dokumentasi kegiatan perusahaan.</p>
          </div>
        </div>
      </div>

      {galat && <div className={`${styles.alert} ${styles.alertError}`}>{galat}</div>}

      {memuat ? (
        <div className={styles.loadingState}>Memuat dashboard Dokumentasi...</div>
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
              title="Tren Album Dibuat per Bulan"
              subtitle={`Jumlah album baru, tahun ${tren?.tahun ?? ''}`}
              data={dataTrenChart}
              accent="purple"
            />
            <SimplePieChart
              title="Status Album"
              subtitle={`Tahun ${tren?.tahun ?? ''}`}
              data={dataStatusAlbum}
              satuan="album"
            />
          </div>
        </>
      )}

      <Link
        href="/administrasi/dokumentasi/album"
        className={styles.linkBtn}
        style={{ alignSelf: 'flex-start', marginTop: 4 }}
      >
        Buka Album
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
