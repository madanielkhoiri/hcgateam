'use client';

// ==================================================
// FILE: frontend/src/app/hc/karyawan/dashboard/page.tsx
// FUNGSI: Dashboard modul Database Karyawan - halaman pertama begitu
// masuk sidebar Database Karyawan. Statistik + grafik saja; daftar &
// pengelolaan karyawan ada di karyawan/daftar/page.tsx.
// ==================================================

import { useEffect, useState } from 'react';
import { StatCardRow, type StatCard } from '@/components/module-shell/stat-card-row';
import AnimatedLineChart from '@/components/dashboard-charts/animated-line-chart';
import SimplePieChart from '@/components/dashboard-charts/simple-pie-chart';
import {
  karyawanApi,
  type RingkasanDatabaseKaryawan,
  type TrenDashboardKaryawan,
} from '@/lib/karyawan-api';

const NAMA_BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const WARNA_STATUS: Record<string, string> = {
  AKTIF: '#079669',
  DIRUMAHKAN: '#f17c16',
  RESIGN: '#94a3b8',
};

const LABEL_STATUS: Record<string, string> = {
  AKTIF: 'Aktif',
  DIRUMAHKAN: 'Dirumahkan',
  RESIGN: 'Resign',
};

export default function DashboardKaryawanPage() {
  const [ringkasan, setRingkasan] = useState<RingkasanDatabaseKaryawan | null>(null);
  const [tren, setTren] = useState<TrenDashboardKaryawan | null>(null);

  useEffect(() => {
    let aktif = true;

    Promise.all([
      karyawanApi.ambil<RingkasanDatabaseKaryawan>('/dashboard/ringkasan'),
      karyawanApi.ambil<TrenDashboardKaryawan>('/dashboard/tren'),
    ])
      .then(([dataRingkasan, dataTren]) => {
        if (aktif) {
          setRingkasan(dataRingkasan);
          setTren(dataTren);
        }
      })
      .catch(() => {
        // Kartu & grafik dashboard cukup kosong bila gagal dimuat.
      });

    return () => {
      aktif = false;
    };
  }, []);

  const statCards: StatCard[] = ringkasan
    ? [
        {
          label: 'Total Karyawan',
          value: ringkasan.totalKaryawan,
          initial: 'TK',
          iconBg: '#e2f5f7',
          iconColor: '#0a7f8c',
        },
        {
          label: 'Karyawan Aktif',
          value: ringkasan.karyawanAktif,
          initial: 'AK',
          iconBg: '#e4f7ec',
          iconColor: '#079669',
        },
        {
          label: 'Jumlah Departemen',
          value: ringkasan.jumlahDepartemen,
          initial: 'DP',
          iconBg: '#eaf2ff',
          iconColor: '#0868f6',
        },
        {
          label: 'Terdaftar WhatsApp',
          value: ringkasan.waTerdaftar,
          initial: 'WA',
          iconBg: '#f0ebff',
          iconColor: '#6748df',
        },
      ]
    : [];

  const dataTrenChart =
    tren?.trenBulanan.map((item) => ({
      label: NAMA_BULAN[item.bulan - 1],
      value: item.total,
    })) ?? [];

  const dataStatus =
    tren?.breakdownStatus.map((item) => ({
      label: LABEL_STATUS[item.status] ?? item.status,
      value: item.total,
      color: WARNA_STATUS[item.status] ?? '#0a7f8c',
    })) ?? [];

  return (
    <div style={{ padding: '22px 24px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#10244a' }}>Dashboard Database Karyawan</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: '#6f819d' }}>
          Ringkasan identitas &amp; status kerja seluruh karyawan
        </p>
      </div>

      <StatCardRow cards={statCards} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        <AnimatedLineChart
          title="Tren Karyawan Baru per Bulan"
          subtitle={`Jumlah karyawan baru terdaftar, tahun ${tren?.tahun ?? ''}`}
          data={dataTrenChart}
          accent="blue"
        />
        <SimplePieChart
          title="Breakdown Status Kerja"
          subtitle="Seluruh karyawan tercatat"
          data={dataStatus}
          satuan="orang"
        />
      </div>
    </div>
  );
}
