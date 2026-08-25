'use client';

// ==================================================
// FILE: frontend/src/app/administrasi/postingan/page.tsx
// FUNGSI: Kelola Postingan (poster/video) yang tampil di carousel
// beranda. Kelola: Admin/Admin HC/Admin Comben/Section Head.
// ==================================================

import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  Inbox,
  Megaphone,
  Plus,
  Trash2,
  UploadCloud,
  Video,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Dialog } from '@/components/mcu/mcu-ui';
import { getStoredUser } from '@/lib/access-control';
import {
  bolehKelolaPostingan,
  postinganApi,
  urlMediaPostingan,
  type Postingan,
  type TipePostingan,
} from '@/lib/postingan-api';
import styles from '@/app/hc/ir/ir.module.css';

function formatTanggal(iso: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export default function PostinganPage() {
  const user = getStoredUser();
  const boleh = bolehKelolaPostingan(user);

  const [daftar, setDaftar] = useState<Postingan[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);
  const [proses, setProses] = useState(false);

  const [formTerbuka, setFormTerbuka] = useState(false);
  const [judulBaru, setJudulBaru] = useState('');
  const [deskripsiBaru, setDeskripsiBaru] = useState('');
  const [tipeBaru, setTipeBaru] = useState<TipePostingan>('POSTER');
  const [tampilBerandaBaru, setTampilBerandaBaru] = useState(true);
  const [urutanBaru, setUrutanBaru] = useState('0');
  const [fileBaru, setFileBaru] = useState<File | null>(null);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      setDaftar(await postinganApi.daftar());
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMemuat(false);
    }
  }, []);

  useEffect(() => {
    void muat();
  }, [muat]);

  function bukaForm() {
    setJudulBaru('');
    setDeskripsiBaru('');
    setTipeBaru('POSTER');
    setTampilBerandaBaru(true);
    setUrutanBaru('0');
    setFileBaru(null);
    setGalat(null);
    setFormTerbuka(true);
  }

  async function unggah() {
    if (!judulBaru.trim() || !fileBaru) {
      setGalat('Judul dan file wajib diisi');
      return;
    }

    setProses(true);
    setGalat(null);

    try {
      await postinganApi.unggah({
        judul: judulBaru.trim(),
        deskripsi: deskripsiBaru.trim() || undefined,
        tipe: tipeBaru,
        tampilBeranda: tampilBerandaBaru,
        urutan: Number(urutanBaru) || 0,
        file: fileBaru,
      });
      setSukses('Postingan berhasil diunggah');
      setFormTerbuka(false);
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function toggleTampilBeranda(item: Postingan) {
    try {
      await postinganApi.ubah(item.id, { tampilBeranda: !item.tampilBeranda });
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    }
  }

  async function hapus(item: Postingan) {
    if (!confirm(`Hapus postingan "${item.judul}"?`)) return;

    try {
      await postinganApi.hapus(item.id);
      setSukses('Postingan berhasil dihapus');
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/dashboard">Dashboard</Link>
        <span>/</span>
        <Link href="/administrasi">ADMINISTRASI</Link>
        <span>/</span>
        <strong>Postingan</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <Megaphone size={26} />
          </span>

          <div>
            <h1>Postingan</h1>
            <p>
              Poster & video informasi yang tampil di carousel beranda seluruh
              akun. Aktifkan &quot;Tampil di Beranda&quot; untuk memunculkan di
              carousel.
            </p>
          </div>
        </div>

        <div className={styles.headActions}>
          {boleh && (
            <button type="button" className={styles.btn} onClick={bukaForm}>
              <Plus size={15} />
              Buat Postingan
            </button>
          )}
          <Link href="/administrasi" className={`${styles.btn} ${styles.btnGhost}`}>
            <ArrowLeft size={15} />
            Kembali
          </Link>
        </div>
      </div>

      {galat && (
        <div className={`${styles.alert} ${styles.alertError}`}>
          <AlertCircle size={16} />
          <span>{galat}</span>
        </div>
      )}
      {sukses && (
        <div className={`${styles.alert} ${styles.alertSuccess}`}>
          <CheckCircle2 size={16} />
          <span>{sukses}</span>
        </div>
      )}

      {memuat ? (
        <div className={styles.loadingState}>Memuat postingan...</div>
      ) : daftar.length === 0 ? (
        <div className={styles.emptyState}>
          <Inbox size={30} />
          <strong>Belum ada postingan</strong>
          <p>Poster/video yang diunggah akan tampil di carousel beranda.</p>
        </div>
      ) : (
        <div className={styles.docGrid}>
          {daftar.map((item) => (
            <div key={item.id} className={styles.docCard}>
              {item.tipe === 'POSTER' ? (
                <img
                  src={urlMediaPostingan(item.urlMedia)}
                  alt={item.judul}
                  className={styles.previewImage}
                  style={{ maxHeight: 140, borderRadius: 12 }}
                />
              ) : (
                <div className={styles.videoThumb} style={{ height: 100 }}>
                  <Video size={28} />
                </div>
              )}

              <div className={styles.docTop}>
                <div className={styles.docTitle}>
                  <strong>{item.judul}</strong>
                  <small>
                    {item.uploadedBy.name}
                    {item.uploadedBy.nrp ? ` (${item.uploadedBy.nrp})` : ''}
                  </small>
                </div>
              </div>

              {item.tampilBeranda ? (
                <span className={styles.watchedTag}>
                  <Eye size={12} />
                  Tampil di Beranda
                </span>
              ) : (
                <span className={`${styles.pill} ${styles.pillNonaktif}`}>
                  <EyeOff size={12} style={{ marginRight: 4 }} />
                  Tersembunyi
                </span>
              )}

              <div className={styles.docFooter}>
                <span className={styles.docDate}>{formatTanggal(item.createdAt)}</span>

                {boleh && (
                  <div className={styles.docActions}>
                    <button
                      type="button"
                      className={`${styles.linkBtn}`}
                      onClick={() => toggleTampilBeranda(item)}
                    >
                      {item.tampilBeranda ? (
                        <>
                          <EyeOff size={13} />
                          Sembunyikan
                        </>
                      ) : (
                        <>
                          <Eye size={13} />
                          Tampilkan
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => hapus(item)}
                      aria-label="Hapus postingan"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {formTerbuka && (
        <Dialog
          judul="Buat Postingan"
          keterangan="Poster (JPG/PNG/WEBP maks 10 MB) atau video (MP4/WEBM/MOV maks 300 MB)."
          onTutup={() => setFormTerbuka(false)}
          aksi={
            <>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => setFormTerbuka(false)}
                disabled={proses}
              >
                Batal
              </button>
              <button
                type="button"
                className={styles.btn}
                onClick={unggah}
                disabled={proses}
              >
                {proses ? 'Mengunggah...' : 'Unggah'}
              </button>
            </>
          }
        >
          <div className={styles.formStack}>
            {galat && (
              <div className={`${styles.alert} ${styles.alertError}`}>
                <AlertCircle size={16} />
                <span>{galat}</span>
              </div>
            )}

            <div className={styles.formField}>
              <label>Judul</label>
              <input
                className={styles.formInput}
                value={judulBaru}
                onChange={(event) => setJudulBaru(event.target.value)}
                placeholder="Contoh: Pengumuman Libur Nasional"
              />
            </div>

            <div className={styles.formField}>
              <label>Deskripsi (opsional)</label>
              <textarea
                className={styles.formTextarea}
                value={deskripsiBaru}
                onChange={(event) => setDeskripsiBaru(event.target.value)}
                rows={2}
              />
            </div>

            <div className={styles.formField}>
              <label>Tipe Media</label>
              <select
                className={styles.formSelect}
                value={tipeBaru}
                onChange={(event) => {
                  setTipeBaru(event.target.value as TipePostingan);
                  setFileBaru(null);
                }}
              >
                <option value="POSTER">Poster (Gambar)</option>
                <option value="VIDEO">Video</option>
              </select>
            </div>

            <div className={styles.formField}>
              <label>Urutan Tampil (angka kecil tampil lebih dulu)</label>
              <input
                type="number"
                className={styles.formInput}
                value={urutanBaru}
                onChange={(event) => setUrutanBaru(event.target.value)}
              />
            </div>

            <div className={styles.formField}>
              <label className={styles.optionItem}>
                <input
                  type="checkbox"
                  checked={tampilBerandaBaru}
                  onChange={(event) => setTampilBerandaBaru(event.target.checked)}
                />
                <span>Tampilkan di carousel beranda</span>
              </label>
            </div>

            <div className={styles.formField}>
              <label>File {tipeBaru === 'VIDEO' ? 'Video' : 'Poster'}</label>
              <label className={styles.dropzone}>
                <input
                  type="file"
                  accept={
                    tipeBaru === 'VIDEO'
                      ? '.mp4,.webm,.mov'
                      : '.jpg,.jpeg,.png,.webp'
                  }
                  onChange={(event) =>
                    setFileBaru(event.target.files?.[0] ?? null)
                  }
                />
                <UploadCloud size={26} className={styles.dropzoneIcon} />
                <span className={styles.dropzoneText}>Klik untuk pilih file</span>
                <span className={styles.dropzoneHint}>
                  {tipeBaru === 'VIDEO'
                    ? 'MP4, WEBM, MOV - maks 300 MB'
                    : 'JPG, PNG, WEBP - maks 10 MB'}
                </span>
                {fileBaru ? (
                  <span className={styles.dropzoneFile}>{fileBaru.name}</span>
                ) : null}
              </label>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
