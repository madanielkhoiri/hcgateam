'use client';

// ==================================================
// FILE: frontend/src/app/hc/helpdesk/dashboard/page.tsx
// FUNGSI: Dashboard modul Helpdesk Center - halaman pertama begitu
// masuk sidebar Helpdesk.
// ==================================================

import { useEffect, useState } from 'react';
import { StatCardRow, type StatCard } from '@/components/module-shell/stat-card-row';
import AnimatedLineChart from '@/components/dashboard-charts/animated-line-chart';
import SimplePieChart from '@/components/dashboard-charts/simple-pie-chart';
import { Memuat, Pesan } from '@/components/helpdesk/helpdesk-ui';
import {
  helpdeskApi,
  LABEL_STATUS_HELPDESK,
  type RingkasanDashboardHelpdesk,
  type TrenDashboardHelpdesk,
} from '@/lib/helpdesk-api';

const NAMA_BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const WARNA_STATUS: Record<string, string> = {
  TERBUKA: '#f17c16',
  DIPROSES: '#1677d2',
  SELESAI: '#079669',
};

export default function DashboardHelpdeskPage() {
  const [ringkasan, setRingkasan] = useState<RingkasanDashboardHelpdesk | null>(null);
  const [tren, setTren] = useState<TrenDashboardHelpdesk | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let aktif = true;

    Promise.all([
      helpdeskApi.ambil<RingkasanDashboardHelpdesk>('/dashboard/ringkasan'),
      helpdeskApi.ambil<TrenDashboardHelpdesk>('/dashboard/tren'),
    ])
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

  if (memuat) {
    return <Memuat teks="Memuat dashboard Helpdesk..." />;
  }

  if (galat) {
    return <Pesan jenis="error">{galat}</Pesan>;
  }

  const statCards: StatCard[] = ringkasan
    ? [
        { label: 'Total Tiket', value: ringkasan.totalTiket, initial: 'TT', iconBg: '#eaf2ff', iconColor: '#0868f6' },
        {
          label: 'Open',
          value: ringkasan.terbuka,
          trend: ringkasan.terbuka > 0 ? 'Belum ditangani' : undefined,
          trendColor: '#b02031',
          initial: 'OP',
          iconBg: '#fff0f3',
          iconColor: '#b02031',
        },
        { label: 'On Progress', value: ringkasan.diproses, initial: 'PR', iconBg: '#fff4d2', iconColor: '#946200' },
        { label: 'Selesai', value: ringkasan.selesai, initial: 'SL', iconBg: '#e8f8ef', iconColor: '#0a9f59' },
      ]
    : [];

  const dataTren =
    tren?.trenBulanan.map((item) => ({ label: NAMA_BULAN[item.bulan - 1], value: item.total })) ?? [];

  const dataStatus =
    tren?.breakdownStatus.map((item) => ({
      label: LABEL_STATUS_HELPDESK[item.status],
      value: item.total,
      color: WARNA_STATUS[item.status] ?? '#8393ac',
    })) ?? [];

  return (
    <div style={{ padding: '22px 24px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#10244a' }}>Dashboard Helpdesk Center</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: '#6f819d' }}>
          Ringkasan tiket bantuan karyawan
        </p>
      </div>

      <StatCardRow cards={statCards} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        <AnimatedLineChart
          title="Tren Tiket Dibuat per Bulan"
          subtitle={`Tahun ${tren?.tahun ?? ''}`}
          data={dataTren}
          accent="blue"
        />
        <SimplePieChart title="Breakdown Status Tiket" subtitle="Seluruh tiket" data={dataStatus} satuan="tiket" />
      </div>
    </div>
  );
}
