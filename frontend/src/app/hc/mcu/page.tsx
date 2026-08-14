'use client';

// ==================================================
// FILE: frontend/src/app/hc/mcu/page.tsx
// FUNGSI: Beranda MCU Periodik - kartu terpisah per tahap alur
// Referensi: alur-workflow-mcu-periodik-v3.md
// ==================================================

import Link from 'next/link';
import {
  ArrowLeft,
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
import { mcuApi, type RingkasanMcu } from '@/lib/mcu-api';
import styles from './mcu.module.css';

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
  /** Kunci angka pending pada ringkasan untuk badge notifikasi. */
  badge?: keyof RingkasanMcu;
};

const kartuAlur: KartuAlur[] = [
  {
    tahap: 'Tahap 1',
    judul: 'Data Karyawan & Reminder H-3 Bulan',
    keterangan:
      'Master karyawan, masa berlaku MCU, dan reminder otomatis 3 bulan sebelum MCU expired.',
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

// ==================================================
// STATISTIK RINGKAS
// ==================================================

const kartuStatistik: Array<{
  kunci: keyof RingkasanMcu;
  label: string;
  icon: React.ElementType;
  penting?: boolean;
}> = [
  { kunci: 'karyawanAktif', label: 'Karyawan Aktif', icon: Users },
  {
    kunci: 'reminderJatuhTempo',
    label: 'Jatuh Tempo MCU',
    icon: BellRing,
    penting: true,
  },
  { kunci: 'jadwalTerkunci', label: 'Jadwal Terkunci', icon: CalendarClock },
  {
    kunci: 'hasilMenungguReview',
    label: 'Menunggu Review Dokter',
    icon: Stethoscope,
  },
  { kunci: 'followUpBerjalan', label: 'Follow Up Berjalan', icon: Repeat2 },
  {
    kunci: 'followUpTerlambat',
    label: 'FU Lewat Batas',
    icon: FileClock,
    penting: true,
  },
  { kunci: 'rekomendasiFit', label: 'Rekomendasi FIT', icon: ClipboardCheck },
  { kunci: 'induksiMenunggu', label: 'Induksi Menunggu', icon: ShieldCheck },
];

export default function BerandaMcuPage() {
  const [ringkasan, setRingkasan] = useState<RingkasanMcu | null>(null);
  const [galat, setGalat] = useState<string | null>(null);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    let aktif = true;

    mcuApi
      .ambil<RingkasanMcu>('/ringkasan')
      .then((data) => {
        if (aktif) {
          setRingkasan(data);
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
              ulang Induksi K3. Pilih kartu sesuai tahap yang ingin dikerjakan.
            </p>
          </div>
        </div>

        <div className={styles.headActions}>
          <Link href="/hc" className={`${styles.tombol} ${styles.tombolNetral}`}>
            <ArrowLeft size={15} />
            Kembali ke HC
          </Link>
        </div>
      </div>

      {galat ? <Pesan jenis="error">{galat}</Pesan> : null}

      {memuat ? (
        <Memuat teks="Memuat ringkasan MCU..." />
      ) : ringkasan ? (
        <div className={styles.statGrid}>
          {kartuStatistik.map((item) => {
            const Ikon = item.icon;
            const nilai = ringkasan[item.kunci];

            return (
              <article
                key={item.kunci}
                className={`${styles.statCard} ${
                  item.penting && nilai > 0 ? styles.statPenting : ''
                }`}
              >
                <span className={styles.statIcon}>
                  <Ikon size={19} />
                </span>

                <div>
                  <strong>{nilai}</strong>
                  <p>{item.label}</p>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

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
