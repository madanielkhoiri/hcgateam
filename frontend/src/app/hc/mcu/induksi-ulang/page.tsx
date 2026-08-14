'use client';

// ==================================================
// FILE: frontend/src/app/hc/mcu/induksi-ulang/page.tsx
// FUNGSI: Pendaftaran & pelaksanaan induksi ulang K3 setelah FIT
// Referensi: Bagian 4.10 alur-workflow-mcu-periodik-v3.md
// ==================================================

import Link from 'next/link';
import {
  ArrowLeft,
  CalendarPlus,
  CheckCircle2,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
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
  type InduksiUlang,
} from '@/lib/mcu-api';
import { useMcu } from '../layout';
import styles from '../mcu.module.css';

type RekomFitMenunggu = {
  id: number;
  tanggalSubmit: string;
  siklusKe: number;
  hasilMcu: {
    jadwalMcu: {
      id: number;
      tanggalMcu: string;
      karyawan: { id: number; nik: string; nama: string };
      departemen: { id: number; namaDepartemen: string };
    };
  };
};

export default function InduksiUlangPage() {
  const { punyaPeran } = useMcu();
  const bolehDaftarkan = punyaPeran('ADMIN_DEPT', 'HC');
  const adalahShe = punyaPeran('SHE');

  const [induksi, setInduksi] = useState<InduksiUlang[]>([]);
  const [menunggu, setMenunggu] = useState<RekomFitMenunggu[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);

  const [dialogDaftar, setDialogDaftar] = useState<RekomFitMenunggu | null>(
    null,
  );
  const [dialogJadwal, setDialogJadwal] = useState<InduksiUlang | null>(null);
  const [dialogSelesai, setDialogSelesai] = useState<InduksiUlang | null>(null);

  const [inputTanggal, setInputTanggal] = useState('');
  const [inputCatatan, setInputCatatan] = useState('');

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      const [daftarInduksi, daftarMenunggu] = await Promise.all([
        mcuApi.ambil<InduksiUlang[]>('/induksi-ulang'),
        mcuApi.ambil<RekomFitMenunggu[]>(
          '/induksi-ulang/menunggu-pendaftaran',
        ),
      ]);

      setInduksi(daftarInduksi);
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

  async function daftarkan() {
    if (!dialogDaftar) {
      return;
    }

    setProses(true);
    setGalat(null);

    try {
      await mcuApi.kirim(
        `/induksi-ulang/rekomendasi/${dialogDaftar.id}/daftarkan`,
        { catatan: inputCatatan.trim() || undefined },
      );

      setSukses(
        `Induksi ulang ${dialogDaftar.hasilMcu.jadwalMcu.karyawan.nama} terdaftar dan diteruskan ke akun SHE.`,
      );
      setDialogDaftar(null);
      setInputCatatan('');
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function jadwalkan() {
    if (!dialogJadwal) {
      return;
    }

    setProses(true);
    setGalat(null);

    try {
      await mcuApi.kirim(`/induksi-ulang/${dialogJadwal.id}/jadwalkan`, {
        tanggalPelaksanaan: inputTanggal,
        catatan: inputCatatan.trim() || undefined,
      });

      setSukses('Jadwal induksi ulang tersimpan dan karyawan dinotifikasi.');
      setDialogJadwal(null);
      setInputTanggal('');
      setInputCatatan('');
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function selesaikan() {
    if (!dialogSelesai) {
      return;
    }

    setProses(true);
    setGalat(null);

    try {
      await mcuApi.kirim(`/induksi-ulang/${dialogSelesai.id}/selesaikan`, {
        catatan: inputCatatan.trim() || undefined,
      });

      setSukses(
        'Induksi ulang selesai. Masa berlaku MCU baru dan pemicu siklus H-3 bulan berikutnya sudah diperbarui.',
      );
      setDialogSelesai(null);
      setInputCatatan('');
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
        <strong>Re-Induksi K3</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <ShieldCheck size={26} />
          </span>

          <div>
            <h1>Induksi Ulang K3 (Setelah FIT)</h1>
            <p>
              Rekomendasi FIT memicu pendaftaran induksi ulang oleh Admin Dept.
              SHE menjadwalkan dan melaksanakannya. Saat status selesai, sistem
              menetapkan masa berlaku MCU baru sekaligus jadwal siklus
              berikutnya.
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
        judul="Rekomendasi FIT Menunggu Pendaftaran"
        keterangan={`${menunggu.length} karyawan FIT belum didaftarkan induksi ulang.`}
      >
        {memuat ? (
          <Memuat />
        ) : menunggu.length === 0 ? (
          <Kosong
            judul="Tidak ada yang menunggu"
            keterangan="Seluruh karyawan berstatus FIT sudah didaftarkan induksi ulang."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Departemen</th>
                  <th>Tanggal MCU</th>
                  <th>Rekomendasi FIT</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {menunggu.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.tableNama}>
                        <strong>
                          {item.hasilMcu.jadwalMcu.karyawan.nama}
                        </strong>
                        <span>{item.hasilMcu.jadwalMcu.karyawan.nik}</span>
                      </div>
                    </td>

                    <td>
                      {item.hasilMcu.jadwalMcu.departemen.namaDepartemen}
                    </td>
                    <td>{formatTanggal(item.hasilMcu.jadwalMcu.tanggalMcu)}</td>
                    <td>{formatWaktu(item.tanggalSubmit)}</td>

                    <td>
                      <button
                        type="button"
                        className={`${styles.tombol} ${styles.tombolKecil}`}
                        onClick={() => {
                          setDialogDaftar(item);
                          setInputCatatan('');
                        }}
                        disabled={!bolehDaftarkan}
                      >
                        <UserPlus size={12} />
                        Daftarkan
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
        judul="Daftar Induksi Ulang"
        keterangan={`${induksi.length} pendaftaran tercatat.`}
      >
        {memuat ? (
          <Memuat />
        ) : induksi.length === 0 ? (
          <Kosong
            judul="Belum ada induksi ulang"
            keterangan="Pendaftaran induksi ulang akan muncul di sini setelah didaftarkan Admin Dept."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Departemen</th>
                  <th>Tanggal Daftar</th>
                  <th>Tanggal Pelaksanaan</th>
                  <th>PIC SHE</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {induksi.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.tableNama}>
                        <strong>{item.karyawan.nama}</strong>
                        <span>{item.karyawan.nik}</span>
                      </div>
                    </td>

                    <td>{item.departemen.namaDepartemen}</td>
                    <td>{formatWaktu(item.tanggalDaftar)}</td>
                    <td>{formatTanggal(item.tanggalPelaksanaan)}</td>
                    <td>{item.she?.name ?? '-'}</td>

                    <td>
                      <BadgeStatus nilai={item.status} />
                    </td>

                    <td>
                      <div className={styles.rowAksi}>
                        {adalahShe && item.status !== 'SELESAI' ? (
                          <>
                            <button
                              type="button"
                              className={`${styles.tombol} ${styles.tombolLembut} ${styles.tombolKecil}`}
                              onClick={() => {
                                setDialogJadwal(item);
                                setInputTanggal('');
                                setInputCatatan(item.catatan ?? '');
                              }}
                            >
                              <CalendarPlus size={12} />
                              Jadwalkan
                            </button>

                            <button
                              type="button"
                              className={`${styles.tombol} ${styles.tombolKecil}`}
                              onClick={() => {
                                setDialogSelesai(item);
                                setInputCatatan(item.catatan ?? '');
                              }}
                            >
                              <CheckCircle2 size={12} />
                              Selesai
                            </button>
                          </>
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

      {dialogDaftar ? (
        <Dialog
          judul="Daftarkan Induksi Ulang"
          keterangan={`${dialogDaftar.hasilMcu.jadwalMcu.karyawan.nama} dinyatakan FIT dan akan diteruskan ke akun SHE.`}
          onTutup={() => setDialogDaftar(null)}
          aksi={
            <>
              <button
                type="button"
                className={`${styles.tombol} ${styles.tombolNetral}`}
                onClick={() => setDialogDaftar(null)}
                disabled={proses}
              >
                Batal
              </button>

              <button
                type="button"
                className={styles.tombol}
                onClick={daftarkan}
                disabled={proses}
              >
                {proses ? 'Mendaftarkan...' : 'Daftarkan ke SHE'}
              </button>
            </>
          }
        >
          <Field label="Catatan (opsional)" lebar>
            <textarea
              className={styles.textarea}
              value={inputCatatan}
              onChange={(event) => setInputCatatan(event.target.value)}
            />
          </Field>
        </Dialog>
      ) : null}

      {dialogJadwal ? (
        <Dialog
          judul={`Jadwalkan Induksi - ${dialogJadwal.karyawan.nama}`}
          onTutup={() => setDialogJadwal(null)}
          aksi={
            <>
              <button
                type="button"
                className={`${styles.tombol} ${styles.tombolNetral}`}
                onClick={() => setDialogJadwal(null)}
                disabled={proses}
              >
                Batal
              </button>

              <button
                type="button"
                className={styles.tombol}
                onClick={jadwalkan}
                disabled={proses || !inputTanggal}
              >
                {proses ? 'Menyimpan...' : 'Simpan Jadwal'}
              </button>
            </>
          }
        >
          <div className={styles.formGrid}>
            <Field label="Tanggal Pelaksanaan">
              <input
                className={styles.input}
                type="date"
                value={inputTanggal}
                onChange={(event) => setInputTanggal(event.target.value)}
              />
            </Field>

            <Field label="Catatan" lebar>
              <textarea
                className={styles.textarea}
                value={inputCatatan}
                onChange={(event) => setInputCatatan(event.target.value)}
              />
            </Field>
          </div>
        </Dialog>
      ) : null}

      {dialogSelesai ? (
        <Dialog
          judul={`Selesaikan Induksi - ${dialogSelesai.karyawan.nama}`}
          keterangan="Menyelesaikan induksi akan menetapkan masa berlaku MCU baru dan menghitung ulang jadwal reminder H-3 bulan."
          onTutup={() => setDialogSelesai(null)}
          aksi={
            <>
              <button
                type="button"
                className={`${styles.tombol} ${styles.tombolNetral}`}
                onClick={() => setDialogSelesai(null)}
                disabled={proses}
              >
                Batal
              </button>

              <button
                type="button"
                className={styles.tombol}
                onClick={selesaikan}
                disabled={proses}
              >
                {proses ? 'Memproses...' : 'Tandai Selesai'}
              </button>
            </>
          }
        >
          <Field label="Catatan Pelaksanaan (opsional)" lebar>
            <textarea
              className={styles.textarea}
              value={inputCatatan}
              onChange={(event) => setInputCatatan(event.target.value)}
            />
          </Field>

          {dialogSelesai.karyawan.statusKerja === 'DIRUMAHKAN' ? (
            <div style={{ marginTop: 12 }}>
              <Pesan jenis="info">
                Karyawan berstatus dirumahkan. Setelah induksi selesai (FIT MCU
                tahap 2), status kerja otomatis dikembalikan menjadi Aktif.
              </Pesan>
            </div>
          ) : null}
        </Dialog>
      ) : null}
    </>
  );
}
