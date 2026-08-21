'use client';

// ==================================================
// FILE: frontend/src/app/hc/mcu/karyawan/page.tsx
// FUNGSI: Tracking MCU per karyawan (tanggal terakhir/expired, status
// kerja) + reminder H-3 bulan. Identitas karyawan (NIK, nama, kontak,
// departemen, jabatan) dikelola di card Database Karyawan - halaman
// ini hanya memilih karyawan yang sudah ada lalu mengatur data MCU-nya.
// Referensi: Bagian 4.1 & 4.11 alur-workflow-mcu-periodik-v3.md
// ==================================================

import Link from 'next/link';
import { ArrowLeft, BellRing, Database, Pencil, Users } from 'lucide-react';
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
  labelStatus,
  mcuApi,
  nilaiInputTanggal,
  type Departemen,
  type Karyawan,
} from '@/lib/mcu-api';
import { useMcu } from '../layout';
import styles from '../mcu.module.css';

type FormMcuKaryawan = {
  tanggalMcuTerakhir: string;
  tanggalMcuExpired: string;
  statusKerja: 'AKTIF' | 'DIRUMAHKAN' | 'RESIGN';
  statusKesehatanDirumahkan: string;
};

const formKosong: FormMcuKaryawan = {
  tanggalMcuTerakhir: '',
  tanggalMcuExpired: '',
  statusKerja: 'AKTIF',
  statusKesehatanDirumahkan: '',
};

