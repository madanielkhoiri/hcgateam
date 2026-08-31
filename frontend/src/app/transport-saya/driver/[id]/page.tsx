'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { Camera, CheckCircle2, Circle, RotateCcw, Upload } from 'lucide-react';
import { TransportApiError, TravelJadwal, transportApi, urlFileTransport } from '@/lib/transport-api';
import { compressImage } from '@/lib/compress-image';
import styles from '../../transport-saya.module.css';

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

export default function DriverTripDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);

  const [jadwal, setJadwal] = useState<TravelJadwal | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [foto, setFoto] = useState<File | null>(null);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);

  const [kameraAktif, setKameraAktif] = useState(false);
  const [kameraError, setKameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  async function muat() {
    try {
      setError('');
      setJadwal(await transportApi.travel.detailTrip(id));
    } catch (err) {
      setError(err instanceof TransportApiError ? err.message : 'Trip tidak ditemukan');
    }
  }

  useEffect(() => {
    void muat();
  }, [id]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  async function pilihFoto(file: File | null) {
    if (!file) {
      setFoto(null);
      setPreviewFoto(null);
      return;
    }

    let fotoTerkompres = file;
    try {
      fotoTerkompres = await compressImage(file);
    } catch {
      // Kompresi gagal (jarang terjadi) — tetap pakai file asli daripada memblokir check-in.
    }

    setFoto(fotoTerkompres);
    setPreviewFoto(URL.createObjectURL(fotoTerkompres));
  }

  async function bukaKamera() {
    setKameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      streamRef.current = stream;
      setKameraAktif(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      setKameraError('Kamera tidak dapat diakses. Pastikan izin kamera diaktifkan, atau unggah foto secara manual.');
    }
  }

  function tutupKamera() {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setKameraAktif(false);
  }

  function ambilFoto() {
    const video = videoRef.current;
    if (!video) return;

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx?.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        void pilihFoto(new File([blob], `checkin-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        tutupKamera();
      },
      'image/jpeg',
      0.92,
    );
  }

  async function checkin() {
    if (!foto) {
      setError('Foto check-in wajib dipilih terlebih dahulu');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await transportApi.travel.driverCheckin(id, foto);
      setFoto(null);
      setPreviewFoto(null);
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
      await transportApi.travel.driverCheckout(id);
      await muat();
    } catch (err) {
      setError(err instanceof TransportApiError ? err.message : 'Check-out gagal');
    } finally {
      setBusy(false);
    }
  }

  if (!jadwal) {
    return error ? <p className={styles.errorText}>{error}</p> : <p className={styles.emptyText}>Memuat...</p>;
  }

  const jumlahCheckin = jadwal.penumpang?.filter((p) => p.checkInWaktu).length ?? 0;
  const jumlahPenumpang = jadwal.penumpang?.length ?? 0;

  return (
    <div>
      <div className={styles.card}>
        <h3>
          {jadwal.armada} — {jadwal.tujuan}
        </h3>
        <p>Berangkat rencana: {formatWaktu(jadwal.waktuBerangkatRencana)}</p>
        <p>
          {jumlahCheckin} dari {jumlahPenumpang} penumpang sudah check-in
        </p>
      </div>

      <div className={styles.card}>
        <h3>Check-in / Check-out Perjalanan</h3>

        {!jadwal.driverCheckIn && (
          <>
            {!kameraAktif && !previewFoto && (
              <>
                <button type="button" className={styles.photoInput} style={{ width: '100%', border: '2px dashed #9bcfb7' }} onClick={bukaKamera}>
                  <Camera />
                  <strong>Buka Kamera Check-in</strong>
                  <span>Foto diambil langsung real-time, wajib sebelum check-in keberangkatan</span>
                </button>
                {kameraError && <p className={styles.errorText} style={{ marginTop: 8 }}>{kameraError}</p>}
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    marginTop: 8,
                    fontSize: 12,
                    color: '#71839d',
                    cursor: 'pointer',
                  }}
                >
                  <Upload size={13} /> atau unggah foto dari galeri
                  <input
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={(e) => void pilihFoto(e.target.files?.[0] ?? null)}
                  />
                </label>
              </>
            )}

            {kameraAktif && (
              <div>
                <video ref={videoRef} muted playsInline style={{ width: '100%', maxWidth: 320, borderRadius: 12, background: '#000' }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  <button type="button" className={styles.primaryButton} onClick={ambilFoto}>
                    Ambil Foto
                  </button>
                  <button type="button" className={styles.secondaryButton} onClick={tutupKamera}>
                    Batal
                  </button>
                </div>
              </div>
            )}

            {previewFoto && !kameraAktif && (
              <div>
                <img src={previewFoto} alt="Preview foto check-in" className={styles.photoPreview} />
                <div style={{ marginTop: 8 }}>
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={() => {
                      void pilihFoto(null);
                      void bukaKamera();
                    }}
                  >
                    <RotateCcw size={14} /> Ambil Ulang
                  </button>
                </div>
              </div>
            )}

            <div style={{ marginTop: 10 }}>
              <button className={styles.primaryButton} disabled={busy || !foto || kameraAktif} onClick={checkin}>
                Check-in Keberangkatan
              </button>
            </div>
          </>
        )}

        {jadwal.driverCheckIn && (
          <>
            {jadwal.driverCheckInFoto && (
              <img src={urlFileTransport(jadwal.driverCheckInFoto)} alt="Foto check-in" className={styles.photoPreview} />
            )}
            <p className={`${styles.pill} ${styles.pillGreen}`} style={{ marginTop: 8 }}>
              Check-in: {formatWaktu(jadwal.driverCheckIn)}
            </p>

            {!jadwal.driverCheckOut && (
              <div style={{ marginTop: 10 }}>
                <button className={styles.primaryButton} disabled={busy} onClick={checkout}>
                  Check-out Sampai Tujuan
                </button>
              </div>
            )}

            {jadwal.driverCheckOut && (
              <>
                <p className={`${styles.pill} ${styles.pillGreen}`} style={{ marginTop: 6 }}>
                  Check-out: {formatWaktu(jadwal.driverCheckOut)}
                </p>
                <p style={{ marginTop: 8 }}>
                  Durasi tempuh: <b>{formatDurasi(jadwal.durasiMenit)}</b>
                </p>
              </>
            )}
          </>
        )}
      </div>

      <div className={styles.card}>
        <h3>Roster Penumpang</h3>
        {jadwal.penumpang?.map((p) => (
          <div key={p.id} className={styles.rowBetween} style={{ marginBottom: 8 }}>
            <span>{p.karyawan?.nama}</span>
            {p.checkInWaktu ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#087848', fontSize: 12 }}>
                <CheckCircle2 size={14} /> Check-in
              </span>
            ) : (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#b02031', fontSize: 12 }}>
                <Circle size={14} /> Belum
              </span>
            )}
          </div>
        ))}
        {!jadwal.penumpang?.length && <p className={styles.emptyText}>Belum ada penumpang.</p>}
      </div>

      {error && <p className={styles.errorText}>{error}</p>}
    </div>
  );
}
