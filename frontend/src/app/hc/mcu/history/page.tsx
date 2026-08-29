'use client';

// ==================================================
// FILE: frontend/src/app/hc/mcu/history/page.tsx
// FUNGSI: History MCU per karyawan + durasi tiap tahapan proses
// Referensi: Bagian 4.9 & 4.11 alur-workflow-mcu-periodik-v3.md
// ==================================================

import Link from 'next/link';
import { ArrowLeft, History, Search } from 'lucide-react';
import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  BadgeStatus,
  Kosong,
  Memuat,
  Panel,
  Pesan,
} from '@/components/mcu/mcu-ui';
import { formatTanggal, mcuApi, type Karyawan } from '@/lib/mcu-api';
import styles from '../mcu.module.css';

type HistoryKaryawan = {
  karyawan: {
    id: number;
    nik: string;
    nama: string;
    jabatan: string | null;
    departemen: { id: number; namaDepartemen: string };
    statusKerja: string;
    statusKesehatanDirumahkan: string | null;
    tanggalMcuTerakhir: string | null;
    tanggalMcuExpired: string | null;
    tanggalMcuBerikutnya: string | null;
  };
  statistik: {
    totalJadwal: number;
    totalRekomendasi: number;
    totalSiklusFollowUp: number;
    totalFit: number;
  };
  riwayat: Array<{
    id: number;
    tanggalMcu: string;
    jenisMcu: string;
    statusPendaftaran: string;
    klinik: { id: number; namaKlinik: string } | null;
    suratPengantar: {
      id: number;
      nomorSurat: string;
      tanggalTerbit: string;
      status: string;
    } | null;
    hasilMcu: {
      id: number;
      tanggalUpload: string;
      rekomendasi: Array<{
        id: number;
        status: string;
        siklusKe: number;
        tanggalSubmit: string;
        dokter: { id: number; name: string };
        followUp: {
          id: number;
          status: string;
          hasilFollowUp: Array<{ id: number; tanggalSubmit: string }>;
        } | null;
        induksiUlang: {
          id: number;
          status: string;
          tanggalDaftar: string;
          tanggalPelaksanaan: string | null;
        } | null;
      }>;
    } | null;
  }>;
};

type DurasiBaris = {
  jadwalId: number;
  karyawan: { id: number; nik: string; nama: string };
  departemen: string;
  tanggalMcu: string;
  jenisMcu: string;
  pendaftaranKeSurat: number | null;
  pelaksanaanKeUpload: number | null;
  uploadKeRekomendasi: number | null;
  rekomendasiKeKaryawan: number | null;
  totalSiklusFu: number | null;
  jumlahSiklus: number;
  statusAkhir: string | null;
};

export default function HistoryMcuPage() {
  return (
    <Suspense fallback={<Memuat teks="Memuat riwayat MCU..." />}>
      <HistoryMcuContent />
    </Suspense>
  );
}

