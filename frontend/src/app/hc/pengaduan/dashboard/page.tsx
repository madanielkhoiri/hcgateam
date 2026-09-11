'use client';

// ==================================================
// FILE: frontend/src/app/hc/pengaduan/dashboard/page.tsx
// FUNGSI: Dashboard modul Pengaduan Layanan HC - statistik + grafik
// pakai komponen reusable (StatCardRow, AnimatedLineChart,
// SimplePieChart), reuse endpoint rekap() yang sudah ada (tanpa endpoint
// backend baru), jadi hanya dapat dilihat role yang boleh lihat rekap
// (sama seperti halaman Rekap Performa).
// ==================================================

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowLeft, MessageSquareText } from 'lucide-react';
import { useEffect, useState } from 'react';
import { clearSession, getAccessToken, getStoredUser, type PortalUser } from '@/lib/access-control';
import { StatCardRow, type StatCard } from '@/components/module-shell/stat-card-row';
import AnimatedLineChart from '@/components/dashboard-charts/animated-line-chart';
import SimplePieChart from '@/components/dashboard-charts/simple-pie-chart';
import {
  pengaduanLayananApi,
  PengaduanLayananApiError,
  ROLE_BOLEH_LIHAT_REKAP,
  type RekapPengaduan,
} from '@/lib/pengaduan-layanan-api';
import styles from '@/components/pengaduan-layanan/pengaduan-layanan.module.css';

const WARNA_BINTANG: Record<number, string> = {
  1: '#b02031',
  2: '#f17c16',
  3: '#f5b400',
  4: '#65a30d',
  5: '#079669',
};

export default function DashboardPengaduanPage() {
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [rekap, setRekap] = useState<RekapPengaduan | null>(null);
  const [galat, setGalat] = useState('');
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    const stored = getStoredUser();

    if (!token || !stored) {
      clearSession();
      router.replace('/login');
      return;
    }

    if (!ROLE_BOLEH_LIHAT_REKAP.includes(stored.role)) {
      router.replace('/hc/pengaduan');
      return;
    }

    setUser(stored);
  }, [router]);

  useEffect(() => {
    if (!user) return;

    let aktif = true;

    pengaduanLayananApi
      .rekap('HC')
      .then((hasil) => {
        if (aktif) setRekap(hasil);
      })
      .catch((error: unknown) => {
        if (!aktif) return;
        setGalat(
          error instanceof PengaduanLayananApiError
            ? error.message
            : 'Gagal memuat dashboard Pengaduan Layanan.',
        );
      })
      .finally(() => {
        if (aktif) setMemuat(false);
      });

    return () => {
      aktif = false;
    };
  }, [user]);

  if (!user) {
    return <main className={styles.page}>Memuat...</main>;
  }

  const menunggu = rekap?.daftar.filter((item) => item.status === 'MENUNGGU').length ?? 0;
  const ditahanDitolak =
    rekap?.daftar.filter((item) => item.status === 'DITAHAN' || item.status === 'DITOLAK').length ?? 0;

  const statCards: StatCard[] = rekap
    ? [
        {
          label: 'Aduan Bulan Ini',
          value: rekap.jumlahPengaduan,
          initial: 'AB',
          iconBg: '#eaf2ff',
          iconColor: '#0868f6',
        },
        {
          label: 'Rata-rata Rating',
          value: `${rekap.rataRata.toFixed(1)} / 5`,
          initial: 'RR',
          iconBg: '#fff4d2',
          iconColor: '#946200',
        },
        {
          label: 'Menunggu Diproses',
          value: menunggu,
          trend: menunggu > 0 ? 'Perlu ditindaklanjuti' : undefined,
          trendColor: '#b02031',
          initial: 'MP',
          iconBg: '#fff0f3',
          iconColor: '#b02031',
        },
        {
          label: 'Ditahan / Ditolak',
          value: ditahanDitolak,
          initial: 'DD',
          iconBg: '#ffe4ec',
          iconColor: '#ef476f',
        },
      ]
    : [];

  const dataTren =
    rekap?.tren.map((item) => ({ label: item.label, value: item.jumlah })) ?? [];

  const dataBintang = rekap
    ? ([1, 2, 3, 4, 5] as const).map((bintang) => ({
        label: `Bintang ${bintang}`,
        value: rekap.distribusiBintang[String(bintang) as '1' | '2' | '3' | '4' | '5'],
        color: WARNA_BINTANG[bintang],
      }))
    : [];

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href="/hc/pengaduan" className={styles.backButton}>
          <ArrowLeft size={16} />
          Kembali ke Aduan Layanan
        </Link>

        <div className={styles.titleSection}>
          <span className={styles.icon}>
            <MessageSquareText size={22} />
          </span>

          <div>
            <h1>Dashboard Pengaduan Layanan</h1>
            <p>Ringkasan rating & aduan layanan HC bulan berjalan, tren 6 bulan terakhir.</p>
          </div>
        </div>

        {galat ? (
          <div style={{ display: 'flex', gap: 8, color: '#b02031', fontSize: 13 }}>
            <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
            <span>{galat}</span>
          </div>
        ) : null}

        {memuat ? (
          <div style={{ padding: 32, textAlign: 'center', color: '#5b6b8a' }}>Memuat dashboard...</div>
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
                title="Tren Jumlah Aduan per Bulan"
                subtitle="6 bulan terakhir"
                data={dataTren}
                accent="purple"
              />
              <SimplePieChart
                title="Distribusi Rating"
                subtitle="Bulan berjalan"
                data={dataBintang}
                satuan="aduan"
              />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
