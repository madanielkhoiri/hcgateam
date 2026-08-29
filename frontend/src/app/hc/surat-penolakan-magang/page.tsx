'use client';

// ==================================================
// FILE: frontend/src/app/hc/surat-penolakan-magang/page.tsx
// FUNGSI: Daftar Surat Penolakan Magang
// ==================================================

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Download, FileX2, Plus } from 'lucide-react';
import {
  formatTanggal,
  suratPenolakanMagangApi,
  type SuratPenolakanMagang,
} from '@/lib/surat-penolakan-magang-api';
import styles from '../anak-magang/anak-magang.module.css';

export default function SuratPenolakanMagangPage() {
  const [daftar, setDaftar] = useState<SuratPenolakanMagang[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  const [filterBulan, setFilterBulan] = useState('');
  const [filterTahun, setFilterTahun] = useState('');

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      const hasil =
        await suratPenolakanMagangApi.ambil<SuratPenolakanMagang[]>('');
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

  const tahunTersedia = useMemo(() => {
    const tahunSekarang = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => tahunSekarang - 5 + index);
  }, []);

  const daftarTampil = useMemo(() => {
    return daftar.filter((item) => {
      const tanggal = new Date(item.createdAt);

      if (filterBulan && tanggal.getMonth() + 1 !== Number(filterBulan)) {
        return false;
      }

      if (filterTahun && tanggal.getFullYear() !== Number(filterTahun)) {
        return false;
      }

      return true;
    });
  }, [daftar, filterBulan, filterTahun]);

  return (
    <>
      <Link href="/hc/anak-magang" className={styles.backButton}>
        <ArrowLeft size={16} />
        Kembali ke Database Anak Magang
      </Link>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <FileX2 size={26} />
          </span>

          <div>
            <h1>Surat Penolakan Magang</h1>
            <p>
              Surat penolakan permohonan magang industri (1 surat per 1
              orang), data pelamar diambil dari Database Anak Magang,
              otomatis jadi PDF.
            </p>
          </div>
        </div>

        <div className={styles.headActions}>
          <Link
            href="/hc/surat-penolakan-magang/buat"
            className={styles.tombol}
          >
            <Plus size={15} />
            Buat Surat Penolakan
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
            <h2>Daftar Surat Penolakan</h2>
            <p>{daftarTampil.length} dari {daftar.length} surat ditampilkan.</p>
          </div>
        </div>

        <div className={styles.filterBar}>
          <select
            className={styles.select}
            style={{ maxWidth: 160 }}
            value={filterBulan}
            onChange={(event) => setFilterBulan(event.target.value)}
          >
            <option value="">Semua Bulan</option>
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {new Intl.DateTimeFormat('id-ID', {
                  month: 'long',
                }).format(new Date(2026, index, 1))}
              </option>
            ))}
          </select>

          <select
            className={styles.select}
            style={{ maxWidth: 130 }}
            value={filterTahun}
            onChange={(event) => setFilterTahun(event.target.value)}
          >
            <option value="">Semua Tahun</option>
            {tahunTersedia.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {memuat ? (
          <div className={styles.memuat}>Memuat data...</div>
        ) : daftarTampil.length === 0 ? (
          <div className={styles.kosong}>
            <FileX2 size={30} />
            <strong>Belum ada surat penolakan</strong>
            <p>Buat surat penolakan baru untuk mulai.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nomor</th>
                  <th>Nama Pelamar</th>
                  <th>Alasan</th>
                  <th>Dibuat Oleh</th>
                  <th>Tanggal</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {daftarTampil.map((item) => (
                  <tr key={item.id}>
                    <td>{item.nomor}</td>
                    <td>
                      {item.sapaan} {item.nama}
                    </td>
                    <td>{item.alasanPenolakan}</td>
                    <td>{item.dibuatOleh.name}</td>
                    <td>{formatTanggal(item.createdAt)}</td>
                    <td>
                      {item.filePdf ? (
                        <a
                          href={suratPenolakanMagangApi.urlPdf(item.filePdf)}
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
