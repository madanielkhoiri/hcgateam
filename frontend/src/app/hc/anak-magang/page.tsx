'use client';

// ==================================================
// FILE: frontend/src/app/hc/anak-magang/page.tsx
// FUNGSI: Card "Database Anak Magang" - master data mahasiswa magang
// (identitas, pendidikan, kontak, rekening, kesehatan, ukuran seragam),
// dipakai bersama Surat Balasan & Surat Penolakan Magang supaya tidak
// input ulang data.
// ==================================================

import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileX2,
  GraduationCap,
  Inbox,
  Info,
  Mail,
  Pencil,
  Plus,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  anakMagangApi,
  formatTanggalSingkat,
  LABEL_STATUS_ANAK_MAGANG,
  type AnakMagang,
  type GenderAnakMagang,
  type StatusAnakMagang,
} from '@/lib/anak-magang-api';
import { useAnakMagang } from './layout';
import styles from './anak-magang.module.css';

type FormAnakMagang = {
  nrp: string;
  nama: string;
  gender: GenderAnakMagang | '';
  universitas: string;
  jurusan: string;
  maritalStatus: string;
  agama: string;
  departemen: string;
  jabatan: string;
  posisi: string;
  tempatLahir: string;
  tanggalLahir: string;
  pendidikan: string;
  tanggalMulai: string;
  tanggalSelesai: string;
  email: string;
  noHp: string;
  noKtp: string;
  npwp: string;
  nomorRekening: string;
  bank: string;
  namaRekening: string;
  alamat: string;
  site: string;
  golonganDarah: string;
  bpjsTk: string;
  bpjsKesehatan: string;
  tanggalMcu: string;
  tanggalPemeriksaan: string;
  tanggalInduksi: string;
  ukuranBaju: string;
  ukuranCelana: string;
  ukuranSepatu: string;
  noKk: string;
  rekomendasi: string;
  atasanLangsung: string;
  status: StatusAnakMagang;
};

const formKosong: FormAnakMagang = {
  nrp: '',
  nama: '',
  gender: '',
  universitas: '',
  jurusan: '',
  maritalStatus: '',
  agama: '',
  departemen: '',
  jabatan: '',
  posisi: '',
  tempatLahir: '',
  tanggalLahir: '',
  pendidikan: '',
  tanggalMulai: '',
  tanggalSelesai: '',
  email: '',
  noHp: '',
  noKtp: '',
  npwp: '',
  nomorRekening: '',
  bank: '',
  namaRekening: '',
  alamat: '',
  site: '',
  golonganDarah: '',
  bpjsTk: '',
  bpjsKesehatan: '',
  tanggalMcu: '',
  tanggalPemeriksaan: '',
  tanggalInduksi: '',
  ukuranBaju: '',
  ukuranCelana: '',
  ukuranSepatu: '',
  noKk: '',
  rekomendasi: '',
  atasanLangsung: '',
  status: 'AKTIF',
};