function HistoryMcuContent() {
  const searchParams = useSearchParams();
  const karyawanIdAwal = searchParams.get('karyawanId') ?? '';

  const [daftarKaryawan, setDaftarKaryawan] = useState<Karyawan[]>([]);
  const [karyawanId, setKaryawanId] = useState(karyawanIdAwal);
  const [history, setHistory] = useState<HistoryKaryawan | null>(null);
  const [durasi, setDurasi] = useState<DurasiBaris[]>([]);

  const [memuatKaryawan, setMemuatKaryawan] = useState(true);
  const [memuatHistory, setMemuatHistory] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  const [filterBulan, setFilterBulan] = useState('');
  const [filterTahun, setFilterTahun] = useState('');

  useEffect(() => {
    mcuApi
      .ambil<Karyawan[]>('/karyawan')
      .then(setDaftarKaryawan)
      .catch((error: Error) => setGalat(error.message))
      .finally(() => setMemuatKaryawan(false));

    mcuApi
      .ambil<DurasiBaris[]>('/durasi-proses')
      .then(setDurasi)
      .catch(() => undefined);
  }, []);

  const muatHistory = useCallback(async (id: string) => {
    if (!id) {
      setHistory(null);
      return;
    }

    setMemuatHistory(true);
    setGalat(null);

    try {
      setHistory(await mcuApi.ambil<HistoryKaryawan>(`/history/${id}`));
    } catch (error) {
      setGalat((error as Error).message);
      setHistory(null);
    } finally {
      setMemuatHistory(false);
    }
  }, []);

  useEffect(() => {
    void muatHistory(karyawanId);
  }, [karyawanId, muatHistory]);

  const tahunTersedia = useMemo(() => {
    const tahunSekarang = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => tahunSekarang - 5 + index);
  }, []);

  const durasiTampil = useMemo(() => {
    return durasi.filter((item) => {
      const tanggal = new Date(item.tanggalMcu);

      if (filterBulan && tanggal.getMonth() + 1 !== Number(filterBulan)) {
        return false;
      }

      if (filterTahun && tanggal.getFullYear() !== Number(filterTahun)) {
        return false;
      }

      return true;
    });
  }, [durasi, filterBulan, filterTahun]);

  return (
    <>
      <div className={styles.breadcrumb}>
        <Link href="/hc/mcu">MCU Periodik</Link>
        <span>/</span>
        <strong>History &amp; Durasi Proses</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <History size={26} />
          </span>

          <div>
            <h1>History &amp; Durasi Proses</h1>
            <p>
              Riwayat lengkap MCU per karyawan - seluruh rekomendasi, jumlah
              siklus Follow Up sampai FIT, surat rujukan &amp; pengantar - serta
              durasi tiap tahapan alur untuk 50 kasus terakhir.
            </p>
          </div>
        </div>

        <div className={styles.headActions}>
          <Link
            href="/hc/mcu"
            className={`${styles.tombol} ${styles.tombolNetral}`}
          >
            <ArrowLeft size={15} />
            Kembali
          </Link>
        </div>
      </div>

      {galat ? <Pesan jenis="error">{galat}</Pesan> : null}

      <Panel judul="Cari Karyawan" keterangan="Pilih karyawan untuk melihat riwayat lengkap MCU-nya.">
        <div className={styles.filterBar}>
          <Search size={16} style={{ color: '#8494a9', alignSelf: 'center' }} />

          <select
            className={styles.select}
            style={{ maxWidth: 340 }}
            value={karyawanId}
            onChange={(event) => setKaryawanId(event.target.value)}
            disabled={memuatKaryawan}
          >
            <option value="">Pilih karyawan...</option>
            {daftarKaryawan.map((item) => (
              <option key={item.id} value={item.id}>
                {item.nama} - {item.nik} ({item.departemen.namaDepartemen})
              </option>
            ))}
          </select>
        </div>

        {memuatHistory ? (
          <Memuat />
        ) : !karyawanId ? (
          <Kosong
            judul="Belum ada karyawan dipilih"
            keterangan="Pilih karyawan pada dropdown di atas untuk melihat riwayat MCU-nya."
          />
        ) : history ? (
          <>
            <div className={styles.statGrid} style={{ marginBottom: 18 }}>
              <article className={styles.statCard}>
                <div>
                  <strong>{history.statistik.totalJadwal}</strong>
                  <p>Total Jadwal MCU</p>
                </div>
              </article>

              <article className={styles.statCard}>
                <div>
                  <strong>{history.statistik.totalRekomendasi}</strong>
                  <p>Total Rekomendasi</p>
                </div>
              </article>

              <article className={styles.statCard}>
                <div>
                  <strong>{history.statistik.totalSiklusFollowUp}</strong>
                  <p>Siklus Follow Up</p>
                </div>
              </article>

              <article className={styles.statCard}>
                <div>
                  <strong>{history.statistik.totalFit}</strong>
                  <p>Total FIT</p>
                </div>
              </article>
            </div>

            <div style={{ marginBottom: 16 }}>
              <div className={styles.tableNama} style={{ marginBottom: 6 }}>
                <strong>{history.karyawan.nama}</strong>
                <span>
                  {history.karyawan.nik} - {history.karyawan.jabatan ?? '-'} -{' '}
                  {history.karyawan.departemen.namaDepartemen}
                </span>
              </div>

              <div className={styles.rowAksi}>
                <BadgeStatus nilai={history.karyawan.statusKerja} />
                {history.karyawan.statusKesehatanDirumahkan ? (
                  <BadgeStatus
                    nilai={history.karyawan.statusKesehatanDirumahkan}
                  />
                ) : null}
              </div>
            </div>

            {history.riwayat.length === 0 ? (
              <Kosong
                judul="Belum ada riwayat MCU"
                keterangan="Karyawan ini belum memiliki jadwal MCU."
              />
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Tanggal MCU</th>
                      <th>Jenis</th>
                      <th>Klinik</th>
                      <th>Surat Pengantar</th>
                      <th>Siklus Rekomendasi</th>
                      <th>Induksi Ulang</th>
                    </tr>
                  </thead>

                  <tbody>
                    {history.riwayat.map((jadwal) => (
                      <tr key={jadwal.id}>
                        <td>{formatTanggal(jadwal.tanggalMcu)}</td>

                        <td>
                          <BadgeStatus nilai={jadwal.jenisMcu} />
                        </td>

                        <td>{jadwal.klinik?.namaKlinik ?? '-'}</td>

                        <td>
                          {jadwal.suratPengantar
                            ? jadwal.suratPengantar.nomorSurat
                            : '-'}
                        </td>

                        <td>
                          {jadwal.hasilMcu?.rekomendasi.length ? (
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 4,
                              }}
                            >
                              {jadwal.hasilMcu.rekomendasi.map((rekom) => (
                                <div key={rekom.id}>
                                  <BadgeStatus
                                    nilai={rekom.status}
                                    teks={`Ke-${rekom.siklusKe}: ${rekom.status === 'FIT' ? 'FIT' : 'Follow Up'}`}
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: '#8494a9' }}>
                              Belum ada hasil
                            </span>
                          )}
                        </td>

                        <td>
                          {jadwal.hasilMcu?.rekomendasi.find(
                            (rekom) => rekom.induksiUlang,
                          )?.induksiUlang ? (
                            <BadgeStatus
                              nilai={
                                jadwal.hasilMcu.rekomendasi.find(
                                  (rekom) => rekom.induksiUlang,
                                )!.induksiUlang!.status
                              }
                            />
                          ) : (
                            '-'
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        ) : null}
      </Panel>

      <Panel
        judul="Durasi Tiap Tahapan Proses"
        keterangan="50 kasus terakhir - satuan hari, dihitung antar tanggal tiap tahapan."
      >
        <div className={styles.filterBar}>
          <select
            className={styles.select}
            style={{ maxWidth: 160 }}
            value={filterBulan}
            onChange={(event) => setFilterBulan(event.target.value)}
          >
            <option value="">Semua Bulan</option>
            {Array.from({ length: 12 }, (_, index) => (
              <option key={index + 1} value={index + 1}>
                {new Intl.DateTimeFormat('id-ID', {
                  month: 'long',
                }).format(new Date(2026, index, 1))}
              </option>
            ))}
          </select>

          <select
            className={styles.select}
            style={{ maxWidth: 130 }}
            value={filterTahun}
            onChange={(event) => setFilterTahun(event.target.value)}
          >
            <option value="">Semua Tahun</option>
            {tahunTersedia.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>

        {durasiTampil.length === 0 ? (
          <Kosong
            judul="Belum ada data durasi"
            keterangan="Data akan muncul setelah ada hasil MCU yang diproses."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Tanggal MCU</th>
                  <th>Daftar → Surat</th>
                  <th>Pelaksanaan → Upload</th>
                  <th>Upload → Rekomendasi</th>
                  <th>Rekom → Karyawan</th>
                  <th>Total Siklus FU</th>
                  <th>Status Akhir</th>
                </tr>
              </thead>

              <tbody>
                {durasiTampil.map((item) => (
                  <tr key={item.jadwalId}>
                    <td>
                      <div className={styles.tableNama}>
                        <strong>{item.karyawan.nama}</strong>
                        <span>{item.departemen}</span>
                      </div>
                    </td>

                    <td>{formatTanggal(item.tanggalMcu)}</td>
                    <td>{item.pendaftaranKeSurat ?? '-'} hari</td>
                    <td>{item.pelaksanaanKeUpload ?? '-'} hari</td>
                    <td>{item.uploadKeRekomendasi ?? '-'} hari</td>
                    <td>{item.rekomendasiKeKaryawan ?? '-'} hari</td>
                    <td>{item.totalSiklusFu ?? '-'} hari</td>

                    <td>
                      {item.statusAkhir ? (
                        <BadgeStatus nilai={item.statusAkhir} />
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
