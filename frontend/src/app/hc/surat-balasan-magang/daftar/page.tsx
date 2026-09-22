'use client';

// ==================================================
// FILE: frontend/src/app/hc/surat-balasan-magang/daftar/page.tsx
// FUNGSI: Daftar Surat Balasan Magang (dipindah dari root - lihat
// frontend/src/app/hc/surat-balasan-magang/page.tsx yang sekarang jadi
// redirect ke dashboard, pola sama seperti modul MCU)
// ==================================================

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, ArrowLeft, Download, Mail, Plus } from 'lucide-react';
import {
  formatTanggal,
  suratBalasanMagangApi,
  type HasilHalaman,
  type SuratBalasanMagang,
} from '@/lib/surat-balasan-magang-api';
import { PaginationBar, hitungTotalHalaman } from '@/components/pagination/pagination-bar';
import styles from '../../anak-magang/anak-magang.module.css';

const UKURAN_HALAMAN = 20;

export default function DaftarSuratBalasanMagangPage() {
  const [daftar, setDaftar] = useState<SuratBalasanMagang[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  const [filterBulan, setFilterBulan] = useState('');
  const [filterTahun, setFilterTahun] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [totalSurat, setTotalSurat] = useState(0);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      const parameter = new URLSearchParams({
        halaman: String(halaman),
        ukuranHalaman: String(UKURAN_HALAMAN),
      });

      if (filterBulan) parameter.set('bulan', filterBulan);
      if (filterTahun) parameter.set('tahun', filterTahun);

      const hasil = await suratBalasanMagangApi.ambil<HasilHalaman<SuratBalasanMagang>>(
        `?${parameter.toString()}`,
      );
      setDaftar(hasil.data);
      setTotalSurat(hasil.total);
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMemuat(false);
    }
  }, [filterBulan, filterTahun, halaman]);

  useEffect(() => {
    void muat();
  }, [muat]);

  // Balik ke halaman 1 tiap kali filter bulan/tahun berubah.
  useEffect(() => {
    setHalaman(1);
  }, [filterBulan, filterTahun]);

  const tahunTersedia = useMemo(() => {
    const tahunSekarang = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => tahunSekarang - 5 + index);
  }, []);

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
            <p>{totalSurat} surat, ditampilkan {daftar.length} per halaman.</p>
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

        <PaginationBar
          halaman={halaman}
          totalHalaman={hitungTotalHalaman(totalSurat, UKURAN_HALAMAN)}
          onGanti={setHalaman}
        />
      </section>
    </>
  );
}
