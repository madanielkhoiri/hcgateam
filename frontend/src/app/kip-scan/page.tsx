'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Camera, CheckCircle2, ScanLine, X } from 'lucide-react';
import { getStoredUser } from '@/lib/access-control';
import { ambilLokasiGps, Kip, KipApiError, KipChecklistBulan, LABEL_LOKASI_KIP, StatusLokasi, kipApi } from '@/lib/kip-api';
import { KipCard3D, statusTampilBulan } from '@/components/kip/kip-card-3d';
import { KipCeklisForm } from '@/components/kip/kip-ceklis-form';
import { KipDetailBulan } from '@/components/kip/kip-detail-bulan';
import styles from './kip-scan.module.css';

const ROLE_BOLEH_CEKLIS = ['ELEKTRIK', 'ADMIN', 'SUPER_ADMIN'];
const NAMA_BULAN = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/** QR yang dicetak isinya URL lengkap (.../kip-scan/OFFICE) — ambil kode lokasinya saja. */
function ekstrakKode(teks: string): string {
  try {
    const url = new URL(teks);
    const bagian = url.pathname.split('/').filter(Boolean);
    return decodeURIComponent(bagian[bagian.length - 1] ?? teks);
  } catch {
    return teks.trim();
  }
}

export default function KipScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<{ stop: () => void } | null>(null);
  const terkunciRef = useRef(false);

  const [kameraAktif, setKameraAktif] = useState(false);
  const [kameraError, setKameraError] = useState('');
  const [manual, setManual] = useState('');

  const [data, setData] = useState<StatusLokasi | null>(null);
  const [hasilError, setHasilError] = useState('');
  const [mencari, setMencari] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [formTarget, setFormTarget] = useState<number | null>(null);
  const [ceklisError, setCeklisError] = useState<string | null>(null);
  const [detailBulan, setDetailBulan] = useState<KipChecklistBulan | null>(null);

  const user = typeof window !== 'undefined' ? getStoredUser() : null;
  const bolehCeklis = !!user && ROLE_BOLEH_CEKLIS.includes(user.role);
  const bulanIni = new Date().getMonth() + 1;

  async function prosesKode(teksMentah: string) {
    if (terkunciRef.current) return;
    terkunciRef.current = true;

    const kode = ekstrakKode(teksMentah);
    setMencari(true);
    setHasilError('');

    try {
      setData(await kipApi.statusByKode(kode));
    } catch (err) {
      setHasilError(err instanceof KipApiError ? err.message : 'Lokasi tidak ditemukan');
      setData(null);
      terkunciRef.current = false;
    } finally {
      setMencari(false);
    }
  }

  useEffect(() => {
    let batal = false;

    async function mulai() {
      try {
        const { BrowserMultiFormatReader } = await import('@zxing/browser');
        const reader = new BrowserMultiFormatReader();

        controlsRef.current = await reader.decodeFromVideoDevice(undefined, videoRef.current ?? undefined, (result) => {
          if (result && !batal) {
            void prosesKode(result.getText());
          }
        });
      } catch {
        setKameraError('Kamera tidak dapat diakses. Pastikan izin kamera diaktifkan, atau masukkan kode lokasi manual di bawah.');
      }
    }

    if (kameraAktif) {
      void mulai();
    }

    return () => {
      batal = true;
      controlsRef.current?.stop();
    };
  }, [kameraAktif]);

  function scanLagi() {
    setData(null);
    setHasilError('');
    terkunciRef.current = false;
  }

  function submitManual() {
    if (!manual.trim()) return;
    void prosesKode(manual.trim());
  }

  async function ceklis(kip: Kip, payload: { foto: File; parameterChecked: boolean[] }) {
    setBusyId(kip.id);
    setCeklisError(null);
    try {
      const posisi = await ambilLokasiGps().catch(() => undefined);
      await kipApi.ceklis(kip.id, bulanIni, { ...payload, lokasiSekarang: posisi });
      setFormTarget(null);
      if (data) setData(await kipApi.statusByKode(data.lokasi));
    } catch (err) {
      setCeklisError(err instanceof KipApiError ? err.message : 'Ceklis gagal disimpan');
    } finally {
      setBusyId(null);
    }
  }

  if (!kameraAktif) {
    return (
      <div className={styles.shell}>
        <div className={styles.topbar}>
          <strong>KIP — Kartu Inspeksi Peralatan</strong>
        </div>
        <div className={styles.main}>
          <div className={styles.scanCard}>
            <h1>Scan Barcode Lokasi</h1>
            <p>Arahkan kamera ke barcode yang ditempel di lokasi — kartu inspeksi langsung muncul di layar kamera.</p>
            <button className={styles.primaryButton} onClick={() => setKameraAktif(true)}>
              <Camera size={18} /> Buka Kamera & Scan
            </button>
            {kameraError && <p className={styles.errorText}>{kameraError}</p>}
            <div className={styles.manualRow}>
              <input
                placeholder="Atau masukkan kode lokasi manual"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitManual()}
              />
              <button onClick={submitManual}>
                <ScanLine size={16} />
              </button>
            </div>
            {hasilError && <p className={styles.errorText}>{hasilError}</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
    <div className={styles.arShell}>
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video ref={videoRef} muted playsInline className={styles.arVideo} />

      <div className={styles.arTopBar}>
        <Link href="/">
          <X size={20} /> Tutup
        </Link>
        <strong style={{ fontSize: 13 }}>Scan Barcode Lokasi</strong>
        <span style={{ width: 20 }} />
      </div>

      {!data && !mencari && (
        <>
          <div className={styles.arFrame} />
          <p className={styles.arHint}>Arahkan kamera ke barcode lokasi...</p>
        </>
      )}

      {mencari && <p className={styles.arHint}>Mencari data lokasi...</p>}

      {data && (
        <>
          <div className={styles.arCardLayer}>
            {data.kip[0] && <KipCard3D kip={data.kip[0]} tinggi="100%" transparan />}
          </div>

          <div className={styles.arSheet}>
            <div className={styles.arSheetHandle} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div>
                <strong style={{ fontSize: 15 }}>{LABEL_LOKASI_KIP[data.lokasi]}</strong>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.6)' }}>{data.kip.length} KIP terdaftar</div>
              </div>
              <button className={styles.arScanLagi} onClick={scanLagi}>
                Scan Lokasi Lain
              </button>
            </div>

            {hasilError && <p className={styles.errorText}>{hasilError}</p>}

            {data.kip.map((kip) => {
              const statusBulanIni = statusTampilBulan(kip, bulanIni);
              const sudahDiceklis = statusBulanIni === 'SUDAH';

              return (
                <div key={kip.id} className={styles.arKipBlock}>
                  <strong style={{ fontSize: 14 }}>{kip.noKip}</strong>
                  <p style={{ margin: '2px 0 6px', fontSize: 12.5, color: 'rgba(255,255,255,.65)' }}>
                    {kip.jenisPeralatan} — {kip.departemen} — Tahun {kip.tahun}
                  </p>

                  <span
                    role={sudahDiceklis ? 'button' : undefined}
                    onClick={() => {
                      if (!sudahDiceklis) return;
                      const baris = kip.checklist.find((c) => c.bulan === bulanIni);
                      if (baris) setDetailBulan(baris);
                    }}
                    className={`${styles.pill} ${
                      sudahDiceklis ? styles.pillGreen : statusBulanIni === 'KUNING' ? styles.pillYellow : styles.pillGray
                    }`}
                    style={sudahDiceklis ? { cursor: 'pointer' } : undefined}
                  >
                    {sudahDiceklis ? <CheckCircle2 size={12} /> : null}
                    {sudahDiceklis
                      ? `Sudah diceklis bulan ${NAMA_BULAN[bulanIni - 1]} — lihat bukti`
                      : `Belum diceklis bulan ${NAMA_BULAN[bulanIni - 1]}`}
                  </span>

                  {bolehCeklis && !sudahDiceklis && formTarget !== kip.id && (
                    <div className={styles.ceklisBar}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,.5)' }}>Login: {user?.name}</span>
                      <button className={styles.primaryButton} onClick={() => setFormTarget(kip.id)}>
                        Ceklis Sekarang
                      </button>
                    </div>
                  )}

                  {bolehCeklis && !sudahDiceklis && formTarget === kip.id && (
                    <div style={{ marginTop: 10 }}>
                      <KipCeklisForm
                        parameterChecklist={kip.parameterChecklist}
                        submitting={busyId === kip.id}
                        error={ceklisError}
                        gelap
                        onSubmit={(payload) => ceklis(kip, payload)}
                      />
                    </div>
                  )}
                </div>
              );
            })}

            {!data.kip.length && <p style={{ color: 'rgba(255,255,255,.6)', fontSize: 13 }}>Belum ada KIP terdaftar di lokasi ini.</p>}
          </div>
        </>
      )}
    </div>
    {detailBulan && <KipDetailBulan baris={detailBulan} onTutup={() => setDetailBulan(null)} />}
    </>
  );
}
