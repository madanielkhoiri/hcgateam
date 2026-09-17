'use client';

// ==================================================
// FILE: frontend/src/app/ga/transport/tiket/dashboard/page.tsx
// FUNGSI: Dashboard modul Tiket - halaman pertama begitu masuk
// sidebar/bottom-nav Tiket. Statistik + grafik pakai komponen
// reusable (StatCardRow, AnimatedLineChart, SimplePieChart).
// ==================================================

import { useEffect, useState } from 'react';
import { StatCardRow, type StatCard } from '@/components/module-shell/stat-card-row';
import AnimatedLineChart from '@/components/dashboard-charts/animated-line-chart';
import SimplePieChart from '@/components/dashboard-charts/simple-pie-chart';
import {
  LABEL_JENIS_TIKET,
  transportApi,
  TransportApiError,
  type DashboardTiket,
} from '@/lib/transport-api';

const NAMA_BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const WARNA_JENIS: Record<string, string> = {
  PULANG_PERGI: '#0a9f59',
  BERANGKAT_SAJA: '#1677d2',
  PULANG_SAJA: '#f17c16',
};

export default function DashboardTiketPage() {
  const [data, setData] = useState<DashboardTiket | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let aktif = true;

    transportApi.tiket
      .dashboard()
      .then((hasil) => {
        if (aktif) setData(hasil);
      })
      .catch((error: unknown) => {
        if (aktif) {
          setGalat(error instanceof TransportApiError ? error.message : 'Gagal memuat dashboard.');
        }
      })
      .finally(() => {
        if (aktif) setMemuat(false);
      });

    return () => {
      aktif = false;
    };
  }, []);

  if (memuat) {
    return (
      <div style={{ padding: 40, textAlign: 'center', color: '#6f819d' }}>
        Memuat dashboard Tiket...
      </div>
    );
  }

  if (galat) {
    return (
      <div style={{ padding: 24, color: '#b02031', fontWeight: 700 }}>{galat}</div>
    );
  }

  const statCards: StatCard[] = data
    ? [
        { label: 'Total Tiket Terkirim', value: data.totalTiket, initial: 'TT', iconBg: '#e8f8ef', iconColor: '#0a9f59' },
        { label: 'Tiket Bulan Ini', value: data.tiketBulanIni, initial: 'TB', iconBg: '#eaf2ff', iconColor: '#0868f6' },
      ]
    : [];

  const dataTren =
    data?.trenBulanan.map((item) => ({ label: NAMA_BULAN[item.bulan - 1], value: item.total })) ?? [];

  const dataJenis =
    data?.breakdownJenis.map((item) => ({
      label: LABEL_JENIS_TIKET[item.jenis],
      value: item.total,
      color: WARNA_JENIS[item.jenis] ?? '#8393ac',
    })) ?? [];

  return (
    <div style={{ padding: '22px 24px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#10244a' }}>Dashboard Tiket</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: '#6f819d' }}>
          Ringkasan tiket cuti karyawan
        </p>
      </div>

      <StatCardRow cards={statCards} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        <AnimatedLineChart
          title="Tren Tiket Terkirim per Bulan"
          subtitle={`Tahun ${data?.tahun ?? ''}`}
          data={dataTren}
          accent="green"
        />
        <SimplePieChart title="Breakdown Jenis Tiket" subtitle="Seluruh tiket" data={dataJenis} satuan="tiket" />
      </div>
    </div>
  );
}
