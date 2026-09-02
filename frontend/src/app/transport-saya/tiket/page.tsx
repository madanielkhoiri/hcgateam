'use client';

import { useEffect, useState } from 'react';
import { Download } from 'lucide-react';
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
  return `${formatTanggal(tanggal)}, ${jam} WIB`;
}

export default function TiketSayaPage() {
  const [data, setData] = useState<TransportTiket[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    transportApi.tiket
      .daftarSaya()
      .then(setData)
      .catch((err) => setError(err instanceof TransportApiError ? err.message : 'Riwayat tiket gagal dimuat'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 style={{ color: '#12355f', fontSize: 17, marginBottom: 12 }}>Riwayat Cuti & Tiket</h2>

      {error && <p className={styles.errorText}>{error}</p>}
      {loading && <p className={styles.emptyText}>Memuat...</p>}
      {!loading && !data.length && !error && (
        <p className={styles.emptyText}>Belum ada tiket cuti yang dikirim untuk Anda.</p>
      )}

      {data.map((tiket) => (
        <div key={tiket.id} className={styles.card}>
          <div className={styles.rowBetween}>
            <div>
              <h3>{LABEL_JENIS_TIKET[tiket.jenisTiket]}</h3>
              <p>Berangkat: {formatLeg(tiket.tanggalMulai, tiket.jamMulai)}</p>
              <p>Pulang: {formatLeg(tiket.tanggalSelesai, tiket.jamSelesai)}</p>
              <p>{tiket.keterangan || 'Tanpa keterangan'}</p>
            </div>
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
