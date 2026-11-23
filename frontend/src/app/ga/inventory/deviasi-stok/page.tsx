'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowDownCircle, ArrowUpCircle, Gauge } from 'lucide-react';
import { clearSession, getAccessToken, getStoredUser, type PortalUser } from '@/lib/access-control';
import {
  deviasiStokApi,
  DeviasiStokApiError,
  LABEL_AREA_DEVIASI,
  namaBulan,
  type AreaDeviasi,
  type RekapDeviasiStok,
} from '@/lib/deviasi-stok-api';
import { PaginationBar, hitungTotalHalaman } from '@/components/pagination/pagination-bar';
import styles from './deviasi-stok.module.css';

import { formatTanggal } from '@/lib/format-tanggal';
const ROLE_BOLEH_LIHAT = ['ADMIN', 'SUPER_ADMIN', 'SECTION_HEAD'];
const PILIHAN_AREA: { nilai: AreaDeviasi | ''; label: string }[] = [
  { nilai: '', label: 'Semua Area' },
  { nilai: 'GENERAL', label: 'Infras' },
  { nilai: 'MESS', label: 'Mess' },
  { nilai: 'ELECTRIC', label: 'Electric' },
];
const PILIHAN_BARIS = [10, 15, 20, 50];

function formatTanggalJam(value: string): string {
  return formatTanggal(new Date(value), { waktu: true });
}

