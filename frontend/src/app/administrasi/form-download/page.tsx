'use client';

// ==================================================
// FILE: frontend/src/app/administrasi/form-download/page.tsx
// FUNGSI: Form Download - folder & file formulir ala Google Drive.
// Kelola: Admin/Admin HC/Admin Comben/Section Head.
// ==================================================

import Link from 'next/link';
import { ArrowLeft, Download } from 'lucide-react';
import { DriveExplorer } from '@/components/administrasi/drive-explorer';
import styles from '@/app/hc/ir/ir.module.css';

export default function FormDownloadPage() {
  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/dashboard">Dashboard</Link>
        <span>/</span>
        <Link href="/administrasi">ADMINISTRASI</Link>
        <span>/</span>
        <strong>Form Download</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <Download size={26} />
          </span>

          <div>
            <h1>Form Download</h1>
            <p>Formulir-formulir resmi yang dapat diunduh - tersimpan dalam folder.</p>
          </div>
        </div>

        <div className={styles.headActions}>
          <Link href="/administrasi" className={`${styles.btn} ${styles.btnGhost}`}>
            <ArrowLeft size={15} />
            Kembali
          </Link>
        </div>
      </div>

      <DriveExplorer scope="FORM_DOWNLOAD" />
    </div>
  );
}
