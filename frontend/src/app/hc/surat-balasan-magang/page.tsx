'use client';

// ==================================================
// FILE: frontend/src/app/hc/surat-balasan-magang/page.tsx
// FUNGSI: Daftar Surat Balasan Magang
// ==================================================

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AlertCircle, ArrowLeft, Download, Mail, Plus } from 'lucide-react';
import {
  formatTanggal,
  suratBalasanMagangApi,
  type SuratBalasanMagang,
} from '@/lib/surat-balasan-magang-api';
import styles from '../anak-magang/anak-magang.module.css';

export default function SuratBalasanMagangPage() {
  const [daftar, setDaftar] = useState<SuratBalasanMagang[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      const hasil = await suratBalasanMagangApi.ambil<SuratBalasanMagang[]>('');
      setDaftar(hasil);
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  return (
    <>
      <Link href="/hc/anak-magang" className={styles.backButton}>
        <ArrowLeft size={16} />
        Kembali ke Database Anak Magang
      </Link>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <Mail size={26} />
          </span>

          <div>
            <h1>Surat Balasan Magang</h1>
            <p>
              Surat persetujuan permohonan magang industri, data mahasiswa
              diambil dari Database Anak Magang, otomatis jadi PDF.
            </p>
          </div>
        </div>

        <div className={styles.headActions}>
          <Link href="/hc/surat-balasan-magang/buat" className={styles.tombol}>
            <Plus size={15} />
            Buat Surat Balasan
          </Link>
        </div>
      </div>

      {galat ? (
        <div className={`${styles.notice} ${styles.noticeError}`}>
          <AlertCircle size={16} style={{ flexShrink: 0, marginTop: 1 }} />
          <span>{galat}</span>
        </div>
      ) : null}

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2>Daftar Surat Balasan</h2>
            <p>{daftar.length} surat ditampilkan.</p>
          </div>
        </div>

        {memuat ? (
          <div className={styles.memuat}>Memuat data...</div>
        ) : daftar.length === 0 ? (
          <div className={styles.kosong}>
            <Mail size={30} />
            <strong>Belum ada surat balasan</strong>
            <p>Buat surat balasan baru untuk mulai.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nomor</th>
                  <th>Tujuan</th>
                  <th>Mahasiswa</th>
                  <th>Dibuat Oleh</th>
                  <th>Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {daftar.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nomor}</td>
                    <td>{item.tujuanJurusan}</td>
                    <td>
                      {item.baris.length} orang (
                      {item.baris.map((baris) => baris.nama).join(', ')})
                    </td>
                    <td>{item.dibuatOleh.name}</td>
                    <td>{formatTanggal(item.createdAt)}</td>
                    <td>
                      {item.filePdf ? (
                        <a
                          href={suratBalasanMagangApi.urlPdf(item.filePdf)}
                          target="_blank"
                          rel="noreferrer"
                          className={`${styles.tombol} ${styles.tombolLembut} ${styles.tombolKecil}`}
                        >
                          <Download size={12} />
                          PDF
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
