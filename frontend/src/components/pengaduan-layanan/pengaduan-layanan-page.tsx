'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, CheckCircle2, MessageSquareHeart, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
  ACCESS_KEYS,
  clearSession,
  getAccessToken,
  getStoredUser,
  hasAccess,
  type PortalUser,
} from '@/lib/access-control';
import {
  pengaduanLayananApi,
  PengaduanLayananApiError,
  LABEL_DIVISI_PENGADUAN,
  LABEL_LOKASI_PENGADUAN,
  type DivisiPengaduan,
  type LokasiPengaduan,
} from '@/lib/pengaduan-layanan-api';
import { StarRating } from './star-rating';
import styles from './pengaduan-layanan.module.css';

const DAFTAR_LOKASI: LokasiPengaduan[] = ['TAMBANG', 'MESS'];

const ROLE_BOLEH_LIHAT_REKAP = ['ADMIN', 'SUPER_ADMIN', 'SECTION_HEAD'];

const ACCESS_KEY_PER_DIVISI: Record<DivisiPengaduan, string> = {
  HC: ACCESS_KEYS.HC,
  GA: ACCESS_KEYS.GA,
  CIVIL: ACCESS_KEYS.CIVIL,
};

const HALAMAN_MENU_PER_DIVISI: Record<DivisiPengaduan, string> = {
  HC: '/hc',
  GA: '/ga',
  CIVIL: '/civil',
};

type Langkah = 'rating' | 'aduan';

