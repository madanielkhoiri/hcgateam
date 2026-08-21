'use client';

// ==================================================
// FILE: frontend/src/app/hc/tugas-dinas/page.tsx
// FUNGSI: Daftar Surat Tugas Dinas
// ==================================================

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Eye, Plane, Plus } from 'lucide-react';
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
  type StatusSuratTugas,
  type SuratTugasDinas,
} from '@/lib/surat-tugas-dinas-api';
import styles from './tugas-dinas.module.css';

const TAB_STATUS: Array<{ key: string; label: string }> = [
  { key: '', label: 'Semua' },
  { key: 'MENUNGGU_SH', label: 'Menunggu SH' },
  { key: 'MENUNGGU_PJO', label: 'Menunggu PJO' },
  { key: 'DISETUJUI', label: 'Disetujui' },
  { key: 'DITOLAK', label: 'Ditolak' },
];

export default function TugasDinasPage() {
  const [tab, setTab] = useState('');
  const [daftar, setDaftar] = useState<SuratTugasDinas[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      const hasil = await suratTugasApi.ambil<SuratTugasDinas[]>(
        tab ? `?status=${tab}` : '',
      );
      setDaftar(hasil);
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMemuat(false);
    }
  }, [tab]);

  useEffect(() => {
    void muat();
  }, [muat]);

  return (
    <>
      <Link href="/hc" className={styles.backButton}>
        <ArrowLeft size={16} />
        Kembali ke HC
      </Link>

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
        keterangan={`${daftar.length} surat ditampilkan.`}
      >
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
      </Panel>
    </>
  );
}