function Pesan({
  jenis,
  children,
}: {
  jenis: 'error' | 'sukses' | 'info';
  children: ReactNode;
}) {
  const kelas =
    jenis === 'error'
      ? styles.noticeError
      : jenis === 'sukses'
        ? styles.noticeSukses
        : styles.noticeInfo;

  const Ikon =
    jenis === 'error' ? AlertCircle : jenis === 'sukses' ? CheckCircle2 : Info;

  return (
    <div className={`${styles.notice} ${kelas}`}>
      <Ikon size={16} style={{ flexShrink: 0, marginTop: 1 }} />
      <span>{children}</span>
    </div>
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

function Bagian({ judul }: { judul: string }) {
  return (
    <div
      className={styles.lebar}
      style={{
        marginTop: 6,
        paddingTop: 10,
        borderTop: '1px solid #eef2f8',
        color: '#a35b04',
        fontSize: 11,
        fontWeight: 800,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
      }}
    >
      {judul}
    </div>
  );
}

export default function AnakMagangPage() {
  const { user } = useAnakMagang();

  const [daftar, setDaftar] = useState<AnakMagang[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);
  const [proses, setProses] = useState(false);

  const [cari, setCari] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBulan, setFilterBulan] = useState('');
  const [filterTahun, setFilterTahun] = useState('');

  const [dialogTerbuka, setDialogTerbuka] = useState(false);
  const [idDiedit, setIdDiedit] = useState<number | null>(null);
  const [form, setForm] = useState<FormAnakMagang>(formKosong);

  const bolehKelola =
    user.role === 'HC' ||
    user.role === 'ADMIN' ||
    user.role === 'SUPER_ADMIN' ||
    user.role === 'SECTION_HEAD';

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      const parameter = new URLSearchParams();

      if (filterStatus) {
        parameter.set('status', filterStatus);
      }

      if (cari.trim()) {
        parameter.set('cari', cari.trim());
      }

      const kueri = parameter.toString();
      const hasil = await anakMagangApi.ambil<AnakMagang[]>(
        kueri ? `?${kueri}` : '',
      );

      setDaftar(hasil);
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMemuat(false);
    }
  }, [cari, filterStatus]);

  useEffect(() => {
    void muat();
  }, [muat]);

  const tahunTersedia = useMemo(() => {
    const tahunSekarang = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => tahunSekarang - 5 + index);
  }, []);

  const daftarTampil = useMemo(() => {
    return daftar.filter((item) => {
      if (!item.tanggalMulai) {
        return !filterBulan && !filterTahun;
      }

      const tanggal = new Date(item.tanggalMulai);

      if (filterBulan && tanggal.getMonth() + 1 !== Number(filterBulan)) {
        return false;
      }

      if (filterTahun && tanggal.getFullYear() !== Number(filterTahun)) {
        return false;
      }

      return true;
    });
  }, [daftar, filterBulan, filterTahun]);

  function bukaTambah() {
    setIdDiedit(null);
    setForm(formKosong);
    setDialogTerbuka(true);
  }

  function keTanggalInput(nilai: string | null): string {
    return nilai ? nilai.slice(0, 10) : '';
  }

  function bukaEdit(item: AnakMagang) {
    setIdDiedit(item.id);
    setForm({
      nrp: item.nrp ?? '',
      nama: item.nama,
      gender: item.gender ?? '',
      universitas: item.universitas ?? '',
      jurusan: item.jurusan ?? '',
      maritalStatus: item.maritalStatus ?? '',
      agama: item.agama ?? '',
      departemen: item.departemen ?? '',
      jabatan: item.jabatan ?? '',
      posisi: item.posisi ?? '',
      tempatLahir: item.tempatLahir ?? '',
      tanggalLahir: keTanggalInput(item.tanggalLahir),
      pendidikan: item.pendidikan ?? '',
      tanggalMulai: keTanggalInput(item.tanggalMulai),
      tanggalSelesai: keTanggalInput(item.tanggalSelesai),
      email: item.email ?? '',
      noHp: item.noHp ?? '',
      noKtp: item.noKtp ?? '',
      npwp: item.npwp ?? '',
      nomorRekening: item.nomorRekening ?? '',
      bank: item.bank ?? '',
      namaRekening: item.namaRekening ?? '',
      alamat: item.alamat ?? '',
      site: item.site ?? '',
      golonganDarah: item.golonganDarah ?? '',
      bpjsTk: item.bpjsTk ?? '',
      bpjsKesehatan: item.bpjsKesehatan ?? '',
      tanggalMcu: keTanggalInput(item.tanggalMcu),
      tanggalPemeriksaan: keTanggalInput(item.tanggalPemeriksaan),
      tanggalInduksi: keTanggalInput(item.tanggalInduksi),
      ukuranBaju: item.ukuranBaju ?? '',
      ukuranCelana: item.ukuranCelana ?? '',
      ukuranSepatu: item.ukuranSepatu ?? '',
      noKk: item.noKk ?? '',
      rekomendasi: item.rekomendasi ?? '',
      atasanLangsung: item.atasanLangsung ?? '',
      status: item.status,
    });
    setDialogTerbuka(true);
  }

  async function simpan() {
    setProses(true);
    setGalat(null);

    const kosongkan = (nilai: string) => nilai.trim() || undefined;

    const muatan = {
      nrp: kosongkan(form.nrp),
      nama: form.nama.trim(),
      gender: form.gender || undefined,
      universitas: kosongkan(form.universitas),
      jurusan: kosongkan(form.jurusan),
      maritalStatus: kosongkan(form.maritalStatus),
      agama: kosongkan(form.agama),
      departemen: kosongkan(form.departemen),
      jabatan: kosongkan(form.jabatan),
      posisi: kosongkan(form.posisi),
      tempatLahir: kosongkan(form.tempatLahir),
      tanggalLahir: form.tanggalLahir || undefined,
      pendidikan: kosongkan(form.pendidikan),
      tanggalMulai: form.tanggalMulai || undefined,
      tanggalSelesai: form.tanggalSelesai || undefined,
      email: kosongkan(form.email),
      noHp: kosongkan(form.noHp),
      noKtp: kosongkan(form.noKtp),
      npwp: kosongkan(form.npwp),
      nomorRekening: kosongkan(form.nomorRekening),
      bank: kosongkan(form.bank),
      namaRekening: kosongkan(form.namaRekening),
      alamat: kosongkan(form.alamat),
      site: kosongkan(form.site),
      golonganDarah: kosongkan(form.golonganDarah),
      bpjsTk: kosongkan(form.bpjsTk),
      bpjsKesehatan: kosongkan(form.bpjsKesehatan),
      tanggalMcu: form.tanggalMcu || undefined,
      tanggalPemeriksaan: form.tanggalPemeriksaan || undefined,
      tanggalInduksi: form.tanggalInduksi || undefined,
      ukuranBaju: kosongkan(form.ukuranBaju),
      ukuranCelana: kosongkan(form.ukuranCelana),
      ukuranSepatu: kosongkan(form.ukuranSepatu),
      noKk: kosongkan(form.noKk),
      rekomendasi: kosongkan(form.rekomendasi),
      atasanLangsung: kosongkan(form.atasanLangsung),
      status: form.status,
    };

    try {
      if (idDiedit) {
        await anakMagangApi.ubah(`/${idDiedit}`, muatan);
        setSukses('Data anak magang berhasil diperbarui');
      } else {
        await anakMagangApi.kirim('', muatan);
        setSukses('Anak magang baru berhasil ditambahkan');
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
      <Link href="/hc" className={styles.backButton}>
        <ArrowLeft size={16} />
        Kembali ke HC
      </Link>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <GraduationCap size={26} />
          </span>

          <div>
            <h1>Database Anak Magang</h1>
            <p>
              Master data mahasiswa magang - identitas, pendidikan, kontak,
              rekening, kesehatan, ukuran seragam, dan status Aktif/Non
              Aktif. Dipakai bersama saat membuat Surat Balasan atau Surat
              Penolakan Magang.
            </p>
          </div>
        </div>

        <div className={styles.headActions}>
          {bolehKelola ? (
            <button type="button" className={styles.tombol} onClick={bukaTambah}>
              <Plus size={15} />
              Tambah Anak Magang
            </button>
          ) : null}

          <Link
            href="/hc/surat-balasan-magang"
            className={`${styles.tombol} ${styles.tombolLembut}`}
          >
            <Mail size={15} />
            Surat Balasan
          </Link>

          <Link
            href="/hc/surat-penolakan-magang"
            className={`${styles.tombol} ${styles.tombolLembut}`}
          >
            <FileX2 size={15} />
            Surat Penolakan
          </Link>
        </div>
      </div>

      {galat ? <Pesan jenis="error">{galat}</Pesan> : null}
      {sukses ? <Pesan jenis="sukses">{sukses}</Pesan> : null}

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2>Daftar Anak Magang</h2>
            <p>{daftarTampil.length} dari {daftar.length} data ditampilkan.</p>
          </div>
        </div>

        <div className={styles.filterBar}>
          <input
            className={styles.input}
            style={{ maxWidth: 240 }}
            placeholder="Cari nama atau NRP..."
            value={cari}
            onChange={(event) => setCari(event.target.value)}
          />

          <select
            className={styles.select}
            style={{ maxWidth: 180 }}
            value={filterStatus}
            onChange={(event) => setFilterStatus(event.target.value)}
          >
            <option value="">Semua Status</option>
            <option value="AKTIF">Aktif</option>
            <option value="NONAKTIF">Non Aktif</option>
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
          <div className={styles.memuat}>Memuat data...</div>
        ) : daftarTampil.length === 0 ? (
          <div className={styles.kosong}>
            <Inbox size={30} />
            <strong>Belum ada data anak magang</strong>
            <p>Tambahkan data mahasiswa magang untuk mulai mengelola.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Mahasiswa</th>
                  <th>Universitas / Jurusan</th>
                  <th>Departemen / Posisi</th>
                  <th>Periode Magang</th>
                  <th>Atasan Langsung</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {daftarTampil.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.tableNama}>
                        <strong>{item.nama}</strong>
                        <span>{item.nrp || '-'}</span>
                      </div>
                    </td>
                    <td>
                      {item.universitas ?? '-'}
                      {item.jurusan ? ` - ${item.jurusan}` : ''}
                    </td>
                    <td>
                      {item.departemen ?? '-'}
                      {item.posisi ? ` - ${item.posisi}` : ''}
                    </td>
                    <td>
                      {formatTanggalSingkat(item.tanggalMulai)} -{' '}
                      {formatTanggalSingkat(item.tanggalSelesai)}
                    </td>
                    <td>{item.atasanLangsung ?? '-'}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          item.status === 'AKTIF' ? styles.sukses : styles.netral
                        }`}
                      >
                        {LABEL_STATUS_ANAK_MAGANG[item.status]}
                      </span>
                    </td>
                    <td>
                      <div className={styles.rowAksi}>
                        {bolehKelola ? (
                          <button
                            type="button"
                            className={`${styles.tombol} ${styles.tombolLembut} ${styles.tombolKecil}`}
                            onClick={() => bukaEdit(item)}
                          >
                            <Pencil size={12} />
                            Edit
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
      </section>

      {dialogTerbuka ? (
        <div
          className={styles.overlay}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setDialogTerbuka(false);
            }
          }}
        >
          <div className={styles.dialog} style={{ width: 'min(760px, 100%)' }}>
            <div className={styles.dialogHead}>
              <div>
                <h3>
                  {idDiedit ? 'Edit Data Anak Magang' : 'Tambah Anak Magang'}
                </h3>
                <p>Identitas, pendidikan, kontak, rekening, dan kesehatan.</p>
              </div>

              <button
                type="button"
                className={styles.dialogTutup}
                onClick={() => setDialogTerbuka(false)}
                aria-label="Tutup"
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.formGrid}>
              <Bagian judul="Identitas" />

              <Field label="Nama Lengkap" lebar>
                <input
                  className={styles.input}
                  value={form.nama}
                  onChange={(event) =>
                    setForm({ ...form, nama: event.target.value })
                  }
                />
              </Field>

              <Field label="NRP">
                <input
                  className={styles.input}
                  value={form.nrp}
                  onChange={(event) =>
                    setForm({ ...form, nrp: event.target.value })
                  }
                />
              </Field>

              <Field label="Gender">
                <select
                  className={styles.select}
                  value={form.gender}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      gender: event.target.value as GenderAnakMagang | '',
                    })
                  }
                >
                  <option value="">-</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                </select>
              </Field>

              <Field label="Tempat Lahir">
                <input
                  className={styles.input}
                  value={form.tempatLahir}
                  onChange={(event) =>
                    setForm({ ...form, tempatLahir: event.target.value })
                  }
                />
              </Field>

              <Field label="Tanggal Lahir">
                <input
                  className={styles.input}
                  type="date"
                  value={form.tanggalLahir}
                  onChange={(event) =>
                    setForm({ ...form, tanggalLahir: event.target.value })
                  }
                />
              </Field>

              <Field label="Marital Status">
                <input
                  className={styles.input}
                  value={form.maritalStatus}
                  onChange={(event) =>
                    setForm({ ...form, maritalStatus: event.target.value })
                  }
                  placeholder="TK"
                />
              </Field>

              <Field label="Agama">
                <input
                  className={styles.input}
                  value={form.agama}
                  onChange={(event) =>
                    setForm({ ...form, agama: event.target.value })
                  }
                />
              </Field>

              <Bagian judul="Pendidikan & Penempatan Magang" />

              <Field label="Universitas / Institut">
                <input
                  className={styles.input}
                  value={form.universitas}
                  onChange={(event) =>
                    setForm({ ...form, universitas: event.target.value })
                  }
                />
              </Field>

              <Field label="Prodi / Jurusan">
                <input
                  className={styles.input}
                  value={form.jurusan}
                  onChange={(event) =>
                    setForm({ ...form, jurusan: event.target.value })
                  }
                />
              </Field>

              <Field label="Pendidikan">
                <input
                  className={styles.input}
                  value={form.pendidikan}
                  onChange={(event) =>
                    setForm({ ...form, pendidikan: event.target.value })
                  }
                  placeholder="SMK / SMA / S1"
                />
              </Field>

              <Field label="Departemen">
                <input
                  className={styles.input}
                  value={form.departemen}
                  onChange={(event) =>
                    setForm({ ...form, departemen: event.target.value })
                  }
                  placeholder="HCGA"
                />
              </Field>

              <Field label="Jabatan">
                <input
                  className={styles.input}
                  value={form.jabatan}
                  onChange={(event) =>
                    setForm({ ...form, jabatan: event.target.value })
                  }
                  placeholder="Magang"
                />
              </Field>

              <Field label="Posisi">
                <input
                  className={styles.input}
                  value={form.posisi}
                  onChange={(event) =>
                    setForm({ ...form, posisi: event.target.value })
                  }
                  placeholder="Magang IT"
                />
              </Field>

              <Field label="Site">
                <input
                  className={styles.input}
                  value={form.site}
                  onChange={(event) =>
                    setForm({ ...form, site: event.target.value })
                  }
                  placeholder="Adaro"
                />
              </Field>

              <Field label="Atasan Langsung">
                <input
                  className={styles.input}
                  value={form.atasanLangsung}
                  onChange={(event) =>
                    setForm({ ...form, atasanLangsung: event.target.value })
                  }
                />
              </Field>

              <Field label="Tanggal Mulai (Start Date)">
                <input
                  className={styles.input}
                  type="date"
                  value={form.tanggalMulai}
                  onChange={(event) =>
                    setForm({ ...form, tanggalMulai: event.target.value })
                  }
                />
              </Field>

              <Field label="Tanggal Selesai (Finish Date)">
                <input
                  className={styles.input}
                  type="date"
                  value={form.tanggalSelesai}
                  onChange={(event) =>
                    setForm({ ...form, tanggalSelesai: event.target.value })
                  }
                />
              </Field>

              <Field label="Rekomendasi" lebar>
                <input
                  className={styles.input}
                  value={form.rekomendasi}
                  onChange={(event) =>
                    setForm({ ...form, rekomendasi: event.target.value })
                  }
                />
              </Field>

              <Bagian judul="Kontak & Dokumen" />

              <Field label="Email">
                <input
                  className={styles.input}
                  type="email"
                  value={form.email}
                  onChange={(event) =>
                    setForm({ ...form, email: event.target.value })
                  }
                />
              </Field>

              <Field label="No. HP">
                <input
                  className={styles.input}
                  type="tel"
                  value={form.noHp}
                  onChange={(event) =>
                    setForm({ ...form, noHp: event.target.value })
                  }
                />
              </Field>

              <Field label="No. KTP">
                <input
                  className={styles.input}
                  value={form.noKtp}
                  onChange={(event) =>
                    setForm({ ...form, noKtp: event.target.value })
                  }
                />
              </Field>

              <Field label="NPWP">
                <input
                  className={styles.input}
                  value={form.npwp}
                  onChange={(event) =>
                    setForm({ ...form, npwp: event.target.value })
                  }
                />
              </Field>

              <Field label="No. KK">
                <input
                  className={styles.input}
                  value={form.noKk}
                  onChange={(event) =>
                    setForm({ ...form, noKk: event.target.value })
                  }
                />
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

              <Bagian judul="Rekening" />

              <Field label="Nomor Rekening">
                <input
                  className={styles.input}
                  value={form.nomorRekening}
                  onChange={(event) =>
                    setForm({ ...form, nomorRekening: event.target.value })
                  }
                />
              </Field>

              <Field label="Bank">
                <input
                  className={styles.input}
                  value={form.bank}
                  onChange={(event) =>
                    setForm({ ...form, bank: event.target.value })
                  }
                />
              </Field>

              <Field label="Nama Rekening">
                <input
                  className={styles.input}
                  value={form.namaRekening}
                  onChange={(event) =>
                    setForm({ ...form, namaRekening: event.target.value })
                  }
                />
              </Field>

              <Bagian judul="Kesehatan & Ukuran Seragam" />

              <Field label="Golongan Darah">
                <input
                  className={styles.input}
                  value={form.golonganDarah}
                  onChange={(event) =>
                    setForm({ ...form, golonganDarah: event.target.value })
                  }
                />
              </Field>

              <Field label="BPJS TK">
                <input
                  className={styles.input}
                  value={form.bpjsTk}
                  onChange={(event) =>
                    setForm({ ...form, bpjsTk: event.target.value })
                  }
                />
              </Field>

              <Field label="BPJS Kesehatan">
                <input
                  className={styles.input}
                  value={form.bpjsKesehatan}
                  onChange={(event) =>
                    setForm({ ...form, bpjsKesehatan: event.target.value })
                  }
                />
              </Field>

              <Field label="Tanggal MCU">
                <input
                  className={styles.input}
                  type="date"
                  value={form.tanggalMcu}
                  onChange={(event) =>
                    setForm({ ...form, tanggalMcu: event.target.value })
                  }
                />
              </Field>

              <Field label="Tanggal Pemeriksaan">
                <input
                  className={styles.input}
                  type="date"
                  value={form.tanggalPemeriksaan}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      tanggalPemeriksaan: event.target.value,
                    })
                  }
                />
              </Field>

              <Field label="Tanggal Induksi">
                <input
                  className={styles.input}
                  type="date"
                  value={form.tanggalInduksi}
                  onChange={(event) =>
                    setForm({ ...form, tanggalInduksi: event.target.value })
                  }
                />
              </Field>

              <Field label="Ukuran Baju">
                <input
                  className={styles.input}
                  value={form.ukuranBaju}
                  onChange={(event) =>
                    setForm({ ...form, ukuranBaju: event.target.value })
                  }
                />
              </Field>

              <Field label="Ukuran Celana">
                <input
                  className={styles.input}
                  value={form.ukuranCelana}
                  onChange={(event) =>
                    setForm({ ...form, ukuranCelana: event.target.value })
                  }
                />
              </Field>

              <Field label="Ukuran Sepatu">
                <input
                  className={styles.input}
                  value={form.ukuranSepatu}
                  onChange={(event) =>
                    setForm({ ...form, ukuranSepatu: event.target.value })
                  }
                />
              </Field>

              <Bagian judul="Status" />

              <Field label="Status">
                <select
                  className={styles.select}
                  value={form.status}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      status: event.target.value as StatusAnakMagang,
                    })
                  }
                >
                  <option value="AKTIF">Aktif</option>
                  <option value="NONAKTIF">Non Aktif</option>
                </select>
              </Field>
            </div>

            <div className={styles.dialogAksi}>
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
                onClick={() => void simpan()}
                disabled={proses || !form.nama.trim()}
              >
                {proses ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
