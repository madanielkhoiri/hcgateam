'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TransportApiError, TravelSaya, transportApi } from '@/lib/transport-api';
import styles from '../transport-saya.module.css';

function formatWaktu(value: string): string {
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TravelSayaPage() {
  const [data, setData] = useState<TravelSaya[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    transportApi.travel
      .daftarSaya()
      .then(setData)
      .catch((err) => setError(err instanceof TransportApiError ? err.message : 'Jadwal Travel gagal dimuat'))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2 style={{ color: '#12355f', fontSize: 17, marginBottom: 12 }}>Jadwal Travel Saya</h2>

      {error && <p className={styles.errorText}>{error}</p>}
      {loading && <p className={styles.emptyText}>Memuat...</p>}
      {!loading && !data.length && !error && <p className={styles.emptyText}>Anda belum terdaftar di jadwal Travel manapun.</p>}

      {data.map((item) => (
        <Link key={item.id} href={`/transport-saya/travel/${item.travelId}`} className={styles.card} style={{ display: 'block' }}>
          <div className={styles.rowBetween}>
            <div>
              <h3>
                {item.travel.armada} — {item.travel.tujuan}
              </h3>
              <p>Berangkat: {formatWaktu(item.travel.waktuBerangkatRencana)}</p>
              <p>Driver: {item.travel.driver?.nama}</p>
            </div>
            <span className={`${styles.pill} ${item.checkInWaktu ? styles.pillGreen : styles.pillGray}`}>
              {item.checkInWaktu ? 'Sudah Check-in' : 'Belum Check-in'}
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
