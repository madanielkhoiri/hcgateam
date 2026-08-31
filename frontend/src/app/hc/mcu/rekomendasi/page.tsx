'use client';

// ==================================================
// FILE: frontend/src/app/hc/mcu/rekomendasi/page.tsx
// FUNGSI: Review Dokter, rekomendasi FIT/FU, surat rujukan,
//         dan penerusan rekomendasi ke karyawan
// Referensi: Bagian 4.5 & 4.6 alur-workflow-mcu-periodik-v3.md
// ==================================================

import Link from 'next/link';
import {
  ArrowLeft,
  Download,
  Send,
  Stethoscope,
  UploadCloud,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BadgeStatus,
  Dialog,
  Field,
  Kosong,
  Memuat,
  Panel,
  Pesan,
} from '@/components/mcu/mcu-ui';
import {
  formatTanggal,
  formatWaktu,
  mcuApi,
  unduhBerkas,
  type Rekomendasi,
  type StatusRekomendasi,
} from '@/lib/mcu-api';
import { useMcu } from '../layout';
import { compressImage } from '@/lib/compress-image';
import styles from '../mcu.module.css';

type AntreanHasil = {
  id: number;
  tanggalUpload: string;
  statusReview: string;
  jadwalMcu: {
    id: number;
    tanggalMcu: string;
    karyawan: { id: number; nik: string; nama: string };
    departemen: { id: number; namaDepartemen: string };
  };
};

type AntreanHasilFu = {
  id: number;
  tanggalSubmit: string;
  followUp: {
    id: number;
    siklusKe: number;
    karyawan: { id: number; nik: string; nama: string };
    rekomendasi: {
      id: number;
      siklusKe: number;
      hasilMcuId: number;
      catatanMedisTerbatas: string | null;
    };
  };
};

