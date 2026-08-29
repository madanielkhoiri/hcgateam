'use client';

// ==================================================
// FILE: frontend/src/app/hc/mcu/notifikasi/page.tsx
// FUNGSI: Log notifikasi & master departemen
// Referensi: Bagian 2 & 4.13 alur-workflow-mcu-periodik-v3.md
// Peran akun MCU (Admin Dept/HC/Dokter/SHE/Klinik) diatur lewat
// kolom Role pada halaman Manajemen Akun - satu akun satu role,
// bukan di halaman ini.
// ==================================================

import Link from 'next/link';
import { ArrowLeft, BellRing, Building2 } from 'lucide-react';
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
  formatWaktu,
  labelStatus,
  mcuApi,
  type Departemen,
  type LogNotifikasi,
} from '@/lib/mcu-api';
import { useMcu } from '../layout';
import styles from '../mcu.module.css';

export default function NotifikasiMcuPage() {
  const { punyaPeran } = useMcu();
  const adalahHc = punyaPeran('HC');

  const [notifikasi, setNotifikasi] = useState<LogNotifikasi[]>([]);
  const [departemen, setDepartemen] = useState<Departemen[]>([]);

  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);

  const [dialogDept, setDialogDept] = useState(false);
  const [namaDept, setNamaDept] = useState('');
  const [adminDeptId, setAdminDeptId] = useState('');

  const [filterStatus, setFilterStatus] = useState('');
  const [filterBulan, setFilterBulan] = useState('');
  const [filterTahun, setFilterTahun] = useState('');

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      const [daftarNotif, daftarDept] = await Promise.all([
        mcuApi.ambil<LogNotifikasi[]>('/notifikasi'),
        mcuApi.ambil<Departemen[]>('/departemen'),
      ]);

      setNotifikasi(daftarNotif);
      setDepartemen(daftarDept);
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

  const notifikasiTampil = useMemo(() => {
    return notifikasi.filter((item) => {
      if (filterStatus && item.statusKirim !== filterStatus) {
        return false;
      }

      const tanggal = new Date(item.createdAt);

      if (filterBulan && tanggal.getMonth() + 1 !== Number(filterBulan)) {
        return false;
      }

      if (filterTahun && tanggal.getFullYear() !== Number(filterTahun)) {
        return false;
      }

      return true;
    });
  }, [notifikasi, filterStatus, filterBulan, filterTahun]);

  async function tambahDepartemen() {
    setProses(true);
    setGalat(null);

    try {
      await mcuApi.kirim('/departemen', {
        namaDepartemen: namaDept.trim(),
        adminAkunId: adminDeptId ? Number(adminDeptId) : undefined,
      });

      setSukses('Departemen baru berhasil ditambahkan.');
      setDialogDept(false);
      setNamaDept('');
      setAdminDeptId('');
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function prosesAntreanEmail() {
    setProses(true);
    setGalat(null);

    try {
      const hasil = await mcuApi.kirim<{ diproses: number }>(
        '/notifikasi/proses-antrean',
      );

      setSukses(`${hasil.diproses} email dalam antrean berhasil diproses.`);
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
        <strong>Notifikasi &amp; Departemen</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <BellRing size={26} />
          </span>

          <div>
            <h1>Notifikasi &amp; Master Departemen</h1>
            <p>
              Seluruh notifikasi dikirim in-app dan via email Outlook (SMTP
              internal). Peran akun MCU (Admin Dept, HC, Dokter, SHE, Klinik
              Provider) diatur lewat kolom Role pada halaman Manajemen Akun -
              satu akun satu role.
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
              onClick={prosesAntreanEmail}
              disabled={proses}
            >
              <BellRing size={15} />
              Proses Antrean Email
            </button>
          ) : null}
        </div>
      </div>

      {galat ? <Pesan jenis="error">{galat}</Pesan> : null}
      {sukses ? <Pesan jenis="sukses">{sukses}</Pesan> : null}

      {!adalahHc ? (
        <Pesan jenis="info">
          Pengaturan departemen adalah wewenang HC. Anda dapat melihat log
          notifikasi terkirim di bawah ini.
        </Pesan>
      ) : null}

      <Panel
        judul="Master Departemen"
        keterangan={`${departemen.length} departemen terdaftar.`}
        aksi={
          adalahHc ? (
            <button
              type="button"
              className={styles.tombol}
              onClick={() => setDialogDept(true)}
            >
              <Building2 size={15} />
              Tambah Departemen
            </button>
          ) : undefined
        }
      >
        {memuat ? (
          <Memuat />
        ) : departemen.length === 0 ? (
          <Kosong
            judul="Belum ada departemen"
            keterangan="Tambahkan departemen agar dapat dipilih saat mengisi data karyawan."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nama Departemen</th>
                  <th>Admin Dept</th>
                  <th>Jumlah Karyawan</th>
                  <th>Status</th>
                </tr>
              </thead>

              <tbody>
                {departemen.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.namaDepartemen}</strong>
                    </td>
                    <td>{item.adminAkun?.name ?? '-'}</td>
                    <td>{item._count?.karyawan ?? 0}</td>

                    <td>
                      <BadgeStatus
                        nilai={item.aktif ? 'AKTIF' : 'RESIGN'}
                        teks={item.aktif ? 'Aktif' : 'Nonaktif'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel
        judul="Log Notifikasi"
        keterangan={`${notifikasiTampil.length} dari ${notifikasi.length} notifikasi tercatat (100 terbaru).`}
      >
        <div className={styles.filterBar}>
          <select
            className={styles.select}
            style={{ maxWidth: 170 }}
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="MENUNGGU">Menunggu</option>
            <option value="TERKIRIM">Terkirim</option>
            <option value="GAGAL">Gagal</option>
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
        ) : notifikasiTampil.length === 0 ? (
          <Kosong
            judul="Belum ada notifikasi"
            keterangan="Notifikasi akan tercatat seiring berjalannya alur MCU."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Waktu</th>
                  <th>Tipe</th>
                  <th>Judul</th>
                  <th>Penerima</th>
                  <th>Kanal</th>
                  <th>Status Kirim</th>
                </tr>
              </thead>

              <tbody>
                {notifikasiTampil.map((item) => (
                  <tr key={item.id}>
                    <td>{formatWaktu(item.createdAt)}</td>
                    <td>{labelStatus(item.tipe)}</td>

                    <td
                      style={{
                        maxWidth: 260,
                        whiteSpace: 'normal',
                      }}
                    >
                      {item.judul}
                    </td>

                    <td>{item.penerima?.name ?? '-'}</td>
                    <td>{labelStatus(item.kanal)}</td>

                    <td>
                      <BadgeStatus nilai={item.statusKirim} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {dialogDept ? (
        <Dialog
          judul="Tambah Departemen"
          onTutup={() => setDialogDept(false)}
          aksi={
            <>
              <button
                type="button"
                className={`${styles.tombol} ${styles.tombolNetral}`}
                onClick={() => setDialogDept(false)}
                disabled={proses}
              >
                Batal
              </button>

              <button
                type="button"
                className={styles.tombol}
                onClick={tambahDepartemen}
                disabled={proses || !namaDept.trim()}
              >
                {proses ? 'Menyimpan...' : 'Simpan'}
              </button>
            </>
          }
        >
          <div className={styles.formGrid}>
            <Field label="Nama Departemen" lebar>
              <input
                className={styles.input}
                value={namaDept}
                onChange={(event) => setNamaDept(event.target.value)}
              />
            </Field>

            <Field label="ID Akun Admin Dept (opsional)" lebar>
              <input
                className={styles.input}
                inputMode="numeric"
                value={adminDeptId}
                onChange={(event) => setAdminDeptId(event.target.value)}
                placeholder="Contoh: 5"
              />
            </Field>
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