export default function DeviasiStokPage() {
  const router = useRouter();
  const sekarang = useMemo(() => new Date(), []);
  const [user, setUser] = useState<PortalUser | null>(null);
  const [bulan, setBulan] = useState<number | ''>('');
  const [tahun, setTahun] = useState(sekarang.getFullYear());
  const [area, setArea] = useState<AreaDeviasi | ''>('');
  const [jumlahBaris, setJumlahBaris] = useState(10);
  const [halaman, setHalaman] = useState(1);
  const [rekap, setRekap] = useState<RekapDeviasiStok | null>(null);
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

    if (!ROLE_BOLEH_LIHAT.includes(stored.role)) {
      router.replace('/ga/inventory/stok-barang');
      return;
    }

    setUser(stored);
  }, [router]);

  useEffect(() => {
    if (!user) return;

    let aktif = true;
    setMemuat(true);
    setError('');

    deviasiStokApi
      .rekap(bulan || null, tahun, area || null)
      .then((hasil) => {
        if (!aktif) return;
        setRekap(hasil);
        setHalaman(1);
      })
      .catch((err: unknown) => {
        if (!aktif) return;
        setError(err instanceof DeviasiStokApiError ? err.message : 'Gagal memuat dashboard deviasi stok.');
      })
      .finally(() => {
        if (aktif) setMemuat(false);
      });

    return () => {
      aktif = false;
    };
  }, [user, bulan, tahun, area]);

  if (!user) {
    return <div className={styles.page}>Memuat...</div>;
  }

  const tahunPilihan = Array.from({ length: 5 }, (_, index) => sekarang.getFullYear() - index);
  const totalBaris = rekap?.daftar.length ?? 0;
  const totalHalaman = hitungTotalHalaman(totalBaris, jumlahBaris);
  const halamanAktif = Math.min(halaman, Math.max(1, totalHalaman));
  const barisTampil = rekap?.daftar.slice((halamanAktif - 1) * jumlahBaris, halamanAktif * jumlahBaris) ?? [];
  const labelArea = area ? ` · ${LABEL_AREA_DEVIASI[area]}` : '';
  const puncakTren = rekap
    ? Math.max(1, ...rekap.perBulan.map((item) => Math.max(item.kurang, item.lebih)))
    : 1;

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1>Dashboard Deviasi Stok</h1>
        <p>Catatan otomatis tiap kali stok diedit langsung dan angkanya berubah — stok berkurang tanpa transaksi keluar (KURANG) atau stok bertambah tanpa transaksi masuk (LEBIH).</p>
      </div>

      <div className={styles.filterRow}>
        <div className={styles.tabArea} role="tablist" aria-label="Filter area inventory">
          {PILIHAN_AREA.map((pilihan) => (
            <button
              key={pilihan.label}
              type="button"
              role="tab"
              aria-selected={area === pilihan.nilai}
              className={area === pilihan.nilai ? styles.tabAktif : ''}
              onClick={() => setArea(pilihan.nilai)}
            >
              {pilihan.label}
            </button>
          ))}
        </div>

        <select value={bulan} onChange={(event) => setBulan(event.target.value ? Number(event.target.value) : '')}>
          <option value="">Semua Bulan</option>
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
        <p className={styles.memuat}>Memuat dashboard...</p>
      ) : rekap ? (
        <>
          <div className={styles.statGrid}>
            <div className={styles.statCard}>
              <span className={styles.statLabel}>
                <Gauge size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                Total Deviasi
              </span>
              <strong className={styles.statAngka}>{rekap.totalDeviasi}</strong>
              <span style={{ color: '#8a9bb0', fontSize: 12 }}>
                {rekap.bulan ? `${namaBulan(rekap.bulan)} ${rekap.tahun}` : `Sepanjang tahun ${rekap.tahun}`}
                {labelArea}
              </span>
            </div>

            <div className={`${styles.statCard} ${styles.statKurang}`}>
              <span className={styles.statLabel}>
                <ArrowDownCircle size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                Deviasi Kurang
              </span>
              <strong className={styles.statAngka}>{rekap.totalKurang}</strong>
              <span style={{ color: '#8a9bb0', fontSize: 12 }}>Stok hilang / tidak tercatat keluar</span>
            </div>

            <div className={`${styles.statCard} ${styles.statLebih}`}>
              <span className={styles.statLabel}>
                <ArrowUpCircle size={13} style={{ verticalAlign: -2, marginRight: 4 }} />
                Deviasi Lebih (Surplus)
              </span>
              <strong className={styles.statAngka}>{rekap.totalLebih}</strong>
              <span style={{ color: '#8a9bb0', fontSize: 12 }}>Stok tidak tercatat lewat barang masuk</span>
            </div>
          </div>

          <div className={styles.trenCard}>
            <span className={styles.statLabel}>Deviasi per Bulan — Tahun {rekap.tahun}{labelArea}</span>
            <div className={styles.trenGrid}>
              {rekap.perBulan.map((item) => (
                <div className={styles.trenBulan} key={item.bulan}>
                  <div className={styles.trenBarTrack}>
                    <div
                      className={styles.trenBarLebih}
                      style={{ height: `${(item.lebih / puncakTren) * 100}%` }}
                      title={`Lebih: ${item.lebih}`}
                    />
                    <div
                      className={styles.trenBarKurang}
                      style={{ height: `${(item.kurang / puncakTren) * 100}%` }}
                      title={`Kurang: ${item.kurang}`}
                    />
                  </div>
                  <span className={styles.trenLabel}>{item.label}</span>
                </div>
              ))}
            </div>
            <div className={styles.legenda}>
              <span className={styles.legendaItem}>
                <span className={styles.legendaDot} style={{ background: '#e35555' }} /> Kurang
              </span>
              <span className={styles.legendaItem}>
                <span className={styles.legendaDot} style={{ background: '#f0b429' }} /> Lebih
              </span>
            </div>
          </div>

          <div className={styles.daftarCard}>
            <span className={styles.statLabel}>
              Riwayat Deviasi — {rekap.bulan ? `${namaBulan(rekap.bulan)} ${rekap.tahun}` : `Semua Bulan ${rekap.tahun}`}
              {labelArea}
            </span>

            {rekap.daftar.length === 0 ? (
              <p className={styles.kosong}>Tidak ada deviasi stok pada periode ini.</p>
            ) : (
              <div className={styles.tableScroll}>
                <table className={styles.tabel}>
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Kode Barang</th>
                      <th>Nama Barang</th>
                      <th>Area</th>
                      <th>Stok Lama</th>
                      <th>Stok Baru</th>
                      <th>Selisih</th>
                      <th>Jenis</th>
                      <th>Diubah Oleh</th>
                    </tr>
                  </thead>
                  <tbody>
                    {barisTampil.map((item) => (
                      <tr key={item.id}>
                        <td>{formatTanggalJam(item.createdAt)}</td>
                        <td>
                          <strong>{item.kodeBarang}</strong>
                        </td>
                        <td>{item.namaBarang}</td>
                        <td>{LABEL_AREA_DEVIASI[item.area]}</td>
                        <td>
                          {item.stokLama} {item.satuan}
                        </td>
                        <td>
                          {item.stokBaru} {item.satuan}
                        </td>
                        <td>
                          {item.selisih > 0 ? `+${item.selisih}` : item.selisih}
                        </td>
                        <td>
                          {item.jenis === 'KURANG' ? (
                            <span className={`${styles.pill} ${styles.pillKurang}`}>
                              <AlertTriangle size={11} /> Kurang
                            </span>
                          ) : (
                            <span className={`${styles.pill} ${styles.pillLebih}`}>
                              <AlertTriangle size={11} /> Lebih
                            </span>
                          )}
                        </td>
                        <td>{item.diubahOleh}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalBaris > 0 && (
              <div className={styles.kakiTabel}>
                <label className={styles.pilihBaris}>
                  Tampilkan
                  <select
                    value={jumlahBaris}
                    onChange={(event) => {
                      setJumlahBaris(Number(event.target.value));
                      setHalaman(1);
                    }}
                  >
                    {PILIHAN_BARIS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                  baris
                </label>
                <span className={styles.infoBaris}>
                  Menampilkan {(halamanAktif - 1) * jumlahBaris + 1}–{Math.min(halamanAktif * jumlahBaris, totalBaris)} dari {totalBaris} data
                </span>
                <PaginationBar halaman={halamanAktif} totalHalaman={totalHalaman} onGanti={setHalaman} />
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
