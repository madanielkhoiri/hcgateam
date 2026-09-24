'use client';

// ==================================================
// FILE: frontend/src/app/hc/mcu/hasil/page.tsx
// FUNGSI: Upload & monitoring hasil MCU mentah
// Referensi: Bagian 4.4 alur-workflow-mcu-periodik-v3.md
// File mentah hanya dapat dibuka HC & Dokter.
// ==================================================

import Link from 'next/link';
import { ArrowLeft, Download, FlaskConical, Upload } from 'lucide-react';
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
  labelStatus,
  mcuApi,
  unduhBerkas,
  type HasilHalaman,
  type HasilMcu,
  type HasilMcuSaya,
} from '@/lib/mcu-api';
import { PaginationBar, hitungTotalHalaman } from '@/components/pagination/pagination-bar';
import { useMcu } from '../layout';
import { compressImage } from '@/lib/compress-image';
import styles from '../mcu.module.css';

const UKURAN_HALAMAN = 20;

type JadwalMenunggu = {
  id: number;
  tanggalMcu: string;
  jenisMcu: string;
  karyawan: { id: number; nik: string; nama: string };
  departemen: { id: number; namaDepartemen: string };
  klinik: { id: number; namaKlinik: string; terkoneksi: boolean } | null;
};

// ==================================================
// HALAMAN — pilih tampilan sesuai role akun.
// Petugas (HC/Admin Dept/Dokter/Klinik) dapat konsol admin lengkap;
// Karyawan dapat riwayat hasil MCU miliknya sendiri saja, per tahun,
// lewat endpoint /hasil/saya.
// ==================================================

export default function HasilMcuPage() {
  const { punyaPeran } = useMcu();
  const adalahPetugas = punyaPeran('HC', 'ADMIN_DEPT', 'DOKTER', 'KLINIK');

  if (!adalahPetugas) {
    return <HasilSayaPage />;
  }

  return <HasilAdminPage />;
}

// ==================================================
// TAMPILAN KARYAWAN — riwayat hasil MCU miliknya sendiri per tahun,
// bisa unduh file miliknya sendiri saja. Data dari GET /mcu/hasil/saya,
// yang server-nya sudah membatasi ke karyawan pemilik akun (lihat
// McuHasilService.hasilSaya) — dan unduh filenya dicek kepemilikan
// juga di McuHasilService.pathFile.
// ==================================================

