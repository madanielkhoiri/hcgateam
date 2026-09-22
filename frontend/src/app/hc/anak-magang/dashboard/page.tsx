'use client';

// ==================================================
// FILE: frontend/src/app/hc/anak-magang/dashboard/page.tsx
// FUNGSI: Dashboard modul Database Anak Magang - halaman pertama
// begitu masuk sidebar Anak Magang. Statistik + grafik saja; daftar
// & pengelolaan anak magang ada di anak-magang/daftar/page.tsx.
// ==================================================

import { useEffect, useState } from 'react';
import { StatCardRow, type StatCard } from '@/components/module-shell/stat-card-row';
import AnimatedLineChart from '@/components/dashboard-charts/animated-line-chart';
import SimplePieChart from '@/components/dashboard-charts/simple-pie-chart';
import {
  anakMagangApi,
  LABEL_STATUS_ANAK_MAGANG,
  type RingkasanAnakMagang,
  type TrenDashboardAnakMagang,
} from '@/lib/anak-magang-api';

const NAMA_BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const WARNA_STATUS: Record<string, string> = {
  AKTIF: '#079669',
  NONAKTIF: '#94a3b8',
};

export default function DashboardAnakMagangPage() {
  const [ringkasan, setRingkasan] = useState<RingkasanAnakMagang | null>(null);
  const [tren, setTren] = useState<TrenDashboardAnakMagang | null>(null);

  useEffect(() => {
    let aktif = true;

    Promise.all([
      anakMagangApi.ambil<RingkasanAnakMagang>('/dashboard/ringkasan'),
      anakMagangApi.ambil<TrenDashboardAnakMagang>('/dashboard/tren'),
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
          label: 'Total Anak Magang',
          value: ringkasan.totalAnakMagang,
          initial: 'TM',
          iconBg: '#fff2df',
          iconColor: '#d97706',
        },
        {
          label: 'Aktif',
          value: ringkasan.aktif,
          initial: 'AK',
          iconBg: '#e4f7ec',
          iconColor: '#079669',
        },
        {
          label: 'Non Aktif',
          value: ringkasan.nonAktif,
          initial: 'NA',
          iconBg: '#eef2f7',
          iconColor: '#5b6c85',
        },
        {
          label: 'Berakhir Bulan Ini',
          value: ringkasan.berakhirBulanIni,
          trend: ringkasan.berakhirBulanIni > 0 ? 'Perlu ditindaklanjuti' : undefined,
          trendColor: '#b02031',
          initial: 'BB',
          iconBg: '#fff0f3',
          iconColor: '#b02031',
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
      label: LABEL_STATUS_ANAK_MAGANG[item.status] ?? item.status,
      value: item.total,
      color: WARNA_STATUS[item.status] ?? '#d97706',
    })) ?? [];

  return (
    <div style={{ padding: '22px 24px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#10244a' }}>Dashboard Anak Magang</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: '#6f819d' }}>
          Ringkasan mahasiswa magang aktif dan non aktif
        </p>
      </div>

      <StatCardRow cards={statCards} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        <AnimatedLineChart
          title="Tren Anak Magang Mulai per Bulan"
          subtitle={`Berdasarkan tanggal mulai magang, tahun ${tren?.tahun ?? ''}`}
          data={dataTrenChart}
          accent="orange"
        />
        <SimplePieChart
          title="Breakdown Status"
          subtitle="Seluruh data anak magang"
          data={dataStatus}
          satuan="orang"
        />
      </div>
    </div>
  );
}