export default function RekomendasiPage() {
  const { punyaPeran } = useMcu();
  const adalahDokter = punyaPeran('DOKTER');
  const bolehTeruskan = punyaPeran('ADMIN_DEPT', 'HC');

  const [rekomendasi, setRekomendasi] = useState<Rekomendasi[]>([]);
  const [antrean, setAntrean] = useState<AntreanHasil[]>([]);
  const [antreanFu, setAntreanFu] = useState<AntreanHasilFu[]>([]);

  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);

  // Dialog review: dipakai untuk review awal maupun review ulang hasil FU.
  const [reviewTerbuka, setReviewTerbuka] = useState(false);
  const [hasilMcuId, setHasilMcuId] = useState<number | null>(null);
  const [hasilFuAsalId, setHasilFuAsalId] = useState<number | null>(null);
  const [namaPasien, setNamaPasien] = useState('');

  const [status, setStatus] = useState<StatusRekomendasi>('FIT');
  const [catatan, setCatatan] = useState('');
  const [filePdfRekomendasi, setFilePdfRekomendasi] = useState<string | null>(
    null,
  );
  const [suratRujukanFu, setSuratRujukanFu] = useState<string | null>(null);
  const [mengunggah, setMengunggah] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterBulan, setFilterBulan] = useState('');
  const [filterTahun, setFilterTahun] = useState('');

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      const [daftarRekom, daftarAntrean, daftarAntreanFu] = await Promise.all([
        mcuApi.ambil<Rekomendasi[]>('/rekomendasi'),
        mcuApi.ambil<AntreanHasil[]>('/rekomendasi/antrean-review'),
        mcuApi.ambil<AntreanHasilFu[]>('/follow-up/antrean-review-ulang'),
      ]);

      setRekomendasi(daftarRekom);
      setAntrean(daftarAntrean);
      setAntreanFu(daftarAntreanFu);
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  const tahunTersedia = useMemo(() => {
    const tahunSekarang = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => tahunSekarang - 5 + index);
  }, []);

  const rekomendasiTampil = useMemo(() => {
    return rekomendasi.filter((item) => {
      if (filterStatus && item.status !== filterStatus) {
        return false;
      }

      const tanggal = new Date(item.tanggalSubmit);

      if (filterBulan && tanggal.getMonth() + 1 !== Number(filterBulan)) {
        return false;
      }

      if (filterTahun && tanggal.getFullYear() !== Number(filterTahun)) {
        return false;
      }

      return true;
    });
  }, [rekomendasi, filterStatus, filterBulan, filterTahun]);

  function bukaReview(
    idHasilMcu: number,
    nama: string,
    idHasilFuAsal?: number,
  ) {
    setHasilMcuId(idHasilMcu);
    setHasilFuAsalId(idHasilFuAsal ?? null);
    setNamaPasien(nama);
    setStatus('FIT');
    setCatatan('');
    setFilePdfRekomendasi(null);
    setSuratRujukanFu(null);
    setReviewTerbuka(true);
  }

  async function unggahDokumen(
    kategori: 'rekomendasi' | 'surat-rujukan',
    fileDipilih: File,
  ) {
    setMengunggah(kategori);
    setGalat(null);

    try {
      const file = fileDipilih.type.startsWith('image/')
        ? await compressImage(fileDipilih).catch(() => fileDipilih)
        : fileDipilih;

      const hasil = await mcuApi.unggah<{ path: string }>(
        `/dokumen/${kategori}`,
        file,
      );

      if (kategori === 'rekomendasi') {
        setFilePdfRekomendasi(hasil.path);
      } else {
        setSuratRujukanFu(hasil.path);
      }
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMengunggah(null);
    }
  }

  async function submitRekomendasi() {
    if (!hasilMcuId) {
      return;
    }

    setProses(true);
    setGalat(null);

    try {
      await mcuApi.kirim(`/rekomendasi/hasil/${hasilMcuId}/submit`, {
        status,
        catatanMedisTerbatas: catatan.trim() || undefined,
        filePdfRekomendasi: filePdfRekomendasi ?? undefined,
        suratRujukanFu: suratRujukanFu ?? undefined,
        hasilFollowUpAsalId: hasilFuAsalId ?? undefined,
      });

      setSukses(
        status === 'FIT'
          ? `Rekomendasi FIT untuk ${namaPasien} tersimpan. HC & Admin Dept sudah dinotifikasi.`
          : `Rekomendasi Follow Up untuk ${namaPasien} tersimpan beserta surat rujukan.`,
      );

      setReviewTerbuka(false);
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function teruskan(item: Rekomendasi) {
    setProses(true);
    setGalat(null);

    try {
      await mcuApi.kirim(`/rekomendasi/${item.id}/teruskan`);

      setSukses(
        `Rekomendasi diteruskan ke ${item.hasilMcu.jadwalMcu.karyawan.nama}. ` +
          'Karyawan hanya melihat status FIT/Follow Up, bukan detail diagnosa.',
      );

      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function unduhRujukan(item: Rekomendasi) {
    setGalat(null);

    try {
      await unduhBerkas(
        `/rekomendasi/${item.id}/surat-rujukan`,
        `surat-rujukan-${item.nomorSuratRujukan ?? item.id}.pdf`,
      );
    } catch (error) {
      setGalat((error as Error).message);
    }
  }

  return (
    <>
      <div className={styles.breadcrumb}>
        <Link href="/hc/mcu">MCU Periodik</Link>
        <span>/</span>
        <strong>Review Dokter &amp; Rekomendasi</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <Stethoscope size={26} />
          </span>

          <div>
            <h1>Review Dokter &amp; Penerbitan Rekomendasi</h1>
            <p>
              Dokter menetapkan FIT atau Follow Up. Untuk Follow Up, surat
              rujukan diterbitkan Dokter di tahap ini juga. Admin Dept kemudian
              meneruskan status rekomendasi ke akun karyawan.
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
      {sukses ? <Pesan jenis="sukses">{sukses}</Pesan> : null}

      <Panel
        judul="Antrean Review Hasil MCU"
        keterangan={`${antrean.length} hasil MCU menunggu keputusan Dokter.`}
      >
        {memuat ? (
          <Memuat />
        ) : antrean.length === 0 ? (
          <Kosong
            judul="Antrean kosong"
            keterangan="Seluruh hasil MCU yang masuk sudah direview Dokter."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Departemen</th>
                  <th>Tanggal MCU</th>
                  <th>Upload Hasil</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {antrean.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.tableNama}>
                        <strong>{item.jadwalMcu.karyawan.nama}</strong>
                        <span>{item.jadwalMcu.karyawan.nik}</span>
                      </div>
                    </td>

                    <td>{item.jadwalMcu.departemen.namaDepartemen}</td>
                    <td>{formatTanggal(item.jadwalMcu.tanggalMcu)}</td>
                    <td>{formatWaktu(item.tanggalUpload)}</td>

                    <td>
                      <BadgeStatus nilai={item.statusReview} />
                    </td>

                    <td>
                      <button
                        type="button"
                        className={`${styles.tombol} ${styles.tombolKecil}`}
                        onClick={() =>
                          bukaReview(item.id, item.jadwalMcu.karyawan.nama)
                        }
                        disabled={!adalahDokter}
                      >
                        Review &amp; Submit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        judul="Antrean Review Ulang Hasil Follow Up"
        keterangan={`${antreanFu.length} hasil FU menunggu review ulang - loop berlanjut sampai FIT.`}
      >
        {memuat ? (
          <Memuat />
        ) : antreanFu.length === 0 ? (
          <Kosong
            judul="Tidak ada hasil FU menunggu"
            keterangan="Hasil Follow Up yang diupload akan masuk antrean ini."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Siklus FU</th>
                  <th>Submit Hasil</th>
                  <th>Catatan Sebelumnya</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {antreanFu.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.tableNama}>
                        <strong>{item.followUp.karyawan.nama}</strong>
                        <span>{item.followUp.karyawan.nik}</span>
                      </div>
                    </td>

                    <td>Siklus ke-{item.followUp.siklusKe}</td>
                    <td>{formatWaktu(item.tanggalSubmit)}</td>

                    <td
                      style={{
                        maxWidth: 280,
                        whiteSpace: 'normal',
                        color: '#6d7f99',
                      }}
                    >
                      {item.followUp.rekomendasi.catatanMedisTerbatas ?? '-'}
                    </td>

                    <td>
                      <button
                        type="button"
                        className={`${styles.tombol} ${styles.tombolKecil}`}
                        onClick={() =>
                          bukaReview(
                            item.followUp.rekomendasi.hasilMcuId,
                            item.followUp.karyawan.nama,
                            item.id,
                          )
                        }
                        disabled={!adalahDokter}
                      >
                        Review Ulang
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        judul="Rekomendasi Terbit"
        keterangan={`${rekomendasiTampil.length} dari ${rekomendasi.length} rekomendasi tercatat.`}
      >
        <div className={styles.filterBar}>
          <select
            className={styles.select}
            style={{ maxWidth: 170 }}
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="FIT">FIT</option>
            <option value="FOLLOW_UP">Follow Up</option>
          </select>

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

        {memuat ? (
          <Memuat />
        ) : rekomendasiTampil.length === 0 ? (
          <Kosong
            judul="Belum ada rekomendasi"
            keterangan="Rekomendasi muncul setelah Dokter menyelesaikan review hasil MCU."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Siklus</th>
                  <th>Status</th>
                  <th>Dokter</th>
                  <th>Tanggal Submit</th>
                  <th>Diteruskan</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {rekomendasiTampil.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.tableNama}>
                        <strong>
                          {item.hasilMcu.jadwalMcu.karyawan.nama}
                        </strong>
                        <span>
                          {item.hasilMcu.jadwalMcu.departemen.namaDepartemen}
                        </span>
                      </div>
                    </td>

                    <td>Ke-{item.siklusKe}</td>

                    <td>
                      <BadgeStatus nilai={item.status} />
                    </td>

                    <td>{item.dokter.name}</td>
                    <td>{formatWaktu(item.tanggalSubmit)}</td>

                    <td>
                      {item.diteruskanKeKaryawanAt ? (
                        <BadgeStatus
                          nilai="SELESAI"
                          teks={formatTanggal(item.diteruskanKeKaryawanAt)}
                        />
                      ) : (
                        <BadgeStatus nilai="MENUNGGU" teks="Belum diteruskan" />
                      )}
                    </td>

                    <td>
                      <div className={styles.rowAksi}>
                        {item.suratRujukanFu ? (
                          <button
                            type="button"
                            className={`${styles.tombol} ${styles.tombolNetral} ${styles.tombolKecil}`}
                            onClick={() => unduhRujukan(item)}
                          >
                            <Download size={12} />
                            Surat Rujukan
                          </button>
                        ) : null}

                        {bolehTeruskan && !item.diteruskanKeKaryawanAt ? (
                          <button
                            type="button"
                            className={`${styles.tombol} ${styles.tombolKecil}`}
                            onClick={() => teruskan(item)}
                            disabled={proses}
                          >
                            <Send size={12} />
                            Teruskan
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {reviewTerbuka ? (
        <Dialog
          judul={
            hasilFuAsalId
              ? `Review Ulang Hasil FU - ${namaPasien}`
              : `Review Hasil MCU - ${namaPasien}`
          }
          keterangan="Catatan medis terbatas hanya terlihat oleh HC, Dokter, dan Admin Dept. Karyawan hanya menerima status FIT/Follow Up."
          onTutup={() => setReviewTerbuka(false)}
          aksi={
            <>
              <button
                type="button"
                className={`${styles.tombol} ${styles.tombolNetral}`}
                onClick={() => setReviewTerbuka(false)}
                disabled={proses}
              >
                Batal
              </button>

              <button
                type="button"
                className={styles.tombol}
                onClick={submitRekomendasi}
                disabled={
                  proses ||
                  (status === 'FOLLOW_UP' && !suratRujukanFu) ||
                  mengunggah !== null
                }
              >
                {proses ? 'Menyimpan...' : 'Submit Rekomendasi'}
              </button>
            </>
          }
        >
          <div className={styles.formGrid}>
            <Field label="Keputusan Dokter" lebar>
              <select
                className={styles.select}
                value={status}
                onChange={(event) =>
                  setStatus(event.target.value as StatusRekomendasi)
                }
              >
                <option value="FIT">FIT - lanjut ke induksi ulang K3</option>
                <option value="FOLLOW_UP">
                  Follow Up - perlu pemeriksaan lanjutan
                </option>
              </select>
            </Field>

            <Field label="Catatan Medis Terbatas" lebar>
              <textarea
                className={styles.textarea}
                value={catatan}
                onChange={(event) => setCatatan(event.target.value)}
                placeholder="Ringkasan temuan yang perlu diketahui HC & Admin Dept"
              />
            </Field>

            <Field label="PDF Rekomendasi (opsional)" lebar>
              <input
                className={styles.input}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={(event) => {
                  const file = event.target.files?.[0];

                  if (file) {
                    void unggahDokumen('rekomendasi', file);
                  }
                }}
              />
              {mengunggah === 'rekomendasi' ? (
                <span style={{ fontSize: 11, color: '#7688a0' }}>
                  Mengupload...
                </span>
              ) : filePdfRekomendasi ? (
                <span style={{ fontSize: 11, color: '#0b7a4b' }}>
                  <UploadCloud size={11} /> Terupload
                </span>
              ) : null}
            </Field>

            {status === 'FOLLOW_UP' ? (
              <Field label="Surat Rujukan FU dari Dokter (wajib)" lebar>
                <input
                  className={styles.input}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(event) => {
                    const file = event.target.files?.[0];

                    if (file) {
                      void unggahDokumen('surat-rujukan', file);
                    }
                  }}
                />
                {mengunggah === 'surat-rujukan' ? (
                  <span style={{ fontSize: 11, color: '#7688a0' }}>
                    Mengupload...
                  </span>
                ) : suratRujukanFu ? (
                  <span style={{ fontSize: 11, color: '#0b7a4b' }}>
                    <UploadCloud size={11} /> Surat rujukan terupload
                  </span>
                ) : null}
              </Field>
            ) : null}
          </div>

          {status === 'FOLLOW_UP' ? (
            <div style={{ marginTop: 12 }}>
              <Pesan jenis="info">
                Rekomendasi Follow Up otomatis membuat kasus FU dengan biaya
                mandiri. Batas waktunya ditetapkan HC secara manual, maksimal 2
                bulan setelah MCU ulang.
              </Pesan>
            </div>
          ) : null}
        </Dialog>
      ) : null}
    </>
  );
}
