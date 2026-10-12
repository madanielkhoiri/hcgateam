"use client";

// ==================================================
// FILE: frontend/src/components/eprom/akses-submenu-dialog.tsx
// FUNGSI: Dialog atur akses submenu project e-ProM (dipakai Data Vendor
// dan Daftar Tender Internal).
// ==================================================

import { useState } from "react";
import { X } from "lucide-react";
import styles from "@/app/civil/project/kontrak/kontrak.module.css";

export const SUBMENU_EPROM = [
  ['shop-drawing', 'Engineer - Shop Drawing'], ['material-approval', 'Engineer - Material Approval'],
  ['metode-pekerjaan', 'Engineer - Metode Pekerjaan'], ['sertifikasi-pekerjaan', 'Engineer - Sertifikasi Pekerjaan'],
  ['peralatan-list', 'Engineer - Daftar Peralatan'], ['komisioning-alat-berat', 'Engineer - Komisioning Alat Berat'],
  ['dokpro', 'Engineer - Dokpro'], ['checklist-tahapan', 'Konstruksi - Checklist Tahapan Pekerjaan'],
  ['inspeksi-area', 'Konstruksi - Inspeksi Area'], ['progress-harian', 'Konstruksi - Laporan Harian'],
  ['progress-mingguan', 'Konstruksi - Laporan Mingguan'], ['progress-bulanan', 'Konstruksi - Laporan Bulanan'],
  ['inspeksi-peralatan', 'Konstruksi - Inspeksi Peralatan'], ['tta', 'Konstruksi - TTA'],
  ['kta', 'Konstruksi - KTA'], ['ibpr', 'Konstruksi - IBPR'], ['jsa', 'Konstruksi - JSA'],
  ['sosialisasi-jsa', 'Konstruksi - Sosialisasi JSA'], ['izin-kerja-khusus', 'Konstruksi - Izin Kerja Khusus'],
  ['meeting', 'Meeting Progress'], ['mom', 'Meeting Progress - MOM'],
  ['dokumentasi', 'Meeting Progress - Dokumentasi'],
  ['p5m', 'Safety Meeting - P5M'], ['safety-talk', 'Safety Meeting - Safety Talk'],
  ['fatigue-test', 'Safety Meeting - Fatigue Test'],
  ['surat-teguran', 'Dokumen - Surat Teguran'], ['surat-peringatan', 'Dokumen - Surat Peringatan'],
  ['coaching-counseling', 'Dokumen - Coaching & Counseling'], ['memo', 'Dokumen - Memo'],
  ['opname-pekerjaan', 'Financial - Opname Pekerjaan'],
  ['as-build-drawing', 'Project Closing - As Build Drawing'], ['komisioning', 'Project Closing - Komisioning'],
  ['serah-terima', 'Project Closing - Serah Terima'], ['masa-pemeliharaan-checklist', 'Project Closing - Checklist Masa Pemeliharaan'],
  ['ba-serah-terima', 'Project Closing - BA Serah Terima'],
] as const;

export function AksesSubmenuDialog({
  judul,
  menuNonaktifAwal,
  onSimpan,
  onTutup,
}: {
  judul: string;
  menuNonaktifAwal: string[];
  onSimpan: (menuNonaktif: string[]) => void | Promise<void>;
  onTutup: () => void;
}) {
  const [menuNonaktif, setMenuNonaktif] = useState<string[]>(menuNonaktifAwal);

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#10244a88', display: 'grid', placeItems: 'center', padding: 16 }}>
      <section className={styles.formCard} style={{ width: 'min(720px, 100%)', maxHeight: '86vh', overflow: 'auto', display: 'block' }}>
        <div className={styles.headerRow}>
          <div><h2>Akses Submenu</h2><p>{judul}</p></div>
          <button type="button" className={styles.iconButton} onClick={onTutup}><X size={16} /></button>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10, margin: '18px 0' }}>
          {SUBMENU_EPROM.map(([key, label]) => {
            const aktif = !menuNonaktif.includes(key);
            return <label key={key} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 12, border: '1px solid #dce7f3', borderRadius: 10 }}>
              <input type="checkbox" checked={aktif} onChange={() => setMenuNonaktif((current) => aktif ? [...current, key] : current.filter((item) => item !== key))} />
              <span><strong>{label}</strong><small style={{ display: 'block', color: '#7185a0' }}>{aktif ? 'Aktif' : 'Nonaktif - tidak masuk penilaian'}</small></span>
            </label>;
          })}
        </div>
        <button type="button" className={styles.primaryButton} onClick={() => void onSimpan(menuNonaktif)}>Simpan Akses Menu</button>
      </section>
    </div>
  );
}
