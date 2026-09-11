'use client';

// ==================================================
// FILE: frontend/src/app/hc/surat-balasan-magang/dashboard/page.tsx
// FUNGSI: Dashboard modul Surat Balasan Magang - halaman pertama begitu
// masuk sidebar. Statistik + grafik pakai komponen reusable
// (StatCardRow, AnimatedLineChart, SimplePieChart), pola sama seperti
// dashboard MCU (frontend/src/app/hc/mcu/dashboard/page.tsx).
// ==================================================

import Link from 'next/link';
import { AlertCircle, ArrowLeft, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { StatCardRow, type StatCard } from '@/components/module-shell/stat-card-row';
import AnimatedLineChart from '@/components/dashboard-charts/animated-line-chart';
import SimplePieChart from '@/components/dashboard-charts/simple-pie-chart';
import {
  suratBalasanMagangApi,
  type RingkasanDashboardSuratBalasan,
} from '@/lib/surat-balasan-magang-api';
import styles from '../../anak-magang/anak-magang.module.css';

const NAMA_BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

export default function DashboardSuratBalasanMagangPage() {
  const [ringkasan, setRingkasan] = useState<RingkasanDashboardSuratBalasan | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let aktif = true;

    suratBalasanMagangApi
      .ambil<RingkasanDashboardSuratBalasan>('/dashboard/ringkasan')
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
          label: 'Total Surat Balasan',
          value: ringkasan.totalSurat,
          initial: 'TS',
          iconBg: '#eaf2ff',
          iconColor: '#0868f6',
        },
        {
          label: 'Total Mahasiswa Diterima',
          value: ringkasan.totalMahasiswa,
          initial: 'TM',
          iconBg: '#fff2df',
          iconColor: '#d97706',
        },
        {
          label: 'Surat Bulan Ini',
          value: ringkasan.suratBulanIni,
          initial: 'BI',
          iconBg: '#e2f6ec',
          iconColor: '#0b7a4b',
        },
        {
          label: 'Surat Tahun Ini',
          value: ringkasan.suratTahunIni,
          initial: 'TI',
          iconBg: '#f1eaff',
          iconColor: '#6748df',
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
            <Mail size={26} />
          </span>

          <div>
            <h1>Dashboard Surat Balasan Magang</h1>
            <p>
              Ringkasan surat persetujuan magang yang sudah diterbitkan,
              tren bulanan, dan status penerbitan PDF.
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
              title="Tren Surat Balasan per Bulan"
              subtitle={`Jumlah surat diterbitkan, tahun ${ringkasan?.tahun ?? ''}`}
              data={dataTren}
              accent="blue"
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
