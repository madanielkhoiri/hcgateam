// ==================================================
// FILE: frontend/src/components/pagination/pagination-bar.tsx
// FUNGSI: Kontrol pagination generik (Sebelumnya/Berikutnya + "Halaman
// X / Y") — gaya visual meniru pola yang sudah dipakai di halaman Audit
// Log, sekarang jadi komponen bersama supaya semua daftar besar (HC,
// GA, Civil, Administrasi) konsisten satu sama lain.
// ==================================================

import styles from './pagination-bar.module.css';

export function PaginationBar({
  halaman,
  totalHalaman,
  onGanti,
}: {
  halaman: number;
  totalHalaman: number;
  onGanti: (halamanBaru: number) => void;
}) {
  if (totalHalaman <= 1) return null;

  return (
    <div className={styles.bar}>
      <button
        type="button"
        className={styles.tombol}
        disabled={halaman <= 1}
        onClick={() => onGanti(halaman - 1)}
      >
        Sebelumnya
      </button>
      <span className={styles.info}>
        Halaman {halaman} / {totalHalaman}
      </span>
      <button
        type="button"
        className={styles.tombol}
        disabled={halaman >= totalHalaman}
        onClick={() => onGanti(halaman + 1)}
      >
        Berikutnya
      </button>
    </div>
  );
}

/** Hitung total halaman dari total baris + ukuran halaman (dibulatkan ke atas, minimal 1). */
export function hitungTotalHalaman(total: number, ukuranHalaman: number): number {
  return Math.max(1, Math.ceil(total / ukuranHalaman));
}
