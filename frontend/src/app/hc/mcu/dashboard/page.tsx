'use client';

// ==================================================
// FILE: frontend/src/app/hc/mcu/dashboard/page.tsx
// FUNGSI: Dashboard modul MCU - halaman pertama begitu masuk sidebar
// MCU. Statistik + grafik pakai komponen reusable (StatCardRow,
// AnimatedLineChart, SimplePieChart) - pola yang sama dipakai di semua
// modul lain yang baru dapat sidebar+dashboard.
// ==================================================

import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  Building2,
  CalendarClock,
  ClipboardCheck,
  FileClock,
  FileSignature,
  FlaskConical,
  HeartPulse,
  History,
  Repeat2,
  ShieldCheck,
  Stethoscope,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Memuat, Pesan } from '@/components/mcu/mcu-ui';
import { StatCardRow, type StatCard } from '@/components/module-shell/stat-card-row';
import AnimatedLineChart from '@/components/dashboard-charts/animated-line-chart';
import SimplePieChart from '@/components/dashboard-charts/simple-pie-chart';
import { mcuApi, type RingkasanMcu, type TrenDashboardMcu } from '@/lib/mcu-api';
import styles from '../mcu.module.css';

const NAMA_BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

// ==================================================
// KARTU ALUR
// Urutan mengikuti Bagian 4 dokumen alur.
// ==================================================

type KartuAlur = {
  tahap: string;
  judul: string;
  keterangan: string;
  href: string;
  icon: React.ElementType;
  varian: string;
  peran: string[];
  badge?: keyof RingkasanMcu;
};

const kartuAlur: KartuAlur[] = [
  {
    tahap: 'Tahap 1',
    judul: 'Data Karyawan & Reminder H-3 Bulan',
    keterangan:
      'Tracking MCU per karyawan (ambil dari Database Karyawan), masa berlaku MCU, dan reminder otomatis 3 bulan sebelum MCU expired.',
    href: '/hc/mcu/karyawan',
    icon: Users,
    varian: styles.tahapKaryawan,
    peran: ['HC', 'Admin Dept'],
    badge: 'reminderJatuhTempo',
  },
  {
    tahap: 'Tahap 2',
    judul: 'Penjadwalan MCU',
    keterangan:
      'Admin Dept menentukan tanggal & klinik. Pendaftaran terkunci H-3 hari, override hanya oleh HC.',
    href: '/hc/mcu/jadwal',
    icon: CalendarClock,
    varian: styles.tahapJadwal,
    peran: ['Admin Dept', 'HC'],
    badge: 'jadwalDraft',
  },
  {
    tahap: 'Tahap 3',
    judul: 'Surat Pengantar MCU',
    keterangan:
      'HC menerbitkan surat pengantar (nomor otomatis + PDF) dan mengirimkannya ke klinik tujuan.',
    href: '/hc/mcu/surat-pengantar',
    icon: FileSignature,
    varian: styles.tahapSurat,
    peran: ['HC'],
    badge: 'suratMenungguKirim',
  },
  {
    tahap: 'Tahap 4',
    judul: 'Hasil MCU',
    keterangan:
      'Upload hasil mentah oleh klinik terkoneksi atau HC. File hanya dapat dibuka HC & Dokter.',
    href: '/hc/mcu/hasil',
    icon: FlaskConical,
    varian: styles.tahapHasil,
    peran: ['Klinik', 'HC'],
    badge: 'hasilMenungguReview',
  },
  {
    tahap: 'Tahap 5',
    judul: 'Review Dokter & Rekomendasi',
    keterangan:
      'Dokter menetapkan FIT atau Follow Up, menerbitkan surat rujukan FU, lalu diteruskan ke karyawan.',
    href: '/hc/mcu/rekomendasi',
    icon: Stethoscope,
    varian: styles.tahapRekomendasi,
    peran: ['Dokter', 'Admin Dept'],
    badge: 'rekomendasiBelumDiteruskan',
  },
  {
    tahap: 'Tahap 6',
    judul: 'Follow Up (FU)',
    keterangan:
      'Batas waktu manual HC (maks 2 bulan), biaya mandiri, loop sampai FIT tanpa dead-end.',
    href: '/hc/mcu/follow-up',
    icon: Repeat2,
    varian: styles.tahapFollowUp,
    peran: ['HC', 'Karyawan'],
    badge: 'followUpTerlambat',
  },
  {
    tahap: 'Tahap 7',
    judul: 'Re-Induksi K3',
    keterangan:
      'Rekomendasi FIT memicu pendaftaran induksi ulang oleh Admin Dept, dilaksanakan SHE.',
    href: '/hc/mcu/induksi-ulang',
    icon: ShieldCheck,
    varian: styles.tahapInduksi,
    peran: ['Admin Dept', 'SHE'],
    badge: 'induksiMenunggu',
  },
  {
    tahap: 'Pendukung',
    judul: 'Master Klinik Provider',
    keterangan:
      'Kelola klinik terkoneksi (punya akun & submit sendiri) dan klinik non-terkoneksi.',
    href: '/hc/mcu/klinik',
    icon: Building2,
    varian: styles.tahapKlinik,
    peran: ['HC'],
  },
  {
    tahap: 'Pendukung',
    judul: 'History & Durasi Proses',
    keterangan:
      'Riwayat MCU per karyawan, jumlah siklus FU sampai FIT, dan durasi tiap tahapan.',
    href: '/hc/mcu/history',
    icon: History,
    varian: styles.tahapHistory,
    peran: ['HC'],
  },
  {
    tahap: 'Pendukung',
    judul: 'Retensi Dokumen',
    keterangan:
      'Dokumen medis disimpan 6 bulan sejak upload. Metadata tetap utuh untuk audit.',
    href: '/hc/mcu/retensi',
    icon: FileClock,
    varian: styles.tahapRetensi,
    peran: ['HC'],
  },
  {
    tahap: 'Pendukung',
    judul: 'Notifikasi & Peran Akun',
    keterangan:
      'Log notifikasi email Outlook/in-app dan pengaturan peran MCU tiap akun.',
    href: '/hc/mcu/notifikasi',
    icon: BellRing,
    varian: styles.tahapNotifikasi,
    peran: ['HC'],
  },
];

