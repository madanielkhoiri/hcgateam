'use client';

// ==================================================
// FILE: frontend/src/app/hc/karyawan/dashboard/page.tsx
// FUNGSI: Dashboard Database Karyawan - halaman pertama begitu masuk
// sidebar Database Karyawan. Statistik + grafik pakai komponen reusable
// (StatCardRow, AnimatedLineChart, SimplePieChart), lalu daftar &
// pengelolaan karyawan (dipindah dari karyawan/page.tsx lama) di bawahnya.
// ==================================================

import {
  AlertCircle,
  CheckCircle2,
  Database,
  Inbox,
  Info,
  Loader2,
  Pencil,
  Plus,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StatCardRow, type StatCard } from '@/components/module-shell/stat-card-row';
import AnimatedLineChart from '@/components/dashboard-charts/animated-line-chart';
import SimplePieChart from '@/components/dashboard-charts/simple-pie-chart';
import {
  karyawanApi,
  type Departemen,
  type Karyawan,
  type RingkasanDatabaseKaryawan,
  type TrenDashboardKaryawan,
} from '@/lib/karyawan-api';
import { useKaryawan } from '../layout';
import styles from '../karyawan.module.css';

const NAMA_BULAN = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

const WARNA_STATUS: Record<string, string> = {
  AKTIF: '#079669',
  DIRUMAHKAN: '#f17c16',
  RESIGN: '#94a3b8',
};

const LABEL_STATUS: Record<string, string> = {
  AKTIF: 'Aktif',
  DIRUMAHKAN: 'Dirumahkan',
  RESIGN: 'Resign',
};

type FormKaryawan = {
  nik: string;
  nama: string;
  departemenId: string;
  jabatan: string;
  email: string;
  noTelepon: string;
};

