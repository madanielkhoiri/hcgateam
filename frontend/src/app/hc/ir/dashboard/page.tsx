'use client';

// ==================================================
// FILE: frontend/src/app/hc/ir/dashboard/page.tsx
// FUNGSI: Dashboard PORTAL IR - halaman pertama begitu masuk sidebar IR.
// Statistik + grafik pakai komponen reusable (StatCardRow,
// AnimatedLineChart, SimplePieChart), landing card 3 sub-modul tetap
// ditampilkan di bawahnya (dipindah dari ir/page.tsx lama).
// ==================================================

import Link from 'next/link';
import { ArrowRight, Database, MessageSquareText, Scale, Video } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useStoredUser } from '@/lib/use-stored-user';
import { isIrPengelola, irApi, type RingkasanIr, type TrenDashboardIr } from '@/lib/ir-api';
import { StatCardRow, type StatCard } from '@/components/module-shell/stat-card-row';
import AnimatedLineChart from '@/components/dashboard-charts/animated-line-chart';
import SimplePieChart from '@/components/dashboard-charts/simple-pie-chart';
import styles from '../ir.module.css';

const NAMA_BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const WARNA_KATEGORI: Record<string, string> = {
  SK: '#0868f6',
  IM: '#f17c16',
  FORM: '#6748df',
};

const kartuIr = [
  {
    judul: 'Upload Dokumen',
    keterangan:
      'Dokumen SK, IM, dan FORM. Admin/Admin HC/Section Head mengunggah, akun lain melihat & mengunduh.',
    href: '/hc/ir/dokumen',
    icon: Database,
  },
  {
    judul: 'Aspirasi Karyawan',
    keterangan:
      'Pertanyaan pilihan ganda/essay disusun Admin HC; karyawan menjawab, jawaban tercatat nama & NRP.',
    href: '/hc/ir/aspirasi',
    icon: MessageSquareText,
  },
  {
    judul: 'IR Course',
    keterangan:
      'Video pelatihan diunggah Admin HC lengkap judulnya; status tontonan tiap akun tercatat.',
    href: '/hc/ir/course',
    icon: Video,
  },
];

export default function DashboardIrPage() {
  const user = useStoredUser();
  const boleh = isIrPengelola(user);

  const [ringkasan, setRingkasan] = useState<RingkasanIr | null>(null);
  const [tren, setTren] = useState<TrenDashboardIr | null>(null);

  useEffect(() => {
    let aktif = true;

    Promise.all([irApi.dashboard.ringkasan(), irApi.dashboard.tren()])
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
          label: 'Total Dokumen',
          value: ringkasan.totalDokumen,
          initial: 'DK',
          iconBg: '#e5f7fb',
          iconColor: '#0783a8',
        },
        {
          label: 'Pertanyaan Aspirasi Aktif',
          value: ringkasan.pertanyaanAktif,
          initial: 'AS',
          iconBg: '#eaf2ff',
          iconColor: '#0868f6',
        },
        {
          label: 'Video IR Course',
          value: ringkasan.totalVideo,
          initial: 'CO',
          iconBg: '#f0ebff',
          iconColor: '#6748df',
        },
        {
          label: 'Jawaban Aspirasi Masuk',
          value: ringkasan.totalJawaban,
          initial: 'JW',
          iconBg: '#e4f7ec',
          iconColor: '#07984c',
        },
      ]
    : [];

  const dataTrenChart =
    tren?.trenBulanan.map((item) => ({
      label: NAMA_BULAN[item.bulan - 1],
      value: item.total,
    })) ?? [];

  const dataKategori =
    tren?.breakdownKategori.map((item) => ({
      label: item.kategori,
      value: item.total,
      color: WARNA_KATEGORI[item.kategori] ?? '#0783a8',
    })) ?? [];

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/hc">HC</Link>
        <span>/</span>
        <strong>PORTAL IR</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <Scale size={26} />
          </span>

          <div>
            <h1>PORTAL IR</h1>
            <p>
              Industrial Relations. {boleh
                ? 'Kelola dokumen, susun pertanyaan aspirasi, dan unggah video IR Course.'
                : 'Lihat & unduh dokumen, isi aspirasi, dan tonton IR Course.'}
            </p>
          </div>
        </div>
      </div>

      <StatCardRow cards={statCards} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)',
          gap: 16,
          margin: '4px 0 20px',
          alignItems: 'start',
        }}
      >
        <AnimatedLineChart
          title="Tren Dokumen Diunggah per Bulan"
          subtitle={`Jumlah dokumen SK/IM/FORM, tahun ${tren?.tahun ?? ''}`}
          data={dataTrenChart}
          accent="blue"
        />
        <SimplePieChart
          title="Breakdown Kategori Dokumen"
          subtitle="Seluruh dokumen tersimpan"
          data={dataKategori}
          satuan="dokumen"
        />
      </div>

      <div className={styles.landingGrid}>
        {kartuIr.map((kartu) => {
          const Ikon = kartu.icon;

          return (
            <Link key={kartu.href} href={kartu.href} className={styles.landingCard}>
              <span className={styles.landingIcon}>
                <Ikon size={22} />
              </span>

              <h2>{kartu.judul}</h2>
              <p>{kartu.keterangan}</p>

              <span className={styles.landingArrow}>
                <ArrowRight size={18} />
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
