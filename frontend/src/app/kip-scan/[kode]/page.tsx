'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, X } from 'lucide-react';
import { getStoredUser } from '@/lib/access-control';
import { ambilLokasiGps, Kip, KipApiError, LABEL_LOKASI_KIP, StatusLokasi, kipApi } from '@/lib/kip-api';
import { KipCard3D, statusTampilBulan } from '@/components/kip/kip-card-3d';
import styles from '../kip-scan.module.css';

const ROLE_BOLEH_CEKLIS = ['ELEKTRIK', 'ADMIN', 'SUPER_ADMIN'];
const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export default function KipScanDetailPage() {
  const params = useParams<{ kode: string }>();
  const kode = decodeURIComponent(params.kode);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [data, setData] = useState<StatusLokasi | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [kameraSiap, setKameraSiap] = useState(false);

  const user = typeof window !== 'undefined' ? getStoredUser() : null;
  const bolehCeklis = !!user && ROLE_BOLEH_CEKLIS.includes(user.role);
  const bulanIni = new Date().getMonth() + 1;

  async function muat() {
    try {
      setError('');
      setData(await kipApi.statusByKode(kode));
    } catch (err) {
      setError(err instanceof KipApiError ? err.message : 'Lokasi tidak ditemukan');
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void muat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kode]);

  // Nyalakan kamera sebagai latar (hanya tampilan, tidak scan apa-apa lagi —
  // lokasinya sudah diketahui dari link). Kalau gagal/ditolak, tampilan
  // jatuh balik ke kartu statis tanpa kamera — tetap berfungsi penuh.
  useEffect(() => {
    let batal = false;

    async function nyalakanKamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        });

        if (batal) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        setKameraSiap(true);
        requestAnimationFrame(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            void videoRef.current.play();
          }
        });
      } catch {
        // Diamkan — jatuh balik ke tampilan tanpa kamera.
      }
    }

    void nyalakanKamera();

    return () => {
      batal = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function ceklis(kip: Kip) {
    setBusyId(kip.id);
    setError('');
    try {
      const posisi = await ambilLokasiGps().catch(() => undefined);
      await kipApi.ceklis(kip.id, bulanIni, posisi);
      await muat();
    } catch (err) {
      setError(err instanceof KipApiError ? err.message : 'Ceklis gagal disimpan');
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className={styles.shell}>
        <p className={styles.emptyText}>Memuat...</p>
      </div>
    );
  }

  const isiSheet = (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
        <div>
          <strong style={{ fontSize: 15 }}>{data ? LABEL_LOKASI_KIP[data.lokasi] : kode}</strong>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>{data?.kip.length ?? 0} KIP terdaftar</div>
        </div>
        <Link href="/kip-scan" className={styles.arScanLagi}>
          Scan Lokasi Lain
        </Link>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}

      {data?.kip.map((kip) => {
        const statusBulanIni = statusTampilBulan(kip, bulanIni);
        const sudahDiceklis = statusBulanIni === 'SUDAH';

        return (
          <div key={kip.id} className={styles.arKipBlock}>
            <strong style={{ fontSize: 14 }}>{kip.noKip}</strong>
            <p style={{ margin: '2px 0 6px', fontSize: 12.5, color: 'rgba(255,255,255,.65)' }}>
              {kip.jenisPeralatan} — {kip.departemen} — Tahun {kip.tahun}
            </p>

            <span
              className={`${styles.pill} ${
                sudahDiceklis ? styles.pillGreen : statusBulanIni === 'KUNING' ? styles.pillYellow : styles.pillGray
              }`}
            >
              {sudahDiceklis ? <CheckCircle2 size={12} /> : null}
              {sudahDiceklis ? `Sudah diceklis bulan ${NAMA_BULAN[bulanIni - 1]}` : `Belum diceklis bulan ${NAMA_BULAN[bulanIni - 1]}`}
            </span>

            {bolehCeklis && !sudahDiceklis && (
              <div className={styles.ceklisBar}>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>Login: {user?.name}</span>
                <button className={styles.primaryButton} disabled={busyId === kip.id} onClick={() => ceklis(kip)}>
                  {busyId === kip.id ? 'Menyimpan...' : 'Ceklis Sekarang'}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {data && !data.kip.length && <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13 }}>Belum ada KIP terdaftar di lokasi ini.</p>}
    </>
  );

  // Kamera jalan — tampilan AR, sama seperti hasil scan lewat halaman /kip-scan.
  if (kameraSiap) {
    return (
      <div className={styles.arShell}>
        {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
        <video ref={videoRef} muted playsInline className={styles.arVideo} />

        <div className={styles.arTopBar}>
          <Link href="/">
            <X size={20} /> Tutup
          </Link>
          <strong style={{ fontSize: 13 }}>KIP</strong>
          <span style={{ width: 20 }} />
        </div>

        {data && (
          <div className={styles.arCardLayer}>
            {data.kip[0] && <KipCard3D kip={data.kip[0]} tinggi="100%" transparan />}
          </div>
        )}

        <div className={styles.arSheet}>
          <div className={styles.arSheetHandle} />
          {isiSheet}
        </div>
      </div>
    );
  }

  // Kamera tidak tersedia/ditolak — tetap berfungsi penuh, tanpa latar kamera.
  return (
    <div className={styles.shell}>
      <div className={styles.topbar}>
        <Link href="/kip-scan" style={{ color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 6, textDecoration: 'none' }}>
          Scan Lagi
        </Link>
        <strong>{kode}</strong>
      </div>
      <div className={styles.main}>
        {data?.kip[0] && (
          <div className={styles.scanCard}>
            <KipCard3D kip={data.kip[0]} tinggi={320} />
          </div>
        )}
        <div className={styles.statusCard}>{isiSheet}</div>
      </div>
    </div>
  );
}
