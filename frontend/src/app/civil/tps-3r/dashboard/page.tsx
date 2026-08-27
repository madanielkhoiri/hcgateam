'use client';

// ==================================================
// FILE: frontend/src/app/civil/tps-3r/dashboard/page.tsx
// FUNGSI: Dashboard ringkasan & grafik TPS 3R
// ==================================================

import { useEffect, useState } from 'react';
import AnimatedLineChart from '@/components/dashboard-charts/animated-line-chart';
import SimplePieChart from '@/components/dashboard-charts/simple-pie-chart';
import { tps3rApi, type RingkasanTps3r, type TrenBulananTps3r } from '@/lib/tps3r-api';
import styles from '../../project/tender/tender.module.css';

const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const NAMA_BULAN_SINGKAT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const WARNA_KATEGORI = {
  organik: '#07984c',
  nonOrganik: '#0868f6',
  reuse: '#7a4ce0',
  recycle: '#d97706',
  residu: '#b3261e',
};

function formatKg(nilai: number) {
  return `${nilai.toLocaleString('id-ID', { maximumFractionDigits: 2 })} kg`;
}

export default function Tps3rDashboardPage() {
  const sekarang = new Date();
  const [bulan, setBulan] = useState(sekarang.getMonth() + 1);
  const [tahun, setTahun] = useState(sekarang.getFullYear());
  const [ringkasan, setRingkasan] = useState<RingkasanTps3r | null>(null);
  const [tren, setTren] = useState<TrenBulananTps3r[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMemuat(true);
    setError(null);
    tps3rApi
      .ringkasan(bulan, tahun)
      .then(setRingkasan)
      .catch((err) => setError(err instanceof Error ? err.message : 'Gagal memuat data'))
      .finally(() => setMemuat(false));
  }, [bulan, tahun]);

  useEffect(() => {
    tps3rApi
      .tren(tahun)
      .then(setTren)
      .catch(() => setTren([]));
  }, [tahun]);

  const dataGrafik = ringkasan
    ? [
        { label: 'Organik', value: ringkasan.totalOrganik },
        { label: 'Non Organik', value: ringkasan.totalNonOrganik },
        { label: 'Reuse', value: ringkasan.totalReuse },
        { label: 'Recycle', value: ringkasan.totalRecycle },
        { label: 'Residu', value: ringkasan.totalResidu },
      ]
    : [];

  const dataPie = ringkasan
    ? [
        { label: 'Organik', value: ringkasan.totalOrganik, color: WARNA_KATEGORI.organik },
        { label: 'Non Organik', value: ringkasan.totalNonOrganik, color: WARNA_KATEGORI.nonOrganik },
        { label: 'Guna Ulang / Reuse', value: ringkasan.totalReuse, color: WARNA_KATEGORI.reuse },
        { label: 'Daur Ulang / Recycle', value: ringkasan.totalRecycle, color: WARNA_KATEGORI.recycle },
        { label: 'Residu', value: ringkasan.totalResidu, color: WARNA_KATEGORI.residu },
      ]
    : [];

  const dataTren = tren.map((item) => ({
    label: NAMA_BULAN_SINGKAT[item.bulan - 1],
    value: Math.round(item.totalKg * 100) / 100,
  }));

  const bulanIniIndex = sekarang.getFullYear() === tahun ? sekarang.getMonth() : 11;
  const bulanLaluTotal = tren[bulanIniIndex - 1]?.totalKg ?? 0;
  const bulanIniTotal = tren[bulanIniIndex]?.totalKg ?? 0;
  const deviasi =
    bulanLaluTotal > 0 ? ((bulanIniTotal - bulanLaluTotal) / bulanLaluTotal) * 100 : null;

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>Dashboard TPS 3R</h1>
          <p>Ringkasan timbangan sampah per kategori untuk periode terpilih.</p>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select
            value={bulan}
            onChange={(e) => setBulan(Number(e.target.value))}
            style={{ minWidth: 130, padding: '9px 11px', border: '1px solid #d8e4f2', borderRadius: 9, fontSize: 12 }}
          >
            {NAMA_BULAN.map((nama, index) => (
              <option key={nama} value={index + 1}>{nama}</option>
            ))}
          </select>

          <select
            value={tahun}
            onChange={(e) => setTahun(Number(e.target.value))}
            style={{ minWidth: 100, padding: '9px 11px', border: '1px solid #d8e4f2', borderRadius: 9, fontSize: 12 }}
          >
            {Array.from({ length: 5 }, (_, i) => sekarang.getFullYear() - 2 + i).map((th) => (
              <option key={th} value={th}>{th}</option>
            ))}
          </select>
        </div>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      {memuat || !ringkasan ? (
        <p className={styles.emptyText}>Memuat...</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            <StatCard label="Organik" value={formatKg(ringkasan.totalOrganik)} />
            <StatCard label="Non Organik" value={formatKg(ringkasan.totalNonOrganik)} />
            <StatCard label="Guna Ulang / Reuse" value={formatKg(ringkasan.totalReuse)} />
            <StatCard label="Daur Ulang / Recycle" value={formatKg(ringkasan.totalRecycle)} />
            <StatCard label="Residu" value={formatKg(ringkasan.totalResidu)} />
            <StatCard label="Jumlah Laporan" value={String(ringkasan.totalLaporan)} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 16 }}>
            <AnimatedLineChart
              title="Total Timbangan per Kategori"
              subtitle={`${NAMA_BULAN[bulan - 1]} ${tahun} - satuan kg`}
              data={dataGrafik}
              accent="green"
            />

            <SimplePieChart
              title="Proporsi Kategori Sampah"
              subtitle={`${NAMA_BULAN[bulan - 1]} ${tahun}`}
              data={dataPie}
            />
          </div>

          <div style={{ position: 'relative' }}>
            <AnimatedLineChart
              title="Tren Setoran Sampah per Bulan"
              subtitle={`Seluruh kategori digabung - ${tahun} (kg)`}
              data={dataTren}
              accent="blue"
            />

            {deviasi !== null && (
              <span
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 18,
                  padding: '4px 10px',
                  borderRadius: 999,
                  fontSize: 11.5,
                  fontWeight: 800,
                  color: deviasi >= 0 ? '#07984c' : '#b3261e',
                  background: deviasi >= 0 ? '#e4f7ec' : '#ffeded',
                }}
              >
                {deviasi >= 0 ? '▲' : '▼'} {Math.abs(deviasi).toFixed(1)}% dari bulan sebelumnya
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: '14px 16px', background: '#f7fafd', border: '1px solid #e4edf7', borderRadius: 14 }}>
      <div style={{ color: '#7185a0', fontSize: 11.5, fontWeight: 700, marginBottom: 4 }}>{label}</div>
      <div style={{ color: '#10244a', fontSize: 19, fontWeight: 800 }}>{value}</div>
    </div>
  );
}