export default function KaryawanMcuPage() {
  const { punyaPeran } = useMcu();
  const bolehKelola = punyaPeran('HC');

  const [karyawan, setKaryawan] = useState<Karyawan[]>([]);
  const [departemen, setDepartemen] = useState<Departemen[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);
  const [proses, setProses] = useState(false);

  const [cari, setCari] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [hanyaJatuhTempo, setHanyaJatuhTempo] = useState(false);

  const [karyawanDiedit, setKaryawanDiedit] = useState<Karyawan | null>(null);
  const [form, setForm] = useState<FormMcuKaryawan>(formKosong);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      const parameter = new URLSearchParams();

      if (filterDept) {
        parameter.set('departemenId', filterDept);
      }

      if (filterStatus) {
        parameter.set('statusKerja', filterStatus);
      }

      if (cari.trim()) {
        parameter.set('cari', cari.trim());
      }

      const kueri = parameter.toString();

      const [daftarKaryawan, daftarDept] = await Promise.all([
        mcuApi.ambil<Karyawan[]>(`/karyawan${kueri ? `?${kueri}` : ''}`),
        mcuApi.ambil<Departemen[]>('/departemen'),
      ]);

      setKaryawan(daftarKaryawan);
      setDepartemen(daftarDept);
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMemuat(false);
    }
  }, [cari, filterDept, filterStatus]);

  useEffect(() => {
    void muat();
  }, [muat]);

  const tampil = useMemo(
    () =>
      hanyaJatuhTempo
        ? karyawan.filter((item) => item.sudahJatuhTempo)
        : karyawan,
    [karyawan, hanyaJatuhTempo],
  );

  const jumlahJatuhTempo = useMemo(
    () => karyawan.filter((item) => item.sudahJatuhTempo).length,
    [karyawan],
  );

  function bukaEdit(item: Karyawan) {
    setKaryawanDiedit(item);
    setForm({
      tanggalMcuTerakhir: nilaiInputTanggal(item.tanggalMcuTerakhir),
      tanggalMcuExpired: nilaiInputTanggal(item.tanggalMcuExpired),
      statusKerja: item.statusKerja,
      statusKesehatanDirumahkan: item.statusKesehatanDirumahkan ?? '',
    });
  }

  async function simpan() {
    if (!karyawanDiedit) {
      return;
    }

    setProses(true);
    setGalat(null);

    try {
      await mcuApi.ubah(`/karyawan/${karyawanDiedit.id}`, {
        tanggalMcuTerakhir: form.tanggalMcuTerakhir || undefined,
        tanggalMcuExpired: form.tanggalMcuExpired || undefined,
        statusKerja: form.statusKerja,
        statusKesehatanDirumahkan:
          form.statusKerja === 'DIRUMAHKAN' && form.statusKesehatanDirumahkan
            ? form.statusKesehatanDirumahkan
            : undefined,
      });

      setSukses('Data MCU karyawan berhasil diperbarui');
      setKaryawanDiedit(null);
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function kirimReminder() {
    setProses(true);
    setGalat(null);

    try {
      const hasil = await mcuApi.kirim<{ dikirim: number; karyawan: number }>(
        '/karyawan/kirim-reminder',
      );

      setSukses(
        `Reminder H-3 bulan terkirim untuk ${hasil.karyawan} karyawan ` +
          `(${hasil.dikirim} notifikasi ke Admin Dept & HC).`,
      );
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
        <strong>Data Karyawan &amp; Reminder H-3 Bulan</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <Users size={26} />
          </span>

          <div>
            <h1>Data Karyawan &amp; Reminder H-3 Bulan</h1>
            <p>
              Karyawan diambil dari card{' '}
              <Link href="/hc/karyawan" style={{ color: 'inherit', fontWeight: 800 }}>
                Database Karyawan
              </Link>{' '}
              (nama &amp; NIK). Tanggal MCU berikutnya dihitung otomatis 3
              bulan sebelum MCU terakhir expired.
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

          <Link
            href="/hc/karyawan"
            className={`${styles.tombol} ${styles.tombolNetral}`}
          >
            <Database size={15} />
            Buka Database Karyawan
          </Link>

          {bolehKelola ? (
            <button
              type="button"
              className={`${styles.tombol} ${styles.tombolLembut}`}
              onClick={kirimReminder}
              disabled={proses || jumlahJatuhTempo === 0}
            >
              <BellRing size={15} />
              Kirim Reminder ({jumlahJatuhTempo})
            </button>
          ) : null}
        </div>
      </div>

      {galat ? <Pesan jenis="error">{galat}</Pesan> : null}
      {sukses ? <Pesan jenis="sukses">{sukses}</Pesan> : null}

      {karyawan.length === 0 && !memuat ? (
        <Pesan jenis="info">
          Belum ada karyawan terdaftar. Tambahkan data karyawan terlebih
          dahulu di card Database Karyawan sebelum mengatur data MCU-nya.
        </Pesan>
      ) : null}

      <Panel
        judul="Daftar Karyawan"
        keterangan={`${tampil.length} karyawan ditampilkan, ${jumlahJatuhTempo} sudah jatuh tempo MCU.`}
      >
        <div className={styles.filterBar}>
          <input
            className={styles.input}
            style={{ maxWidth: 240 }}
            placeholder="Cari nama atau NIK..."
            value={cari}
            onChange={(event) => setCari(event.target.value)}
          />

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

          <select
            className={styles.select}
            style={{ maxWidth: 170 }}
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
          >
            <option value="">Semua Status Kerja</option>
            <option value="AKTIF">Aktif</option>
            <option value="DIRUMAHKAN">Dirumahkan</option>
            <option value="RESIGN">Resign</option>
          </select>

          <button
            type="button"
            className={`${styles.tombol} ${
              hanyaJatuhTempo ? '' : styles.tombolNetral
            }`}
            onClick={() => setHanyaJatuhTempo((nilai) => !nilai)}
          >
            <BellRing size={14} />
            Hanya Jatuh Tempo
          </button>
        </div>

        {memuat ? (
          <Memuat />
        ) : tampil.length === 0 ? (
          <Kosong
            judul="Belum ada data karyawan"
            keterangan="Tambahkan karyawan di card Database Karyawan untuk mulai menjalankan siklus MCU periodik."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Departemen</th>
                  <th>MCU Terakhir</th>
                  <th>Expired</th>
                  <th>Jadwal Berikutnya</th>
                  <th>Status Kerja</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {tampil.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.tableNama}>
                        <strong>{item.nama}</strong>
                        <span>
                          {item.nik}
                          {item.jabatan ? ` - ${item.jabatan}` : ''}
                        </span>
                      </div>
                    </td>

                    <td>{item.departemen.namaDepartemen}</td>
                    <td>{formatTanggal(item.tanggalMcuTerakhir)}</td>

                    <td>
                      {formatTanggal(item.tanggalMcuExpired)}
                      {item.mcuKedaluwarsa ? (
                        <div style={{ marginTop: 4 }}>
                          <BadgeStatus nilai="DIBATALKAN" teks="Kedaluwarsa" />
                        </div>
                      ) : null}
                    </td>

                    <td>
                      {formatTanggal(item.tanggalMcuBerikutnya)}
                      {item.sudahJatuhTempo ? (
                        <div style={{ marginTop: 4 }}>
                          <BadgeStatus
                            nilai="MENUNGGU"
                            teks="Perlu dijadwalkan"
                          />
                        </div>
                      ) : null}
                    </td>

                    <td>
                      <BadgeStatus nilai={item.statusKerja} />
                      {item.statusKesehatanDirumahkan ? (
                        <div style={{ marginTop: 4 }}>
                          <BadgeStatus
                            nilai={item.statusKesehatanDirumahkan}
                          />
                        </div>
                      ) : null}
                    </td>

                    <td>
                      <div className={styles.rowAksi}>
                        <Link
                          href={`/hc/mcu/history?karyawanId=${item.id}`}
                          className={`${styles.tombol} ${styles.tombolNetral} ${styles.tombolKecil}`}
                        >
                          History
                        </Link>

                        {bolehKelola ? (
                          <button
                            type="button"
                            className={`${styles.tombol} ${styles.tombolLembut} ${styles.tombolKecil}`}
                            onClick={() => bukaEdit(item)}
                          >
                            <Pencil size={12} />
                            Data MCU
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

      {karyawanDiedit ? (
        <Dialog
          judul={`Data MCU - ${karyawanDiedit.nama}`}
          keterangan="Identitas karyawan dikelola di card Database Karyawan. Tanggal MCU berikutnya dihitung otomatis dari tanggal expired dikurangi 3 bulan."
          onTutup={() => setKaryawanDiedit(null)}
          aksi={
            <>
              <button
                type="button"
                className={`${styles.tombol} ${styles.tombolNetral}`}
                onClick={() => setKaryawanDiedit(null)}
                disabled={proses}
              >
                Batal
              </button>

              <button
                type="button"
                className={styles.tombol}
                onClick={simpan}
                disabled={proses}
              >
                {proses ? 'Menyimpan...' : 'Simpan'}
              </button>
            </>
          }
        >
          <div className={styles.formGrid}>
            <Field label="Tanggal MCU Terakhir">
              <input
                className={styles.input}
                type="date"
                value={form.tanggalMcuTerakhir}
                onChange={(event) =>
                  setForm({ ...form, tanggalMcuTerakhir: event.target.value })
                }
              />
            </Field>

            <Field label="Tanggal MCU Expired">
              <input
                className={styles.input}
                type="date"
                value={form.tanggalMcuExpired}
                onChange={(event) =>
                  setForm({ ...form, tanggalMcuExpired: event.target.value })
                }
              />
            </Field>

            <Field label="Status Kerja">
              <select
                className={styles.select}
                value={form.statusKerja}
                onChange={(event) =>
                  setForm({
                    ...form,
                    statusKerja: event.target
                      .value as FormMcuKaryawan['statusKerja'],
                  })
                }
              >
                <option value="AKTIF">Aktif</option>
                <option value="DIRUMAHKAN">Dirumahkan</option>
                <option value="RESIGN">Resign</option>
              </select>
            </Field>

            {form.statusKerja === 'DIRUMAHKAN' ? (
              <Field label="Status Kesehatan (dirumahkan)">
                <select
                  className={styles.select}
                  value={form.statusKesehatanDirumahkan}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      statusKesehatanDirumahkan: event.target.value,
                    })
                  }
                >
                  <option value="">Pilih status</option>
                  <option value="SAKIT">
                    {labelStatus('SAKIT')} (belum FIT tahap 1)
                  </option>
                  <option value="FIT_SAKIT">
                    {labelStatus('FIT_SAKIT')} (lanjut MCU lengkap)
                  </option>
                </select>
              </Field>
            ) : null}
          </div>
        </Dialog>
      ) : null}
    </>
  );
}