function HasilSayaPage() {
  const [data, setData] = useState<HasilMcuSaya[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [tahun, setTahun] = useState('');

  const tahunTersedia = useMemo(() => {
    const tahunSekarang = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => tahunSekarang - 5 + index);
  }, []);

  useEffect(() => {
    let aktif = true;
    setMemuat(true);
    setGalat(null);

    const parameter = new URLSearchParams();
    if (tahun) parameter.set('tahun', tahun);

    mcuApi
      .ambil<HasilMcuSaya[]>(`/hasil/saya?${parameter.toString()}`)
      .then((hasil) => {
        if (aktif) setData(hasil);
      })
      .catch((error: Error) => {
        if (aktif) setGalat(error.message);
      })
      .finally(() => {
        if (aktif) setMemuat(false);
      });

    return () => {
      aktif = false;
    };
  }, [tahun]);

  async function unduhFile(item: HasilMcuSaya) {
    setGalat(null);

    try {
      await unduhBerkas(`/hasil/${item.id}/file`);
    } catch (error) {
      setGalat((error as Error).message);
    }
  }

  return (
    <>
      <div className={styles.breadcrumb}>
        <Link href="/hc/mcu">MCU Periodik</Link>
        <span>/</span>
        <strong>Hasil MCU Saya</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <FlaskConical size={26} />
          </span>

          <div>
            <h1>Hasil MCU Saya</h1>
            <p>
              Riwayat hasil MCU Anda per tahun. File hanya dapat diunduh oleh
              Anda sendiri, HC, dan Dokter — tidak dapat dibuka karyawan lain.
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

      <Panel judul="Riwayat Hasil MCU">
        <div className={styles.filterBar}>
          <select
            className={styles.select}
            style={{ maxWidth: 130 }}
            value={tahun}
            onChange={(event) => setTahun(event.target.value)}
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
        ) : data.length === 0 ? (
          <Kosong
            judul="Belum ada hasil MCU"
            keterangan="Hasil MCU muncul di sini setelah diupload HC atau klinik terkoneksi."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tanggal MCU</th>
                  <th>Jenis MCU</th>
                  <th>Tanggal Upload</th>
                  <th>Status Review</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {data.map((item) => (
                  <tr key={item.id}>
                    <td>{formatTanggal(item.jadwalMcu.tanggalMcu)}</td>
                    <td>{item.jadwalMcu.jenisMcu}</td>
                    <td>{formatWaktu(item.tanggalUpload)}</td>

                    <td>
                      <BadgeStatus nilai={item.statusReview} />
                    </td>

                    <td>
                      {item.fileDihapusAt ? (
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>
                          File sudah dihapus (retensi 6 bulan)
                        </span>
                      ) : (
                        <button
                          type="button"
                          className={`${styles.tombol} ${styles.tombolNetral} ${styles.tombolKecil}`}
                          onClick={() => unduhFile(item)}
                        >
                          <Download size={12} />
                          Unduh
                        </button>
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

function HasilAdminPage() {
  const { punyaPeran } = useMcu();
  const bolehUnggah = punyaPeran('HC', 'KLINIK');
  const bolehBukaFile = punyaPeran('HC', 'DOKTER');

  const [hasil, setHasil] = useState<HasilMcu[]>([]);
  const [menunggu, setMenunggu] = useState<JadwalMenunggu[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);

  const [jadwalDipilih, setJadwalDipilih] = useState<JadwalMenunggu | null>(
    null,
  );
  const [berkas, setBerkas] = useState<File | null>(null);

  const [cari, setCari] = useState('');
  const [filterBulan, setFilterBulan] = useState('');
  const [filterTahun, setFilterTahun] = useState('');
  const [halaman, setHalaman] = useState(1);
  const [totalHasil, setTotalHasil] = useState(0);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      const parameter = new URLSearchParams({
        halaman: String(halaman),
        ukuranHalaman: String(UKURAN_HALAMAN),
      });

      if (filterBulan) parameter.set('bulan', filterBulan);
      if (filterTahun) parameter.set('tahun', filterTahun);
      if (cari.trim()) parameter.set('cari', cari.trim());

      const [hasilData, daftarMenunggu] = await Promise.all([
        mcuApi.ambil<HasilHalaman<HasilMcu>>(`/hasil?${parameter.toString()}`),
        mcuApi.ambil<JadwalMenunggu[]>('/hasil/menunggu-upload'),
      ]);

      setHasil(hasilData.data);
      setTotalHasil(hasilData.total);
      setMenunggu(daftarMenunggu);
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMemuat(false);
    }
  }, [cari, filterBulan, filterTahun, halaman]);

  useEffect(() => {
    void muat();
  }, [muat]);

  // Balik ke halaman 1 tiap kali filter berubah.
  useEffect(() => {
    setHalaman(1);
  }, [cari, filterBulan, filterTahun]);

  const tahunTersedia = useMemo(() => {
    const tahunSekarang = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => tahunSekarang - 5 + index);
  }, []);

  async function unggah() {
    if (!jadwalDipilih || !berkas) {
      return;
    }

    setProses(true);
    setGalat(null);

    try {
      await mcuApi.unggah(`/hasil/jadwal/${jadwalDipilih.id}/unggah`, berkas);

      setSukses(
        `Hasil MCU ${jadwalDipilih.karyawan.nama} terupload. Dokter sudah dinotifikasi untuk review.`,
      );
      setJadwalDipilih(null);
      setBerkas(null);
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function unduh(item: HasilMcu) {
    setGalat(null);

    try {
      await unduhBerkas(`/hasil/${item.id}/file`);
    } catch (error) {
      setGalat((error as Error).message);
    }
  }

  return (
    <>
      <div className={styles.breadcrumb}>
        <Link href="/hc/mcu">MCU Periodik</Link>
        <span>/</span>
        <strong>Hasil MCU</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <FlaskConical size={26} />
          </span>

          <div>
            <h1>Pelaksanaan &amp; Upload Hasil MCU</h1>
            <p>
              Hasil mentah diupload oleh klinik terkoneksi atau HC. File hanya
              dapat dibuka akun HC dan Dokter, serta otomatis dihapus 6 bulan
              setelah tanggal upload.
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
        judul="Menunggu Upload Hasil"
        keterangan={`${menunggu.length} pelaksanaan MCU belum ada hasilnya.`}
      >
        {memuat ? (
          <Memuat />
        ) : menunggu.length === 0 ? (
          <Kosong
            judul="Tidak ada yang menunggu"
            keterangan="Seluruh MCU yang sudah terlaksana hasilnya sudah diupload."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Departemen</th>
                  <th>Tanggal MCU</th>
                  <th>Klinik</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {menunggu.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.tableNama}>
                        <strong>{item.karyawan.nama}</strong>
                        <span>{item.karyawan.nik}</span>
                      </div>
                    </td>

                    <td>{item.departemen.namaDepartemen}</td>
                    <td>{formatTanggal(item.tanggalMcu)}</td>
                    <td>{item.klinik?.namaKlinik ?? '-'}</td>

                    <td>
                      <button
                        type="button"
                        className={`${styles.tombol} ${styles.tombolKecil}`}
                        onClick={() => {
                          setJadwalDipilih(item);
                          setBerkas(null);
                        }}
                        disabled={!bolehUnggah}
                      >
                        <Upload size={12} />
                        Upload Hasil
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
        judul="Hasil MCU Tersimpan"
        keterangan={`${totalHasil} hasil MCU, ditampilkan ${hasil.length} per halaman.`}
      >
        <div className={styles.filterBar}>
          <input
            className={styles.input}
            style={{ maxWidth: 220 }}
            placeholder="Cari nama atau NIK karyawan..."
            value={cari}
            onChange={(event) => setCari(event.target.value)}
          />

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
        ) : hasil.length === 0 ? (
          <Kosong
            judul="Belum ada hasil MCU"
            keterangan="Hasil MCU akan muncul setelah klinik atau HC mengunggahnya."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Tanggal MCU</th>
                  <th>Upload</th>
                  <th>Diunggah Oleh</th>
                  <th>Status Review</th>
                  <th>Rekomendasi</th>
                  <th>Retensi</th>
                  <th>File</th>
                </tr>
              </thead>

              <tbody>
                {hasil.map((item) => {
                  const rekomTerakhir =
                    item.rekomendasi[item.rekomendasi.length - 1] ?? null;

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className={styles.tableNama}>
                          <strong>{item.jadwalMcu.karyawan.nama}</strong>
                          <span>
                            {item.jadwalMcu.departemen.namaDepartemen}
                          </span>
                        </div>
                      </td>

                      <td>{formatTanggal(item.jadwalMcu.tanggalMcu)}</td>
                      <td>{formatWaktu(item.tanggalUpload)}</td>
                      <td>{labelStatus(item.tipePengunggah)}</td>

                      <td>
                        <BadgeStatus nilai={item.statusReview} />
                      </td>

                      <td>
                        {rekomTerakhir ? (
                          <BadgeStatus
                            nilai={rekomTerakhir.status}
                            teks={`${labelStatus(rekomTerakhir.status)} (siklus ${rekomTerakhir.siklusKe})`}
                          />
                        ) : (
                          <span style={{ color: '#8494a9' }}>Belum ada</span>
                        )}
                      </td>

                      <td>
                        {formatTanggal(item.retensiHapusAt)}
                        {item.fileDihapusAt ? (
                          <div style={{ marginTop: 4 }}>
                            <BadgeStatus
                              nilai="DIBATALKAN"
                              teks="File dihapus"
                            />
                          </div>
                        ) : null}
                      </td>

                      <td>
                        {bolehBukaFile && !item.fileDihapusAt ? (
                          <button
                            type="button"
                            className={`${styles.tombol} ${styles.tombolNetral} ${styles.tombolKecil}`}
                            onClick={() => unduh(item)}
                          >
                            <Download size={12} />
                            Unduh
                          </button>
                        ) : (
                          <span style={{ color: '#8494a9', fontSize: 11 }}>
                            {item.fileDihapusAt ? 'Retensi habis' : 'Terbatas'}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <PaginationBar
          halaman={halaman}
          totalHalaman={hitungTotalHalaman(totalHasil, UKURAN_HALAMAN)}
          onGanti={setHalaman}
        />
      </Panel>

      {jadwalDipilih ? (
        <Dialog
          judul="Upload Hasil MCU"
          keterangan={`${jadwalDipilih.karyawan.nama} - pelaksanaan ${formatTanggal(jadwalDipilih.tanggalMcu)}`}
          onTutup={() => setJadwalDipilih(null)}
          aksi={
            <>
              <button
                type="button"
                className={`${styles.tombol} ${styles.tombolNetral}`}
                onClick={() => setJadwalDipilih(null)}
                disabled={proses}
              >
                Batal
              </button>

              <button
                type="button"
                className={styles.tombol}
                onClick={unggah}
                disabled={proses || !berkas}
              >
                {proses ? 'Mengupload...' : 'Upload Hasil'}
              </button>
            </>
          }
        >
          <Field label="Berkas Hasil MCU (PDF/JPG/PNG, maks 15 MB)" lebar>
            <input
              className={styles.input}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={async (event) => {
                const file = event.target.files?.[0] ?? null;
                if (file && file.type.startsWith('image/')) {
                  setBerkas(await compressImage(file).catch(() => file));
                  return;
                }
                setBerkas(file);
              }}
            />
          </Field>

          <div style={{ marginTop: 12 }}>
            <Pesan jenis="info">
              File ini berisi data medis mentah dan hanya dapat diakses akun HC
              dan Dokter. Retensi otomatis 6 bulan sejak tanggal upload.
            </Pesan>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
