'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Circle, Star } from 'lucide-react';
import { ACCESS_KEYS, getAccessToken, getStoredUser, hasAccess } from '@/lib/access-control';
import { TransportApiError, TravelJadwal, transportApi, urlFileTransport } from '@/lib/transport-api';
import styles from '@/components/transport/transport.module.css';

const LABEL_STATUS: Record<string, string> = {
  DIJADWALKAN: 'Dijadwalkan',
  BERJALAN: 'Berjalan',
  SELESAI: 'Selesai',
  DIBATALKAN: 'Dibatalkan',
};

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

function formatDurasi(menit: number | null): string {
  if (menit === null) return '-';
  const jam = Math.floor(menit / 60);
  const sisaMenit = menit % 60;
  return `${jam} jam ${sisaMenit} menit`;
}

export default function TravelDetailAdminPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);
  const [siap, setSiap] = useState(false);
  const [jadwal, setJadwal] = useState<TravelJadwal | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const token = getAccessToken();
    const user = getStoredUser();

    if (!token || !user) {
      router.replace('/login');
      return;
    }

    if (!hasAccess(user, ACCESS_KEYS.GA_TRANSPORT_TRAVEL)) {
      router.replace('/ga/transport/dashboard');
      return;
    }

    setSiap(true);
  }, [router]);

  useEffect(() => {
    if (!siap) return;
    transportApi.travel
      .detailJadwalAdmin(id)
      .then(setJadwal)
      .catch((err) => setError(err instanceof TransportApiError ? err.message : 'Jadwal tidak ditemukan'));
  }, [siap, id]);

  if (!siap) return null;

  return (
    <section>
      <Link
        href="/ga/transport/travel"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14, color: '#385675', fontSize: 13, fontWeight: 700 }}
      >
        <ArrowLeft size={16} /> Kembali ke daftar Travel
      </Link>

      {error && <p className={styles.pageError}>{error}</p>}

      {jadwal && (
        <>
          <div className={styles.hero}>
            <div>
              <div>
                <h1>
                  {jadwal.armada} — {jadwal.tujuan}
                </h1>
                <p>
                  Driver: <b>{jadwal.driver?.nama}</b> · Berangkat: {formatWaktu(jadwal.waktuBerangkatRencana)} · Status:{' '}
                  <b>{LABEL_STATUS[jadwal.status]}</b>
                </p>
              </div>
            </div>
          </div>

          <div className={styles.grid} style={{ marginBottom: 18 }}>
            <div className={styles.panel}>
              <h3>Check-in / Check-out Driver</h3>
              {jadwal.driverCheckInFoto && (
                <img
                  src={urlFileTransport(jadwal.driverCheckInFoto)}
                  alt="Foto check-in driver"
                  style={{ width: '100%', maxWidth: 280, borderRadius: 12, marginBottom: 12 }}
                />
              )}
              <p>Check-in berangkat: {formatWaktu(jadwal.driverCheckIn)}</p>
              <p>Check-out sampai tujuan: {formatWaktu(jadwal.driverCheckOut)}</p>
              <p>Durasi tempuh: <b>{formatDurasi(jadwal.durasiMenit)}</b></p>
            </div>

            <div className={styles.panel}>
              <h3>Info Jadwal</h3>
              <p>Asal: {jadwal.asal || '-'}</p>
              <p>Tujuan: {jadwal.tujuan}</p>
              <p>Catatan: {jadwal.catatan || '-'}</p>
              <p>Jumlah penumpang: {jadwal.penumpang?.length ?? 0}</p>
            </div>
          </div>

          <div className={styles.tablePanel}>
            <div className={styles.tableTitle}>
              <h3>Roster Penumpang</h3>
              <span>
                {jadwal.penumpang?.filter((p) => p.checkInWaktu).length ?? 0} dari {jadwal.penumpang?.length ?? 0} sudah check-in
              </span>
            </div>
            <div className={styles.tableScroll}>
              <table>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nama</th>
                    <th>Departemen</th>
                    <th>Check-in</th>
                    <th>Check-out</th>
                    <th>Rating</th>
                    <th>Ulasan</th>
                  </tr>
                </thead>
                <tbody>
                  {jadwal.penumpang?.map((p, index) => (
                    <tr key={p.id}>
                      <td>{index + 1}</td>
                      <td>
                        <b>{p.karyawan?.nama}</b>
                      </td>
                      <td>{p.karyawan?.departemen?.namaDepartemen ?? '-'}</td>
                      <td>
                        {p.checkInWaktu ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#087848' }}>
                            <CheckCircle2 size={14} /> {formatWaktu(p.checkInWaktu)}
                          </span>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#b02031' }}>
                            <Circle size={14} /> Belum
                          </span>
                        )}
                      </td>
                      <td>
                        {p.checkOutWaktu ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#087848' }}>
                            <CheckCircle2 size={14} /> {formatWaktu(p.checkOutWaktu)}
                          </span>
                        ) : (
                          <span style={{ color: '#8a9bb0' }}>Belum</span>
                        )}
                      </td>
                      <td>
                        {p.ratingBintang ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 2, color: '#e8a527' }}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star key={i} size={13} fill={i < (p.ratingBintang ?? 0) ? '#e8a527' : 'none'} />
                            ))}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>{p.ratingUlasan || '-'}</td>
                    </tr>
                  ))}
                  {!jadwal.penumpang?.length && (
                    <tr>
                      <td colSpan={7} className={styles.empty}>
                        Belum ada penumpang.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
