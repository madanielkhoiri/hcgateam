'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BarChart3, CheckCircle2, ImagePlus, MessageSquareHeart, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
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
  ROLE_BOLEH_LIHAT_REKAP,
  type DivisiPengaduan,
  type LokasiPengaduan,
} from '@/lib/pengaduan-layanan-api';
import { StarRating } from './star-rating';
import { DaftarPengaduanTabel } from './daftar-pengaduan-tabel';
import styles from './pengaduan-layanan.module.css';

const DAFTAR_LOKASI: LokasiPengaduan[] = ['TAMBANG', 'MESS'];

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
  const [foto, setFoto] = useState<File[]>([]);
  const [mengirim, setMengirim] = useState(false);
  const [error, setError] = useState('');
  const [terkirim, setTerkirim] = useState(false);
  const [popupTutup, setPopupTutup] = useState(false);
  const inputFotoRef = useRef<HTMLInputElement | null>(null);

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

  function tambahFoto(daftar: FileList | null) {
    if (!daftar || daftar.length === 0) return;

    // Materialize ke array biasa DULU — FileList itu live reference, kalau
    // dibaca lewat closure di updater setFoto (dieksekusi belakangan) dia
    // sudah keburu kosong karena input.value di-reset di baris bawah.
    const fileBaru = Array.from(daftar);
    setFoto((cur) => [...cur, ...fileBaru]);

    if (inputFotoRef.current) inputFotoRef.current.value = '';
  }

  function hapusFoto(index: number) {
    setFoto((cur) => cur.filter((_, i) => i !== index));
  }

  async function kirimPengaduan() {
    if (butuhLokasi && !lokasi) {
      setError('Pilih lokasi (Tambang atau Mess) terlebih dahulu.');
      return;
    }

    if (foto.length === 0) {
      setError('Minimal 1 foto wajib dilampirkan.');
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
        foto,
      });

      setTerkirim(true);
      setRating(0);
      setKomentar('');
      setDeskripsiAduan('');
      setLokasi(null);
      setFoto([]);
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

  // Admin/Section Head/Elektrik/Korlap punya tabel kelola Aduan Layanan di
  // halaman ini juga — silang cukup tutup popup-nya, jangan dilempar keluar
  // ke menu utama divisi seperti karyawan biasa (yang memang datang dari sana).
  function tutupPopup() {
    if (bolehLihatRekap) {
      setPopupTutup(true);
      return;
    }

    router.push(HALAMAN_MENU_PER_DIVISI[divisi]);
  }

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

          {bolehLihatRekap && popupTutup && (
            <button type="button" className={styles.rekapButton} onClick={() => setPopupTutup(false)}>
              <MessageSquareHeart size={16} />
              Beri Penilaian
            </button>
          )}

          {bolehLihatRekap && (
            <Link href={`${HALAMAN_MENU_PER_DIVISI[divisi]}/pengaduan/rekap`} className={styles.rekapButton}>
              <BarChart3 size={16} />
              Rekap Performa
            </Link>
          )}
        </div>

        {bolehLihatRekap && <DaftarPengaduanTabel divisi={divisi} />}
      </div>

      {!popupTutup && (
      <div className={styles.popupOverlay}>
        <div className={styles.popupCard}>
        {terkirim ? (
          <div className={styles.sukses}>
            <div className={styles.popupHeaderKanan}>
              <button type="button" onClick={tutupPopup} className={styles.popupCloseInline} title="Tutup">
                <X size={16} />
              </button>
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
              <button type="button" onClick={tutupPopup} className={styles.popupCloseInline} title="Tutup">
                <X size={16} />
              </button>
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
              <button type="button" onClick={tutupPopup} className={styles.popupCloseInline} title="Tutup">
                <X size={16} />
              </button>
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

            <div className={styles.fotoWrap}>
              <span className={styles.formLabelKecil}>Foto (wajib, minimal 1)</span>

              <input
                ref={inputFotoRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                hidden
                onChange={(event) => tambahFoto(event.target.files)}
              />

              <button type="button" className={styles.tombolTambahFoto} onClick={() => inputFotoRef.current?.click()}>
                <ImagePlus size={15} />
                Tambah Foto
              </button>

              {foto.length > 0 && (
                <div className={styles.fotoPreviewRow}>
                  {foto.map((file, index) => (
                    <span key={`${file.name}-${index}`} className={styles.fotoChip}>
                      {file.name}
                      <button type="button" onClick={() => hapusFoto(index)} title="Hapus foto ini">
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

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
      )}
    </main>
  );
}
