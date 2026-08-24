'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bus, Eye, Pencil, Plus, Trash2, UserRound, X } from 'lucide-react';
import { ACCESS_KEYS, getAccessToken, getStoredUser, hasAccess } from '@/lib/access-control';
import { Driver, KaryawanRingkas, TransportApiError, TravelJadwal, transportApi } from '@/lib/transport-api';
import styles from '@/components/transport/transport.module.css';

const LABEL_STATUS: Record<string, string> = {
  DIJADWALKAN: 'Dijadwalkan',
  BERJALAN: 'Berjalan',
  SELESAI: 'Selesai',
  DIBATALKAN: 'Dibatalkan',
};

function formatWaktu(value: string): string {
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const blankDriverForm = { nama: '', noTelepon: '', username: '', password: '' };
const blankJadwalForm = {
  armada: '',
  driverId: 0,
  asal: '',
  tujuan: '',
  tanggalBerangkat: '',
  jamBerangkat: '08:00',
  catatan: '',
};

const OPSI_JAM = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const OPSI_MENIT = ['00', '15', '30', '45'];

export default function TravelPage() {
  const router = useRouter();
  const [siap, setSiap] = useState(false);
  const [driverList, setDriverList] = useState<Driver[]>([]);
  const [jadwalList, setJadwalList] = useState<TravelJadwal[]>([]);
  const [error, setError] = useState('');

  const [modalDriver, setModalDriver] = useState(false);
  const [editDriver, setEditDriver] = useState<Driver | null>(null);
  const [formDriver, setFormDriver] = useState(blankDriverForm);
  const [driverError, setDriverError] = useState('');
  const [savingDriver, setSavingDriver] = useState(false);

  const [modalJadwal, setModalJadwal] = useState(false);
  const [formJadwal, setFormJadwal] = useState(blankJadwalForm);
  const [cariKaryawan, setCariKaryawan] = useState('');
  const [hasilKaryawan, setHasilKaryawan] = useState<KaryawanRingkas[]>([]);
  const [penumpangDipilih, setPenumpangDipilih] = useState<KaryawanRingkas[]>([]);
  const [jadwalError, setJadwalError] = useState('');
  const [savingJadwal, setSavingJadwal] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    const user = getStoredUser();

    if (!token || !user) {
      router.replace('/login');
      return;
    }

    if (!hasAccess(user, ACCESS_KEYS.GA_TRANSPORT_TRAVEL)) {
      router.replace('/ga/transport/dashboard');
      return;
    }

    setSiap(true);
  }, [router]);

  async function muat() {
    try {
      setError('');
      const [d, j] = await Promise.all([transportApi.travel.daftarDriver(), transportApi.travel.daftarJadwalAdmin()]);
      setDriverList(d);
      setJadwalList(j);
    } catch (err) {
      setError(err instanceof TransportApiError ? err.message : 'Data Travel gagal dimuat');
    }
  }

  useEffect(() => {
    if (siap) void muat();
  }, [siap]);

  useEffect(() => {
    if (!modalJadwal) return;
    const timer = setTimeout(() => {
      transportApi.travel.karyawanRingkas(cariKaryawan).then(setHasilKaryawan).catch(() => setHasilKaryawan([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [cariKaryawan, modalJadwal]);

  function bukaModalDriver(driver?: Driver) {
    setEditDriver(driver ?? null);
    setFormDriver(driver ? { nama: driver.nama, noTelepon: driver.noTelepon ?? '', username: '', password: '' } : blankDriverForm);
    setDriverError('');
    setModalDriver(true);
  }

  async function submitDriver(event: FormEvent) {
    event.preventDefault();
    setDriverError('');
    setSavingDriver(true);
    try {
      if (editDriver) {
        await transportApi.travel.ubahDriver(editDriver.id, { nama: formDriver.nama, noTelepon: formDriver.noTelepon || undefined });
      } else {
        await transportApi.travel.buatDriver({
          nama: formDriver.nama,
          noTelepon: formDriver.noTelepon || undefined,
          username: formDriver.username || undefined,
          password: formDriver.password || undefined,
        });
      }
      setModalDriver(false);
      await muat();
    } catch (err) {
      setDriverError(err instanceof TransportApiError ? err.message : 'Driver gagal disimpan');
    } finally {
      setSavingDriver(false);
    }
  }

  async function hapusDriver(id: number) {
    if (!confirm('Hapus driver ini?')) return;
    try {
      await transportApi.travel.hapusDriver(id);
      await muat();
    } catch (err) {
      setError(err instanceof TransportApiError ? err.message : 'Driver gagal dihapus');
    }
  }

  function bukaModalJadwal() {
    setFormJadwal(blankJadwalForm);
    setPenumpangDipilih([]);
    setCariKaryawan('');
    setHasilKaryawan([]);
    setJadwalError('');
    setModalJadwal(true);
  }

  function tambahPenumpang(k: KaryawanRingkas) {
    if (!penumpangDipilih.some((p) => p.id === k.id)) {
      setPenumpangDipilih((cur) => [...cur, k]);
    }
    setCariKaryawan('');
  }

  function hapusPenumpang(id: number) {
    setPenumpangDipilih((cur) => cur.filter((p) => p.id !== id));
  }

  async function submitJadwal(event: FormEvent) {
    event.preventDefault();
    setJadwalError('');

    if (!formJadwal.driverId) {
      setJadwalError('Pilih driver terlebih dahulu');
      return;
    }

    if (!formJadwal.tanggalBerangkat) {
      setJadwalError('Pilih tanggal berangkat terlebih dahulu');
      return;
    }

    if (penumpangDipilih.length === 0) {
      setJadwalError('Pilih minimal 1 penumpang');
      return;
    }

    setSavingJadwal(true);
    try {
      await transportApi.travel.buatJadwal({
        armada: formJadwal.armada,
        driverId: formJadwal.driverId,
        asal: formJadwal.asal || undefined,
        tujuan: formJadwal.tujuan,
        waktuBerangkatRencana: new Date(`${formJadwal.tanggalBerangkat}T${formJadwal.jamBerangkat}:00`).toISOString(),
        catatan: formJadwal.catatan || undefined,
        karyawanIds: penumpangDipilih.map((p) => p.id),
      });
      setModalJadwal(false);
      await muat();
    } catch (err) {
      setJadwalError(err instanceof TransportApiError ? err.message : 'Jadwal Travel gagal disimpan');
    } finally {
      setSavingJadwal(false);
    }
  }

  async function hapusJadwal(id: number) {
    if (!confirm('Hapus jadwal Travel ini?')) return;
    try {
      await transportApi.travel.hapusJadwal(id);
      await muat();
    } catch (err) {
      setError(err instanceof TransportApiError ? err.message : 'Jadwal gagal dihapus');
    }
  }

  if (!siap) return null;

  return (
    <section>
      <div className={styles.hero}>
        <div>
          <span className={styles.heroIcon}>
            <Bus />
          </span>
          <div>
            <h1>Travel & Driver</h1>
            <p>Kelola profil Driver dan jadwal Travel karyawan.</p>
          </div>
        </div>
        <div className={styles.heroActions}>
          <button className={styles.importButton} onClick={() => bukaModalDriver()}>
            <UserRound />
            Tambah Driver
          </button>
          <button className={styles.primary} onClick={bukaModalJadwal}>
            <Plus />
            Buat Jadwal
          </button>
        </div>
      </div>

      {error && <p className={styles.pageError}>{error}</p>}

      <div className={styles.tablePanel} style={{ marginBottom: 18 }}>
        <div className={styles.tableTitle}>
          <h3>Driver</h3>
          <span>Total {driverList.length} driver</span>
        </div>
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Nama</th>
                <th>No Telepon</th>
                <th>Akun Login</th>
                <th>Jumlah Trip</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {driverList.map((d, index) => (
                <tr key={d.id}>
                  <td>{index + 1}</td>
                  <td>
                    <b>{d.nama}</b>
                  </td>
                  <td>{d.noTelepon ?? '-'}</td>
                  <td>{d.users?.[0]?.username ?? <i style={{ color: '#8a9bb0' }}>Belum ada</i>}</td>
                  <td>{d._count?.travelJadwal ?? 0}</td>
                  <td>
                    <span className={d.statusAktif ? styles.ready : styles.breakdown}>
                      {d.statusAktif ? 'AKTIF' : 'NONAKTIF'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <button onClick={() => bukaModalDriver(d)} title="Edit">
                        <Pencil />
                      </button>
                      <button onClick={() => hapusDriver(d.id)} title="Hapus">
                        <Trash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!driverList.length && (
                <tr>
                  <td colSpan={7} className={styles.empty}>
                    Belum ada driver.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.tablePanel}>
        <div className={styles.tableTitle}>
          <h3>Jadwal Travel</h3>
          <span>Total {jadwalList.length} jadwal</span>
        </div>
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Armada</th>
                <th>Driver</th>
                <th>Tujuan</th>
                <th>Waktu Berangkat</th>
                <th>Penumpang</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {jadwalList.map((j, index) => (
                <tr key={j.id}>
                  <td>{index + 1}</td>
                  <td>
                    <b>{j.armada}</b>
                  </td>
                  <td>{j.driver?.nama}</td>
                  <td>{j.tujuan}</td>
                  <td>{formatWaktu(j.waktuBerangkatRencana)}</td>
                  <td>{j._count?.penumpang ?? 0} orang</td>
                  <td>
                    <span className={j.status === 'DIJADWALKAN' ? styles.ready : styles.breakdown}>
                      {LABEL_STATUS[j.status]}
                    </span>
                  </td>
                  <td>
                    <div className={styles.actions}>
                      <Link href={`/ga/transport/travel/${j.id}`} title="Detail">
                        <Eye size={16} />
                      </Link>
                      {j.status === 'DIJADWALKAN' && (
                        <button onClick={() => hapusJadwal(j.id)} title="Hapus">
                          <Trash2 />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!jadwalList.length && (
                <tr>
                  <td colSpan={8} className={styles.empty}>
                    Belum ada jadwal Travel.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalDriver && (
        <div className={styles.modalBack}>
          <form className={styles.modal} onSubmit={submitDriver}>
            <header>
              <div>
                <h2>{editDriver ? 'Edit' : 'Tambah'} Driver</h2>
                <p>Profil driver dikelola terpisah dari database Karyawan HC.</p>
              </div>
              <button type="button" onClick={() => setModalDriver(false)}>
                <X />
              </button>
            </header>
            <div className={styles.formGrid}>
              <label>
                Nama Driver
                <input
                  required
                  value={formDriver.nama}
                  onChange={(e) => setFormDriver((cur) => ({ ...cur, nama: e.target.value }))}
                />
              </label>
              <label>
                No Telepon
                <input
                  value={formDriver.noTelepon}
                  onChange={(e) => setFormDriver((cur) => ({ ...cur, noTelepon: e.target.value }))}
                />
              </label>
              {!editDriver && (
                <>
                  <label>
                    Username Akun Login (opsional)
                    <input
                      value={formDriver.username}
                      onChange={(e) => setFormDriver((cur) => ({ ...cur, username: e.target.value }))}
                    />
                  </label>
                  <label>
                    Password Akun Login (opsional)
                    <input
                      type="password"
                      value={formDriver.password}
                      onChange={(e) => setFormDriver((cur) => ({ ...cur, password: e.target.value }))}
                    />
                  </label>
                </>
              )}
            </div>
            {driverError && <p className={styles.error}>{driverError}</p>}
            <footer>
              <button type="button" onClick={() => setModalDriver(false)}>
                Batal
              </button>
              <button className={styles.primary} disabled={savingDriver}>
                {savingDriver ? 'Menyimpan...' : 'Simpan'}
              </button>
            </footer>
          </form>
        </div>
      )}

      {modalJadwal && (
        <div className={styles.modalBack}>
          <form className={styles.modal} onSubmit={submitJadwal}>
            <header>
              <div>
                <h2>Buat Jadwal Travel</h2>
                <p>Tentukan armada, driver, waktu berangkat, dan daftar penumpang.</p>
              </div>
              <button type="button" onClick={() => setModalJadwal(false)}>
                <X />
              </button>
            </header>
            <div className={styles.formGrid}>
              <label>
                Armada
                <input
                  required
                  placeholder="Contoh: Hiace 01"
                  value={formJadwal.armada}
                  onChange={(e) => setFormJadwal((cur) => ({ ...cur, armada: e.target.value }))}
                />
              </label>
              <label>
                Driver
                <select
                  required
                  value={formJadwal.driverId || ''}
                  onChange={(e) => setFormJadwal((cur) => ({ ...cur, driverId: Number(e.target.value) }))}
                >
                  <option value="">Pilih driver...</option>
                  {driverList
                    .filter((d) => d.statusAktif)
                    .map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.nama}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Asal (opsional)
                <input value={formJadwal.asal} onChange={(e) => setFormJadwal((cur) => ({ ...cur, asal: e.target.value }))} />
              </label>
              <label>
                Tujuan
                <input
                  required
                  value={formJadwal.tujuan}
                  onChange={(e) => setFormJadwal((cur) => ({ ...cur, tujuan: e.target.value }))}
                />
              </label>
              <label>
                Tanggal Berangkat
                <input
                  type="date"
                  required
                  value={formJadwal.tanggalBerangkat}
                  onChange={(e) => setFormJadwal((cur) => ({ ...cur, tanggalBerangkat: e.target.value }))}
                />
              </label>
              <label>
                Jam Berangkat (24 jam)
                <div style={{ display: 'flex', gap: 8 }}>
                  <select
                    required
                    value={formJadwal.jamBerangkat.split(':')[0]}
                    onChange={(e) =>
                      setFormJadwal((cur) => ({
                        ...cur,
                        jamBerangkat: `${e.target.value}:${cur.jamBerangkat.split(':')[1]}`,
                      }))
                    }
                  >
                    {OPSI_JAM.map((jam) => (
                      <option key={jam} value={jam}>
                        {jam}
                      </option>
                    ))}
                  </select>
                  <select
                    required
                    value={formJadwal.jamBerangkat.split(':')[1]}
                    onChange={(e) =>
                      setFormJadwal((cur) => ({
                        ...cur,
                        jamBerangkat: `${cur.jamBerangkat.split(':')[0]}:${e.target.value}`,
                      }))
                    }
                  >
                    {OPSI_MENIT.map((menit) => (
                      <option key={menit} value={menit}>
                        {menit}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <label>
                Catatan (opsional)
                <input value={formJadwal.catatan} onChange={(e) => setFormJadwal((cur) => ({ ...cur, catatan: e.target.value }))} />
              </label>

              <label style={{ gridColumn: '1/-1' }}>
                Cari & Tambah Penumpang
                <input
                  placeholder="Cari nama karyawan..."
                  value={cariKaryawan}
                  onChange={(e) => setCariKaryawan(e.target.value)}
                />
                {cariKaryawan && (
                  <div
                    style={{
                      marginTop: 6,
                      maxHeight: 160,
                      overflowY: 'auto',
                      border: '1px solid #cbd9e8',
                      borderRadius: 10,
                    }}
                  >
                    {hasilKaryawan.map((k) => (
                      <div
                        key={k.id}
                        onClick={() => tambahPenumpang(k)}
                        style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13 }}
                      >
                        <b>{k.nama}</b> — {k.nik} ({k.departemen?.namaDepartemen ?? '-'})
                      </div>
                    ))}
                    {!hasilKaryawan.length && (
                      <div style={{ padding: '8px 12px', fontSize: 12, color: '#8a9bb0' }}>
                        Karyawan tidak ditemukan
                      </div>
                    )}
                  </div>
                )}
              </label>

              <div style={{ gridColumn: '1/-1', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {penumpangDipilih.map((p) => (
                  <span
                    key={p.id}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 10px',
                      borderRadius: 999,
                      background: '#eafaf2',
                      color: '#067b46',
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                  >
                    {p.nama}
                    <X size={13} style={{ cursor: 'pointer' }} onClick={() => hapusPenumpang(p.id)} />
                  </span>
                ))}
                {!penumpangDipilih.length && (
                  <span style={{ fontSize: 12, color: '#8a9bb0' }}>Belum ada penumpang dipilih.</span>
                )}
              </div>
            </div>
            {jadwalError && <p className={styles.error}>{jadwalError}</p>}
            <footer>
              <button type="button" onClick={() => setModalJadwal(false)}>
                Batal
              </button>
              <button className={styles.primary} disabled={savingJadwal}>
                {savingJadwal ? 'Menyimpan...' : 'Simpan Jadwal'}
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}
