'use client';

// ==================================================
// FILE: frontend/src/components/mcu/mcu-ui.tsx
// FUNGSI: Komponen tampilan bersama seluruh halaman MCU
// ==================================================

import { AlertCircle, CheckCircle2, Info, Inbox, X } from 'lucide-react';
import type { ReactNode } from 'react';
import styles from '@/app/hc/mcu/mcu.module.css';
import { labelStatus, nadaStatus } from '@/lib/mcu-api';

// ==================================================
// BADGE STATUS
// ==================================================

export function BadgeStatus({
  nilai,
  teks,
}: {
  nilai: string | null | undefined;
  teks?: string;
}) {
  const nada = nadaStatus(nilai);

  return (
    <span className={`${styles.badge} ${styles[nada]}`}>
      {teks ?? labelStatus(nilai)}
    </span>
  );
}

// ==================================================
// PESAN
// ==================================================

export function Pesan({
  jenis,
  children,
}: {
  jenis: 'error' | 'sukses' | 'info';
  children: ReactNode;
}) {
  const kelas =
    jenis === 'error'
      ? styles.noticeError
      : jenis === 'sukses'
        ? styles.noticeSukses
        : styles.noticeInfo;

  const Ikon =
    jenis === 'error' ? AlertCircle : jenis === 'sukses' ? CheckCircle2 : Info;

  return (
    <div className={`${styles.notice} ${kelas}`}>
      <Ikon size={16} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{children}</span>
    </div>
  );
}

// ==================================================
// STATUS KOSONG & MEMUAT
// ==================================================

export function Kosong({
  judul,
  keterangan,
}: {
  judul: string;
  keterangan: string;
}) {
  return (
    <div className={styles.kosong}>
      <Inbox size={30} />
      <strong>{judul}</strong>
      <p>{keterangan}</p>
    </div>
  );
}

export function Memuat({ teks = 'Memuat data...' }: { teks?: string }) {
  return <div className={styles.memuat}>{teks}</div>;
}

// ==================================================
// PANEL
// ==================================================

export function Panel({
  judul,
  keterangan,
  aksi,
  children,
}: {
  judul: string;
  keterangan?: string;
  aksi?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHead}>
        <div>
          <h2>{judul}</h2>
          {keterangan ? <p>{keterangan}</p> : null}
        </div>
        {aksi ? <div className={styles.headActions}>{aksi}</div> : null}
      </div>

      {children}
    </section>
  );
}

// ==================================================
// DIALOG
// ==================================================

export function Dialog({
  judul,
  keterangan,
  onTutup,
  children,
  aksi,
}: {
  judul: string;
  keterangan?: string;
  onTutup: () => void;
  children: ReactNode;
  aksi?: ReactNode;
}) {
  return (
    <div
      className={styles.overlay}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onTutup();
        }
      }}
    >
      <div className={styles.dialog}>
        <div className={styles.dialogHead}>
          <div>
            <h3>{judul}</h3>
            {keterangan ? <p>{keterangan}</p> : null}
          </div>

          <button
            type="button"
            className={styles.dialogTutup}
            onClick={onTutup}
            aria-label="Tutup"
          >
            <X size={16} />
          </button>
        </div>

        {children}

        {aksi ? <div className={styles.dialogAksi}>{aksi}</div> : null}
      </div>
    </div>
  );
}

// ==================================================
// FIELD FORM
// ==================================================

export function Field({
  label,
  lebar,
  children,
}: {
  label: string;
  lebar?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`${styles.field} ${lebar ? styles.lebar : ''}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}