export default function DashboardMcuPage() {
  const [ringkasan, setRingkasan] = useState<RingkasanMcu | null>(null);
  const [tren, setTren] = useState<TrenDashboardMcu | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let aktif = true;

    Promise.all([
      mcuApi.ambil<RingkasanMcu>('/ringkasan'),
      mcuApi.ambil<TrenDashboardMcu>('/dashboard/tren'),
    ])
      .then(([dataRingkasan, dataTren]) => {
        if (aktif) {
          setRingkasan(dataRingkasan);
          setTren(dataTren);
        }
      })
      .catch((error: Error) => {
        if (aktif) {
          setGalat(error.message);
        }
      })
      .finally(() => {
        if (aktif) {
          setMemuat(false);
        }
      });

    return () => {
      aktif = false;
    };
  }, []);

  const statCards: StatCard[] = ringkasan
    ? [
        {
          label: 'Karyawan Aktif',
          value: ringkasan.karyawanAktif,
          initial: 'KA',
          iconBg: '#eaf2ff',
          iconColor: '#0868f6',
        },
        {
          label: 'Jatuh Tempo MCU',
          value: ringkasan.reminderJatuhTempo,
          trend: ringkasan.reminderJatuhTempo > 0 ? 'Perlu dijadwalkan' : undefined,
          trendColor: '#b02031',
          initial: 'JT',
          iconBg: '#fff0f3',
          iconColor: '#b02031',
        },
        {
          label: 'Menunggu Review Dokter',
          value: ringkasan.hasilMenungguReview,
          initial: 'MR',
          iconBg: '#fff4d2',
          iconColor: '#946200',
        },
        {
          label: 'Follow Up Lewat Batas',
          value: ringkasan.followUpTerlambat,
          trend: ringkasan.followUpTerlambat > 0 ? 'Perlu ditindaklanjuti' : undefined,
          trendColor: '#b02031',
          initial: 'FU',
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

  const dataStatus = tren
    ? [
        { label: 'FIT', value: tren.statusRekomendasi.fit, color: '#079669' },
        { label: 'Follow Up', value: tren.statusRekomendasi.followUp, color: '#f17c16' },
      ]
    : [];

  return (
    <>
      <div className={styles.breadcrumb}>
        <Link href="/hc">HC</Link>
        <span>/</span>
        <strong>MCU Periodik</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <HeartPulse size={28} />
          </span>

          <div>
            <h1>Digitalisasi Monitoring MCU Periodik</h1>
            <p>
              Alur lengkap dari reminder H-3 bulan, penjadwalan, pelaksanaan di
              klinik, review Dokter, Follow Up sampai FIT, hingga pendaftaran
              ulang Induksi K3.
            </p>
          </div>
        </div>
      </div>

      {galat ? <Pesan jenis="error">{galat}</Pesan> : null}

      {memuat ? (
        <Memuat teks="Memuat dashboard MCU..." />
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
              title="Tren Pemeriksaan MCU per Bulan"
              subtitle={`Jumlah jadwal MCU, tahun ${tren?.tahun ?? ''}`}
              data={dataTrenChart}
              accent="blue"
            />
            <SimplePieChart
              title="Status Rekomendasi"
              subtitle={`Tahun ${tren?.tahun ?? ''}`}
              data={dataStatus}
              satuan="kasus"
            />
          </div>
        </>
      )}

      <div className={styles.flowGrid}>
        {kartuAlur.map((kartu) => {
          const Ikon = kartu.icon;
          const jumlahBadge =
            kartu.badge && ringkasan ? ringkasan[kartu.badge] : 0;

          return (
            <Link
              key={kartu.href}
              href={kartu.href}
              className={`${styles.flowCard} ${kartu.varian}`}
            >
              <span className={styles.flowIcon}>
                <Ikon size={24} />
              </span>

              <div className={styles.flowBody}>
                <span className={styles.flowStep}>{kartu.tahap}</span>
                <h2>{kartu.judul}</h2>
                <p>{kartu.keterangan}</p>

                <div className={styles.flowMeta}>
                  {kartu.peran.map((peran) => (
                    <span key={peran} className={styles.flowTag}>
                      {peran}
                    </span>
                  ))}
                </div>
              </div>

              {jumlahBadge > 0 ? (
                <span className={styles.flowBadge}>{jumlahBadge}</span>
              ) : (
                <ArrowRight className={styles.flowArrow} size={19} />
              )}
            </Link>
          );
        })}
      </div>

      <div className={styles.catatanAlur}>
        <strong>Aturan utama yang dijaga sistem:</strong>
        <ul>
          <li>
            Kerahasiaan medis - karyawan hanya melihat rekomendasi FIT/Follow
            Up, file mentah hanya untuk HC &amp; Dokter.
          </li>
          <li>
            Pendaftaran MCU terkunci H-3 hari sebelum pelaksanaan; hanya akun HC
            yang berwenang melakukan override.
          </li>
          <li>
            Seluruh biaya Follow Up mandiri, batas waktunya ditetapkan HC manual
            per kasus dan wajib close maksimal 2 bulan setelah MCU ulang.
          </li>
          <li>
            Surat pengantar FU memakai surat rujukan Dokter, bukan surat
            administratif HC.
          </li>
          <li>
            Bila batas FU terlewat tanpa close, HC me-reminder Admin Dept untuk
            penjadwalan ulang sampai FIT tercapai.
          </li>
          <li>
            Dokumen medis diretensi 6 bulan sejak tanggal upload; metadata tetap
            tersimpan untuk audit.
          </li>
        </ul>
      </div>
    </>
  );
}
