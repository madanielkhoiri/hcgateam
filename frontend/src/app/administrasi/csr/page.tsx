'use client';

// ==================================================
// FILE: frontend/src/app/administrasi/csr/page.tsx
// FUNGSI: CSR - folder & file (proposal, laporan, dsb) ala Google
// Drive. Kelola: Admin/Admin HC/Admin Comben/Section Head.
// ==================================================

import Link from 'next/link';
import { ArrowLeft, HandHeart } from 'lucide-react';
import { DriveExplorer } from '@/components/administrasi/drive-explorer';
import styles from '@/app/hc/ir/ir.module.css';

export default function CsrPage() {
  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/dashboard">Dashboard</Link>
        <span>/</span>
        <Link href="/administrasi">ADMINISTRASI</Link>
        <span>/</span>
        <strong>CSR</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <HandHeart size={26} />
          </span>

          <div>
            <h1>CSR</h1>
            <p>Proposal, laporan, dan dokumen kegiatan CSR - tersimpan dalam folder.</p>
          </div>
        </div>

        <div className={styles.headActions}>
          <Link href="/administrasi" className={`${styles.btn} ${styles.btnGhost}`}>
            <ArrowLeft size={15} />
            Kembali
          </Link>
        </div>
      </div>

      <DriveExplorer scope="CSR" />
    </div>
  );
}
