'use client';

// ==================================================
// FILE: frontend/src/app/hc/mcu/surat-pengantar/page.tsx
// FUNGSI: Terbitkan & kirim surat pengantar MCU (HC)
// Referensi: Bagian 4.3 alur-workflow-mcu-periodik-v3.md
// ==================================================

import Link from 'next/link';
import { ArrowLeft, Download, FileSignature, Send } from 'lucide-react';
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
  mcuApi,
  type SuratPengantar,
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

export default function SuratPengantarPage() {
  const { punyaPeran } = useMcu();
  const adalahHc = punyaPeran('HC');

  const [surat, setSurat] = useState<SuratPengantar[]>([]);
  const [menunggu, setMenunggu] = useState<JadwalMenunggu[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);

  const [jadwalDipilih, setJadwalDipilih] = useState<JadwalMenunggu | null>(
    null,
  );
  const [catatan, setCatatan] = useState('');

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      const [daftarSurat, daftarMenunggu] = await Promise.all([
        mcuApi.ambil<SuratPengantar[]>('/surat-pengantar'),
        mcuApi.ambil<JadwalMenunggu[]>('/surat-pengantar/menunggu-terbit'),
      ]);

      setSurat(daftarSurat);
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

  async function terbitkan() {
    if (!jadwalDipilih) {
      return;
    }

    setProses(true);
    setGalat(null);

    try {
      const hasil = await mcuApi.kirim<SuratPengantar>(
        `/surat-pengantar/jadwal/${jadwalDipilih.id}/terbitkan`,
        { catatan: catatan.trim() || undefined },
      );

      setSukses(`Surat pengantar ${hasil.nomorSurat} berhasil diterbitkan.`);
      setJadwalDipilih(null);
      setCatatan('');
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function kirim(item: SuratPengantar) {
    setProses(true);
    setGalat(null);

    try {
      await mcuApi.kirim(`/surat-pengantar/${item.id}/kirim`);

      setSukses(
        item.klinik?.terkoneksi
          ? `Surat ${item.nomorSurat} terkirim ke akun klinik ${item.klinik.namaKlinik}.`
          : `Surat ${item.nomorSurat} ditandai terkirim. Silakan unduh dan kirim manual ke klinik.`,
      );

      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  return (
    <>
      <div className={styles.breadcrumb}>
        <Link href="/hc/mcu">MCU Periodik</Link>
        <span>/</span>
        <strong>Surat Pengantar MCU</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <FileSignature size={26} />
          </span>

          <div>
            <h1>Surat Pengantar MCU</h1>
            <p>
              Sistem membuat nomor surat otomatis dan menghasilkan PDF. Klinik
              terkoneksi menerima surat lewat akunnya; klinik non-terkoneksi
              suratnya diunduh HC lalu dikirim manual.
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

      {!adalahHc ? (
        <Pesan jenis="info">
          Penerbitan dan pengiriman surat pengantar adalah wewenang akun HC.
          Halaman ini tampil dalam mode baca saja.
        </Pesan>
      ) : null}

      <Panel
        judul="Jadwal Menunggu Surat Pengantar"
        keterangan={`${menunggu.length} jadwal belum memiliki surat pengantar.`}
      >
        {memuat ? (
          <Memuat />
        ) : menunggu.length === 0 ? (
          <Kosong
            judul="Semua jadwal sudah bersurat"
            keterangan="Setiap jadwal MCU yang tersimpan sudah memiliki surat pengantar."
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

                    <td>
                      {item.klinik ? (
                        <>
                          {item.klinik.namaKlinik}
                          {item.klinik.terkoneksi ? (
                            <div style={{ marginTop: 4 }}>
                              <BadgeStatus nilai="FIT" teks="Terkoneksi" />
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <span style={{ color: '#c0392b' }}>Belum dipilih</span>
                      )}
                    </td>

                    <td>
                      <button
                        type="button"
                        className={`${styles.tombol} ${styles.tombolKecil}`}
                        onClick={() => {
                          setJadwalDipilih(item);
                          setCatatan('');
                        }}
                        disabled={!adalahHc || !item.klinik}
                      >
                        Terbitkan Surat
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
        judul="Surat Pengantar Terbit"
        keterangan={`${surat.length} surat tercatat.`}
      >
        {memuat ? (
          <Memuat />
        ) : surat.length === 0 ? (
          <Kosong
            judul="Belum ada surat pengantar"
            keterangan="Surat pengantar akan muncul di sini setelah diterbitkan HC."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nomor Surat</th>
                  <th>Karyawan</th>
                  <th>Klinik</th>
                  <th>Tanggal Terbit</th>
                  <th>Tanggal MCU</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {surat.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.nomorSurat}</strong>
                    </td>

                    <td>
                      <div className={styles.tableNama}>
                        <strong>{item.jadwalMcu.karyawan.nama}</strong>
                        <span>
                          {item.jadwalMcu.departemen.namaDepartemen}
                        </span>
                      </div>
                    </td>

                    <td>{item.klinik?.namaKlinik ?? '-'}</td>
                    <td>{formatTanggal(item.tanggalTerbit)}</td>
                    <td>{formatTanggal(item.jadwalMcu.tanggalMcu)}</td>

                    <td>
                      <BadgeStatus nilai={item.status} />
                      {item.tanggalKirim ? (
                        <div
                          style={{
                            marginTop: 4,
                            fontSize: 10.5,
                            color: '#8494a9',
                          }}
                        >
                          {formatWaktu(item.tanggalKirim)}
                        </div>
                      ) : null}
                    </td>

                    <td>
                      <div className={styles.rowAksi}>
                        {item.filePdf ? (
                          <a
                            href={`${process.env.NEXT_PUBLIC_UPLOADS_URL ?? 'http://localhost:3001/uploads'}/${item.filePdf.replace(/^mcu\//, 'mcu/')}`}
                            target="_blank"
                            rel="noreferrer"
                            className={`${styles.tombol} ${styles.tombolNetral} ${styles.tombolKecil}`}
                          >
                            <Download size={12} />
                            PDF
                          </a>
                        ) : null}

                        {adalahHc && item.status === 'DRAFT' ? (
                          <button
                            type="button"
                            className={`${styles.tombol} ${styles.tombolKecil}`}
                            onClick={() => kirim(item)}
                            disabled={proses}
                          >
                            <Send size={12} />
                            Kirim
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

      {jadwalDipilih ? (
        <Dialog
          judul="Terbitkan Surat Pengantar"
          keterangan={`${jadwalDipilih.karyawan.nama} - pelaksanaan ${formatTanggal(jadwalDipilih.tanggalMcu)} di ${jadwalDipilih.klinik?.namaKlinik ?? '-'}`}
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
                onClick={terbitkan}
                disabled={proses}
              >
                {proses ? 'Menerbitkan...' : 'Terbitkan & Generate PDF'}
              </button>
            </>
          }
        >
          <Field label="Catatan Tambahan pada Surat (opsional)" lebar>
            <textarea
              className={styles.textarea}
              value={catatan}
              onChange={(event) => setCatatan(event.target.value)}
              placeholder="Contoh: mohon dilakukan pemeriksaan audiometri tambahan"
            />
          </Field>
        </Dialog>
      ) : null}
    </>
  );
}
