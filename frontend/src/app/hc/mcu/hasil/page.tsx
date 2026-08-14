'use client';

// ==================================================
// FILE: frontend/src/app/hc/mcu/hasil/page.tsx
// FUNGSI: Upload & monitoring hasil MCU mentah
// Referensi: Bagian 4.4 alur-workflow-mcu-periodik-v3.md
// File mentah hanya dapat dibuka HC & Dokter.
// ==================================================

import Link from 'next/link';
import { ArrowLeft, Download, FlaskConical, Upload } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
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
  type HasilMcu,
} from '@/lib/mcu-api';
import { useMcu } from '../layout';
import styles from '../mcu.module.css';

type JadwalMenunggu = {
  id: number;
  tanggalMcu: string;
  jenisMcu: string;
  karyawan: { id: number; nik: string; nama: string };
  departemen: { id: number; namaDepartemen: string };
  klinik: { id: number; namaKlinik: string; terkoneksi: boolean } | null;
};

export default function HasilMcuPage() {
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

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      const [daftarHasil, daftarMenunggu] = await Promise.all([
        mcuApi.ambil<HasilMcu[]>('/hasil'),
        mcuApi.ambil<JadwalMenunggu[]>('/hasil/menunggu-upload'),
      ]);

      setHasil(daftarHasil);
      setMenunggu(daftarMenunggu);
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

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
      await unduhBerkas(
        `/hasil/${item.id}/file`,
        item.namaFileAsli ?? `hasil-mcu-${item.id}.pdf`,
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
        keterangan={`${hasil.length} hasil MCU tercatat.`}
      >
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
              onChange={(event) => setBerkas(event.target.files?.[0] ?? null)}
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
