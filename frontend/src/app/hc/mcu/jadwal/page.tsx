'use client';

// ==================================================
// FILE: frontend/src/app/hc/mcu/jadwal/page.tsx
// FUNGSI: Penjadwalan MCU, lock H-3 hari, override HC
// Referensi: Bagian 4.0 & 4.2 alur-workflow-mcu-periodik-v3.md
// ==================================================

import Link from 'next/link';
import {
  ArrowLeft,
  CalendarClock,
  Lock,
  Pencil,
  Plus,
  XCircle,
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
  mcuApi,
  nilaiInputTanggal,
  type Departemen,
  type JadwalMcu,
  type JenisMcu,
  type Karyawan,
  type Klinik,
} from '@/lib/mcu-api';
import { useMcu } from '../layout';
import styles from '../mcu.module.css';

export default function JadwalMcuPage() {
  const { punyaPeran } = useMcu();
  const bolehJadwalkan = punyaPeran('ADMIN_DEPT', 'HC');
  const adalahHc = punyaPeran('HC');

  const [jadwal, setJadwal] = useState<JadwalMcu[]>([]);
  const [karyawan, setKaryawan] = useState<Karyawan[]>([]);
  const [klinik, setKlinik] = useState<Klinik[]>([]);
  const [departemen, setDepartemen] = useState<Departemen[]>([]);

  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);

  const [filterStatus, setFilterStatus] = useState('');
  const [filterDept, setFilterDept] = useState('');

  const [dialogBuat, setDialogBuat] = useState(false);
  const [jadwalDiedit, setJadwalDiedit] = useState<JadwalMcu | null>(null);
  const [jadwalDibatalkan, setJadwalDibatalkan] = useState<JadwalMcu | null>(
    null,
  );

  const [formKaryawanId, setFormKaryawanId] = useState('');
  const [formTanggal, setFormTanggal] = useState('');
  const [formJenis, setFormJenis] = useState<JenisMcu>('BERKALA');
  const [formKlinikId, setFormKlinikId] = useState('');
  const [formCatatan, setFormCatatan] = useState('');
  const [formAlasanHc, setFormAlasanHc] = useState('');

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      const parameter = new URLSearchParams();

      if (filterStatus) {
        parameter.set('status', filterStatus);
      }

      if (filterDept) {
        parameter.set('departemenId', filterDept);
      }

      const kueri = parameter.toString();

      const [daftarJadwal, daftarKaryawan, daftarKlinik, daftarDept] =
        await Promise.all([
          mcuApi.ambil<JadwalMcu[]>(`/jadwal${kueri ? `?${kueri}` : ''}`),
          mcuApi.ambil<Karyawan[]>('/karyawan?statusKerja=AKTIF'),
          mcuApi.ambil<Klinik[]>('/klinik?hanyaAktif=true'),
          mcuApi.ambil<Departemen[]>('/departemen'),
        ]);

      setJadwal(daftarJadwal);
      setKaryawan(daftarKaryawan);
      setKlinik(daftarKlinik);
      setDepartemen(daftarDept);
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMemuat(false);
    }
  }, [filterStatus, filterDept]);

  useEffect(() => {
    void muat();
  }, [muat]);

  function resetForm() {
    setFormKaryawanId('');
    setFormTanggal('');
    setFormJenis('BERKALA');
    setFormKlinikId('');
    setFormCatatan('');
    setFormAlasanHc('');
  }

  function bukaBuat() {
    resetForm();
    setDialogBuat(true);
  }

  function bukaEdit(item: JadwalMcu) {
    setJadwalDiedit(item);
    setFormTanggal(nilaiInputTanggal(item.tanggalMcu));
    setFormJenis(item.jenisMcu);
    setFormKlinikId(item.klinikId ? String(item.klinikId) : '');
    setFormCatatan(item.catatan ?? '');
    setFormAlasanHc('');
  }

  async function simpanBaru() {
    setProses(true);
    setGalat(null);

    try {
      await mcuApi.kirim('/jadwal', {
        karyawanId: Number(formKaryawanId),
        tanggalMcu: formTanggal,
        jenisMcu: formJenis,
        klinikId: formKlinikId ? Number(formKlinikId) : undefined,
        catatan: formCatatan.trim() || undefined,
      });

      setSukses(
        'Jadwal MCU tersimpan dan notifikasi sudah dikirim ke karyawan.',
      );
      setDialogBuat(false);
      resetForm();
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function simpanPerubahan() {
    if (!jadwalDiedit) {
      return;
    }

    setProses(true);
    setGalat(null);

    try {
      await mcuApi.ubah(`/jadwal/${jadwalDiedit.id}`, {
        tanggalMcu: formTanggal,
        jenisMcu: formJenis,
        klinikId: formKlinikId ? Number(formKlinikId) : undefined,
        catatan: formCatatan.trim() || undefined,
        alasanPerubahanHc: formAlasanHc.trim() || undefined,
      });

      setSukses('Jadwal MCU berhasil diperbarui.');
      setJadwalDiedit(null);
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function batalkan() {
    if (!jadwalDibatalkan) {
      return;
    }

    setProses(true);
    setGalat(null);

    try {
      await mcuApi.kirim(`/jadwal/${jadwalDibatalkan.id}/batalkan`, {
        alasanPerubahanHc: formAlasanHc.trim(),
      });

      setSukses('Jadwal MCU dibatalkan.');
      setJadwalDibatalkan(null);
      setFormAlasanHc('');
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function kunciJatuhTempo() {
    setProses(true);
    setGalat(null);

    try {
      const hasil = await mcuApi.kirim<{ terkunci: number }>(
        '/jadwal/kunci-jatuh-tempo',
      );

      setSukses(`${hasil.terkunci} jadwal dikunci karena sudah masuk H-3 hari.`);
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
        <strong>Penjadwalan MCU</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <CalendarClock size={26} />
          </span>

          <div>
            <h1>Penjadwalan MCU &amp; Lock H-3 Hari</h1>
            <p>
              Admin Dept menentukan tanggal pelaksanaan dan klinik tujuan, lalu
              submit ke karyawan. Pendaftaran otomatis terkunci 3 hari sebelum
              pelaksanaan dan hanya akun HC yang dapat mengubah setelahnya.
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
              className={`${styles.tombol} ${styles.tombolLembut}`}
              onClick={kunciJatuhTempo}
              disabled={proses}
            >
              <Lock size={15} />
              Kunci Jadwal Jatuh Tempo
            </button>
          ) : null}

          {bolehJadwalkan ? (
            <button
              type="button"
              className={styles.tombol}
              onClick={bukaBuat}
              disabled={karyawan.length === 0}
            >
              <Plus size={15} />
              Buat Jadwal
            </button>
          ) : null}
        </div>
      </div>

      {galat ? <Pesan jenis="error">{galat}</Pesan> : null}
      {sukses ? <Pesan jenis="sukses">{sukses}</Pesan> : null}

      <Panel
        judul="Daftar Jadwal MCU"
        keterangan={`${jadwal.length} jadwal ditampilkan.`}
      >
        <div className={styles.filterBar}>
          <select
            className={styles.select}
            style={{ maxWidth: 180 }}
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="DRAFT">Draft</option>
            <option value="TERKUNCI">Terkunci</option>
            <option value="SELESAI">Selesai</option>
            <option value="DIBATALKAN">Dibatalkan</option>
          </select>

          <select
            className={styles.select}
            style={{ maxWidth: 200 }}
            value={filterDept}
            onChange={(event) => setFilterDept(event.target.value)}
          >
            <option value="">Semua Departemen</option>
            {departemen.map((item) => (
              <option key={item.id} value={item.id}>
                {item.namaDepartemen}
              </option>
            ))}
          </select>
        </div>

        {memuat ? (
          <Memuat />
        ) : jadwal.length === 0 ? (
          <Kosong
            judul="Belum ada jadwal MCU"
            keterangan="Buat jadwal untuk karyawan yang sudah masuk masa reminder H-3 bulan."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Departemen</th>
                  <th>Jenis</th>
                  <th>Tanggal MCU</th>
                  <th>Tanggal Lock</th>
                  <th>Klinik</th>
                  <th>Status</th>
                  <th>Surat</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {jadwal.map((item) => {
                  const bolehUbah =
                    item.statusPendaftaran !== 'SELESAI' &&
                    item.statusPendaftaran !== 'DIBATALKAN' &&
                    (adalahHc || (bolehJadwalkan && !item.terkunci));

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className={styles.tableNama}>
                          <strong>{item.karyawan.nama}</strong>
                          <span>{item.karyawan.nik}</span>
                        </div>
                      </td>

                      <td>{item.departemen.namaDepartemen}</td>
                      <td>
                        <BadgeStatus nilai={item.jenisMcu} />
                      </td>
                      <td>{formatTanggal(item.tanggalMcu)}</td>

                      <td>
                        {formatTanggal(item.tanggalLock)}
                        {item.terkunci ? (
                          <div style={{ marginTop: 4 }}>
                            <BadgeStatus nilai="TERKUNCI" teks="Terkunci" />
                          </div>
                        ) : (
                          <div style={{ marginTop: 4, fontSize: 10.5, color: '#8494a9' }}>
                            {item.sisaHariLock} hari lagi
                          </div>
                        )}
                      </td>

                      <td>{item.klinik?.namaKlinik ?? '-'}</td>

                      <td>
                        <BadgeStatus nilai={item.statusPendaftaran} />
                      </td>

                      <td>
                        {item.suratPengantar ? (
                          <BadgeStatus
                            nilai={item.suratPengantar.status}
                            teks={item.suratPengantar.nomorSurat}
                          />
                        ) : (
                          <span style={{ color: '#8494a9' }}>Belum terbit</span>
                        )}
                      </td>

                      <td>
                        <div className={styles.rowAksi}>
                          {bolehUbah ? (
                            <button
                              type="button"
                              className={`${styles.tombol} ${styles.tombolLembut} ${styles.tombolKecil}`}
                              onClick={() => bukaEdit(item)}
                            >
                              <Pencil size={12} />
                              Ubah
                            </button>
                          ) : null}

                          {adalahHc &&
                          item.statusPendaftaran !== 'SELESAI' &&
                          item.statusPendaftaran !== 'DIBATALKAN' ? (
                            <button
                              type="button"
                              className={`${styles.tombol} ${styles.tombolBahaya} ${styles.tombolKecil}`}
                              onClick={() => {
                                setJadwalDibatalkan(item);
                                setFormAlasanHc('');
                              }}
                            >
                              <XCircle size={12} />
                              Batalkan
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

      {dialogBuat ? (
        <Dialog
          judul="Buat Jadwal MCU"
          keterangan="Pendaftaran final minimal H-3 hari sebelum tanggal pelaksanaan."
          onTutup={() => setDialogBuat(false)}
          aksi={
            <>
              <button
                type="button"
                className={`${styles.tombol} ${styles.tombolNetral}`}
                onClick={() => setDialogBuat(false)}
                disabled={proses}
              >
                Batal
              </button>

              <button
                type="button"
                className={styles.tombol}
                onClick={simpanBaru}
                disabled={proses || !formKaryawanId || !formTanggal}
              >
                {proses ? 'Menyimpan...' : 'Submit Jadwal'}
              </button>
            </>
          }
        >
          <div className={styles.formGrid}>
            <Field label="Karyawan" lebar>
              <select
                className={styles.select}
                value={formKaryawanId}
                onChange={(event) => setFormKaryawanId(event.target.value)}
              >
                <option value="">Pilih karyawan</option>
                {karyawan.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.nama} - {item.nik} ({item.departemen.namaDepartemen})
                    {item.sudahJatuhTempo ? ' [jatuh tempo]' : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Jenis MCU">
              <select
                className={styles.select}
                value={formJenis}
                onChange={(event) =>
                  setFormJenis(event.target.value as JenisMcu)
                }
              >
                <option value="BERKALA">MCU Berkala (periodik)</option>
                <option value="AWAL">MCU Awal (pre-employment)</option>
                <option value="KHUSUS">MCU Khusus</option>
              </select>
            </Field>

            <Field label="Tanggal Pelaksanaan">
              <input
                className={styles.input}
                type="date"
                value={formTanggal}
                onChange={(event) => setFormTanggal(event.target.value)}
              />
            </Field>

            <Field label="Klinik Tujuan" lebar>
              <select
                className={styles.select}
                value={formKlinikId}
                onChange={(event) => setFormKlinikId(event.target.value)}
              >
                <option value="">Pilih klinik</option>
                {klinik.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.namaKlinik}
                    {item.terkoneksi ? ' (terkoneksi)' : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Catatan" lebar>
              <textarea
                className={styles.textarea}
                value={formCatatan}
                onChange={(event) => setFormCatatan(event.target.value)}
              />
            </Field>
          </div>
        </Dialog>
      ) : null}

      {jadwalDiedit ? (
        <Dialog
          judul={`Ubah Jadwal - ${jadwalDiedit.karyawan.nama}`}
          keterangan={
            jadwalDiedit.terkunci
              ? 'Jadwal sudah terkunci. Perubahan tercatat sebagai override HC.'
              : 'Perubahan sebelum masa lock, tidak memerlukan alasan override.'
          }
          onTutup={() => setJadwalDiedit(null)}
          aksi={
            <>
              <button
                type="button"
                className={`${styles.tombol} ${styles.tombolNetral}`}
                onClick={() => setJadwalDiedit(null)}
                disabled={proses}
              >
                Batal
              </button>

              <button
                type="button"
                className={styles.tombol}
                onClick={simpanPerubahan}
                disabled={
                  proses ||
                  !formTanggal ||
                  (jadwalDiedit.terkunci && !formAlasanHc.trim())
                }
              >
                {proses ? 'Menyimpan...' : 'Simpan Perubahan'}
              </button>
            </>
          }
        >
          <div className={styles.formGrid}>
            <Field label="Jenis MCU">
              <select
                className={styles.select}
                value={formJenis}
                onChange={(event) =>
                  setFormJenis(event.target.value as JenisMcu)
                }
              >
                <option value="BERKALA">MCU Berkala (periodik)</option>
                <option value="AWAL">MCU Awal (pre-employment)</option>
                <option value="KHUSUS">MCU Khusus</option>
              </select>
            </Field>

            <Field label="Tanggal Pelaksanaan">
              <input
                className={styles.input}
                type="date"
                value={formTanggal}
                onChange={(event) => setFormTanggal(event.target.value)}
              />
            </Field>

            <Field label="Klinik Tujuan" lebar>
              <select
                className={styles.select}
                value={formKlinikId}
                onChange={(event) => setFormKlinikId(event.target.value)}
              >
                <option value="">Pilih klinik</option>
                {klinik.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.namaKlinik}
                    {item.terkoneksi ? ' (terkoneksi)' : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Catatan" lebar>
              <textarea
                className={styles.textarea}
                value={formCatatan}
                onChange={(event) => setFormCatatan(event.target.value)}
              />
            </Field>

            {jadwalDiedit.terkunci ? (
              <Field label="Alasan Override HC (wajib)" lebar>
                <textarea
                  className={styles.textarea}
                  value={formAlasanHc}
                  onChange={(event) => setFormAlasanHc(event.target.value)}
                  placeholder="Contoh: permintaan reschedule dari klinik"
                />
              </Field>
            ) : null}
          </div>
        </Dialog>
      ) : null}

      {jadwalDibatalkan ? (
        <Dialog
          judul="Batalkan Jadwal MCU"
          keterangan={`Jadwal ${jadwalDibatalkan.karyawan.nama} pada ${formatTanggal(jadwalDibatalkan.tanggalMcu)} akan dibatalkan.`}
          onTutup={() => setJadwalDibatalkan(null)}
          aksi={
            <>
              <button
                type="button"
                className={`${styles.tombol} ${styles.tombolNetral}`}
                onClick={() => setJadwalDibatalkan(null)}
                disabled={proses}
              >
                Batal
              </button>

              <button
                type="button"
                className={`${styles.tombol} ${styles.tombolBahaya}`}
                onClick={batalkan}
                disabled={proses || !formAlasanHc.trim()}
              >
                {proses ? 'Memproses...' : 'Batalkan Jadwal'}
              </button>
            </>
          }
        >
          <Field label="Alasan Pembatalan (wajib)" lebar>
            <textarea
              className={styles.textarea}
              value={formAlasanHc}
              onChange={(event) => setFormAlasanHc(event.target.value)}
            />
          </Field>
        </Dialog>
      ) : null}
    </>
  );
}
