'use client';

// ==================================================
// FILE: frontend/src/components/pengaduan-layanan/daftar-pengaduan-tabel.tsx
// FUNGSI: Tabel Daftar Pengaduan (bulan berjalan) + aksi Approve/Hold/Reject.
// Dipakai bersama di halaman utama Pengaduan Layanan (di bawah tombol Rekap
// Performa) dan di halaman Rekap Performa itu sendiri.
// ==================================================

import { useEffect, useState } from 'react';
import {
  pengaduanLayananApi,
  PengaduanLayananApiError,
  LABEL_LOKASI_PENGADUAN,
  LABEL_STATUS_PENGADUAN,
  urlFotoPengaduan,
  type DivisiPengaduan,
  type RekapPengaduan,
  type StatusPengaduan,
} from '@/lib/pengaduan-layanan-api';
import styles from './pengaduan-layanan.module.css';

const KELAS_STATUS: Record<StatusPengaduan, string> = {
  MENUNGGU: 'statusMenunggu',
  DISETUJUI: 'statusDisetujui',
  DITAHAN: 'statusDitahan',
  DITOLAK: 'statusDitolak',
};

export function DaftarPengaduanTabel({
  divisi,
  bulan,
  tahun,
}: {
  divisi: DivisiPengaduan;
  /** Opsional — default bulan/tahun berjalan bila tidak diisi (dipakai di halaman utama). */
  bulan?: number;
  tahun?: number;
}) {
  const [rekap, setRekap] = useState<RekapPengaduan | null>(null);
  const [error, setError] = useState('');
  const [memuat, setMemuat] = useState(true);
  const [prosesId, setProsesId] = useState<number | null>(null);

  useEffect(() => {
    let aktif = true;
    setMemuat(true);
    setError('');

    pengaduanLayananApi
      .rekap(divisi, bulan, tahun)
      .then((hasil) => {
        if (aktif) setRekap(hasil);
      })
      .catch((err: unknown) => {
        if (!aktif) return;
        setError(
          err instanceof PengaduanLayananApiError
            ? err.message
            : 'Gagal memuat daftar pengaduan.',
        );
      })
      .finally(() => {
        if (aktif) setMemuat(false);
      });

    return () => {
      aktif = false;
    };
  }, [divisi, bulan, tahun]);

  async function muatUlangRekap() {
    try {
      const hasil = await pengaduanLayananApi.rekap(divisi, bulan, tahun);
      setRekap(hasil);
    } catch (err) {
      setError(
        err instanceof PengaduanLayananApiError ? err.message : 'Gagal memuat ulang daftar pengaduan.',
      );
    }
  }

  async function ubahStatus(id: number, status: 'DISETUJUI' | 'DITAHAN' | 'DITOLAK') {
    let catatan: string | undefined;

    if (status !== 'DISETUJUI') {
      const label = status === 'DITAHAN' ? 'Hold' : 'Reject';
      const input = window.prompt(`Catatan untuk ${label} (wajib diisi):`);
      if (input === null) return;
      if (!input.trim()) {
        setError('Catatan wajib diisi untuk Hold/Reject.');
        return;
      }
      catatan = input.trim();
    }

    setProsesId(id);
    setError('');

    try {
      await pengaduanLayananApi.ubahStatus(id, status, catatan);
      await muatUlangRekap();
    } catch (err) {
      setError(
        err instanceof PengaduanLayananApiError ? err.message : 'Gagal mengubah status pengaduan.',
      );
    } finally {
      setProsesId(null);
    }
  }

  return (
    <div className={styles.daftarCard}>
      <span className={styles.statLabel}>Daftar Pengaduan Bulan Ini</span>

      {error && <p className={styles.error}>{error}</p>}

      {memuat ? (
        <p className={styles.memuat}>Memuat...</p>
      ) : !rekap || rekap.daftar.length === 0 ? (
        <p className={styles.kosong}>Belum ada pengaduan pada periode ini.</p>
      ) : (
        <table className={styles.tabel}>
          <thead>
            <tr>
              <th>Tanggal</th>
              <th>Pengirim</th>
              <th>Lokasi</th>
              <th>Rating</th>
              <th>Komentar</th>
              <th>Aduan Layanan</th>
              <th>Foto</th>
              <th>Status</th>
              <th>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rekap.daftar.map((item) => (
              <tr key={item.id}>
                <td>
                  {new Intl.DateTimeFormat('id-ID', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  }).format(new Date(item.createdAt))}
                </td>
                <td>{item.pengirim}</td>
                <td>{item.lokasi ? LABEL_LOKASI_PENGADUAN[item.lokasi] : '-'}</td>
                <td>{'★'.repeat(item.rating)}</td>
                <td>{item.komentar || '-'}</td>
                <td>{item.deskripsiAduan || '-'}</td>
                <td>
                  {item.foto.length > 0 ? (
                    <div className={styles.fotoLinkRow}>
                      {item.foto.map((f) => (
                        <a
                          key={f.id}
                          href={urlFotoPengaduan(f.urlFoto)}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.fotoThumb}
                          title={f.namaFile}
                        >
                          <img src={urlFotoPengaduan(f.urlFoto)} alt={f.namaFile} />
                        </a>
                      ))}
                    </div>
                  ) : (
                    '-'
                  )}
                </td>
                <td>
                  <span className={`${styles.statusBadge} ${styles[KELAS_STATUS[item.status]]}`}>
                    {LABEL_STATUS_PENGADUAN[item.status]}
                  </span>
                  {item.catatanAdmin && (
                    <div className={styles.catatanAdmin}>&ldquo;{item.catatanAdmin}&rdquo;</div>
                  )}
                </td>
                <td>
                  {item.status === 'MENUNGGU' ? (
                    <div className={styles.aksiGroup}>
                      <button
                        type="button"
                        className={`${styles.tombolAksi} ${styles.tombolApprove}`}
                        disabled={prosesId === item.id}
                        onClick={() => ubahStatus(item.id, 'DISETUJUI')}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className={`${styles.tombolAksi} ${styles.tombolHold}`}
                        disabled={prosesId === item.id}
                        onClick={() => ubahStatus(item.id, 'DITAHAN')}
                      >
                        Hold
                      </button>
                      <button
                        type="button"
                        className={`${styles.tombolAksi} ${styles.tombolReject}`}
                        disabled={prosesId === item.id}
                        onClick={() => ubahStatus(item.id, 'DITOLAK')}
                      >
                        Reject
                      </button>
                    </div>
                  ) : (
                    '-'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
