'use client';

// ==================================================
// FILE: frontend/src/app/hc/surat-balasan-magang/buat/page.tsx
// FUNGSI: Form pembuatan Surat Balasan Magang - mahasiswa diambil dari
// Database Anak Magang (nama/NRP/jurusan otomatis), departemen tujuan &
// tanggal pelaksanaan diisi manual per baris karena beda tiap batch.
// ==================================================

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Mail, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { anakMagangApi, type AnakMagang } from '@/lib/anak-magang-api';
import {
  suratBalasanMagangApi,
  type SuratBalasanMagang,
} from '@/lib/surat-balasan-magang-api';
import styles from '../../anak-magang/anak-magang.module.css';

type BarisForm = {
  anakMagangId: number;
  nama: string;
  nrp: string;
  jurusan: string;
  departemenTujuan: string;
  tanggalMulai: string;
  tanggalSelesai: string;
};

export default function BuatSuratBalasanMagangPage() {
  const router = useRouter();

  const [tujuanJurusan, setTujuanJurusan] = useState('');
  const [kotaTujuan, setKotaTujuan] = useState('');
  const [nomorSuratMasuk, setNomorSuratMasuk] = useState('');
  const [perihalSuratMasuk, setPerihalSuratMasuk] = useState('');

  const [baris, setBaris] = useState<BarisForm[]>([]);

  const [cari, setCari] = useState('');
  const [hasilCari, setHasilCari] = useState<AnakMagang[]>([]);
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
      anakMagangApi
        .ambil<AnakMagang[]>(
          `?status=AKTIF&cari=${encodeURIComponent(cari.trim())}`,
        )
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

  function tambahBaris(item: AnakMagang) {
    if (baris.some((row) => row.anakMagangId === item.id)) {
      setCari('');
      setHasilCari([]);
      setDropdownTerbuka(false);
      return;
    }

    setBaris((current) => [
      ...current,
      {
        anakMagangId: item.id,
        nama: item.nama,
        nrp: item.nrp ?? '',
        jurusan: item.jurusan ?? '',
        departemenTujuan: '',
        tanggalMulai: '',
        tanggalSelesai: '',
      },
    ]);
    setCari('');
    setHasilCari([]);
    setDropdownTerbuka(false);
  }

  function ubahBaris(index: number, patch: Partial<BarisForm>) {
    setBaris((current) =>
      current.map((row, idx) => (idx === index ? { ...row, ...patch } : row)),
    );
  }

  function hapusBaris(index: number) {
    setBaris((current) => current.filter((_, idx) => idx !== index));
  }

  async function submit() {
    setProses(true);
    setGalat(null);

    try {
      const hasil = await suratBalasanMagangApi.kirim<SuratBalasanMagang>('', {
        tujuanJurusan: tujuanJurusan.trim(),
        kotaTujuan: kotaTujuan.trim(),
        nomorSuratMasuk: nomorSuratMasuk.trim() || undefined,
        perihalSuratMasuk: perihalSuratMasuk.trim() || undefined,
        baris: baris.map((row) => ({
          anakMagangId: row.anakMagangId,
          departemenTujuan: row.departemenTujuan,
          tanggalMulai: row.tanggalMulai,
          tanggalSelesai: row.tanggalSelesai,
        })),
      });

      router.push(`/hc/surat-balasan-magang?berhasil=${hasil.id}`);
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  const bisaSimpan =
    tujuanJurusan.trim().length > 0 &&
    kotaTujuan.trim().length > 0 &&
    baris.length > 0 &&
    baris.every(
      (row) =>
        row.departemenTujuan.trim().length > 0 &&
        row.tanggalMulai &&
        row.tanggalSelesai,
    );

  return (
    <>
      <Link href="/hc/surat-balasan-magang" className={styles.backButton}>
        <ArrowLeft size={16} />
        Kembali
      </Link>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <Mail size={26} />
          </span>

          <div>
            <h1>Buat Surat Balasan Magang</h1>
            <p>
              Pilih mahasiswa dari Database Anak Magang, lengkapi departemen
              tujuan &amp; tanggal pelaksanaan tiap orang, PDF akan dibuat
              otomatis.
            </p>
          </div>
        </div>
      </div>

      {galat ? (
        <div className={`${styles.notice} ${styles.noticeError}`}>
          <span>{galat}</span>
        </div>
      ) : null}

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2>Tujuan Surat</h2>
          </div>
        </div>

        <div className={styles.formGrid}>
          <Field label="Ketua Jurusan / Institusi Tujuan" lebar>
            <input
              className={styles.input}
              value={tujuanJurusan}
              onChange={(event) => setTujuanJurusan(event.target.value)}
              placeholder="Ketua Jurusan Teknik Sipil dan Kebumian Program Studi D3 Teknik Pertambangan"
            />
          </Field>

          <Field label="Kota Tujuan">
            <input
              className={styles.input}
              value={kotaTujuan}
              onChange={(event) => setKotaTujuan(event.target.value)}
              placeholder="Banjarmasin"
            />
          </Field>

          <Field label="Nomor Surat Masuk (opsional)">
            <input
              className={styles.input}
              value={nomorSuratMasuk}
              onChange={(event) => setNomorSuratMasuk(event.target.value)}
              placeholder="280/DST/PL18.1/DV.01.10/2026"
            />
          </Field>

          <Field label="Perihal Surat Masuk (opsional)" lebar>
            <input
              className={styles.input}
              value={perihalSuratMasuk}
              onChange={(event) => setPerihalSuratMasuk(event.target.value)}
              placeholder="Permohonan Magang Industri dan Data Tugas Akhir"
            />
          </Field>
        </div>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2>Mahasiswa Diterima</h2>
            <p>{baris.length} mahasiswa ditambahkan.</p>
          </div>
        </div>

        <div className={styles.pickerWrap}>
          <Field label="Cari mahasiswa (nama/NRP/NIM) dari Database Anak Magang">
            <input
              className={styles.input}
              value={cari}
              onChange={(event) => {
                setCari(event.target.value);
                setDropdownTerbuka(true);
              }}
              onFocus={() => setDropdownTerbuka(true)}
              onBlur={() => setTimeout(() => setDropdownTerbuka(false), 150)}
              placeholder="Ketik nama, NRP, atau NIM..."
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
                      {item.nrp || '-'}
                      {item.jurusan ? ` - ${item.jurusan}` : ''}
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
                  <th>Nama</th>
                  <th>NRP</th>
                  <th>Jurusan</th>
                  <th>Departemen Tujuan</th>
                  <th>Tgl Mulai</th>
                  <th>Tgl Selesai</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {baris.map((row, index) => (
                  <tr key={row.anakMagangId}>
                    <td>{index + 1}</td>
                    <td>{row.nama}</td>
                    <td>{row.nrp || '-'}</td>
                    <td>{row.jurusan || '-'}</td>
                    <td>
                      <input
                        className={styles.input}
                        style={{ minWidth: 140 }}
                        value={row.departemenTujuan}
                        onChange={(event) =>
                          ubahBaris(index, {
                            departemenTujuan: event.target.value,
                          })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className={styles.input}
                        style={{ minWidth: 140 }}
                        type="date"
                        value={row.tanggalMulai}
                        onChange={(event) =>
                          ubahBaris(index, { tanggalMulai: event.target.value })
                        }
                      />
                    </td>
                    <td>
                      <input
                        className={styles.input}
                        style={{ minWidth: 140 }}
                        type="date"
                        value={row.tanggalSelesai}
                        onChange={(event) =>
                          ubahBaris(index, {
                            tanggalSelesai: event.target.value,
                          })
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
          href="/hc/surat-balasan-magang"
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
          {proses ? 'Menyimpan...' : 'Buat Surat Balasan'}
        </button>
      </div>
    </>
  );
}

function Field({
  label,
  lebar,
  children,
}: {
  label: string;
  lebar?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`${styles.field} ${lebar ? styles.lebar : ''}`}>
      <label>{label}</label>
      {children}
    </div>
  );
}
