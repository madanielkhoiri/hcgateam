'use client';

import { DragEvent, FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ChevronLeft,
  ChevronRight,
  Images,
  Plus,
  Printer,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { ACCESS_KEYS, getAccessToken, getStoredUser, hasAccess } from '@/lib/access-control';
import {
  HousekeepingIndoorApiError,
  HousekeepingIndoorLaporan,
  LABEL_LOKASI_HOUSEKEEPING_INDOOR,
  LOKASI_HOUSEKEEPING_INDOOR,
  LokasiHousekeepingIndoor,
  housekeepingIndoorApi,
  urlFileHousekeepingIndoor,
} from '@/lib/housekeeping-indoor-api';
import styles from './housekeeping-indoor.module.css';

function formatTanggal(value: string): string {
  return new Date(value).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatWaktu(value: string): string {
  return new Date(value).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const blankForm = { lokasi: '' as LokasiHousekeepingIndoor | '', namaPetugas: '' };

export default function HousekeepingIndoorPage() {
  const router = useRouter();
  const [siap, setSiap] = useState(false);
  const [data, setData] = useState<HousekeepingIndoorLaporan[]>([]);
  const [error, setError] = useState('');
  const [filterLokasi, setFilterLokasi] = useState<LokasiHousekeepingIndoor | ''>('');
  const [filterBulan, setFilterBulan] = useState('');
  const [filterTahun, setFilterTahun] = useState('');

  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(blankForm);
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [galeri, setGaleri] = useState<HousekeepingIndoorLaporan | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  useEffect(() => {
    const token = getAccessToken();
    const user = getStoredUser();

    if (!token || !user) {
      router.replace('/login');
      return;
    }

    if (!hasAccess(user, ACCESS_KEYS.GA_GS_HOUSEKEEPING_INDOOR)) {
      router.replace('/ga');
      return;
    }

    setSiap(true);
  }, [router]);

  async function muat() {
    try {
      setError('');
      setData(await housekeepingIndoorApi.daftar());
    } catch (err) {
      setError(err instanceof HousekeepingIndoorApiError ? err.message : 'Data laporan gagal dimuat');
    }
  }

  useEffect(() => {
    if (siap) void muat();
  }, [siap]);

  const tahunTersedia = useMemo(() => {
    const sekarang = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, i) => sekarang - 5 + i);
  }, []);

  const dataTampil = useMemo(
    () =>
      data
        .filter((item) => !filterLokasi || item.lokasi === filterLokasi)
        .filter((item) => {
          if (!filterBulan && !filterTahun) return true;
          const tanggal = new Date(item.createdAt);
          if (filterTahun && tanggal.getFullYear() !== Number(filterTahun)) return false;
          if (filterBulan && tanggal.getMonth() + 1 !== Number(filterBulan)) return false;
          return true;
        }),
    [data, filterLokasi, filterBulan, filterTahun],
  );

  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);
  useEffect(() => () => previews.forEach((url) => URL.revokeObjectURL(url)), [previews]);

  const stat = useMemo(() => {
    const hariIni = new Date().toDateString();
    const totalFoto = data.reduce((total, item) => total + item.foto.length, 0);
    const lokasiHariIni = new Set(
      data.filter((item) => new Date(item.createdAt).toDateString() === hariIni).map((item) => item.lokasi),
    ).size;
    return { totalLaporan: data.length, totalFoto, lokasiHariIni };
  }, [data]);

  function bukaModal() {
    setForm(blankForm);
    setFiles([]);
    setFormError('');
    setModal(true);
  }

  function tambahFile(fileList: FileList | File[] | null) {
    if (!fileList) return;
    setFiles((cur) => [...cur, ...Array.from(fileList)]);
  }

  function hapusFile(index: number) {
    setFiles((cur) => cur.filter((_, i) => i !== index));
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragActive(false);
    tambahFile(event.dataTransfer.files);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setFormError('');

    if (!form.lokasi) {
      setFormError('Pilih lokasi terlebih dahulu');
      return;
    }

    if (!form.namaPetugas.trim()) {
      setFormError('Nama petugas wajib diisi');
      return;
    }

    setSubmitting(true);
    try {
      await housekeepingIndoorApi.buat({ lokasi: form.lokasi, namaPetugas: form.namaPetugas }, files);
      setModal(false);
      await muat();
    } catch (err) {
      setFormError(err instanceof HousekeepingIndoorApiError ? err.message : 'Laporan gagal disimpan');
    } finally {
      setSubmitting(false);
    }
  }

  async function hapus(id: number) {
    if (!confirm('Hapus laporan ini beserta seluruh fotonya?')) return;
    try {
      await housekeepingIndoorApi.hapus(id);
      setGaleri((cur) => (cur?.id === id ? null : cur));
      await muat();
    } catch (err) {
      setError(err instanceof HousekeepingIndoorApiError ? err.message : 'Laporan gagal dihapus');
    }
  }

  function cetakPdf() {
    window.print();
  }

  if (!siap) return null;

  return (
    <div className={styles.page}>
      <Link href="/ga" className={styles.backLink}>
        <ChevronLeft size={16} /> Kembali ke GA
      </Link>

      <div className={styles.hero}>
        <div className={styles.heroTop}>
          <div className={styles.heroLeft}>
            <span className={styles.heroIcon}>
              <Sparkles />
            </span>
            <div>
              <h1>Housekeeping Indoor</h1>
              <p>Laporan kebersihan per lokasi — pilih lokasi, unggah foto sebanyak apa pun.</p>
            </div>
          </div>
          <button className={styles.primaryButton} onClick={bukaModal}>
            <Plus />
            Buat Laporan
          </button>
        </div>

        <div className={styles.statRow}>
          <div className={styles.statCard}>
            <strong>{stat.totalLaporan}</strong>
            <span>Total Laporan</span>
          </div>
          <div className={styles.statCard}>
            <strong>{stat.totalFoto}</strong>
            <span>Total Foto Terkumpul</span>
          </div>
          <div className={styles.statCard}>
            <strong>{stat.lokasiHariIni} / 6</strong>
            <span>Lokasi Dilaporkan Hari Ini</span>
          </div>
        </div>
      </div>

      <div className={styles.filterRow}>
        <button
          className={`${styles.chip} ${!filterLokasi ? styles.chipActive : ''}`}
          onClick={() => setFilterLokasi('')}
        >
          Semua Lokasi
        </button>
        {LOKASI_HOUSEKEEPING_INDOOR.map((l) => (
          <button
            key={l}
            className={`${styles.chip} ${filterLokasi === l ? styles.chipActive : ''}`}
            onClick={() => setFilterLokasi(l)}
          >
            {LABEL_LOKASI_HOUSEKEEPING_INDOOR[l]}
          </button>
        ))}
      </div>

      <div className={styles.dateFilterRow}>
        <select
          className={styles.dateSelect}
          value={filterBulan}
          onChange={(e) => setFilterBulan(e.target.value)}
        >
          <option value="">Semua Bulan</option>
          {Array.from({ length: 12 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(2026, i, 1))}
            </option>
          ))}
        </select>

        <select
          className={styles.dateSelect}
          value={filterTahun}
          onChange={(e) => setFilterTahun(e.target.value)}
        >
          <option value="">Semua Tahun</option>
          {tahunTersedia.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>

        <button
          type="button"
          className={styles.resetChip}
          onClick={() => {
            setFilterLokasi('');
            setFilterBulan('');
            setFilterTahun('');
          }}
        >
          Reset
        </button>
      </div>

      {error && <p className={styles.pageError}>{error}</p>}

      <div className={styles.grid}>
        {dataTampil.map((item) => (
          <article key={item.id} className={styles.card}>
            <div className={styles.cardCover} onClick={() => setGaleri(item)}>
              {item.foto[0] ? (
                <img src={urlFileHousekeepingIndoor(item.foto[0].fileUrl)} alt="Cover laporan" />
              ) : (
                <div className={styles.cardCoverEmpty}>
                  <Images size={30} />
                </div>
              )}
              <span className={styles.cardCoverBadge}>
                <Images size={12} /> {item.foto.length} foto
              </span>
            </div>
            <div className={styles.cardBody}>
              <span className={`${styles.lokasiBadge} ${styles[`lokasi_${item.lokasi}`]}`}>
                {LABEL_LOKASI_HOUSEKEEPING_INDOOR[item.lokasi]}
              </span>
              <h3>{item.namaPetugas}</h3>
              <time>{formatWaktu(item.createdAt)}</time>
              <div className={styles.cardFooter}>
                <span>Oleh {item.pengirim?.name ?? '-'}</span>
                <button className={styles.iconButton} onClick={() => hapus(item.id)} title="Hapus">
                  <Trash2 />
                </button>
              </div>
            </div>
          </article>
        ))}

        {!dataTampil.length && !error && (
          <div className={styles.empty}>Belum ada laporan kebersihan untuk filter ini.</div>
        )}
      </div>

      {modal && (
        <div className={styles.modalBack} onClick={() => setModal(false)}>
          <form className={styles.modal} onSubmit={submit} onClick={(e) => e.stopPropagation()}>
            <header>
              <div>
                <h2>Buat Laporan Kebersihan</h2>
                <p>Pilih lokasi, isi nama petugas, dan unggah foto sebanyak apa pun.</p>
              </div>
              <button type="button" onClick={() => setModal(false)}>
                <X />
              </button>
            </header>

            <div className={styles.formBody}>
              <div className={styles.formRow}>
                <label>
                  Lokasi
                  <select
                    required
                    value={form.lokasi}
                    onChange={(e) => setForm((cur) => ({ ...cur, lokasi: e.target.value as LokasiHousekeepingIndoor }))}
                  >
                    <option value="">Pilih lokasi...</option>
                    {LOKASI_HOUSEKEEPING_INDOOR.map((l) => (
                      <option key={l} value={l}>
                        {LABEL_LOKASI_HOUSEKEEPING_INDOOR[l]}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Nama Petugas
                  <input
                    required
                    value={form.namaPetugas}
                    onChange={(e) => setForm((cur) => ({ ...cur, namaPetugas: e.target.value }))}
                  />
                </label>
              </div>

              <label
                className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
              >
                <Upload />
                <strong>Seret foto ke sini, atau klik untuk pilih</strong>
                <span>JPG / PNG / WEBP — bisa pilih banyak foto sekaligus</span>
                <input type="file" multiple accept="image/*" onChange={(e) => tambahFile(e.target.files)} />
              </label>

              {files.length > 0 && (
                <div className={styles.previewGrid}>
                  {previews.map((url, index) => (
                    <div key={url} className={styles.previewItem}>
                      <img src={url} alt={`Preview ${index + 1}`} />
                      <button type="button" className={styles.previewRemove} onClick={() => hapusFile(index)}>
                        <X />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {files.length > 0 && <span style={{ fontSize: 12, color: '#71839d' }}>{files.length} foto dipilih</span>}
            </div>

            {formError && <p className={styles.errorText}>{formError}</p>}

            <footer>
              <button type="button" className={styles.ghostButton} onClick={() => setModal(false)}>
                Batal
              </button>
              <button className={styles.primaryButton} style={{ color: '#fff', background: 'linear-gradient(135deg,#0d9488,#0891b2)' }} disabled={submitting}>
                {submitting ? 'Mengunggah...' : 'Simpan Laporan'}
              </button>
            </footer>
          </form>
        </div>
      )}

      {galeri && (
        <div className={styles.modalBack} onClick={() => setGaleri(null)}>
          <div className={`${styles.modal} ${styles.modalWide}`} onClick={(e) => e.stopPropagation()}>
            <header>
              <div className={styles.galeriMeta}>
                <span className={`${styles.lokasiBadge} ${styles[`lokasi_${galeri.lokasi}`]}`}>
                  {LABEL_LOKASI_HOUSEKEEPING_INDOOR[galeri.lokasi]}
                </span>
                <div>
                  <h2>{galeri.namaPetugas}</h2>
                  <p>
                    {formatWaktu(galeri.createdAt)} · {galeri.foto.length} foto · Oleh {galeri.pengirim?.name ?? '-'}
                  </p>
                </div>
              </div>
              <div className={styles.galeriActions}>
                <button type="button" className={styles.btnCetak} onClick={cetakPdf}>
                  <Printer size={14} /> Cetak PDF
                </button>
                <button type="button" className={styles.btnHapus} onClick={() => hapus(galeri.id)}>
                  <Trash2 size={14} /> Hapus
                </button>
                <button type="button" onClick={() => setGaleri(null)} style={{ background: '#f1f5f9', border: 0, borderRadius: 9, width: 34, cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>
            </header>
            <div className={styles.masonry}>
              {galeri.foto.map((f, index) => (
                <button key={f.id} type="button" className={styles.masonryItem} onClick={() => setLightboxIndex(index)}>
                  <img src={urlFileHousekeepingIndoor(f.fileUrl)} alt={`Foto ${index + 1}`} />
                </button>
              ))}
              {!galeri.foto.length && <p style={{ color: '#8a9bb0', fontSize: 13 }}>Belum ada foto pada laporan ini.</p>}
            </div>
          </div>
        </div>
      )}

      {galeri && lightboxIndex !== null && (
        <div className={styles.lightbox} onClick={() => setLightboxIndex(null)}>
          <button className={styles.lightboxClose} onClick={() => setLightboxIndex(null)}>
            <X size={18} />
          </button>
          {lightboxIndex > 0 && (
            <button
              className={`${styles.lightboxNav} ${styles.lightboxPrev}`}
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i !== null ? i - 1 : i));
              }}
            >
              <ChevronLeft size={22} />
            </button>
          )}
          <img
            src={urlFileHousekeepingIndoor(galeri.foto[lightboxIndex].fileUrl)}
            alt={`Foto ${lightboxIndex + 1}`}
            onClick={(e) => e.stopPropagation()}
          />
          {lightboxIndex < galeri.foto.length - 1 && (
            <button
              className={`${styles.lightboxNav} ${styles.lightboxNext}`}
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex((i) => (i !== null ? i + 1 : i));
              }}
            >
              <ChevronRight size={22} />
            </button>
          )}
          <span className={styles.lightboxCount}>
            {lightboxIndex + 1} / {galeri.foto.length}
          </span>
        </div>
      )}

      {/* Area khusus cetak PDF (window.print) — hanya tampil saat mencetak */}
      {galeri && (
        <div className={styles.cetakArea}>
          <div className={styles.cetakHeader}>
            <h1>Laporan Kebersihan — Housekeeping Indoor</h1>
            <span>HCGA TEAM · dicetak {formatWaktu(new Date().toISOString())}</span>
          </div>
          <div className={styles.cetakInfo}>
            <div>
              Lokasi: <b>{LABEL_LOKASI_HOUSEKEEPING_INDOOR[galeri.lokasi]}</b>
            </div>
            <div>
              Tanggal Laporan: <b>{formatTanggal(galeri.createdAt)}</b>
            </div>
            <div>
              Nama Petugas: <b>{galeri.namaPetugas}</b>
            </div>
            <div>
              Dikirim Oleh: <b>{galeri.pengirim?.name ?? '-'}</b>
            </div>
            <div>
              Jumlah Foto: <b>{galeri.foto.length}</b>
            </div>
          </div>
          <div className={styles.cetakPhotoGrid}>
            {galeri.foto.map((f, index) => (
              <figure key={f.id}>
                <img src={urlFileHousekeepingIndoor(f.fileUrl)} alt={`Foto ${index + 1}`} />
                <figcaption>Foto {index + 1}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
