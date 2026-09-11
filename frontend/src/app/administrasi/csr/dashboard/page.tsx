'use client';

// ==================================================
// FILE: frontend/src/app/administrasi/csr/dashboard/page.tsx
// FUNGSI: Dashboard modul CSR - halaman pertama begitu masuk sidebar
// CSR. Statistik + grafik pakai komponen reusable (StatCardRow,
// AnimatedLineChart, SimplePieChart).
// ==================================================

import Link from 'next/link';
import { ArrowRight, HandHeart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StatCardRow, type StatCard } from '@/components/module-shell/stat-card-row';
import AnimatedLineChart from '@/components/dashboard-charts/animated-line-chart';
import SimplePieChart from '@/components/dashboard-charts/simple-pie-chart';
import { driveApi, type RingkasanDrive, type TrenDrive } from '@/lib/drive-api';
import styles from '@/app/hc/ir/ir.module.css';

const NAMA_BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export default function DashboardCsrPage() {
  const [ringkasan, setRingkasan] = useState<RingkasanDrive | null>(null);
  const [tren, setTren] = useState<TrenDrive | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let aktif = true;

    Promise.all([driveApi.ringkasan('CSR'), driveApi.tren('CSR')])
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
          label: 'Total Folder',
          value: ringkasan.totalFolder,
          initial: 'FL',
          iconBg: '#fff2df',
          iconColor: '#d97706',
        },
        {
          label: 'Total File',
          value: ringkasan.totalFile,
          initial: 'FI',
          iconBg: '#f4f0ff',
          iconColor: '#6748df',
        },
        {
          label: 'File Bulan Ini',
          value: ringkasan.fileBulanIni,
          trend: ringkasan.fileBulanIni > 0 ? 'Aktivitas bulan berjalan' : undefined,
          trendColor: '#07984c',
          initial: 'BI',
          iconBg: '#e4f7ec',
          iconColor: '#07984c',
        },
        {
          label: 'Kontributor',
          value: ringkasan.totalKontributor,
          initial: 'KT',
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

  const dataJenisFile = tren
    ? [
        { label: 'Dokumen', value: tren.jenisFile.dokumen, color: '#6748df' },
        { label: 'Spreadsheet', value: tren.jenisFile.spreadsheet, color: '#07984c' },
        { label: 'Gambar', value: tren.jenisFile.gambar, color: '#0868f6' },
        { label: 'Lainnya', value: tren.jenisFile.lainnya, color: '#d97706' },
      ]
    : [];

  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <HandHeart size={26} />
          </span>

          <div>
            <h1>Dashboard CSR</h1>
            <p>Ringkasan dokumen kegiatan CSR (proposal, laporan, dsb).</p>
          </div>
        </div>
      </div>

      {galat && <div className={`${styles.alert} ${styles.alertError}`}>{galat}</div>}

      {memuat ? (
        <div className={styles.loadingState}>Memuat dashboard CSR...</div>
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
              title="Tren File Diunggah per Bulan"
              subtitle={`Jumlah file baru, tahun ${tren?.tahun ?? ''}`}
              data={dataTrenChart}
              accent="purple"
            />
            <SimplePieChart
              title="Jenis Dokumen"
              subtitle={`Tahun ${tren?.tahun ?? ''}`}
              data={dataJenisFile}
              satuan="file"
            />
          </div>
        </>
      )}

      <Link
        href="/administrasi/csr/dokumen"
        className={styles.linkBtn}
        style={{ alignSelf: 'flex-start', marginTop: 4 }}
      >
        Buka Dokumen CSR
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
