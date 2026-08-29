'use client';

// ==================================================
// FILE: frontend/src/app/hc/mcu/surat-pengantar/page.tsx
// FUNGSI: Terbitkan (batch) & kirim surat pengantar MCU (HC)
// Referensi: Bagian 4.3 alur-workflow-mcu-periodik-v3.md
// Satu surat bisa mencakup beberapa Jadwal MCU sekaligus ke satu
// klinik tujuan yang sama. Identitas karyawan tetap dari Database
// Karyawan (lewat Jadwal MCU); yang diisi manual per baris hanya
// Jenis Pemeriksaan & Tanggal MCU.
// ==================================================

import Link from 'next/link';
import { ArrowLeft, Download, FileSignature, RefreshCw, Send } from 'lucide-react';
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
  nilaiInputTanggal,
  type Klinik,
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

type BarisPilihan = {
  jenisPemeriksaan: string;
  tanggalMcu: string;
};

const UPLOADS_URL =
  process.env.NEXT_PUBLIC_UPLOADS_URL ?? 'http://localhost:3001/api/uploads';

export default function SuratPengantarPage() {
  const { punyaPeran } = useMcu();
  const adalahHc = punyaPeran('HC');

  const [surat, setSurat] = useState<SuratPengantar[]>([]);
  const [menunggu, setMenunggu] = useState<JadwalMenunggu[]>([]);
  const [klinikList, setKlinikList] = useState<Klinik[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);

  const [dialogTerbuka, setDialogTerbuka] = useState(false);
  const [klinikId, setKlinikId] = useState('');
  const [dipilih, setDipilih] = useState<Record<number, BarisPilihan>>({});
  const [catatan, setCatatan] = useState('');

  const [filterStatus, setFilterStatus] = useState('');
  const [filterBulan, setFilterBulan] = useState('');
  const [filterTahun, setFilterTahun] = useState('');

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      const [daftarSurat, daftarMenunggu, daftarKlinik] = await Promise.all([
        mcuApi.ambil<SuratPengantar[]>('/surat-pengantar'),
        mcuApi.ambil<JadwalMenunggu[]>('/surat-pengantar/menunggu-terbit'),
        mcuApi.ambil<Klinik[]>('/klinik?hanyaAktif=true'),
      ]);

      setSurat(daftarSurat);
      setMenunggu(daftarMenunggu);
      setKlinikList(daftarKlinik);
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

  const suratTampil = useMemo(() => {
    return surat.filter((item) => {
      if (filterStatus && item.status !== filterStatus) {
        return false;
      }

      const tanggal = new Date(item.tanggalTerbit);

      if (filterBulan && tanggal.getMonth() + 1 !== Number(filterBulan)) {
        return false;
      }

      if (filterTahun && tanggal.getFullYear() !== Number(filterTahun)) {
        return false;
      }

      return true;
    });
  }, [surat, filterStatus, filterBulan, filterTahun]);

  function bukaDialog() {
    setKlinikId('');
    setDipilih({});
    setCatatan('');
    setDialogTerbuka(true);
  }

  function toggleJadwal(item: JadwalMenunggu) {
    setDipilih((current) => {
      const salinan = { ...current };

      if (salinan[item.id]) {
        delete salinan[item.id];
      } else {
        salinan[item.id] = {
          jenisPemeriksaan: '',
          tanggalMcu: nilaiInputTanggal(item.tanggalMcu),
        };
      }

      return salinan;
    });
  }

  function ubahBaris(id: number, field: keyof BarisPilihan, nilai: string) {
    setDipilih((current) => ({
      ...current,
      [id]: { ...current[id], [field]: nilai },
    }));
  }

  const jumlahDipilih = Object.keys(dipilih).length;

  const bisaTerbitkan =
    klinikId &&
    jumlahDipilih > 0 &&
    Object.values(dipilih).every(
      (baris) => baris.jenisPemeriksaan.trim() && baris.tanggalMcu,
    );

  async function terbitkan() {
    setProses(true);
    setGalat(null);

    try {
      const hasil = await mcuApi.kirim<SuratPengantar>('/surat-pengantar/terbitkan', {
        klinikId: Number(klinikId),
        catatan: catatan.trim() || undefined,
        jadwal: Object.entries(dipilih).map(([jadwalMcuId, baris]) => ({
          jadwalMcuId: Number(jadwalMcuId),
          jenisPemeriksaan: baris.jenisPemeriksaan.trim(),
          tanggalMcu: baris.tanggalMcu,
        })),
      });

      setSukses(
        `Surat pengantar ${hasil.nomorSurat} berhasil diterbitkan untuk ${hasil.jadwalMcu.length} karyawan.`,
      );
      setDialogTerbuka(false);
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function cetakUlang(item: SuratPengantar) {
    setProses(true);
    setGalat(null);

    try {
      await mcuApi.kirim(`/surat-pengantar/${item.id}/cetak-ulang`);
      setSukses(`PDF surat ${item.nomorSurat} berhasil dicetak ulang.`);
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

  const daftarTerpilih = useMemo(
    () => menunggu.filter((item) => dipilih[item.id]),
    [menunggu, dipilih],
  );

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
              Pilih beberapa jadwal MCU sekaligus ke satu klinik tujuan untuk
              digabung jadi 1 surat batch (nomor otomatis + PDF). Klinik
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

          {adalahHc ? (
            <button
              type="button"
              className={styles.tombol}
              onClick={bukaDialog}
              disabled={menunggu.length === 0}
            >
              <FileSignature size={15} />
              Terbitkan Surat Pengantar
            </button>
          ) : null}
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
                  <th>Klinik saat ini</th>
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
                        <span style={{ color: '#8494a9' }}>Belum dipilih</span>
                      )}
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
        keterangan={`${suratTampil.length} dari ${surat.length} surat tercatat.`}
      >
        <div className={styles.filterBar}>
          <select
            className={styles.select}
            style={{ maxWidth: 170 }}
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="DRAFT">Draft</option>
            <option value="TERKIRIM">Terkirim</option>
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
        ) : suratTampil.length === 0 ? (
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
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {suratTampil.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.nomorSurat}</strong>
                    </td>

                    <td>
                      <div className={styles.tableNama}>
                        <strong>{item.jadwalMcu.length} karyawan</strong>
                        <span>
                          {item.jadwalMcu
                            .map((jadwal) => jadwal.karyawan.nama)
                            .join(', ')}
                        </span>
                      </div>
                    </td>

                    <td>{item.klinik?.namaKlinik ?? '-'}</td>
                    <td>{formatTanggal(item.tanggalTerbit)}</td>

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
                            href={`${UPLOADS_URL}/${item.filePdf}`}
                            target="_blank"
                            rel="noreferrer"
                            className={`${styles.tombol} ${styles.tombolNetral} ${styles.tombolKecil}`}
                          >
                            <Download size={12} />
                            PDF
                          </a>
                        ) : null}

                        {adalahHc ? (
                          <button
                            type="button"
                            className={`${styles.tombol} ${styles.tombolNetral} ${styles.tombolKecil}`}
                            onClick={() => void cetakUlang(item)}
                            disabled={proses}
                          >
                            <RefreshCw size={12} />
                            Cetak Ulang
                          </button>
                        ) : null}

                        {adalahHc && item.status === 'DRAFT' ? (
                          <button
                            type="button"
                            className={`${styles.tombol} ${styles.tombolKecil}`}
                            onClick={() => void kirim(item)}
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

      {dialogTerbuka ? (
        <Dialog
          judul="Terbitkan Surat Pengantar"
          keterangan="Pilih klinik tujuan, lalu centang jadwal MCU yang akan digabung dalam 1 surat."
          onTutup={() => setDialogTerbuka(false)}
          aksi={
            <>
              <button
                type="button"
                className={`${styles.tombol} ${styles.tombolNetral}`}
                onClick={() => setDialogTerbuka(false)}
                disabled={proses}
              >
                Batal
              </button>

              <button
                type="button"
                className={styles.tombol}
                onClick={() => void terbitkan()}
                disabled={proses || !bisaTerbitkan}
              >
                {proses
                  ? 'Menerbitkan...'
                  : `Terbitkan & Generate PDF (${jumlahDipilih})`}
              </button>
            </>
          }
        >
          <div className={styles.formGrid}>
            <Field label="Klinik Tujuan" lebar>
              <select
                className={styles.select}
                value={klinikId}
                onChange={(event) => setKlinikId(event.target.value)}
              >
                <option value="">Pilih klinik</option>
                {klinikList.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.namaKlinik}
                    {item.terkoneksi ? ' (terkoneksi)' : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Catatan Tambahan pada Surat (opsional)" lebar>
              <textarea
                className={styles.textarea}
                value={catatan}
                onChange={(event) => setCatatan(event.target.value)}
                placeholder="Contoh: mohon dilakukan pemeriksaan audiometri tambahan"
              />
            </Field>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th />
                    <th>Karyawan</th>
                    <th>Jenis Pemeriksaan</th>
                    <th>Tanggal MCU</th>
                  </tr>
                </thead>

                <tbody>
                  {menunggu.map((item) => {
                    const baris = dipilih[item.id];

                    return (
                      <tr key={item.id}>
                        <td>
                          <input
                            type="checkbox"
                            checked={Boolean(baris)}
                            onChange={() => toggleJadwal(item)}
                          />
                        </td>

                        <td>
                          <div className={styles.tableNama}>
                            <strong>{item.karyawan.nama}</strong>
                            <span>{item.karyawan.nik}</span>
                          </div>
                        </td>

                        <td>
                          <input
                            className={styles.input}
                            style={{ minWidth: 110 }}
                            value={baris?.jenisPemeriksaan ?? ''}
                            onChange={(event) =>
                              ubahBaris(
                                item.id,
                                'jenisPemeriksaan',
                                event.target.value,
                              )
                            }
                            placeholder="Contoh: L1B"
                            disabled={!baris}
                          />
                        </td>

                        <td>
                          <input
                            className={styles.input}
                            type="date"
                            value={baris?.tanggalMcu ?? ''}
                            onChange={(event) =>
                              ubahBaris(item.id, 'tanggalMcu', event.target.value)
                            }
                            disabled={!baris}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {daftarTerpilih.length === 0 ? (
              <p style={{ marginTop: 10, color: '#8494a9', fontSize: 11.5 }}>
                Centang minimal 1 karyawan untuk diterbitkan surat pengantarnya.
              </p>
            ) : null}
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
