'use client';

// ==================================================
// FILE: frontend/src/app/hc/karyawan/page.tsx
// FUNGSI: Card "Database Karyawan" - master identitas & kontak seluruh
// karyawan (NIK, nama, no. telepon, email, departemen, jabatan), dipakai
// bersama card HC lain yang butuh data karyawan (mis. Manajemen Akun
// saat membuatkan akun, dan MCU Periodik untuk data tracking MCU).
// ==================================================

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Database,
  Inbox,
  Info,
  Pencil,
  Plus,
  UsersRound,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ACCESS_KEYS,
  clearSession,
  formatRole,
  getAccessToken,
  getStoredUser,
  hasAccess,
  saveStoredUser,
  type PortalUser,
} from '@/lib/access-control';
import {
  karyawanApi,
  type Departemen,
  type Karyawan,
} from '@/lib/karyawan-api';
import styles from './karyawan.module.css';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

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

// ==================================================
// KOMPONEN KECIL
// ==================================================

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

export default function KaryawanPage() {
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);

  const [karyawan, setKaryawan] = useState<Karyawan[]>([]);
  const [departemen, setDepartemen] = useState<Departemen[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);
  const [proses, setProses] = useState(false);

  const [cari, setCari] = useState('');
  const [filterDept, setFilterDept] = useState('');

  const [dialogTerbuka, setDialogTerbuka] = useState(false);
  const [idDiedit, setIdDiedit] = useState<number | null>(null);
  const [form, setForm] = useState<FormKaryawan>(formKosong);

  useEffect(() => {
    let active = true;

    async function loadUser() {
      const token = getAccessToken();
      const stored = getStoredUser();

      if (!token || !stored) {
        clearSession();
        router.replace('/login');
        return;
      }

      let current = stored;

      try {
        const response = await fetch(`${API_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: 'no-store',
        });

        if (response.status === 401) {
          clearSession();
          router.replace('/login');
          return;
        }

        if (response.ok) {
          current = (await response.json()) as PortalUser;
          saveStoredUser(current);
        }
      } catch {
        // Gunakan data login terakhir saat backend sementara tidak terjangkau.
      }

      if (!hasAccess(current, ACCESS_KEYS.HC_KARYAWAN)) {
        router.replace('/hc');
        return;
      }

      if (active) {
        setUser(current);
      }
    }

    void loadUser();

    return () => {
      active = false;
    };
  }, [router]);

  const bolehKelola =
    user?.role === 'HC' || user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';

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
    if (user) {
      void muat();
    }
  }, [user, muat]);

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

  if (!user) {
    return <main className={styles.memuat}>Memuat Database Karyawan...</main>;
  }

  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/hc" className={styles.brand}>
          <span className={styles.brandLogo}>
            <Database size={20} />
          </span>
          Database Karyawan
        </Link>

        <div className={styles.profile}>
          <span className={styles.profileIcon}>
            <UsersRound size={20} />
          </span>
          <div className={styles.akun}>
            <strong>{user.name}</strong>
            <span>{formatRole(user.role)}</span>
          </div>
        </div>
      </header>

      <main className={styles.body}>
        <Link href="/hc" className={styles.backButton}>
          <ArrowLeft size={16} />
          Kembali ke HC
        </Link>

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
      </main>

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
    </div>
  );
}