const formKosong: FormKaryawan = {
  nik: '',
  nama: '',
  departemenId: '',
  jabatan: '',
  email: '',
  noTelepon: '',
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

export default function DashboardKaryawanPage() {
  const { user } = useKaryawan();

  const [karyawan, setKaryawan] = useState<Karyawan[]>([]);
  const [departemen, setDepartemen] = useState<Departemen[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);
  const [proses, setProses] = useState(false);
  const [idCekWa, setIdCekWa] = useState<number | null>(null);
  const [errorCekWa, setErrorCekWa] = useState<Record<number, string>>({});

  const [cari, setCari] = useState('');
  const [filterDept, setFilterDept] = useState('');

  const [dialogTerbuka, setDialogTerbuka] = useState(false);
  const [idDiedit, setIdDiedit] = useState<number | null>(null);
  const [form, setForm] = useState<FormKaryawan>(formKosong);

  const [ringkasan, setRingkasan] = useState<RingkasanDatabaseKaryawan | null>(null);
  const [tren, setTren] = useState<TrenDashboardKaryawan | null>(null);

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

      if (filterDept) {
        parameter.set('departemenId', filterDept);
      }

      if (cari.trim()) {
        parameter.set('cari', cari.trim());
      }

      const kueri = parameter.toString();

      const [daftarKaryawan, daftarDept] = await Promise.all([
        karyawanApi.ambil<Karyawan[]>(`${kueri ? `?${kueri}` : ''}`),
        karyawanApi.ambil<Departemen[]>('/departemen'),
      ]);

      setKaryawan(daftarKaryawan);
      setDepartemen(daftarDept);
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMemuat(false);
    }
  }, [cari, filterDept]);

  useEffect(() => {
    void muat();
  }, [muat]);

  useEffect(() => {
    let aktif = true;

    Promise.all([
      karyawanApi.ambil<RingkasanDatabaseKaryawan>('/dashboard/ringkasan'),
      karyawanApi.ambil<TrenDashboardKaryawan>('/dashboard/tren'),
    ])
      .then(([dataRingkasan, dataTren]) => {
        if (aktif) {
          setRingkasan(dataRingkasan);
          setTren(dataTren);
        }
      })
      .catch(() => {
        // Kartu & grafik dashboard cukup kosong bila gagal dimuat.
      });

    return () => {
      aktif = false;
    };
  }, []);

  async function cekWa(id: number) {
    setIdCekWa(id);
    setErrorCekWa((cur) => {
      const next = { ...cur };
      delete next[id];
      return next;
    });

    try {
      const hasil = await karyawanApi.kirim<Pick<Karyawan, 'id' | 'waTerdaftar' | 'waDicekPada'>>(
        `/${id}/cek-wa`,
      );

      setKaryawan((cur) =>
        cur.map((item) =>
          item.id === id
            ? { ...item, waTerdaftar: hasil.waTerdaftar, waDicekPada: hasil.waDicekPada }
            : item,
        ),
      );
    } catch (error) {
      setErrorCekWa((cur) => ({ ...cur, [id]: (error as Error).message }));
    } finally {
      setIdCekWa(null);
    }
  }

  function bukaTambah() {
    setIdDiedit(null);
    setForm({
      ...formKosong,
      departemenId: departemen[0] ? String(departemen[0].id) : '',
    });
    setDialogTerbuka(true);
  }

  function bukaEdit(item: Karyawan) {
    setIdDiedit(item.id);
    setForm({
      nik: item.nik,
      nama: item.nama,
      departemenId: String(item.departemenId),
      jabatan: item.jabatan ?? '',
      email: item.email ?? '',
      noTelepon: item.noTelepon ?? '',
    });
    setDialogTerbuka(true);
  }

  async function simpan() {
    setProses(true);
    setGalat(null);

    const muatan = {
      nik: form.nik.trim(),
      nama: form.nama.trim(),
      departemenId: Number(form.departemenId),
      jabatan: form.jabatan.trim() || undefined,
      email: form.email.trim() || undefined,
      noTelepon: form.noTelepon.trim() || undefined,
    };

    try {
      if (idDiedit) {
        await karyawanApi.ubah(`/${idDiedit}`, muatan);
        setSukses('Data karyawan berhasil diperbarui');
      } else {
        await karyawanApi.kirim('', muatan);
        setSukses('Karyawan baru berhasil ditambahkan');
      }

      setDialogTerbuka(false);
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  const statCards: StatCard[] = ringkasan
    ? [
        {
          label: 'Total Karyawan',
          value: ringkasan.totalKaryawan,
          initial: 'TK',
          iconBg: '#e2f5f7',
          iconColor: '#0a7f8c',
        },
        {
          label: 'Karyawan Aktif',
          value: ringkasan.karyawanAktif,
          initial: 'AK',
          iconBg: '#e4f7ec',
          iconColor: '#079669',
        },
        {
          label: 'Jumlah Departemen',
          value: ringkasan.jumlahDepartemen,
          initial: 'DP',
          iconBg: '#eaf2ff',
          iconColor: '#0868f6',
        },
        {
          label: 'Terdaftar WhatsApp',
          value: ringkasan.waTerdaftar,
          initial: 'WA',
          iconBg: '#f0ebff',
          iconColor: '#6748df',
        },
      ]
    : [];

  const dataTrenChart =
    tren?.trenBulanan.map((item) => ({
      label: NAMA_BULAN[item.bulan - 1],
      value: item.total,
    })) ?? [];

  const dataStatus =
    tren?.breakdownStatus.map((item) => ({
      label: LABEL_STATUS[item.status] ?? item.status,
      value: item.total,
      color: WARNA_STATUS[item.status] ?? '#0a7f8c',
    })) ?? [];

  return (
    <>
      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <Database size={26} />
          </span>

          <div>
            <h1>Database Karyawan</h1>
            <p>
              Master identitas &amp; kontak seluruh karyawan - NIK, no.
              telepon, email, departemen, dan jabatan. Dipakai bersama saat
              membuatkan akun di Manajemen Akun, dan oleh card HC lain yang
              butuh data karyawan (mis. MCU Periodik).
            </p>
          </div>
        </div>

        <div className={styles.headActions}>
          {bolehKelola ? (
            <button
              type="button"
              className={styles.tombol}
              onClick={bukaTambah}
              disabled={departemen.length === 0}
            >
              <Plus size={15} />
              Tambah Karyawan
            </button>
          ) : null}
        </div>
      </div>

      {galat ? <Pesan jenis="error">{galat}</Pesan> : null}
      {sukses ? <Pesan jenis="sukses">{sukses}</Pesan> : null}

      <StatCardRow cards={statCards} />

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.7fr) minmax(0, 1fr)',
          gap: 16,
          margin: '4px 0 20px',
          alignItems: 'start',
        }}
      >
        <AnimatedLineChart
          title="Tren Karyawan Baru per Bulan"
          subtitle={`Jumlah karyawan baru terdaftar, tahun ${tren?.tahun ?? ''}`}
          data={dataTrenChart}
          accent="blue"
        />
        <SimplePieChart
          title="Breakdown Status Kerja"
          subtitle="Seluruh karyawan tercatat"
          data={dataStatus}
          satuan="orang"
        />
      </div>

      <section className={styles.panel}>
        <div className={styles.panelHead}>
          <div>
            <h2>Daftar Karyawan</h2>
            <p>{karyawan.length} karyawan ditampilkan.</p>
          </div>
        </div>

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
        </div>

        {memuat ? (
          <div className={styles.memuat}>Memuat data...</div>
        ) : karyawan.length === 0 ? (
          <div className={styles.kosong}>
            <Inbox size={30} />
            <strong>Belum ada data karyawan</strong>
            <p>Tambahkan data karyawan untuk mulai mengelola master data HC.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Karyawan</th>
                  <th>Departemen</th>
                  <th>Jabatan</th>
                  <th>No. Telepon</th>
                  <th>Status WA</th>
                  <th>Email</th>
                  <th>Aksi</th>
                </tr>
              </thead>

              <tbody>
                {karyawan.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <div className={styles.tableNama}>
                        <strong>{item.nama}</strong>
                        <span>{item.nik}</span>
                      </div>
                    </td>

                    <td>{item.departemen.namaDepartemen}</td>
                    <td>{item.jabatan ?? '-'}</td>
                    <td>{item.noTelepon ?? '-'}</td>

                    <td>
                      <div className={styles.statusWa}>
                        {idCekWa === item.id ? (
                          <Loader2 size={14} className={styles.ikonMuat} />
                        ) : errorCekWa[item.id] ? (
                          <span className={styles.statusWaError} title={errorCekWa[item.id]}>
                            <X size={14} className={styles.ikonGagal} aria-label="Gagal dicek" />
                            Gagal dicek
                          </span>
                        ) : item.waTerdaftar === true ? (
                          <span className={styles.statusWaSukses}>
                            <CheckCircle2 size={14} />
                            Terdaftar WA
                          </span>
                        ) : item.waTerdaftar === false ? (
                          <span className={styles.statusWaGagal}>
                            <X size={14} />
                            Tidak terdaftar WA
                          </span>
                        ) : (
                          <span className={styles.statusWaKosong}>Belum dicek</span>
                        )}

                        {bolehKelola ? (
                          <button
                            type="button"
                            className={styles.tombolCekWa}
                            onClick={() => cekWa(item.id)}
                            disabled={idCekWa === item.id || !item.noTelepon}
                            title={!item.noTelepon ? 'Karyawan belum punya nomor telepon' : 'Cek status WhatsApp'}
                          >
                            Cek
                          </button>
                        ) : null}
                      </div>
                    </td>

                    <td>{item.email ?? '-'}</td>

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
          <div className={styles.dialog}>
            <div className={styles.dialogHead}>
              <div>
                <h3>{idDiedit ? 'Edit Data Karyawan' : 'Tambah Karyawan'}</h3>
                <p>Identitas &amp; kontak dasar karyawan.</p>
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
              <Field label="NIK">
                <input
                  className={styles.input}
                  value={form.nik}
                  onChange={(event) =>
                    setForm({ ...form, nik: event.target.value })
                  }
                />
              </Field>

              <Field label="Nama Lengkap">
                <input
                  className={styles.input}
                  value={form.nama}
                  onChange={(event) =>
                    setForm({ ...form, nama: event.target.value })
                  }
                />
              </Field>

              <Field label="Departemen">
                <select
                  className={styles.select}
                  value={form.departemenId}
                  onChange={(event) =>
                    setForm({ ...form, departemenId: event.target.value })
                  }
                >
                  <option value="">Pilih departemen</option>
                  {departemen.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.namaDepartemen}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Jabatan">
                <input
                  className={styles.input}
                  value={form.jabatan}
                  onChange={(event) =>
                    setForm({ ...form, jabatan: event.target.value })
                  }
                />
              </Field>

              <Field label="No. Telepon">
                <input
                  className={styles.input}
                  type="tel"
                  value={form.noTelepon}
                  onChange={(event) =>
                    setForm({ ...form, noTelepon: event.target.value })
                  }
                  placeholder="08xxxxxxxxxx"
                />
              </Field>

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
                disabled={
                  proses ||
                  !form.nik.trim() ||
                  !form.nama.trim() ||
                  !form.departemenId
                }
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
