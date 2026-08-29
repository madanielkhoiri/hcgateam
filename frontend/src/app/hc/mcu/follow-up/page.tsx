'use client';

// ==================================================
// FILE: frontend/src/app/hc/mcu/follow-up/page.tsx
// FUNGSI: Siklus Follow Up sampai FIT tanpa dead-end
// Referensi: Bagian 4.7 alur-workflow-mcu-periodik-v3.md
// ==================================================

import Link from 'next/link';
import {
  AlarmClock,
  ArrowLeft,
  CalendarCheck,
  Download,
  Repeat2,
  Timer,
  Upload,
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
  labelStatus,
  mcuApi,
  unduhBerkas,
  type FollowUp,
  type Klinik,
} from '@/lib/mcu-api';
import { useMcu } from '../layout';
import styles from '../mcu.module.css';

export default function FollowUpPage() {
  const { punyaPeran } = useMcu();
  const adalahHc = punyaPeran('HC');
  const bolehPilihTanggal = punyaPeran('KARYAWAN', 'HC', 'ADMIN_DEPT');
  const bolehUnggah = punyaPeran('KARYAWAN', 'HC', 'ADMIN_DEPT', 'KLINIK');
  const bolehBukaFile = punyaPeran('HC', 'DOKTER');

  const [daftar, setDaftar] = useState<FollowUp[]>([]);
  const [klinik, setKlinik] = useState<Klinik[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBulan, setFilterBulan] = useState('');
  const [filterTahun, setFilterTahun] = useState('');

  const [dialogBatas, setDialogBatas] = useState<FollowUp | null>(null);
  const [dialogTanggal, setDialogTanggal] = useState<FollowUp | null>(null);
  const [dialogUnggah, setDialogUnggah] = useState<FollowUp | null>(null);
  const [dialogReminder, setDialogReminder] = useState<FollowUp | null>(null);

  const [inputTanggal, setInputTanggal] = useState('');
  const [inputKlinik, setInputKlinik] = useState('');
  const [inputCatatan, setInputCatatan] = useState('');
  const [berkas, setBerkas] = useState<File | null>(null);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      const kueri = filterStatus ? `?status=${filterStatus}` : '';

      const [daftarFu, daftarKlinik] = await Promise.all([
        mcuApi.ambil<FollowUp[]>(`/follow-up${kueri}`),
        mcuApi.ambil<Klinik[]>('/klinik?hanyaAktif=true'),
      ]);

      setDaftar(daftarFu);
      setKlinik(daftarKlinik);
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMemuat(false);
    }
  }, [filterStatus]);

  useEffect(() => {
    void muat();
  }, [muat]);

  const jumlahTerlambat = useMemo(
    () => daftar.filter((item) => item.melewatiBatas).length,
    [daftar],
  );

  const tahunTersedia = useMemo(() => {
    const tahunSekarang = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => tahunSekarang - 5 + index);
  }, []);

  const daftarTampil = useMemo(() => {
    return daftar.filter((item) => {
      const tanggal = new Date(
        item.rekomendasi.hasilMcu.jadwalMcu.tanggalMcu,
      );

      if (filterBulan && tanggal.getMonth() + 1 !== Number(filterBulan)) {
        return false;
      }

      if (filterTahun && tanggal.getFullYear() !== Number(filterTahun)) {
        return false;
      }

      return true;
    });
  }, [daftar, filterBulan, filterTahun]);

  async function simpanBatas() {
    if (!dialogBatas) {
      return;
    }

    setProses(true);
    setGalat(null);

    try {
      await mcuApi.kirim(`/follow-up/${dialogBatas.id}/batas-waktu`, {
        batasWaktuFu: inputTanggal,
        klinikId: inputKlinik ? Number(inputKlinik) : undefined,
      });

      setSukses(
        `Batas waktu FU ${dialogBatas.karyawan.nama} ditetapkan. Karyawan sudah dinotifikasi untuk memilih tanggal.`,
      );
      setDialogBatas(null);
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function simpanTanggal() {
    if (!dialogTanggal) {
      return;
    }

    setProses(true);
    setGalat(null);

    try {
      await mcuApi.kirim(`/follow-up/${dialogTanggal.id}/pilih-tanggal`, {
        tanggalPilihanKaryawan: inputTanggal,
        klinikId: inputKlinik ? Number(inputKlinik) : undefined,
      });

      setSukses('Tanggal Follow Up tersimpan.');
      setDialogTanggal(null);
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function unggahHasil() {
    if (!dialogUnggah || !berkas) {
      return;
    }

    setProses(true);
    setGalat(null);

    try {
      await mcuApi.unggah(`/follow-up/${dialogUnggah.id}/unggah-hasil`, berkas);

      setSukses(
        'Hasil Follow Up terupload dan masuk antrean review ulang Dokter.',
      );
      setDialogUnggah(null);
      setBerkas(null);
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function kirimReminder() {
    if (!dialogReminder) {
      return;
    }

    setProses(true);
    setGalat(null);

    try {
      await mcuApi.kirim(`/follow-up/${dialogReminder.id}/reminder`, {
        catatan: inputCatatan.trim() || undefined,
      });

      setSukses(
        `Reminder terkirim ke Admin Dept untuk penjadwalan FU ulang ${dialogReminder.karyawan.nama}.`,
      );
      setDialogReminder(null);
      setInputCatatan('');
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function tandaiSemuaTerlambat() {
    setProses(true);
    setGalat(null);

    try {
      const hasil = await mcuApi.kirim<{ diproses: number }>(
        '/follow-up/tandai-terlambat',
      );

      setSukses(
        `${hasil.diproses} kasus FU melewati batas ditandai dan Admin Dept sudah di-reminder.`,
      );
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function unduhHasilFu(idHasil: number, nama: string | null) {
    setGalat(null);

    try {
      await unduhBerkas(
        `/follow-up/hasil/${idHasil}/file`,
        nama ?? `hasil-fu-${idHasil}.pdf`,
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
        <strong>Follow Up</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <Repeat2 size={26} />
          </span>

          <div>
            <h1>Follow Up (FU)</h1>
            <p>
              Seluruh biaya FU ditanggung mandiri. HC menetapkan batas waktu
              manual per kasus, maksimal 2 bulan setelah MCU ulang. Bila batas
              terlewat tanpa close, HC me-reminder Admin Dept untuk penjadwalan
              ulang sampai FIT tercapai.
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
              className={`${styles.tombol} ${styles.tombolBahaya}`}
              onClick={tandaiSemuaTerlambat}
              disabled={proses || jumlahTerlambat === 0}
            >
              <AlarmClock size={15} />
              Reminder Semua Terlambat ({jumlahTerlambat})
            </button>
          ) : null}
        </div>
      </div>

      {galat ? <Pesan jenis="error">{galat}</Pesan> : null}
      {sukses ? <Pesan jenis="sukses">{sukses}</Pesan> : null}

      <Panel
        judul="Daftar Kasus Follow Up"
        keterangan={`${daftarTampil.length} dari ${daftar.length} kasus, ${jumlahTerlambat} melewati batas waktu.`}
      >
        <div className={styles.filterBar}>
          <select
            className={styles.select}
            style={{ maxWidth: 230 }}
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="MENUNGGU_TANGGAL">Menunggu Tanggal</option>
            <option value="TERJADWAL">Terjadwal</option>
            <option value="TERLAKSANA">Terlaksana</option>
            <option value="TERLAMBAT_RESCHEDULE">
              Terlambat - Jadwal Ulang
            </option>
            <option value="SELESAI">Selesai</option>
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
        ) : daftarTampil.length === 0 ? (
          <Kosong
            judul="Belum ada kasus Follow Up"
            keterangan="Kasus FU dibuat otomatis saat Dokter menerbitkan rekomendasi Follow Up."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Siklus</th>
                  <th>Biaya</th>
                  <th>Batas Waktu HC</th>
                  <th>Tanggal Pilihan</th>
                  <th>Status</th>
                  <th>Reminder</th>
                  <th>Hasil FU</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {daftarTampil.map((item) => {
                  const hasilTerakhir =
                    item.hasilFollowUp[0] ?? null;

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className={styles.tableNama}>
                          <strong>{item.karyawan.nama}</strong>
                          <span>
                            {item.karyawan.departemen.namaDepartemen}
                          </span>
                        </div>
                      </td>

                      <td>Ke-{item.siklusKe}</td>
                      <td>
                        <BadgeStatus nilai="netral" teks="Mandiri" />
                      </td>

                      <td>
                        {item.batasWaktuFu ? (
                          <>
                            {formatTanggal(item.batasWaktuFu)}
                            <div
                              style={{
                                marginTop: 4,
                                fontSize: 10.5,
                                color: item.melewatiBatas
                                  ? '#b62b22'
                                  : '#8494a9',
                              }}
                            >
                              {item.melewatiBatas
                                ? `Lewat ${Math.abs(item.sisaHariBatas ?? 0)} hari`
                                : `${item.sisaHariBatas} hari lagi`}
                            </div>
                          </>
                        ) : (
                          <BadgeStatus
                            nilai="MENUNGGU"
                            teks="Belum ditetapkan"
                          />
                        )}
                      </td>

                      <td>{formatTanggal(item.tanggalPilihanKaryawan)}</td>

                      <td>
                        <BadgeStatus nilai={item.status} />
                      </td>

                      <td>
                        {item.jumlahReminderHc > 0
                          ? `${item.jumlahReminderHc}x`
                          : '-'}
                      </td>

                      <td>
                        {hasilTerakhir ? (
                          <div className={styles.tableNama}>
                            <span>{formatWaktu(hasilTerakhir.tanggalSubmit)}</span>
                            <span>
                              {labelStatus(hasilTerakhir.tipePengunggah)}
                            </span>
                          </div>
                        ) : (
                          <span style={{ color: '#8494a9' }}>Belum ada</span>
                        )}
                      </td>

                      <td>
                        <div className={styles.rowAksi}>
                          {adalahHc && item.status !== 'SELESAI' ? (
                            <button
                              type="button"
                              className={`${styles.tombol} ${styles.tombolLembut} ${styles.tombolKecil}`}
                              onClick={() => {
                                setDialogBatas(item);
                                setInputTanggal('');
                                setInputKlinik(
                                  item.klinik ? String(item.klinik.id) : '',
                                );
                              }}
                            >
                              <Timer size={12} />
                              Batas
                            </button>
                          ) : null}

                          {bolehPilihTanggal &&
                          item.batasWaktuFu &&
                          item.status !== 'SELESAI' &&
                          item.status !== 'TERLAKSANA' ? (
                            <button
                              type="button"
                              className={`${styles.tombol} ${styles.tombolKecil}`}
                              onClick={() => {
                                setDialogTanggal(item);
                                setInputTanggal('');
                                setInputKlinik(
                                  item.klinik ? String(item.klinik.id) : '',
                                );
                              }}
                            >
                              <CalendarCheck size={12} />
                              Tanggal
                            </button>
                          ) : null}

                          {bolehUnggah && item.status !== 'SELESAI' ? (
                            <button
                              type="button"
                              className={`${styles.tombol} ${styles.tombolNetral} ${styles.tombolKecil}`}
                              onClick={() => {
                                setDialogUnggah(item);
                                setBerkas(null);
                              }}
                            >
                              <Upload size={12} />
                              Hasil
                            </button>
                          ) : null}

                          {adalahHc &&
                          item.melewatiBatas &&
                          item.status !== 'SELESAI' ? (
                            <button
                              type="button"
                              className={`${styles.tombol} ${styles.tombolBahaya} ${styles.tombolKecil}`}
                              onClick={() => {
                                setDialogReminder(item);
                                setInputCatatan('');
                              }}
                            >
                              <AlarmClock size={12} />
                              Reminder
                            </button>
                          ) : null}

                          {bolehBukaFile && hasilTerakhir ? (
                            <button
                              type="button"
                              className={`${styles.tombol} ${styles.tombolNetral} ${styles.tombolKecil}`}
                              onClick={() =>
                                unduhHasilFu(
                                  hasilTerakhir.id,
                                  hasilTerakhir.namaFileAsli,
                                )
                              }
                            >
                              <Download size={12} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {dialogBatas ? (
        <Dialog
          judul={`Tetapkan Batas Waktu FU - ${dialogBatas.karyawan.nama}`}
          keterangan={`MCU ulang ${formatTanggal(dialogBatas.rekomendasi.hasilMcu.jadwalMcu.tanggalMcu)}. Batas maksimal 2 bulan setelah tanggal tersebut.`}
          onTutup={() => setDialogBatas(null)}
          aksi={
            <>
              <button
                type="button"
                className={`${styles.tombol} ${styles.tombolNetral}`}
                onClick={() => setDialogBatas(null)}
                disabled={proses}
              >
                Batal
              </button>

              <button
                type="button"
                className={styles.tombol}
                onClick={simpanBatas}
                disabled={proses || !inputTanggal}
              >
                {proses ? 'Menyimpan...' : 'Tetapkan Batas'}
              </button>
            </>
          }
        >
          <div className={styles.formGrid}>
            <Field label="Batas Waktu Follow Up">
              <input
                className={styles.input}
                type="date"
                value={inputTanggal}
                onChange={(event) => setInputTanggal(event.target.value)}
              />
            </Field>

            <Field label="Klinik Rujukan (opsional)">
              <select
                className={styles.select}
                value={inputKlinik}
                onChange={(event) => setInputKlinik(event.target.value)}
              >
                <option value="">Bebas / belum ditentukan</option>
                {klinik.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.namaKlinik}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </Dialog>
      ) : null}

      {dialogTanggal ? (
        <Dialog
          judul={`Pilih Tanggal FU - ${dialogTanggal.karyawan.nama}`}
          keterangan={`Tanggal tidak boleh melewati batas HC: ${formatTanggal(dialogTanggal.batasWaktuFu)}.`}
          onTutup={() => setDialogTanggal(null)}
          aksi={
            <>
              <button
                type="button"
                className={`${styles.tombol} ${styles.tombolNetral}`}
                onClick={() => setDialogTanggal(null)}
                disabled={proses}
              >
                Batal
              </button>

              <button
                type="button"
                className={styles.tombol}
                onClick={simpanTanggal}
                disabled={proses || !inputTanggal}
              >
                {proses ? 'Menyimpan...' : 'Simpan Tanggal'}
              </button>
            </>
          }
        >
          <div className={styles.formGrid}>
            <Field label="Tanggal Pelaksanaan FU">
              <input
                className={styles.input}
                type="date"
                value={inputTanggal}
                onChange={(event) => setInputTanggal(event.target.value)}
              />
            </Field>

            <Field label="Klinik (opsional)">
              <select
                className={styles.select}
                value={inputKlinik}
                onChange={(event) => setInputKlinik(event.target.value)}
              >
                <option value="">Belum ditentukan</option>
                {klinik.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.namaKlinik}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ marginTop: 12 }}>
            <Pesan jenis="info">
              Surat rujukan FU sudah diterbitkan Dokter pada tahap rekomendasi
              dan dapat diunduh dari halaman Rekomendasi. Biaya FU ditanggung
              mandiri.
            </Pesan>
          </div>
        </Dialog>
      ) : null}

      {dialogUnggah ? (
        <Dialog
          judul={`Upload Hasil FU - ${dialogUnggah.karyawan.nama}`}
          keterangan="Hasil dapat diupload oleh karyawan, klinik terkoneksi, HC, atau Admin Dept."
          onTutup={() => setDialogUnggah(null)}
          aksi={
            <>
              <button
                type="button"
                className={`${styles.tombol} ${styles.tombolNetral}`}
                onClick={() => setDialogUnggah(null)}
                disabled={proses}
              >
                Batal
              </button>

              <button
                type="button"
                className={styles.tombol}
                onClick={unggahHasil}
                disabled={proses || !berkas}
              >
                {proses ? 'Mengupload...' : 'Upload Hasil FU'}
              </button>
            </>
          }
        >
          <Field label="Berkas Hasil Follow Up" lebar>
            <input
              className={styles.input}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(event) => setBerkas(event.target.files?.[0] ?? null)}
            />
          </Field>
        </Dialog>
      ) : null}

      {dialogReminder ? (
        <Dialog
          judul={`Reminder FU Ulang - ${dialogReminder.karyawan.nama}`}
          keterangan={`Batas ${formatTanggal(dialogReminder.batasWaktuFu)} terlewat. Admin Dept akan diminta menjadwalkan FU ulang.`}
          onTutup={() => setDialogReminder(null)}
          aksi={
            <>
              <button
                type="button"
                className={`${styles.tombol} ${styles.tombolNetral}`}
                onClick={() => setDialogReminder(null)}
                disabled={proses}
              >
                Batal
              </button>

              <button
                type="button"
                className={`${styles.tombol} ${styles.tombolBahaya}`}
                onClick={kirimReminder}
                disabled={proses}
              >
                {proses ? 'Mengirim...' : 'Kirim Reminder'}
              </button>
            </>
          }
        >
          <Field label="Catatan HC (opsional)" lebar>
            <textarea
              className={styles.textarea}
              value={inputCatatan}
              onChange={(event) => setInputCatatan(event.target.value)}
              placeholder="Contoh: mohon dijadwalkan ulang minggu depan"
            />
          </Field>
        </Dialog>
      ) : null}
    </>
  );
}
