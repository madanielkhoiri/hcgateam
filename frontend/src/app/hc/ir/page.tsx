'use client';

// ==================================================
// FILE: frontend/src/app/hc/ir/page.tsx
// FUNGSI: Beranda PORTAL IR - 3 card: Upload Dokumen, Aspirasi
// Karyawan, IR Course.
// ==================================================

import Link from 'next/link';
import { ArrowLeft, ArrowRight, Database, MessageSquareText, Scale, Video } from 'lucide-react';
import { getStoredUser } from '@/lib/access-control';
import { isIrPengelola } from '@/lib/ir-api';
import styles from './ir.module.css';

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

export default function PortalIrPage() {
  const user = getStoredUser();
  const boleh = isIrPengelola(user);

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

        <div className={styles.headActions}>
          <Link href="/hc" className={`${styles.btn} ${styles.btnGhost}`}>
            <ArrowLeft size={15} />
            Kembali ke HC
          </Link>
        </div>
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
