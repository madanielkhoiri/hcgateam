'use client';

// ==================================================
// FILE: frontend/src/app/hc/tugas-dinas/dashboard/page.tsx
// FUNGSI: Dashboard modul Form Tugas Dinas - halaman pertama begitu
// masuk sidebar Tugas Dinas. Statistik + grafik saja; daftar surat
// tugas ada di tugas-dinas/daftar/page.tsx.
// ==================================================

import { useEffect, useState } from 'react';
import { StatCardRow, type StatCard } from '@/components/module-shell/stat-card-row';
import AnimatedLineChart from '@/components/dashboard-charts/animated-line-chart';
import SimplePieChart from '@/components/dashboard-charts/simple-pie-chart';
import {
  suratTugasApi,
  type RingkasanSuratTugas,
  type TrenDashboardSuratTugas,
} from '@/lib/surat-tugas-dinas-api';

const NAMA_BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const WARNA_STATUS: Record<string, string> = {
  MENUNGGU_SH: '#f17c16',
  MENUNGGU_PJO: '#6748df',
  DISETUJUI: '#079669',
  DITOLAK: '#d53535',
};

const LABEL_STATUS: Record<string, string> = {
  MENUNGGU_SH: 'Menunggu SH',
  MENUNGGU_PJO: 'Menunggu PJO',
  DISETUJUI: 'Disetujui',
  DITOLAK: 'Ditolak',
};

export default function DashboardTugasDinasPage() {
  const [ringkasan, setRingkasan] = useState<RingkasanSuratTugas | null>(null);
  const [tren, setTren] = useState<TrenDashboardSuratTugas | null>(null);

  useEffect(() => {
    let aktif = true;

    Promise.all([
      suratTugasApi.ambil<RingkasanSuratTugas>('/dashboard/ringkasan'),
      suratTugasApi.ambil<TrenDashboardSuratTugas>('/dashboard/tren'),
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
          label: 'Total Surat Tugas',
          value: ringkasan.totalSurat,
          initial: 'TS',
          iconBg: '#fff2df',
          iconColor: '#d97706',
        },
        {
          label: 'Menunggu SH',
          value: ringkasan.menungguSh,
          initial: 'SH',
          iconBg: '#fff2df',
          iconColor: '#f17c16',
        },
        {
          label: 'Menunggu PJO',
          value: ringkasan.menungguPjo,
          initial: 'PJ',
          iconBg: '#f0ebff',
          iconColor: '#6748df',
        },
        {
          label: 'Disetujui',
          value: ringkasan.disetujui,
          initial: 'OK',
          iconBg: '#e4f7ec',
          iconColor: '#079669',
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
      color: WARNA_STATUS[item.status] ?? '#d97706',
    })) ?? [];

  return (
    <div style={{ padding: '22px 24px 40px', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: '#10244a' }}>Dashboard Form Tugas Dinas</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, fontWeight: 600, color: '#6f819d' }}>
          Ringkasan surat tugas dinas dan status persetujuan
        </p>
      </div>

      <StatCardRow cards={statCards} />

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)', gap: 16, alignItems: 'start' }}>
        <AnimatedLineChart
          title="Tren Surat Tugas Dinas per Bulan"
          subtitle={`Jumlah surat dibuat, tahun ${tren?.tahun ?? ''}`}
          data={dataTrenChart}
          accent="orange"
        />
        <SimplePieChart
          title="Breakdown Status Surat"
          subtitle="Seluruh surat tercatat"
          data={dataStatus}
          satuan="surat"
        />
      </div>
    </div>
  );
}
