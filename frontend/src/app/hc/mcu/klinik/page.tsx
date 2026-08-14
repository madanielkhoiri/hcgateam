'use client';

// ==================================================
// FILE: frontend/src/app/hc/mcu/klinik/page.tsx
// FUNGSI: Master klinik provider MCU (terkoneksi & non-terkoneksi)
// Referensi: Bagian 4.8 alur-workflow-mcu-periodik-v3.md
// ==================================================

import Link from 'next/link';
import { ArrowLeft, Building2, Pencil, Plus } from 'lucide-react';
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
import { mcuApi, type Klinik } from '@/lib/mcu-api';
import { useMcu } from '../layout';
import styles from '../mcu.module.css';

type FormKlinik = {
  namaKlinik: string;
  alamat: string;
  picKlinik: string;
  terkoneksi: boolean;
  akunId: string;
  statusAktif: boolean;
};

const formKosong: FormKlinik = {
  namaKlinik: '',
  alamat: '',
  picKlinik: '',
  terkoneksi: false,
  akunId: '',
  statusAktif: true,
};

export default function KlinikMcuPage() {
  const { punyaPeran } = useMcu();
  const adalahHc = punyaPeran('HC');

  const [klinik, setKlinik] = useState<Klinik[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);

  const [dialogTerbuka, setDialogTerbuka] = useState(false);
  const [idDiedit, setIdDiedit] = useState<number | null>(null);
  const [form, setForm] = useState<FormKlinik>(formKosong);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      setKlinik(await mcuApi.ambil<Klinik[]>('/klinik'));
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  function bukaTambah() {
    setIdDiedit(null);
    setForm(formKosong);
    setDialogTerbuka(true);
  }

  function bukaEdit(item: Klinik) {
    setIdDiedit(item.id);
    setForm({
      namaKlinik: item.namaKlinik,
      alamat: item.alamat ?? '',
      picKlinik: item.picKlinik ?? '',
      terkoneksi: item.terkoneksi,
      akunId: item.akunId ? String(item.akunId) : '',
      statusAktif: item.statusAktif,
    });
    setDialogTerbuka(true);
  }

  async function simpan() {
    setProses(true);
    setGalat(null);

    const muatan = {
      namaKlinik: form.namaKlinik.trim(),
      alamat: form.alamat.trim() || undefined,
      picKlinik: form.picKlinik.trim() || undefined,
      terkoneksi: form.terkoneksi,
      akunId: form.akunId ? Number(form.akunId) : undefined,
      statusAktif: form.statusAktif,
    };

    try {
      if (idDiedit) {
        await mcuApi.ubah(`/klinik/${idDiedit}`, muatan);
        setSukses('Data klinik berhasil diperbarui');
      } else {
        await mcuApi.kirim('/klinik', muatan);
        setSukses('Klinik baru berhasil ditambahkan');
      }

      setDialogTerbuka(false);
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
        <strong>Master Klinik Provider</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <Building2 size={26} />
          </span>

          <div>
            <h1>Master Klinik Provider</h1>
            <p>
              Klinik terkoneksi memiliki akun dan dapat submit hasil MCU/FU
              sendiri. Klinik non-terkoneksi hasilnya diupload HC atau Admin
              Dept.
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
              onClick={bukaTambah}
            >
              <Plus size={15} />
              Tambah Klinik
            </button>
          ) : null}
        </div>
      </div>

      {galat ? <Pesan jenis="error">{galat}</Pesan> : null}
      {sukses ? <Pesan jenis="sukses">{sukses}</Pesan> : null}

      <Panel
        judul="Daftar Klinik"
        keterangan={`${klinik.length} klinik terdaftar.`}
      >
        {memuat ? (
          <Memuat />
        ) : klinik.length === 0 ? (
          <Kosong
            judul="Belum ada klinik"
            keterangan="Tambahkan klinik agar dapat dipilih saat penjadwalan MCU."
          />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Nama Klinik</th>
                  <th>PIC</th>
                  <th>Alamat</th>
                  <th>Tipe</th>
                  <th>Jadwal Terpakai</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {klinik.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.namaKlinik}</strong>
                    </td>
                    <td>{item.picKlinik ?? '-'}</td>

                    <td
                      style={{
                        maxWidth: 260,
                        whiteSpace: 'normal',
                        color: '#6d7f99',
                      }}
                    >
                      {item.alamat ?? '-'}
                    </td>

                    <td>
                      <BadgeStatus
                        nilai={item.terkoneksi ? 'FIT' : 'netral'}
                        teks={item.terkoneksi ? 'Terkoneksi' : 'Non-terkoneksi'}
                      />
                    </td>

                    <td>{item._count?.jadwalMcu ?? 0}</td>

                    <td>
                      <BadgeStatus
                        nilai={item.statusAktif ? 'AKTIF' : 'RESIGN'}
                        teks={item.statusAktif ? 'Aktif' : 'Nonaktif'}
                      />
                    </td>

                    <td>
                      {adalahHc ? (
                        <button
                          type="button"
                          className={`${styles.tombol} ${styles.tombolLembut} ${styles.tombolKecil}`}
                          onClick={() => bukaEdit(item)}
                        >
                          <Pencil size={12} />
                          Edit
                        </button>
                      ) : null}
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
          judul={idDiedit ? 'Edit Klinik' : 'Tambah Klinik'}
          keterangan="Klinik terkoneksi wajib memiliki ID akun agar bisa submit hasil sendiri."
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
                onClick={simpan}
                disabled={
                  proses ||
                  !form.namaKlinik.trim() ||
                  (form.terkoneksi && !form.akunId)
                }
              >
                {proses ? 'Menyimpan...' : 'Simpan'}
              </button>
            </>
          }
        >
          <div className={styles.formGrid}>
            <Field label="Nama Klinik" lebar>
              <input
                className={styles.input}
                value={form.namaKlinik}
                onChange={(event) =>
                  setForm({ ...form, namaKlinik: event.target.value })
                }
              />
            </Field>

            <Field label="PIC Klinik">
              <input
                className={styles.input}
                value={form.picKlinik}
                onChange={(event) =>
                  setForm({ ...form, picKlinik: event.target.value })
                }
              />
            </Field>

            <Field label="Status Aktif">
              <select
                className={styles.select}
                value={form.statusAktif ? '1' : '0'}
                onChange={(event) =>
                  setForm({
                    ...form,
                    statusAktif: event.target.value === '1',
                  })
                }
              >
                <option value="1">Aktif</option>
                <option value="0">Nonaktif</option>
              </select>
            </Field>

            <Field label="Alamat" lebar>
              <textarea
                className={styles.textarea}
                value={form.alamat}
                onChange={(event) =>
                  setForm({ ...form, alamat: event.target.value })
                }
              />
            </Field>

            <Field label="Klinik Terkoneksi">
              <select
                className={styles.select}
                value={form.terkoneksi ? '1' : '0'}
                onChange={(event) =>
                  setForm({
                    ...form,
                    terkoneksi: event.target.value === '1',
                  })
                }
              >
                <option value="0">Tidak (upload manual oleh HC)</option>
                <option value="1">Ya (klinik submit sendiri)</option>
              </select>
            </Field>

            {form.terkoneksi ? (
              <Field label="ID Akun Klinik">
                <input
                  className={styles.input}
                  inputMode="numeric"
                  value={form.akunId}
                  onChange={(event) =>
                    setForm({ ...form, akunId: event.target.value })
                  }
                  placeholder="Contoh: 42"
                />
              </Field>
            ) : null}
          </div>
        </Dialog>
      ) : null}
    </>
  );
}
