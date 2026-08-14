'use client';

// ==================================================
// FILE: frontend/src/app/hc/mcu/retensi/page.tsx
// FUNGSI: Monitoring & eksekusi retensi dokumen medis 6 bulan
// Referensi: Bagian 4.12 alur-workflow-mcu-periodik-v3.md
// ==================================================

import Link from 'next/link';
import { ArrowLeft, FileClock, Trash2 } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import {
  Dialog,
  Kosong,
  Memuat,
  Panel,
  Pesan,
} from '@/components/mcu/mcu-ui';
import {
  formatTanggal,
  mcuApi,
  type DokumenRetensi,
} from '@/lib/mcu-api';
import { useMcu } from '../layout';
import styles from '../mcu.module.css';

type RingkasanRetensi = {
  jatuhTempoHasilMcu: number;
  jatuhTempoHasilFollowUp: number;
  jatuhTempoRekomendasi: number;
  totalJatuhTempo: number;
  hasilMcuSudahDihapus: number;
};

export default function RetensiMcuPage() {
  const { punyaPeran } = useMcu();
  const adalahHc = punyaPeran('HC');

  const [dokumen, setDokumen] = useState<{
    hasilMcu: DokumenRetensi[];
    hasilFollowUp: DokumenRetensi[];
    rekomendasi: DokumenRetensi[];
  } | null>(null);
  const [ringkasan, setRingkasan] = useState<RingkasanRetensi | null>(null);

  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);
  const [dialogTerbuka, setDialogTerbuka] = useState(false);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      const [daftarDokumen, ring] = await Promise.all([
        mcuApi.ambil<{
          hasilMcu: DokumenRetensi[];
          hasilFollowUp: DokumenRetensi[];
          rekomendasi: DokumenRetensi[];
        }>('/retensi?hariKeDepan=30'),
        mcuApi.ambil<RingkasanRetensi>('/retensi/ringkasan'),
      ]);

      setDokumen(daftarDokumen);
      setRingkasan(ring);
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  async function jalankanPembersihan() {
    setProses(true);
    setGalat(null);

    try {
      const hasil = await mcuApi.kirim<{
        dokumenDiproses: number;
        fileDihapus: number;
      }>('/retensi/jalankan');

      setSukses(
        `${hasil.dokumenDiproses} dokumen diproses, ${hasil.fileDihapus} file fisik dihapus. Metadata tetap tersimpan untuk audit.`,
      );
      setDialogTerbuka(false);
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  const semuaDokumen = dokumen
    ? [...dokumen.hasilMcu, ...dokumen.hasilFollowUp, ...dokumen.rekomendasi].sort(
        (a, b) => a.sisaHari - b.sisaHari,
      )
    : [];

  return (
    <>
      <div className={styles.breadcrumb}>
        <Link href="/hc/mcu">MCU Periodik</Link>
        <span>/</span>
        <strong>Retensi Dokumen</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <FileClock size={26} />
          </span>

          <div>
            <h1>Retensi Dokumen Medis</h1>
            <p>
              File hasil MCU mentah, hasil FU, dan dokumen rekomendasi disimpan
              6 bulan sejak tanggal upload. Setelah lewat masa retensi, file
              fisik dihapus namun metadata (status FIT/FU, tanggal, jumlah
              siklus) tetap tersimpan untuk audit.
            </p>
          </div>
        </div>

        <div className={styles.headActions}>
          <Link
            href="/hc/mcu"
            className={`${styles.tombol} ${styles.tombolNetral}`}
          >
            <ArrowLeft size={15} />
            Kembali
          </Link>

          {adalahHc ? (
            <button
              type="button"
              className={`${styles.tombol} ${styles.tombolBahaya}`}
              onClick={() => setDialogTerbuka(true)}
              disabled={proses || !ringkasan?.totalJatuhTempo}
            >
              <Trash2 size={15} />
              Jalankan Pembersihan ({ringkasan?.totalJatuhTempo ?? 0})
            </button>
          ) : null}
        </div>
      </div>

      {galat ? <Pesan jenis="error">{galat}</Pesan> : null}
      {sukses ? <Pesan jenis="sukses">{sukses}</Pesan> : null}

      {memuat ? (
        <Memuat />
      ) : ringkasan ? (
        <div className={styles.statGrid}>
          <article className={styles.statCard}>
            <div>
              <strong>{ringkasan.jatuhTempoHasilMcu}</strong>
              <p>Hasil MCU Jatuh Tempo</p>
            </div>
          </article>

          <article className={styles.statCard}>
            <div>
              <strong>{ringkasan.jatuhTempoHasilFollowUp}</strong>
              <p>Hasil FU Jatuh Tempo</p>
            </div>
          </article>

          <article className={styles.statCard}>
            <div>
              <strong>{ringkasan.jatuhTempoRekomendasi}</strong>
              <p>Rekomendasi Jatuh Tempo</p>
            </div>
          </article>

          <article className={`${styles.statCard} ${styles.statPenting}`}>
            <div>
              <strong>{ringkasan.totalJatuhTempo}</strong>
              <p>Total Perlu Dibersihkan</p>
            </div>
          </article>
        </div>
      ) : null}

      <Panel
        judul="Dokumen Mendekati/Sudah Jatuh Tempo"
        keterangan="Menampilkan dokumen dalam 30 hari ke depan, diurutkan dari yang paling mendesak."
      >
        {memuat ? (
          <Memuat />
        ) : semuaDokumen.length === 0 ? (
          <Kosong
            judul="Tidak ada dokumen jatuh tempo"
            keterangan="Seluruh dokumen medis masih dalam masa retensi aman."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Jenis Dokumen</th>
                  <th>Karyawan</th>
                  <th>File Asli</th>
                  <th>Tanggal Upload</th>
                  <th>Batas Retensi</th>
                  <th>Sisa Hari</th>
                </tr>
              </thead>

              <tbody>
                {semuaDokumen.map((item) => (
                  <tr key={`${item.jenis}-${item.id}`}>
                    <td>{item.jenis}</td>

                    <td>
                      <div className={styles.tableNama}>
                        <strong>{item.karyawan.nama}</strong>
                        <span>{item.karyawan.nik}</span>
                      </div>
                    </td>

                    <td>{item.namaFileAsli ?? '-'}</td>
                    <td>{formatTanggal(item.tanggalUpload)}</td>
                    <td>{formatTanggal(item.retensiHapusAt)}</td>

                    <td
                      style={{
                        color: item.sisaHari <= 0 ? '#b62b22' : '#96650a',
                        fontWeight: 700,
                      }}
                    >
                      {item.sisaHari <= 0
                        ? `Lewat ${Math.abs(item.sisaHari)} hari`
                        : `${item.sisaHari} hari lagi`}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {dialogTerbuka ? (
        <Dialog
          judul="Jalankan Pembersihan Retensi"
          keterangan={`${ringkasan?.totalJatuhTempo ?? 0} dokumen akan dihapus fisik dari server. Metadata tetap tersimpan untuk audit.`}
          onTutup={() => setDialogTerbuka(false)}
          aksi={
            <>
              <button
                type="button"
                className={`${styles.tombol} ${styles.tombolNetral}`}
                onClick={() => setDialogTerbuka(false)}
                disabled={proses}
              >
                Batal
              </button>

              <button
                type="button"
                className={`${styles.tombol} ${styles.tombolBahaya}`}
                onClick={jalankanPembersihan}
                disabled={proses}
              >
                {proses ? 'Memproses...' : 'Ya, Hapus File Fisik'}
              </button>
            </>
          }
        >
          <Pesan jenis="info">
            Tindakan ini tidak dapat dibatalkan. File fisik akan dihapus dari
            server, namun seluruh riwayat status dan tanggal tetap tercatat di
            halaman History.
          </Pesan>
        </Dialog>
      ) : null}
    </>
  );
}
