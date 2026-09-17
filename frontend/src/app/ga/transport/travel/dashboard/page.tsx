'use client';

// ==================================================
// FILE: frontend/src/app/ga/transport/travel/dashboard/page.tsx
// FUNGSI: Dashboard modul Travel - halaman pertama begitu masuk
// sidebar/bottom-nav Travel. Statistik + grafik pakai komponen
// reusable (StatCardRow, AnimatedLineChart, SimplePieChart).
// ==================================================

import { useEffect, useState } from 'react';
import { StatCardRow, type StatCard } from '@/components/module-shell/stat-card-row';
import AnimatedLineChart from '@/components/dashboard-charts/animated-line-chart';
import SimplePieChart from '@/components/dashboard-charts/simple-pie-chart';
import { transportApi, TransportApiError, type DashboardTravel } from '@/lib/transport-api';

const NAMA_BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const LABEL_STATUS: Record<string, string> = {
  DIJADWALKAN: 'Dijadwalkan',
  BERJALAN: 'Berjalan',
  SELESAI: 'Selesai',
  DIBATALKAN: 'Dibatalkan',
};

const WARNA_STATUS: Record<string, string> = {
  DIJADWALKAN: '#1677d2',
  BERJALAN: '#f17c16',
  SELESAI: '#079669',
  DIBATALKAN: '#b02031',
};

export default function DashboardTravelPage() {
  const [data, setData] = useState<DashboardTravel | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let aktif = true;

    transportApi.travel
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
        Memuat dashboard Travel...
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
        { label: 'Total Jadwal Travel', value: data.totalJadwal, initial: 'TJ', iconBg: '#e8f8ef', iconColor: '#0a9f59' },
        { label: 'Jadwal Bulan Ini', value: data.jadwalBulanIni, initial: 'JB', iconBg: '#eaf2ff', iconColor: '#0868f6' },
      ]
    : [];

  const dataTren =
    data?.trenBulanan.map((item) => ({ label: NAMA_BULAN[item.bulan - 1], value: item.total })) ?? [];

  const dataStatus =
    data?.breakdownStatus.map((item) => ({
      label: LABEL_STATUS[item.status] ?? item.status,
      value: item.total,
      color: WARNA_STATUS[item.status] ?? '#8393ac',
    })) ?? [];

  return (
    <div style={{ padding: '22px 24px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#10244a' }}>Dashboard Travel</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: '#6f819d' }}>
          Ringkasan jadwal travel/shuttle
        </p>
      </div>

      <StatCardRow cards={statCards} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        <AnimatedLineChart
          title="Tren Jadwal Travel per Bulan"
          subtitle={`Tahun ${data?.tahun ?? ''}`}
          data={dataTren}
          accent="green"
        />
        <SimplePieChart title="Breakdown Status Travel" subtitle="Seluruh jadwal" data={dataStatus} satuan="jadwal" />
      </div>
    </div>
  );
}
