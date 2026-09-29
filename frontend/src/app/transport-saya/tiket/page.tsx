'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Download, FileText, PlaneTakeoff } from 'lucide-react';
import {
  LABEL_JENIS_TIKET,
  TransportApiError,
  TransportTiket,
  transportApi,
  urlFileTransport,
} from '@/lib/transport-api';
import styles from '../transport-saya.module.css';

function formatTanggal(value: string | null): string {
  if (!value) return '-';
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatLeg(tanggal: string | null, jam: string | null): string {
  if (!tanggal || !jam) return 'Belum ada jadwal';
  return `${formatTanggal(tanggal)}, ${jam} WITA`;
}

function hitungHariCuti(tiket: TransportTiket): number {
  if (!tiket.tanggalMulai || !tiket.tanggalSelesai) return 0;
  const mulai = new Date(`${tiket.tanggalMulai.slice(0, 10)}T00:00:00`);
  const selesai = new Date(`${tiket.tanggalSelesai.slice(0, 10)}T00:00:00`);
  const hari = Math.floor((selesai.getTime() - mulai.getTime()) / 86400000) + 1;
  return hari > 0 ? hari : 0;
}

function jenisPerjalanan(keterangan: string | null): string {
  if (keterangan?.toLowerCase().startsWith('selamat menjalankan perjalanan dinas')) return 'Perjalanan Dinas';
  if (keterangan?.toLowerCase().startsWith('selamat mengikuti training')) return 'Training';
  return 'Cuti';
}

function teksKeterangan(keterangan: string | null): string {
  return keterangan || 'Selamat Cuti';
}

export default function TiketSayaPage() {
  const [data, setData] = useState<TransportTiket[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const totalCuti = data.reduce((total, tiket) => total + hitungHariCuti(tiket), 0);

  useEffect(() => {
    transportApi.tiket
      .daftarSaya()
      .then(setData)
      .catch((err) => setError(err instanceof TransportApiError ? err.message : 'Riwayat tiket gagal dimuat'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.pageWrap}>
      <div className={styles.hero}>
        <div>
          <div className={styles.eyebrow}>TIKET PERJALANAN</div>
          <h2>Riwayat Tiket</h2>
          <p>Kelola tiket cuti, perjalanan dinas, dan training.</p>
        </div>
        <div className={styles.heroIcon}><PlaneTakeoff size={28} /></div>
      </div>

      {!loading && !error && data.length > 0 && (
        <div className={styles.summaryGrid}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryIcon}><CalendarDays size={20} /></div>
            <div><span>Total hari perjalanan</span><strong>{totalCuti} hari</strong><small>Dihitung dari tanggal berangkat sampai pulang</small></div>
          </div>
          <div className={styles.summaryCard}>
            <div className={styles.summaryIconBlue}><FileText size={20} /></div>
            <div><span>Total tiket</span><strong>{data.length}</strong><small>Riwayat tiket yang diterima</small></div>
          </div>
        </div>
      )}

      {error && <p className={styles.errorText}>{error}</p>}
      {loading && <p className={styles.emptyText}>Memuat...</p>}
      {!loading && !data.length && !error && (
        <p className={styles.emptyText}>Belum ada tiket cuti yang dikirim untuk Anda.</p>
      )}

      {data.map((tiket) => (
        <div key={tiket.id} className={styles.card}>
          <div className={styles.rowBetween}>
            <div>
              <div className={styles.cardLabel}>{jenisPerjalanan(tiket.keterangan).toUpperCase()}</div>
              <h3>{LABEL_JENIS_TIKET[tiket.jenisTiket]}</h3>
              <p className={styles.dateLine}>Berangkat: {formatLeg(tiket.tanggalMulai, tiket.jamMulai)}</p>
              <p className={styles.dateLine}>Pulang: {formatLeg(tiket.tanggalSelesai, tiket.jamSelesai)}</p>
              <p className={styles.description}><span>Keterangan</span>{teksKeterangan(tiket.keterangan)}</p>
            </div>
            <div className={styles.daysBadge}>{hitungHariCuti(tiket)}<span>hari</span></div>
          </div>
          <div>
            {tiket.files.map((f) => (
              <a key={f.id} href={urlFileTransport(f.fileUrl)} target="_blank" rel="noreferrer" className={styles.fileLink}>
                <Download size={14} /> {f.namaFile}
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
