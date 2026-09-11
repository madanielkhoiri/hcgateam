'use client';

// ==================================================
// FILE: frontend/src/app/hc/surat-penolakan-magang/dashboard/page.tsx
// FUNGSI: Dashboard modul Surat Penolakan Magang - halaman pertama
// begitu masuk sidebar. Statistik + grafik pakai komponen reusable
// (StatCardRow, AnimatedLineChart, SimplePieChart), pola sama seperti
// dashboard MCU (frontend/src/app/hc/mcu/dashboard/page.tsx).
// ==================================================

import Link from 'next/link';
import { AlertCircle, ArrowLeft, FileX2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StatCardRow, type StatCard } from '@/components/module-shell/stat-card-row';
import AnimatedLineChart from '@/components/dashboard-charts/animated-line-chart';
import SimplePieChart from '@/components/dashboard-charts/simple-pie-chart';
import {
  suratPenolakanMagangApi,
  type RingkasanDashboardSuratPenolakan,
} from '@/lib/surat-penolakan-magang-api';
import styles from '../../anak-magang/anak-magang.module.css';

const NAMA_BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export default function DashboardSuratPenolakanMagangPage() {
  const [ringkasan, setRingkasan] = useState<RingkasanDashboardSuratPenolakan | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let aktif = true;

    suratPenolakanMagangApi
      .ambil<RingkasanDashboardSuratPenolakan>('/dashboard/ringkasan')
      .then((hasil) => {
        if (aktif) setRingkasan(hasil);
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
          label: 'Total Surat Penolakan',
          value: ringkasan.totalSurat,
          initial: 'TS',
          iconBg: '#eaf2ff',
          iconColor: '#0868f6',
        },
        {
          label: 'Surat Bulan Ini',
          value: ringkasan.suratBulanIni,
          initial: 'BI',
          iconBg: '#fff0f3',
          iconColor: '#b02031',
        },
        {
          label: 'Surat Tahun Ini',
          value: ringkasan.suratTahunIni,
          initial: 'TI',
          iconBg: '#f1eaff',
          iconColor: '#6748df',
        },
        {
          label: 'Rata-rata / Bulan',
          value: ringkasan.rataRataPerBulan,
          initial: 'RB',
          iconBg: '#e2f6ec',
          iconColor: '#0b7a4b',
        },
      ]
    : [];

  const dataTren =
    ringkasan?.trenBulanan.map((item) => ({
      label: NAMA_BULAN[item.bulan - 1],
      value: item.total,
    })) ?? [];

  const dataStatus = ringkasan
    ? [
        { label: 'Sudah Terbit PDF', value: ringkasan.statusPdf.sudahTerbit, color: '#079669' },
        { label: 'Belum Terbit PDF', value: ringkasan.statusPdf.belumTerbit, color: '#f17c16' },
      ]
    : [];

  return (
    <>
      <Link href="/hc/anak-magang" className={styles.backButton}>
        <ArrowLeft size={16} />
        Kembali ke Database Anak Magang
      </Link>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <FileX2 size={26} />
          </span>

          <div>
            <h1>Dashboard Surat Penolakan Magang</h1>
            <p>
              Ringkasan surat penolakan yang sudah diterbitkan, tren
              bulanan, dan status penerbitan PDF.
            </p>
          </div>
        </div>
      </div>

      {galat ? (
        <div className={`${styles.notice} ${styles.noticeError}`}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{galat}</span>
        </div>
      ) : null}

      {memuat ? (
        <div className={styles.memuat}>Memuat dashboard...</div>
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
              title="Tren Surat Penolakan per Bulan"
              subtitle={`Jumlah surat diterbitkan, tahun ${ringkasan?.tahun ?? ''}`}
              data={dataTren}
              accent="orange"
            />
            <SimplePieChart
              title="Status Penerbitan PDF"
              subtitle={`Tahun ${ringkasan?.tahun ?? ''}`}
              data={dataStatus}
              satuan="surat"
            />
          </div>
        </>
      )}
    </>
  );
}