export function PengaduanLayananPage({ divisi }: { divisi: DivisiPengaduan }) {
  const router = useRouter();
  const butuhLokasi = divisi !== 'HC';
  const [user, setUser] = useState<PortalUser | null>(null);
  const [langkah, setLangkah] = useState<Langkah>('rating');
  const [lokasi, setLokasi] = useState<LokasiPengaduan | null>(null);
  const [rating, setRating] = useState(0);
  const [komentar, setKomentar] = useState('');
  const [deskripsiAduan, setDeskripsiAduan] = useState('');
  const [mengirim, setMengirim] = useState(false);
  const [error, setError] = useState('');
  const [terkirim, setTerkirim] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    const stored = getStoredUser();

    if (!token || !stored) {
      clearSession();
      router.replace('/login');
      return;
    }

    if (!hasAccess(stored, ACCESS_KEY_PER_DIVISI[divisi])) {
      router.replace(HALAMAN_MENU_PER_DIVISI[divisi]);
      return;
    }

    setUser(stored);
  }, [divisi, router]);

  function lanjutKeAduan() {
    if (rating < 1) {
      setError('Pilih rating bintang terlebih dahulu.');
      return;
    }

    setError('');
    setLangkah('aduan');
  }

  async function kirimPengaduan() {
    if (butuhLokasi && !lokasi) {
      setError('Pilih lokasi (Tambang atau Mess) terlebih dahulu.');
      return;
    }

    setMengirim(true);
    setError('');

    try {
      await pengaduanLayananApi.kirim({
        divisi,
        rating,
        komentar: komentar.trim() || undefined,
        deskripsiAduan: deskripsiAduan.trim() || undefined,
        lokasi: butuhLokasi ? lokasi ?? undefined : undefined,
      });

      setTerkirim(true);
      setRating(0);
      setKomentar('');
      setDeskripsiAduan('');
      setLokasi(null);
      setLangkah('rating');
    } catch (err) {
      setError(
        err instanceof PengaduanLayananApiError
          ? err.message
          : 'Pengaduan gagal dikirim, coba lagi.',
      );
    } finally {
      setMengirim(false);
    }
  }

  function beriPenilaianLagi() {
    setTerkirim(false);
    setLangkah('rating');
  }

  if (!user) {
    return <main className={styles.page}>Memuat...</main>;
  }

  const bolehLihatRekap = ROLE_BOLEH_LIHAT_REKAP.includes(user.role);
  const labelDivisi = LABEL_DIVISI_PENGADUAN[divisi];

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href={HALAMAN_MENU_PER_DIVISI[divisi]} className={styles.backButton}>
          <ArrowLeft size={16} />
          Kembali ke {labelDivisi}
        </Link>

        <div className={styles.headerRow}>
          <div className={styles.titleSection}>
            <span className={styles.icon}>
              <MessageSquareHeart size={26} />
            </span>
            <div>
              <h1>Pengaduan Layanan {labelDivisi}</h1>
              <p>Bagaimana pengalaman Bapak/Ibu dengan pelayanan tim {labelDivisi}?</p>
            </div>
          </div>

          {bolehLihatRekap && (
            <Link href={`${HALAMAN_MENU_PER_DIVISI[divisi]}/pengaduan/rekap`} className={styles.rekapButton}>
              <BarChart3 size={16} />
              Rekap Performa
            </Link>
          )}
        </div>

      </div>

      <div className={styles.popupOverlay}>
        <div className={styles.popupCard}>
        {terkirim ? (
          <div className={styles.sukses}>
            <div className={styles.popupHeaderKanan}>
              <Link href={HALAMAN_MENU_PER_DIVISI[divisi]} className={styles.popupCloseInline} title="Tutup">
                <X size={16} />
              </Link>
            </div>
            <CheckCircle2 size={40} color="#07984c" />
            <h2>Terima kasih atas penilaian Anda</h2>
            <p>Masukan ini akan membantu tim {labelDivisi} meningkatkan pelayanan.</p>
            <div className={styles.suksesTombolRow}>
              <button type="button" className={styles.tombolLagi} onClick={beriPenilaianLagi}>
                Beri Penilaian Lagi
              </button>
              {bolehLihatRekap && (
                <Link href={`${HALAMAN_MENU_PER_DIVISI[divisi]}/pengaduan/rekap`} className={styles.tombolKirim}>
                  Lihat Rekap Performa
                </Link>
              )}
            </div>
          </div>
        ) : langkah === 'rating' ? (
          <div className={styles.formCard}>
            <div className={styles.popupHeader}>
              <span className={styles.formLabel}>Beri rating pelayanan</span>
              <Link href={HALAMAN_MENU_PER_DIVISI[divisi]} className={styles.popupCloseInline} title="Tutup">
                <X size={16} />
              </Link>
            </div>

            <StarRating value={rating} onChange={setRating} />

            <textarea
              className={styles.komentar}
              placeholder="Ceritakan pengalaman Anda (opsional)..."
              value={komentar}
              onChange={(event) => setKomentar(event.target.value)}
              rows={3}
              maxLength={2000}
            />

            {error && <p className={styles.error}>{error}</p>}

            <button type="button" className={styles.tombolKirim} onClick={lanjutKeAduan}>
              Lanjut
            </button>
          </div>
        ) : (
          <div className={styles.formCard}>
            <div className={styles.popupHeader}>
              <span className={styles.formLabel}>Aduan Layanan</span>
              <Link href={HALAMAN_MENU_PER_DIVISI[divisi]} className={styles.popupCloseInline} title="Tutup">
                <X size={16} />
              </Link>
            </div>
            <p className={styles.aduanHint}>
              Ada masalah atau permintaan (mis. permintaan perbaikan) yang ingin dilaporkan?
            </p>

            {butuhLokasi && (
              <div className={styles.lokasiRow}>
                {DAFTAR_LOKASI.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={`${styles.lokasiButton} ${lokasi === item ? styles.lokasiButtonAktif : ''}`}
                    onClick={() => setLokasi(item)}
                  >
                    {LABEL_LOKASI_PENGADUAN[item]}
                  </button>
                ))}
              </div>
            )}

            <textarea
              className={styles.komentar}
              placeholder="Ceritakan masalah atau permintaan Anda (opsional)..."
              value={deskripsiAduan}
              onChange={(event) => setDeskripsiAduan(event.target.value)}
              rows={4}
              maxLength={2000}
            />

            {error && <p className={styles.error}>{error}</p>}

            <div className={styles.aduanTombolRow}>
              <button
                type="button"
                className={styles.tombolLagi}
                onClick={() => setLangkah('rating')}
                disabled={mengirim}
              >
                Kembali
              </button>
              <button
                type="button"
                className={styles.tombolKirim}
                onClick={() => void kirimPengaduan()}
                disabled={mengirim}
              >
                {mengirim ? 'Mengirim...' : 'Kirim'}
              </button>
            </div>
          </div>
        )}
        </div>
      </div>
    </main>
  );
}
