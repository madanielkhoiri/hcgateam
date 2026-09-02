'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, CalendarClock, Download, Plus, Search, Ticket, Trash2, X } from 'lucide-react';
import { ACCESS_KEYS, getAccessToken, getStoredUser, hasAccess } from '@/lib/access-control';
import { compressImage } from '@/lib/compress-image';
import { TimeInput24 } from '@/components/transport/time-input-24';
import {
  JenisTiket,
  KaryawanRingkas,
  LABEL_JENIS_TIKET,
  TransportApiError,
  TransportTiket,
  transportApi,
  urlFileTransport,
} from '@/lib/transport-api';
import styles from '@/components/transport/transport.module.css';

function formatTanggal(value: string | null): string {
  if (!value) return '-';
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatLeg(tanggal: string | null, jam: string | null): string {
  if (!tanggal || !jam) return 'Belum ada jadwal';
  return `${formatTanggal(tanggal)}, ${jam} WIB`;
}

const blankForm = {
  karyawanId: 0,
  namaKaryawan: '',
  jenisTiket: 'PULANG_PERGI' as JenisTiket,
  tanggalMulai: '',
  jamMulai: '',
  tanggalSelesai: '',
  jamSelesai: '',
  keterangan: '',
};

const blankReschedule = {
  ubahBerangkat: false,
  tanggalMulai: '',
  jamMulai: '',
  ubahPulang: false,
  tanggalSelesai: '',
  jamSelesai: '',
  alasan: '',
};

export default function TiketPage() {
  const router = useRouter();
  const [siap, setSiap] = useState(false);
  const [data, setData] = useState<TransportTiket[]>([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [bulan, setBulan] = useState('');
  const [tahun, setTahun] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [files, setFiles] = useState<File[]>([]);
  const [cariKaryawan, setCariKaryawan] = useState('');
  const [hasilKaryawan, setHasilKaryawan] = useState<KaryawanRingkas[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [rescheduleTarget, setRescheduleTarget] = useState<TransportTiket | null>(null);
  const [rescheduleForm, setRescheduleForm] = useState(blankReschedule);
  const [rescheduleFile, setRescheduleFile] = useState<File | null>(null);
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false);
  const [rescheduleError, setRescheduleError] = useState('');

  useEffect(() => {
    const token = getAccessToken();
    const user = getStoredUser();

    if (!token || !user) {
      router.replace('/login');
      return;
    }

    if (!hasAccess(user, ACCESS_KEYS.GA_TRANSPORT_TIKET)) {
      router.replace('/ga/transport/dashboard');
      return;
    }

    setSiap(true);
  }, [router]);

  async function muat() {
    try {
      setError('');
      setData(await transportApi.tiket.daftarAdmin());
    } catch (err) {
      setError(err instanceof TransportApiError ? err.message : 'Data tiket gagal dimuat');
    }
  }

  useEffect(() => {
    if (siap) void muat();
  }, [siap]);

  useEffect(() => {
    if (!modal) return;
    const timer = setTimeout(() => {
      transportApi.tiket.karyawanRingkas(cariKaryawan).then(setHasilKaryawan).catch(() => setHasilKaryawan([]));
    }, 250);
    return () => clearTimeout(timer);
  }, [cariKaryawan, modal]);

  function bukaModal() {
    setForm(blankForm);
    setFiles([]);
    setCariKaryawan('');
    setHasilKaryawan([]);
    setFormError('');
    setModal(true);
  }

  const perluBerangkat = form.jenisTiket !== 'PULANG_SAJA';
  const perluPulang = form.jenisTiket !== 'BERANGKAT_SAJA';

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError('');

    if (!form.karyawanId) {
      setFormError('Pilih karyawan penerima tiket terlebih dahulu');
      return;
    }

    if (perluBerangkat && (!form.tanggalMulai || !form.jamMulai)) {
      setFormError('Tanggal & jam keberangkatan wajib diisi');
      return;
    }

    if (perluPulang && (!form.tanggalSelesai || !form.jamSelesai)) {
      setFormError('Tanggal & jam kepulangan wajib diisi');
      return;
    }

    if (files.length === 0) {
      setFormError('Minimal 1 file tiket wajib diunggah');
      return;
    }

    setSubmitting(true);
    try {
      await transportApi.tiket.kirim(
        {
          karyawanId: form.karyawanId,
          jenisTiket: form.jenisTiket,
          tanggalMulai: perluBerangkat ? form.tanggalMulai : undefined,
          jamMulai: perluBerangkat ? form.jamMulai : undefined,
          tanggalSelesai: perluPulang ? form.tanggalSelesai : undefined,
          jamSelesai: perluPulang ? form.jamSelesai : undefined,
          keterangan: form.keterangan || undefined,
        },
        files,
      );
      setModal(false);
      await muat();
    } catch (err) {
      setFormError(err instanceof TransportApiError ? err.message : 'Tiket gagal dikirim');
    } finally {
      setSubmitting(false);
    }
  }

  const tahunTersedia = useMemo(() => {
    const sekarang = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => sekarang - 5 + i);
  }, []);

  const dataTampil = useMemo(
    () =>
      data
        .filter((item) => {
          if (!search.trim()) return true;
          const keyword = search.trim().toLowerCase();
          return `${item.karyawan?.nama ?? ''} ${item.karyawan?.nik ?? ''} ${
            item.karyawan?.departemen?.namaDepartemen ?? ''
          }`
            .toLowerCase()
            .includes(keyword);
        })
        .filter((item) => {
          if (!bulan && !tahun) return true;
          const acuan = item.tanggalMulai ?? item.tanggalSelesai;
          if (!acuan) return true;
          const tanggal = new Date(`${acuan.slice(0, 10)}T00:00:00`);
          if (tahun && tanggal.getFullYear() !== Number(tahun)) return false;
          if (bulan && tanggal.getMonth() + 1 !== Number(bulan)) return false;
          return true;
        }),
    [data, search, bulan, tahun],
  );

  async function hapus(id: number) {
    if (!confirm('Hapus tiket ini?')) return;
    try {
      await transportApi.tiket.hapus(id);
      await muat();
    } catch (err) {
      setError(err instanceof TransportApiError ? err.message : 'Tiket gagal dihapus');
    }
  }

  function bukaReschedule(item: TransportTiket) {
    setRescheduleTarget(item);
    setRescheduleForm({
      ubahBerangkat: false,
      tanggalMulai: item.tanggalMulai ? item.tanggalMulai.slice(0, 10) : '',
      jamMulai: item.jamMulai ?? '',
      ubahPulang: false,
      tanggalSelesai: item.tanggalSelesai ? item.tanggalSelesai.slice(0, 10) : '',
      jamSelesai: item.jamSelesai ?? '',
      alasan: '',
    });
    setRescheduleFile(null);
    setRescheduleError('');
  }

  async function submitReschedule(event: FormEvent) {
    event.preventDefault();
    if (!rescheduleTarget) return;

    setRescheduleError('');

    if (!rescheduleForm.ubahBerangkat && !rescheduleForm.ubahPulang) {
      setRescheduleError('Pilih minimal satu jadwal (keberangkatan/kepulangan) yang mau diubah');
      return;
    }

    if (rescheduleForm.ubahBerangkat && (!rescheduleForm.tanggalMulai || !rescheduleForm.jamMulai)) {
      setRescheduleError('Tanggal & jam keberangkatan baru wajib diisi');
      return;
    }

    if (rescheduleForm.ubahPulang && (!rescheduleForm.tanggalSelesai || !rescheduleForm.jamSelesai)) {
      setRescheduleError('Tanggal & jam kepulangan baru wajib diisi');
      return;
    }

    setRescheduleSubmitting(true);
    try {
      await transportApi.tiket.reschedule(
        rescheduleTarget.id,
        {
          tanggalMulai: rescheduleForm.ubahBerangkat ? rescheduleForm.tanggalMulai : undefined,
          jamMulai: rescheduleForm.ubahBerangkat ? rescheduleForm.jamMulai : undefined,
          tanggalSelesai: rescheduleForm.ubahPulang ? rescheduleForm.tanggalSelesai : undefined,
          jamSelesai: rescheduleForm.ubahPulang ? rescheduleForm.jamSelesai : undefined,
          alasan: rescheduleForm.alasan || undefined,
        },
        rescheduleFile ?? undefined,
      );
      setRescheduleTarget(null);
      await muat();
    } catch (err) {
      setRescheduleError(
        err instanceof TransportApiError ? err.message : 'Jadwal gagal diperbarui',
      );
    } finally {
      setRescheduleSubmitting(false);
    }
  }

  if (!siap) return null;

  return (
    <section>
      <Link
        href="/ga/transport/dashboard"
        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 14, color: '#385675', fontSize: 13, fontWeight: 700 }}
      >
        <ArrowLeft size={16} /> Kembali ke Dashboard Transportasi
      </Link>

      <div className={styles.hero}>
        <div>
          <span className={styles.heroIcon}>
            <Ticket />
          </span>
          <div>
            <h1>Tiket Cuti Karyawan</h1>
            <p>Kirim tiket cuti (file) ke akun karyawan — mereka bisa unduh sendiri di menu pribadinya.</p>
          </div>
        </div>
        <div className={styles.heroActions}>
          <button className={styles.primary} onClick={bukaModal}>
            <Plus />
            Kirim Tiket
          </button>
        </div>
      </div>

      {error && <p className={styles.pageError}>{error}</p>}

      <div className={styles.filterPanel}>
        <label>
          <Search />
          <input
            placeholder="Cari nama, NIK, atau departemen karyawan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </label>

        <select value={bulan} onChange={(e) => setBulan(e.target.value)}>
          <option value="">Semua Bulan</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(2026, i, 1))}
            </option>
          ))}
        </select>

        <select value={tahun} onChange={(e) => setTahun(e.target.value)}>
          <option value="">Semua Tahun</option>
          {tahunTersedia.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={() => {
            setSearch('');
            setBulan('');
            setTahun('');
          }}
        >
          Reset
        </button>
      </div>

      <div className={styles.tablePanel}>
        <div className={styles.tableTitle}>
          <h3>Daftar Tiket Terkirim</h3>
          <span>Total {dataTampil.length} data</span>
        </div>
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Karyawan</th>
                <th>Departemen</th>
                <th>Periode Cuti</th>
                <th>Keterangan</th>
                <th>File</th>
                <th>Dikirim Oleh</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {dataTampil.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>
                    <b>{item.karyawan?.nama}</b>
                    <div>{item.karyawan?.nik}</div>
                  </td>
                  <td>{item.karyawan?.departemen?.namaDepartemen ?? '-'}</td>
                  <td>
                    <div style={{ fontWeight: 700, fontSize: 11, color: '#385675', marginBottom: 2 }}>
                      {LABEL_JENIS_TIKET[item.jenisTiket]}
                    </div>
                    <div>Berangkat: {formatLeg(item.tanggalMulai, item.jamMulai)}</div>
                    <div>Pulang: {formatLeg(item.tanggalSelesai, item.jamSelesai)}</div>
                  </td>
                  <td>{item.keterangan || '-'}</td>
                  <td>
                    {item.files.map((f) => (
                      <a
                        key={f.id}
                        href={urlFileTransport(f.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}
                      >
                        <Download size={13} /> {f.namaFile}
                      </a>
                    ))}
                  </td>
                  <td>{item.pengirim?.name ?? '-'}</td>
                  <td>
                    <div className={styles.actions}>
                      <button onClick={() => bukaReschedule(item)} title="Reschedule (perubahan jadwal penerbangan)">
                        <CalendarClock />
                      </button>
                      <button onClick={() => hapus(item.id)} title="Hapus">
                        <Trash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!dataTampil.length && (
                <tr>
                  <td colSpan={8} className={styles.empty}>
                    Belum ada tiket yang dikirim.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div className={styles.modalBack}>
          <form className={styles.modal} onSubmit={submit}>
            <header>
              <div>
                <h2>Kirim Tiket Cuti</h2>
                <p>Pilih karyawan, periode cuti, dan unggah file tiket (bisa lebih dari 1).</p>
              </div>
              <button type="button" onClick={() => setModal(false)}>
                <X />
              </button>
            </header>

            <div className={styles.formGrid}>
              <label style={{ gridColumn: '1/-1' }}>
                Karyawan
                <input
                  placeholder="Cari nama karyawan..."
                  value={form.namaKaryawan}
                  onChange={(e) => {
                    setForm((cur) => ({ ...cur, namaKaryawan: e.target.value, karyawanId: 0 }));
                    setCariKaryawan(e.target.value);
                  }}
                />
                {cariKaryawan && !form.karyawanId && (
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
                        onClick={() => {
                          setForm((cur) => ({ ...cur, karyawanId: k.id, namaKaryawan: k.nama }));
                          setCariKaryawan('');
                        }}
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

              <label style={{ gridColumn: '1/-1' }}>
                Jenis Tiket
                <select
                  value={form.jenisTiket}
                  onChange={(e) => setForm((cur) => ({ ...cur, jenisTiket: e.target.value as JenisTiket }))}
                >
                  <option value="PULANG_PERGI">Pulang-Pergi</option>
                  <option value="BERANGKAT_SAJA">Berangkat Saja (kepulangan menyusul)</option>
                  <option value="PULANG_SAJA">Pulang Saja (keberangkatan sudah lewat/menyusul terpisah)</option>
                </select>
              </label>

              {perluBerangkat && (
                <>
                  <label>
                    Tanggal Keberangkatan
                    <input
                      type="date"
                      required
                      value={form.tanggalMulai}
                      onChange={(e) => setForm((cur) => ({ ...cur, tanggalMulai: e.target.value }))}
                    />
                  </label>

                  <label>
                    Jam Keberangkatan (24 jam)
                    <TimeInput24
                      required
                      value={form.jamMulai}
                      onChange={(v) => setForm((cur) => ({ ...cur, jamMulai: v }))}
                    />
                  </label>
                </>
              )}

              {perluPulang && (
                <>
                  <label>
                    Tanggal Kepulangan
                    <input
                      type="date"
                      required
                      value={form.tanggalSelesai}
                      onChange={(e) => setForm((cur) => ({ ...cur, tanggalSelesai: e.target.value }))}
                    />
                  </label>

                  <label>
                    Jam Kepulangan (24 jam)
                    <TimeInput24
                      required
                      value={form.jamSelesai}
                      onChange={(v) => setForm((cur) => ({ ...cur, jamSelesai: v }))}
                    />
                  </label>
                </>
              )}

              <label style={{ gridColumn: '1/-1' }}>
                Keterangan (opsional)
                <input
                  placeholder="Contoh: Cuti tahunan pulang kampung"
                  value={form.keterangan}
                  onChange={(e) => setForm((cur) => ({ ...cur, keterangan: e.target.value }))}
                />
              </label>

              <label style={{ gridColumn: '1/-1' }}>
                File Tiket (PDF/JPG/PNG, bisa lebih dari 1)
                <input
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={async (e) => {
                    const dipilih = Array.from(e.target.files ?? []);
                    const hasil = await Promise.all(
                      dipilih.map((file) =>
                        file.type.startsWith('image/')
                          ? compressImage(file).catch(() => file)
                          : Promise.resolve(file),
                      ),
                    );
                    setFiles(hasil);
                  }}
                  className={styles.fileInput}
                />
                {files.length > 0 && (
                  <span className={styles.fileHint}>{files.length} file dipilih</span>
                )}
              </label>
            </div>

            {formError && <p className={styles.error}>{formError}</p>}

            <footer>
              <button type="button" onClick={() => setModal(false)}>
                Batal
              </button>
              <button className={styles.primary} disabled={submitting}>
                {submitting ? 'Mengirim...' : 'Kirim Tiket'}
              </button>
            </footer>
          </form>
        </div>
      )}

      {rescheduleTarget && (
        <div className={styles.modalBack}>
          <form className={styles.modal} onSubmit={submitReschedule}>
            <header>
              <div>
                <h2>Reschedule Jadwal Tiket</h2>
                <p>
                  Perubahan jadwal dadakan dari penerbangan (delay/cuaca buruk/dsb) — {rescheduleTarget.karyawan?.nama}{' '}
                  akan langsung dapat notifikasi WA jadwal lama &amp; barunya.
                </p>
              </div>
              <button type="button" onClick={() => setRescheduleTarget(null)}>
                <X />
              </button>
            </header>

            <div className={styles.formGrid}>
              <label style={{ gridColumn: '1/-1', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={rescheduleForm.ubahBerangkat}
                  onChange={(e) => setRescheduleForm((cur) => ({ ...cur, ubahBerangkat: e.target.checked }))}
                />
                Ubah jadwal keberangkatan
                <span style={{ fontWeight: 400, color: '#8a9bb0' }}>
                  (saat ini: {formatLeg(rescheduleTarget.tanggalMulai, rescheduleTarget.jamMulai)})
                </span>
              </label>

              {rescheduleForm.ubahBerangkat && (
                <>
                  <label>
                    Tanggal Keberangkatan Baru
                    <input
                      type="date"
                      required
                      value={rescheduleForm.tanggalMulai}
                      onChange={(e) =>
                        setRescheduleForm((cur) => ({ ...cur, tanggalMulai: e.target.value }))
                      }
                    />
                  </label>

                  <label>
                    Jam Keberangkatan Baru (24 jam)
                    <TimeInput24
                      required
                      value={rescheduleForm.jamMulai}
                      onChange={(v) => setRescheduleForm((cur) => ({ ...cur, jamMulai: v }))}
                    />
                  </label>
                </>
              )}

              <label style={{ gridColumn: '1/-1', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <input
                  type="checkbox"
                  checked={rescheduleForm.ubahPulang}
                  onChange={(e) => setRescheduleForm((cur) => ({ ...cur, ubahPulang: e.target.checked }))}
                />
                Ubah jadwal kepulangan
                <span style={{ fontWeight: 400, color: '#8a9bb0' }}>
                  (saat ini: {formatLeg(rescheduleTarget.tanggalSelesai, rescheduleTarget.jamSelesai)})
                </span>
              </label>

              {rescheduleForm.ubahPulang && (
                <>
                  <label>
                    Tanggal Kepulangan Baru
                    <input
                      type="date"
                      required
                      value={rescheduleForm.tanggalSelesai}
                      onChange={(e) =>
                        setRescheduleForm((cur) => ({ ...cur, tanggalSelesai: e.target.value }))
                      }
                    />
                  </label>

                  <label>
                    Jam Kepulangan Baru (24 jam)
                    <TimeInput24
                      required
                      value={rescheduleForm.jamSelesai}
                      onChange={(v) => setRescheduleForm((cur) => ({ ...cur, jamSelesai: v }))}
                    />
                  </label>
                </>
              )}

              <label style={{ gridColumn: '1/-1' }}>
                Alasan Perubahan (opsional, ikut disebut di WA)
                <input
                  placeholder="Contoh: Delay karena cuaca buruk"
                  value={rescheduleForm.alasan}
                  onChange={(e) => setRescheduleForm((cur) => ({ ...cur, alasan: e.target.value }))}
                />
              </label>

              <label style={{ gridColumn: '1/-1' }}>
                E-Tiket Terbaru (opsional — kalau tidak diisi, e-tiket lama tetap dilampirkan di WA)
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={async (e) => {
                    const dipilih = e.target.files?.[0];
                    if (!dipilih) {
                      setRescheduleFile(null);
                      return;
                    }
                    const hasil = dipilih.type.startsWith('image/')
                      ? await compressImage(dipilih).catch(() => dipilih)
                      : dipilih;
                    setRescheduleFile(hasil);
                  }}
                  className={styles.fileInput}
                />
                {rescheduleFile && <span className={styles.fileHint}>{rescheduleFile.name}</span>}
              </label>
            </div>

            {rescheduleError && <p className={styles.error}>{rescheduleError}</p>}

            <footer>
              <button type="button" onClick={() => setRescheduleTarget(null)}>
                Batal
              </button>
              <button className={styles.primary} disabled={rescheduleSubmitting}>
                {rescheduleSubmitting ? 'Menyimpan...' : 'Simpan & Kirim Notifikasi'}
              </button>
            </footer>
          </form>
        </div>
      )}
    </section>
  );
}
