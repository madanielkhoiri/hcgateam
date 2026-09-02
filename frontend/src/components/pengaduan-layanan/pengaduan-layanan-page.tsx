'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, CheckCircle2, MessageSquareHeart } from 'lucide-react';
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
  type DivisiPengaduan,
} from '@/lib/pengaduan-layanan-api';
import { StarRating } from './star-rating';
import styles from './pengaduan-layanan.module.css';

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

export function PengaduanLayananPage({ divisi }: { divisi: DivisiPengaduan }) {
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [rating, setRating] = useState(0);
  const [komentar, setKomentar] = useState('');
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

  async function kirimPengaduan() {
    if (rating < 1) {
      setError('Pilih rating bintang terlebih dahulu.');
      return;
    }

    setMengirim(true);
    setError('');

    try {
      await pengaduanLayananApi.kirim({
        divisi,
        rating,
        komentar: komentar.trim() || undefined,
      });

      setTerkirim(true);
      setRating(0);
      setKomentar('');
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

        {terkirim ? (
          <div className={styles.sukses}>
            <CheckCircle2 size={40} color="#07984c" />
            <h2>Terima kasih atas penilaian Anda</h2>
            <p>Masukan ini akan membantu tim {labelDivisi} meningkatkan pelayanan.</p>
            <button type="button" className={styles.tombolLagi} onClick={() => setTerkirim(false)}>
              Beri Penilaian Lagi
            </button>
          </div>
        ) : (
          <div className={styles.formCard}>
            <span className={styles.formLabel}>Beri rating pelayanan</span>

            <StarRating value={rating} onChange={setRating} />

            <textarea
              className={styles.komentar}
              placeholder="Ceritakan pengalaman Anda (opsional)..."
              value={komentar}
              onChange={(event) => setKomentar(event.target.value)}
              rows={4}
              maxLength={2000}
            />

            {error && <p className={styles.error}>{error}</p>}

            <button
              type="button"
              className={styles.tombolKirim}
              onClick={() => void kirimPengaduan()}
              disabled={mengirim}
            >
              {mengirim ? 'Mengirim...' : 'Kirim Penilaian'}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
