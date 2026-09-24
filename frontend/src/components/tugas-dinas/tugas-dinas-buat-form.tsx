'use client';

// ==================================================
// FILE: frontend/src/components/tugas-dinas/tugas-dinas-buat-form.tsx
// FUNGSI: Form pembuatan Surat Tugas Dinas - dipakai bersama oleh menu
// "Buat Tugas Dinas" (STD biasa) dan "STD Akomodasi" (STD + field
// penginapan/transportasi/laundry). Karyawan diambil dari Database
// Karyawan (NRP & nama), lalu PDF dibuat otomatis.
// ==================================================

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Plane, Plus, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Field, Pesan } from '@/components/tugas-dinas/tugas-dinas-ui';
import { karyawanApi, type Karyawan } from '@/lib/karyawan-api';
import {
  formatRupiah,
  suratTugasApi,
  type SuratTugasDinas,
} from '@/lib/surat-tugas-dinas-api';
import styles from '@/app/hc/tugas-dinas/tugas-dinas.module.css';

type BarisKaryawan = {
  nrp: string;
  nama: string;
  departemen: string;
  jabatan: string;
};

export function TugasDinasBuatForm({
  withAkomodasi,
}: {
  withAkomodasi: boolean;
}) {
  const router = useRouter();

  const [nomor, setNomor] = useState('');
  const [tujuanLokasi, setTujuanLokasi] = useState('');
  const [tanggalMulai, setTanggalMulai] = useState('');
  const [tanggalSelesai, setTanggalSelesai] = useState('');
  const [keteranganTugas, setKeteranganTugas] = useState('');

  const [penginapanHotel, setPenginapanHotel] = useState('');
  const [bantuanTransportasi, setBantuanTransportasi] = useState('');
  const [uangPerjalananNominal, setUangPerjalananNominal] = useState('');
  const [uangPerjalananKeterangan, setUangPerjalananKeterangan] = useState('');
  const [akomodasiNominal, setAkomodasiNominal] = useState('');
  const [akomodasiKeterangan, setAkomodasiKeterangan] = useState('');
  const [laundryNominal, setLaundryNominal] = useState('');
  const [laundryKeterangan, setLaundryKeterangan] = useState('');

  const jumlahAkomodasi =
    (Number(uangPerjalananNominal) || 0) +
    (Number(akomodasiNominal) || 0) +
    (Number(laundryNominal) || 0);

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
        ...(withAkomodasi
          ? {
              penginapanHotel: penginapanHotel.trim() || undefined,
              bantuanTransportasi: bantuanTransportasi.trim() || undefined,
              uangPerjalananNominal: uangPerjalananNominal
                ? Number(uangPerjalananNominal)
                : undefined,
              uangPerjalananKeterangan:
                uangPerjalananKeterangan.trim() || undefined,
              akomodasiNominal: akomodasiNominal
                ? Number(akomodasiNominal)
                : undefined,
              akomodasiKeterangan: akomodasiKeterangan.trim() || undefined,
              laundryNominal: laundryNominal
                ? Number(laundryNominal)
                : undefined,
              laundryKeterangan: laundryKeterangan.trim() || undefined,
            }
          : {}),
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
            <h1>
              {withAkomodasi ? 'Buat STD Akomodasi' : 'Buat Surat Tugas Dinas'}
            </h1>
            <p>
              {withAkomodasi
                ? 'Untuk tugas dinas yang perlu penginapan/transportasi/laundry. Pilih karyawan dari Database Karyawan, lengkapi detail tugas & akomodasi, PDF akan dibuat otomatis.'
                : 'Pilih karyawan dari Database Karyawan (NRP & nama), lengkapi detail tugas, PDF akan dibuat otomatis.'}{' '}
              Setelah dibuat, surat menunggu persetujuan SH lalu PJO.
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

      {withAkomodasi ? (
        <section className={styles.panel}>
          <div className={styles.panelHead}>
            <div>
              <h2>Akomodasi</h2>
              <p>Penginapan, transportasi, dan laundry selama tugas dinas.</p>
            </div>
          </div>

          <div className={styles.formGrid}>
            <Field label="Penginapan / Hotel" lebar>
              <input
                className={styles.input}
                value={penginapanHotel}
                onChange={(event) => setPenginapanHotel(event.target.value)}
                placeholder="Contoh: Hotel Fave Kelapa Gading"
              />
            </Field>

            <Field label="Bantuan Transportasi" lebar>
              <input
                className={styles.input}
                value={bantuanTransportasi}
                onChange={(event) =>
                  setBantuanTransportasi(event.target.value)
                }
                placeholder="Contoh: Travel & Tiket Pesawat / Bandara BDJ - CGK (PP)"
              />
            </Field>

            <Field label="Uang Perjalanan (Rp)">
              <input
                className={styles.input}
                type="number"
                min="0"
                value={uangPerjalananNominal}
                onChange={(event) =>
                  setUangPerjalananNominal(event.target.value)
                }
                placeholder="0"
              />
            </Field>

            <Field label="Keterangan Uang Perjalanan">
              <input
                className={styles.input}
                value={uangPerjalananKeterangan}
                onChange={(event) =>
                  setUangPerjalananKeterangan(event.target.value)
                }
                placeholder="Contoh: 2 Orang / Bandara - Hotel (PP)"
              />
            </Field>

            <Field label="Akomodasi (Rp)">
              <input
                className={styles.input}
                type="number"
                min="0"
                value={akomodasiNominal}
                onChange={(event) => setAkomodasiNominal(event.target.value)}
                placeholder="0"
              />
            </Field>

            <Field label="Keterangan Akomodasi">
              <input
                className={styles.input}
                value={akomodasiKeterangan}
                onChange={(event) =>
                  setAkomodasiKeterangan(event.target.value)
                }
                placeholder="Contoh: 3 Orang (2,025k) 1 Orang (450k) / Uang Makan (9x)"
              />
            </Field>

            <Field label="Laundry (Rp)">
              <input
                className={styles.input}
                type="number"
                min="0"
                value={laundryNominal}
                onChange={(event) => setLaundryNominal(event.target.value)}
                placeholder="0"
              />
            </Field>

            <Field label="Keterangan Laundry">
              <input
                className={styles.input}
                value={laundryKeterangan}
                onChange={(event) => setLaundryKeterangan(event.target.value)}
                placeholder="Contoh: 4 Orang"
              />
            </Field>
          </div>

          <div
            style={{
              marginTop: 14,
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <span style={{ fontSize: 12, color: '#667085', fontWeight: 600 }}>
              Jumlah
            </span>
            <strong style={{ fontSize: 15 }}>
              {formatRupiah(jumlahAkomodasi)}
            </strong>
          </div>
        </section>
      ) : null}

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
