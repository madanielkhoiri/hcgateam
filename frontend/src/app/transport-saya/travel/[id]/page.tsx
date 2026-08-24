'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { Star, UserRound } from 'lucide-react';
import { TransportApiError, TravelJadwal, TravelPenumpang, transportApi } from '@/lib/transport-api';
import styles from '../../transport-saya.module.css';

const JENDELA_CHECKIN_MS = 2 * 60 * 60 * 1000;

function formatWaktu(value: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function TravelSayaDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [jadwal, setJadwal] = useState<TravelJadwal | null>(null);
  const [penumpangSaya, setPenumpangSaya] = useState<TravelPenumpang | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [bintang, setBintang] = useState(0);
  const [ulasan, setUlasan] = useState('');
  const [now, setNow] = useState(() => Date.now());

  async function muat() {
    try {
      setError('');
      const hasil = await transportApi.travel.detailSaya(id);
      setJadwal(hasil.jadwal);
      setPenumpangSaya(hasil.penumpangSaya);
    } catch (err) {
      setError(err instanceof TransportApiError ? err.message : 'Jadwal tidak ditemukan');
    }
  }

  useEffect(() => {
    void muat();
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [id]);

  const bolehCheckin = useMemo(() => {
    if (!jadwal) return false;
    const sisaMs = new Date(jadwal.waktuBerangkatRencana).getTime() - now;
    return sisaMs <= JENDELA_CHECKIN_MS;
  }, [jadwal, now]);

  async function checkin() {
    setBusy(true);
    setError('');
    try {
      await transportApi.travel.checkin(id);
      await muat();
    } catch (err) {
      setError(err instanceof TransportApiError ? err.message : 'Check-in gagal');
    } finally {
      setBusy(false);
    }
  }

  async function checkout() {
    setBusy(true);
    setError('');
    try {
      await transportApi.travel.checkout(id);
      await muat();
    } catch (err) {
      setError(err instanceof TransportApiError ? err.message : 'Check-out gagal');
    } finally {
      setBusy(false);
    }
  }

  async function kirimRating() {
    if (!bintang) {
      setError('Pilih rating bintang terlebih dahulu');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await transportApi.travel.rating(id, { bintang, ulasan: ulasan || undefined });
      await muat();
    } catch (err) {
      setError(err instanceof TransportApiError ? err.message : 'Rating gagal dikirim');
    } finally {
      setBusy(false);
    }
  }

  if (!jadwal || !penumpangSaya) {
    return error ? <p className={styles.errorText}>{error}</p> : <p className={styles.emptyText}>Memuat...</p>;
  }

  return (
    <div>
      <div className={styles.card}>
        <h3>
          {jadwal.armada} — {jadwal.tujuan}
        </h3>
        <p>Driver: {jadwal.driver?.nama}</p>
        <p>Berangkat rencana: {formatWaktu(jadwal.waktuBerangkatRencana)}</p>
        {jadwal.catatan && <p>Catatan: {jadwal.catatan}</p>}
      </div>

      <div className={styles.card}>
        <h3>
          <UserRound size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Rekan Perjalanan
        </h3>
        {jadwal.penumpang
          ?.filter((p) => p.id !== penumpangSaya.id)
          .map((p) => (
            <p key={p.id}>{p.karyawan?.nama}</p>
          ))}
        {(jadwal.penumpang?.length ?? 0) <= 1 && <p>Anda satu-satunya penumpang jadwal ini.</p>}
      </div>

      <div className={styles.card}>
        <h3>Status Perjalanan Saya</h3>

        {!penumpangSaya.checkInWaktu && (
          <>
            <button className={styles.primaryButton} disabled={busy || !bolehCheckin} onClick={checkin}>
              Check-in Sekarang
            </button>
            {!bolehCheckin && (
              <p className={styles.hint}>Check-in baru bisa dilakukan mulai H-2 jam sebelum waktu berangkat.</p>
            )}
          </>
        )}

        {penumpangSaya.checkInWaktu && !penumpangSaya.checkOutWaktu && (
          <>
            <p className={`${styles.pill} ${styles.pillGreen}`}>Check-in: {formatWaktu(penumpangSaya.checkInWaktu)}</p>
            <div style={{ marginTop: 10 }}>
              <button className={styles.primaryButton} disabled={busy} onClick={checkout}>
                Check-out Sampai Tujuan
              </button>
            </div>
          </>
        )}

        {penumpangSaya.checkOutWaktu && (
          <>
            <p className={`${styles.pill} ${styles.pillGreen}`}>Check-in: {formatWaktu(penumpangSaya.checkInWaktu)}</p>
            <p className={`${styles.pill} ${styles.pillGreen}`} style={{ marginTop: 6 }}>
              Check-out: {formatWaktu(penumpangSaya.checkOutWaktu)}
            </p>
          </>
        )}
      </div>

      {penumpangSaya.checkOutWaktu && !penumpangSaya.ratingBintang && (
        <div className={styles.card}>
          <h3>Beri Rating Perjalanan</h3>
          <div className={styles.starRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                className={`${styles.starButton} ${n <= bintang ? styles.starButtonActive : ''}`}
                onClick={() => setBintang(n)}
              >
                <Star size={28} fill={n <= bintang ? '#e8a527' : 'none'} />
              </button>
            ))}
          </div>
          <textarea
            className={styles.textarea}
            placeholder="Ulasan atau kritik (opsional)"
            value={ulasan}
            onChange={(e) => setUlasan(e.target.value)}
          />
          <div style={{ marginTop: 10 }}>
            <button className={styles.primaryButton} disabled={busy} onClick={kirimRating}>
              Kirim Rating
            </button>
          </div>
        </div>
      )}

      {penumpangSaya.ratingBintang && (
        <div className={styles.card}>
          <h3>Rating Anda</h3>
          <div className={styles.starRow}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={22} fill={i < (penumpangSaya.ratingBintang ?? 0) ? '#e8a527' : 'none'} color="#e8a527" />
            ))}
          </div>
          {penumpangSaya.ratingUlasan && <p>{penumpangSaya.ratingUlasan}</p>}
        </div>
      )}

      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}
