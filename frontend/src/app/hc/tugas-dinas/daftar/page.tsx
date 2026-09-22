'use client';

// ==================================================
// FILE: frontend/src/app/hc/tugas-dinas/daftar/page.tsx
// FUNGSI: Daftar Surat Tugas Dinas - terpisah dari dashboard/page.tsx
// (yang hanya statistik + grafik).
// ==================================================

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Plane, Plus } from 'lucide-react';
import {
  BadgeStatusSurat,
  Kosong,
  Memuat,
  Panel,
  Pesan,
} from '@/components/tugas-dinas/tugas-dinas-ui';
import {
  formatTanggal,
  suratTugasApi,
  type HasilHalaman,
  type StatusSuratTugas,
  type SuratTugasDinas,
} from '@/lib/surat-tugas-dinas-api';
import { PaginationBar, hitungTotalHalaman } from '@/components/pagination/pagination-bar';
import styles from '../tugas-dinas.module.css';

const UKURAN_HALAMAN = 20;

const TAB_STATUS: Array<{ key: string; label: string }> = [
  { key: '', label: 'Semua' },
  { key: 'MENUNGGU_SH', label: 'Menunggu SH' },
  { key: 'MENUNGGU_PJO', label: 'Menunggu PJO' },
  { key: 'DISETUJUI', label: 'Disetujui' },
  { key: 'DITOLAK', label: 'Ditolak' },
];

export default function DaftarTugasDinasPage() {
  const [tab, setTab] = useState('');
  const [daftar, setDaftar] = useState<SuratTugasDinas[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  const [cari, setCari] = useState('');
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

      if (tab) parameter.set('status', tab);
      if (cari.trim()) parameter.set('cari', cari.trim());
      if (filterBulan) parameter.set('bulan', filterBulan);
      if (filterTahun) parameter.set('tahun', filterTahun);

      const hasil = await suratTugasApi.ambil<HasilHalaman<SuratTugasDinas>>(
        `?${parameter.toString()}`,
      );
      setDaftar(hasil.data);
      setTotalSurat(hasil.total);
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMemuat(false);
    }
  }, [tab, cari, filterBulan, filterTahun, halaman]);

  useEffect(() => {
    void muat();
  }, [muat]);

  // Balik ke halaman 1 tiap kali tab status atau filter cari/bulan/tahun berubah.
  useEffect(() => {
    setHalaman(1);
  }, [tab, cari, filterBulan, filterTahun]);

  const tahunTersedia = useMemo(() => {
    const tahunSekarang = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => tahunSekarang - 5 + index);
  }, []);

  return (
    <>
      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <Plane size={26} />
          </span>

          <div>
            <h1>Form Tugas Dinas</h1>
            <p>
              Buat Surat Tugas Dinas dengan karyawan dari Database Karyawan,
              otomatis jadi PDF, lengkap alur persetujuan SH &amp; PJO.
            </p>
          </div>
        </div>

        <div className={styles.headActions}>
          <Link href="/hc/tugas-dinas/buat" className={styles.tombol}>
            <Plus size={15} />
            Buat Surat Tugas
          </Link>
        </div>
      </div>

      {galat ? <Pesan jenis="error">{galat}</Pesan> : null}

      <div className={styles.filterBar}>
        {TAB_STATUS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`${styles.tombol} ${styles.tombolKecil} ${
              tab === item.key ? '' : styles.tombolNetral
            }`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Panel
        judul="Daftar Surat Tugas Dinas"
        keterangan={`${totalSurat} surat, ditampilkan ${daftar.length} per halaman.`}
      >
        <div className={styles.filterBar}>
          <input
            className={styles.input}
            style={{ maxWidth: 240 }}
            placeholder="Cari nama karyawan, NRP, atau tujuan..."
            value={cari}
            onChange={(event) => setCari(event.target.value)}
          />

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
          <Memuat />
        ) : daftar.length === 0 ? (
          <Kosong
            judul="Belum ada surat tugas"
            keterangan="Buat surat tugas dinas baru untuk mulai."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Aksi</th>
                  <th>Nomor</th>
                  <th>Tujuan/Lokasi</th>
                  <th>Tanggal Tugas</th>
                  <th>Jumlah Karyawan</th>
                  <th>Dibuat Oleh</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {daftar.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <Link
                        href={`/hc/tugas-dinas/${item.id}`}
                        className={`${styles.tombol} ${styles.tombolLembut} ${styles.tombolKecil}`}
                      >
                        <Eye size={12} />
                        Lihat
                      </Link>
                    </td>
                    <td>{item.nomor}</td>
                    <td>{item.tujuanLokasi}</td>
                    <td>
                      {formatTanggal(item.tanggalMulai)} -{' '}
                      {formatTanggal(item.tanggalSelesai)}
                    </td>
                    <td>{item.karyawan.length} orang</td>
                    <td>{item.dibuatOleh.name}</td>
                    <td>
                      <BadgeStatusSurat nilai={item.status as StatusSuratTugas} />
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
      </Panel>
    </>
  );
}
