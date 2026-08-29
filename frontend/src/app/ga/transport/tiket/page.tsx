'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Download, Plus, Ticket, Trash2, X } from 'lucide-react';
import { ACCESS_KEYS, getAccessToken, getStoredUser, hasAccess } from '@/lib/access-control';
import {
  KaryawanRingkas,
  TransportApiError,
  TransportTiket,
  transportApi,
  urlFileTransport,
} from '@/lib/transport-api';
import styles from '@/components/transport/transport.module.css';

function formatTanggal(value: string): string {
  return new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

const blankForm = {
  karyawanId: 0,
  namaKaryawan: '',
  tanggalMulai: '',
  tanggalSelesai: '',
  keterangan: '',
};

export default function TiketPage() {
  const router = useRouter();
  const [siap, setSiap] = useState(false);
  const [data, setData] = useState<TransportTiket[]>([]);
  const [error, setError] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [files, setFiles] = useState<File[]>([]);
  const [cariKaryawan, setCariKaryawan] = useState('');
  const [hasilKaryawan, setHasilKaryawan] = useState<KaryawanRingkas[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

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

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError('');

    if (!form.karyawanId) {
      setFormError('Pilih karyawan penerima tiket terlebih dahulu');
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
          tanggalMulai: form.tanggalMulai,
          tanggalSelesai: form.tanggalSelesai,
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

  async function hapus(id: number) {
    if (!confirm('Hapus tiket ini?')) return;
    try {
      await transportApi.tiket.hapus(id);
      await muat();
    } catch (err) {
      setError(err instanceof TransportApiError ? err.message : 'Tiket gagal dihapus');
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

      <div className={styles.tablePanel}>
        <div className={styles.tableTitle}>
          <h3>Daftar Tiket Terkirim</h3>
          <span>Total {data.length} data</span>
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
              {data.map((item, index) => (
                <tr key={item.id}>
                  <td>{index + 1}</td>
                  <td>
                    <b>{item.karyawan?.nama}</b>
                    <div>{item.karyawan?.nik}</div>
                  </td>
                  <td>{item.karyawan?.departemen?.namaDepartemen ?? '-'}</td>
                  <td>
                    {formatTanggal(item.tanggalMulai)} — {formatTanggal(item.tanggalSelesai)}
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
                      <button onClick={() => hapus(item.id)} title="Hapus">
                        <Trash2 />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!data.length && (
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

              <label>
                Tanggal Mulai Cuti
                <input
                  type="date"
                  required
                  value={form.tanggalMulai}
                  onChange={(e) => setForm((cur) => ({ ...cur, tanggalMulai: e.target.value }))}
                />
              </label>

              <label>
                Tanggal Selesai Cuti
                <input
                  type="date"
                  required
                  value={form.tanggalSelesai}
                  onChange={(e) => setForm((cur) => ({ ...cur, tanggalSelesai: e.target.value }))}
                />
              </label>

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
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
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
    </section>
  );
}
