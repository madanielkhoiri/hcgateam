'use client';

// ==================================================
// FILE: frontend/src/app/hc/tugas-dinas/buat/page.tsx
// FUNGSI: Form pembuatan Surat Tugas Dinas - karyawan diambil dari
// Database Karyawan (NRP & nama), lalu otomatis jadi PDF.
// ==================================================

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plane, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Field, Pesan } from '@/components/tugas-dinas/tugas-dinas-ui';
import { karyawanApi, type Karyawan } from '@/lib/karyawan-api';
import {
  suratTugasApi,
  type SuratTugasDinas,
} from '@/lib/surat-tugas-dinas-api';
import styles from '../tugas-dinas.module.css';

type BarisKaryawan = {
  nrp: string;
  nama: string;
  departemen: string;
  jabatan: string;
};

export default function BuatTugasDinasPage() {
  const router = useRouter();

  const [nomor, setNomor] = useState('');
  const [tujuanLokasi, setTujuanLokasi] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [keteranganTugas, setKeteranganTugas] = useState('');

  const [baris, setBaris] = useState<BarisKaryawan[]>([]);

  const [cari, setCari] = useState('');
  const [hasilCari, setHasilCari] = useState<Karyawan[]>([]);
  const [dropdownTerbuka, setDropdownTerbuka] = useState(false);
  const [mencari, setMencari] = useState(false);

  const [proses, setProses] = useState(false);
  const [galat, setGalat] = useState<string | null>(null);

  useEffect(() => {
    if (!cari.trim() || cari.trim().length < 2) {
      setHasilCari([]);
      return;
    }

    let aktif = true;
    setMencari(true);

    const timer = setTimeout(() => {
      karyawanApi
        .ambil<Karyawan[]>(`?cari=${encodeURIComponent(cari.trim())}`)
        .then((hasil) => {
          if (aktif) {
            setHasilCari(hasil.slice(0, 8));
          }
        })
        .catch(() => {
          if (aktif) {
            setHasilCari([]);
          }
        })
        .finally(() => {
          if (aktif) {
            setMencari(false);
          }
        });
    }, 300);

    return () => {
      aktif = false;
      clearTimeout(timer);
    };
  }, [cari]);

  function tambahBaris(item: Karyawan) {
    if (baris.some((row) => row.nrp === item.nik)) {
      setCari('');
      setHasilCari([]);
      setDropdownTerbuka(false);
      return;
    }

    setBaris((current) => [
      ...current,
      {
        nrp: item.nik,
        nama: item.nama,
        departemen: item.departemen.namaDepartemen,
        jabatan: item.jabatan ?? '',
      },
    ]);
    setCari('');
    setHasilCari([]);
    setDropdownTerbuka(false);
  }

  function ubahJabatan(index: number, jabatan: string) {
    setBaris((current) =>
      current.map((row, idx) => (idx === index ? { ...row, jabatan } : row)),
    );
  }

  function hapusBaris(index: number) {
    setBaris((current) => current.filter((_, idx) => idx !== index));
  }

  async function submit() {
    setProses(true);
    setGalat(null);

    try {
      const hasil = await suratTugasApi.kirim<SuratTugasDinas>('', {
        nomor: nomor.trim(),
        tujuanLokasi: tujuanLokasi.trim(),
        tanggalMulai,
        tanggalSelesai,
        keteranganTugas: keteranganTugas.trim(),
        karyawan: baris,
      });

      router.push(`/hc/tugas-dinas/${hasil.id}`);
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  const bisaSimpan =
    nomor.trim().length > 0 &&
    tujuanLokasi.trim().length > 0 &&
    tanggalMulai &&
    tanggalSelesai &&
    keteranganTugas.trim().length > 0 &&
    baris.length > 0;

  return (
    <>
      <Link href="/hc/tugas-dinas" className={styles.backButton}>
        <ArrowLeft size={16} />
        Kembali
      </Link>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <Plane size={26} />
          </span>

          <div>
            <h1>Buat Surat Tugas Dinas</h1>
            <p>
              Pilih karyawan dari Database Karyawan (NRP &amp; nama), lengkapi
              detail tugas, PDF akan dibuat otomatis. Setelah dibuat, surat
              menunggu persetujuan SH lalu PJO.
            </p>
          </div>
        </div>
      </div>

      {galat ? <Pesan jenis="error">{galat}</Pesan> : null}

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2>Detail Surat</h2>
          </div>
        </div>

        <div className={styles.formGrid}>
          <Field label="Nomor Surat">
            <input
              className={styles.input}
              value={nomor}
              onChange={(event) => setNomor(event.target.value)}
              placeholder="12/S-Out/HCGA/PPA-Adw/VIII/2026"
            />
          </Field>

          <Field label="Tujuan/Lokasi" lebar>
            <input
              className={styles.input}
              value={tujuanLokasi}
              onChange={(event) => setTujuanLokasi(event.target.value)}
              placeholder="PPA SITE ADARO INDONESIA"
            />
          </Field>

          <Field label="Tanggal Mulai">
            <input
              className={styles.input}
              type="date"
              value={tanggalMulai}
              onChange={(event) => setTanggalMulai(event.target.value)}
            />
          </Field>

          <Field label="Tanggal Selesai">
            <input
              className={styles.input}
              type="date"
              value={tanggalSelesai}
              onChange={(event) => setTanggalSelesai(event.target.value)}
            />
          </Field>

          <Field label="Keterangan Tugas" lebar>
            <input
              className={styles.input}
              value={keteranganTugas}
              onChange={(event) => setKeteranganTugas(event.target.value)}
              placeholder="DIKLAT & SERTIFIKASI BNSP"
            />
          </Field>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2>Diberikan Kepada</h2>
            <p>{baris.length} karyawan ditambahkan.</p>
          </div>
        </div>

        <div className={styles.pickerWrap}>
          <Field label="Cari karyawan (nama/NIK) dari Database Karyawan">
            <input
              className={styles.input}
              value={cari}
              onChange={(event) => {
                setCari(event.target.value);
                setDropdownTerbuka(true);
              }}
              onFocus={() => setDropdownTerbuka(true)}
              onBlur={() => setTimeout(() => setDropdownTerbuka(false), 150)}
              placeholder="Ketik nama atau NIK..."
            />
          </Field>

          {dropdownTerbuka && cari.trim().length >= 2 ? (
            <div className={styles.pickerDropdown}>
              {mencari ? (
                <div className={styles.pickerItem}>
                  <span>Mencari...</span>
                </div>
              ) : hasilCari.length === 0 ? (
                <div className={styles.pickerItem}>
                  <span>Tidak ditemukan</span>
                </div>
              ) : (
                hasilCari.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className={styles.pickerItem}
                    onClick={() => tambahBaris(item)}
                  >
                    <strong>{item.nama}</strong>
                    <span>
                      {item.nik} - {item.departemen.namaDepartemen}
                      {item.jabatan ? ` - ${item.jabatan}` : ''}
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>

        {baris.length > 0 ? (
          <div className={styles.tableWrap} style={{ marginTop: 14 }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>NRP</th>
                  <th>Nama</th>
                  <th>Departemen</th>
                  <th>Jabatan</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {baris.map((row, index) => (
                  <tr key={row.nrp}>
                    <td>{index + 1}</td>
                    <td>{row.nrp}</td>
                    <td>{row.nama}</td>
                    <td>{row.departemen}</td>
                    <td>
                      <input
                        className={styles.input}
                        style={{ minWidth: 160 }}
                        value={row.jabatan}
                        onChange={(event) =>
                          ubahJabatan(index, event.target.value)
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`${styles.tombol} ${styles.tombolBahaya} ${styles.tombolKecil}`}
                        onClick={() => hapusBaris(index)}
                      >
                        <Trash2 size={12} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <div className={styles.headActions} style={{ marginTop: 18 }}>
        <Link
          href="/hc/tugas-dinas"
          className={`${styles.tombol} ${styles.tombolNetral}`}
        >
          Batal
        </Link>

        <button
          type="button"
          className={styles.tombol}
          onClick={() => void submit()}
          disabled={proses || !bisaSimpan}
        >
          <Plus size={15} />
          {proses ? 'Menyimpan...' : 'Buat Surat Tugas'}
        </button>
      </div>
    </>
  );
}