'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TransportApiError, TripDriver, transportApi } from '@/lib/transport-api';
import styles from '../transport-saya.module.css';

const LABEL_STATUS: Record<string, string> = {
  DIJADWALKAN: 'Dijadwalkan',
  BERJALAN: 'Berjalan',
  SELESAI: 'Selesai',
  DIBATALKAN: 'Dibatalkan',
};

function formatWaktu(value: string): string {
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DriverTripListPage() {
  const [data, setData] = useState<TripDriver[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    transportApi.travel
      .daftarTripSaya()
      .then(setData)
      .catch((err) => setError(err instanceof TransportApiError ? err.message : 'Trip gagal dimuat'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 style={{ color: '#12355f', fontSize: 17, marginBottom: 12 }}>Trip Saya</h2>

      {error && <p className={styles.errorText}>{error}</p>}
      {loading && <p className={styles.emptyText}>Memuat...</p>}
      {!loading && !data.length && !error && <p className={styles.emptyText}>Belum ada trip yang ditugaskan ke Anda.</p>}

      {data.map((trip) => (
        <Link key={trip.id} href={`/transport-saya/driver/${trip.id}`} className={styles.card} style={{ display: 'block' }}>
          <div className={styles.rowBetween}>
            <div>
              <h3>
                {trip.armada} — {trip.tujuan}
              </h3>
              <p>Berangkat: {formatWaktu(trip.waktuBerangkatRencana)}</p>
              <p>
                {trip.jumlahCheckin} dari {trip.jumlahPenumpang} penumpang sudah check-in
              </p>
            </div>
            <span
              className={`${styles.pill} ${
                trip.status === 'SELESAI' ? styles.pillGreen : trip.status === 'BERJALAN' ? styles.pillBlue : styles.pillGray
              }`}
            >
              {LABEL_STATUS[trip.status]}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
