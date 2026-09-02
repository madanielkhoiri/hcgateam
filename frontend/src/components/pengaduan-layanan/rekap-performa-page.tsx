'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Star } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { clearSession, getAccessToken, getStoredUser, type PortalUser } from '@/lib/access-control';
import {
  pengaduanLayananApi,
  PengaduanLayananApiError,
  LABEL_DIVISI_PENGADUAN,
  namaBulan,
  type DivisiPengaduan,
  type RekapPengaduan,
} from '@/lib/pengaduan-layanan-api';
import styles from './pengaduan-layanan.module.css';

const ROLE_BOLEH_LIHAT_REKAP = ['ADMIN', 'SUPER_ADMIN', 'SECTION_HEAD'];

const HALAMAN_MENU_PER_DIVISI: Record<DivisiPengaduan, string> = {
  HC: '/hc',
  GA: '/ga',
  CIVIL: '/civil',
};

function BintangRingkas({ rataRata }: { rataRata: number }) {
  return (
    <span className={styles.bintangRingkas}>
      {[1, 2, 3, 4, 5].map((posisi) => (
        <Star
          key={posisi}
          size={22}
          fill={posisi <= Math.round(rataRata) ? '#f5b400' : 'none'}
          color={posisi <= Math.round(rataRata) ? '#f5b400' : '#c7ccd3'}
          strokeWidth={1.5}
        />
      ))}
    </span>
  );
}

export function RekapPerformaPage({ divisi }: { divisi: DivisiPengaduan }) {
  const router = useRouter();
  const sekarang = useMemo(() => new Date(), []);
  const [user, setUser] = useState<PortalUser | null>(null);
  const [bulan, setBulan] = useState(sekarang.getMonth() + 1);
  const [tahun, setTahun] = useState(sekarang.getFullYear());
  const [rekap, setRekap] = useState<RekapPengaduan | null>(null);
  const [error, setError] = useState('');
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    const token = getAccessToken();
    const stored = getStoredUser();

    if (!token || !stored) {
      clearSession();
      router.replace('/login');
      return;
    }

    if (!ROLE_BOLEH_LIHAT_REKAP.includes(stored.role)) {
      router.replace(HALAMAN_MENU_PER_DIVISI[divisi]);
      return;
    }

    setUser(stored);
  }, [divisi, router]);

  useEffect(() => {
    if (!user) return;

    let aktif = true;
    setMemuat(true);
    setError('');

    pengaduanLayananApi
      .rekap(divisi, bulan, tahun)
      .then((hasil) => {
        if (aktif) setRekap(hasil);
      })
      .catch((err: unknown) => {
        if (!aktif) return;
        setError(
          err instanceof PengaduanLayananApiError
            ? err.message
            : 'Gagal memuat rekap performa.',
        );
      })
      .finally(() => {
        if (aktif) setMemuat(false);
      });

    return () => {
      aktif = false;
    };
  }, [user, divisi, bulan, tahun]);

  if (!user) {
    return <main className={styles.page}>Memuat...</main>;
  }

  const labelDivisi = LABEL_DIVISI_PENGADUAN[divisi];
  const tahunPilihan = Array.from({ length: 5 }, (_, index) => sekarang.getFullYear() - index);
  const trenTertinggi = rekap ? Math.max(1, ...rekap.tren.map((item) => item.rataRata)) : 1;

  return (
    <main className={styles.page}>
      <div className={styles.container}>
        <Link href={HALAMAN_MENU_PER_DIVISI[divisi] + '/pengaduan'} className={styles.backButton}>
          <ArrowLeft size={16} />
          Kembali ke Pengaduan Layanan
        </Link>

        <div className={styles.titleSection}>
          <div>
            <h1>Rekap Performa {labelDivisi}</h1>
            <p>Ringkasan penilaian layanan dari seluruh karyawan.</p>
          </div>
        </div>

        <div className={styles.filterRow}>
          <select value={bulan} onChange={(event) => setBulan(Number(event.target.value))}>
            {Array.from({ length: 12 }, (_, index) => index + 1).map((angka) => (
              <option key={angka} value={angka}>
                {namaBulan(angka)}
              </option>
            ))}
          </select>

          <select value={tahun} onChange={(event) => setTahun(Number(event.target.value))}>
            {tahunPilihan.map((angka) => (
              <option key={angka} value={angka}>
                {angka}
              </option>
            ))}
          </select>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        {memuat ? (
          <p className={styles.memuat}>Memuat rekap...</p>
        ) : rekap ? (
          <>
            <div className={styles.ringkasanGrid}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Rata-rata Bintang</span>
                <strong className={styles.statAngka}>{rekap.rataRata.toFixed(2)}</strong>
                <BintangRingkas rataRata={rekap.rataRata} />
              </div>

              <div className={styles.statCard}>
                <span className={styles.statLabel}>Jumlah Pengaduan</span>
                <strong className={styles.statAngka}>{rekap.jumlahPengaduan}</strong>
                <span className={styles.statSub}>
                  {namaBulan(rekap.bulan)} {rekap.tahun}
                </span>
              </div>

              <div className={styles.distribusiCard}>
                <span className={styles.statLabel}>Distribusi Bintang</span>
                {([5, 4, 3, 2, 1] as const).map((bintang) => {
                  const jumlah = rekap.distribusiBintang[String(bintang) as '1' | '2' | '3' | '4' | '5'];
                  const persen = rekap.jumlahPengaduan
                    ? Math.round((jumlah / rekap.jumlahPengaduan) * 100)
                    : 0;

                  return (
                    <div className={styles.distribusiRow} key={bintang}>
                      <span>{bintang}★</span>
                      <div className={styles.distribusiBarTrack}>
                        <div className={styles.distribusiBarFill} style={{ width: `${persen}%` }} />
                      </div>
                      <span className={styles.distribusiJumlah}>{jumlah}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className={styles.trenCard}>
              <span className={styles.statLabel}>Tren 6 Bulan Terakhir</span>
              <div className={styles.trenGrid}>
                {rekap.tren.map((item) => (
                  <div className={styles.trenBar} key={`${item.tahun}-${item.bulan}`}>
                    <div className={styles.trenBarTrack}>
                      <div
                        className={styles.trenBarFill}
                        style={{ height: `${(item.rataRata / trenTertinggi) * 100}%` }}
                      />
                    </div>
                    <span className={styles.trenAngka}>{item.jumlah ? item.rataRata.toFixed(1) : '-'}</span>
                    <span className={styles.trenLabel}>{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.daftarCard}>
              <span className={styles.statLabel}>Daftar Pengaduan Bulan Ini</span>

              {rekap.daftar.length === 0 ? (
                <p className={styles.kosong}>Belum ada pengaduan pada periode ini.</p>
              ) : (
                <table className={styles.tabel}>
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Pengirim</th>
                      <th>Rating</th>
                      <th>Komentar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rekap.daftar.map((item) => (
                      <tr key={item.id}>
                        <td>
                          {new Intl.DateTimeFormat('id-ID', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          }).format(new Date(item.createdAt))}
                        </td>
                        <td>{item.pengirim}</td>
                        <td>{'★'.repeat(item.rating)}</td>
                        <td>{item.komentar || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        ) : null}
      </div>
    </main>
  );
}
