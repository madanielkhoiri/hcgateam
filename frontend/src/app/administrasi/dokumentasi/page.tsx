'use client';

// ==================================================
// FILE: frontend/src/app/administrasi/dokumentasi/page.tsx
// FUNGSI: Dokumentasi - album foto kegiatan. Kelola: Admin/Admin HC/
// Admin Comben/Section Head. Lihat: seluruh akun ber-akses Administrasi.
// ==================================================

import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  ImagePlus,
  Images,
  Inbox,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Dialog } from '@/components/mcu/mcu-ui';
import { getStoredUser } from '@/lib/access-control';
import {
  albumApi,
  urlFotoAlbum,
  type AlbumDetail,
  type AlbumRingkas,
} from '@/lib/album-api';
import { bolehKelolaPostingan } from '@/lib/postingan-api';
import styles from '@/app/hc/ir/ir.module.css';

function formatTanggal(iso: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export default function DokumentasiPage() {
  const user = getStoredUser();
  const boleh = bolehKelolaPostingan(user);

  const [albumList, setAlbumList] = useState<AlbumRingkas[]>([]);
  const [albumAktif, setAlbumAktif] = useState<AlbumDetail | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);
  const [proses, setProses] = useState(false);

  const [formAlbumTerbuka, setFormAlbumTerbuka] = useState(false);
  const [judulBaru, setJudulBaru] = useState('');
  const [deskripsiBaru, setDeskripsiBaru] = useState('');

  const [fotoDipilih, setFotoDipilih] = useState<File[]>([]);
  const [previewFoto, setPreviewFoto] = useState<string | null>(null);

  const muatDaftar = useCallback(() => {
    setMemuat(true);
    setGalat(null);

    albumApi
      .daftar()
      .then(setAlbumList)
      .catch((error) => setGalat((error as Error).message))
      .finally(() => setMemuat(false));
  }, []);

  useEffect(() => {
    muatDaftar();
  }, [muatDaftar]);

  function bukaAlbum(id: number) {
    setGalat(null);
    albumApi
      .detail(id)
      .then(setAlbumAktif)
      .catch((error) => setGalat((error as Error).message));
  }

  function muatUlangAlbumAktif() {
    if (albumAktif) bukaAlbum(albumAktif.id);
  }

  async function buatAlbum() {
    if (!judulBaru.trim()) {
      setGalat('Judul album wajib diisi');
      return;
    }

    setProses(true);
    setGalat(null);

    try {
      await albumApi.buat(judulBaru.trim(), deskripsiBaru.trim() || undefined);
      setSukses('Album berhasil dibuat');
      setFormAlbumTerbuka(false);
      setJudulBaru('');
      setDeskripsiBaru('');
      muatDaftar();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function tambahFoto() {
    if (!albumAktif || fotoDipilih.length === 0) return;

    setProses(true);
    setGalat(null);

    try {
      const hasil = await albumApi.tambahFoto(albumAktif.id, fotoDipilih);
      setAlbumAktif(hasil);
      setFotoDipilih([]);
      setSukses('Foto berhasil ditambahkan');
      muatDaftar();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function hapusAlbum(album: AlbumRingkas) {
    if (!confirm(`Hapus album "${album.judul}" beserta seluruh fotonya?`)) return;

    try {
      await albumApi.hapusAlbum(album.id);
      setSukses('Album berhasil dihapus');
      muatDaftar();
    } catch (error) {
      setGalat((error as Error).message);
    }
  }

  async function hapusFoto(fotoId: number) {
    if (!confirm('Hapus foto ini?')) return;

    try {
      await albumApi.hapusFoto(fotoId);
      muatUlangAlbumAktif();
      muatDaftar();
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
        {albumAktif ? (
          <>
            <button
              type="button"
              onClick={() => setAlbumAktif(null)}
              style={{ border: 0, background: 'none', color: '#0783a8', font: 'inherit', fontWeight: 700, cursor: 'pointer', padding: 0 }}
            >
              Dokumentasi
            </button>
            <span>/</span>
            <strong>{albumAktif.judul}</strong>
          </>
        ) : (
          <strong>Dokumentasi</strong>
        )}
      </div>

      {!albumAktif ? (
        <>
          <div className={styles.pageHead}>
            <div className={styles.pageTitle}>
              <span className={styles.pageIcon}>
                <Images size={26} />
              </span>

              <div>
                <h1>Dokumentasi</h1>
                <p>Album foto kegiatan.</p>
              </div>
            </div>

            <div className={styles.headActions}>
              {boleh && (
                <button
                  type="button"
                  className={styles.btn}
                  onClick={() => setFormAlbumTerbuka(true)}
                >
                  <Plus size={15} />
                  Buat Album
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
            <div className={styles.loadingState}>Memuat album...</div>
          ) : albumList.length === 0 ? (
            <div className={styles.emptyState}>
              <Inbox size={30} />
              <strong>Belum ada album</strong>
              <p>Buat album baru untuk mulai menyimpan foto dokumentasi kegiatan.</p>
            </div>
          ) : (
            <div className={styles.docGrid}>
              {albumList.map((album) => (
                <div key={album.id} className={styles.docCard}>
                  <button
                    type="button"
                    onClick={() => bukaAlbum(album.id)}
                    style={{ display: 'block', width: '100%', border: 0, background: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    {album.sampul ? (
                      <img
                        src={urlFotoAlbum(album.sampul)}
                        alt={album.judul}
                        className={styles.posterThumb}
                      />
                    ) : (
                      <div className={styles.videoThumb} style={{ height: 170 }}>
                        <Images size={28} />
                      </div>
                    )}
                  </button>

                  <div className={styles.docTop}>
                    <div className={styles.docTitle}>
                      <strong>{album.judul}</strong>
                      <small>{album.totalFoto} foto</small>
                    </div>
                  </div>

                  <div className={styles.docFooter}>
                    <span className={styles.docDate}>{formatTanggal(album.createdAt)}</span>

                    <div className={styles.docActions}>
                      <button
                        type="button"
                        className={styles.linkBtn}
                        onClick={() => bukaAlbum(album.id)}
                      >
                        Buka
                      </button>

                      {boleh && (
                        <button
                          type="button"
                          className={styles.iconBtn}
                          onClick={() => hapusAlbum(album)}
                          aria-label="Hapus album"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className={styles.pageHead}>
            <div className={styles.pageTitle}>
              <span className={styles.pageIcon}>
                <Images size={26} />
              </span>

              <div>
                <h1>{albumAktif.judul}</h1>
                <p>
                  {albumAktif.deskripsi || `${albumAktif.foto.length} foto`}
                  {' - '}
                  {albumAktif.uploadedBy.name}
                </p>
              </div>
            </div>

            <div className={styles.headActions}>
              {boleh && (
                <label className={styles.btn} style={{ cursor: 'pointer' }}>
                  <ImagePlus size={15} />
                  Tambah Foto
                  <input
                    type="file"
                    accept=".jpg,.jpeg,.png,.webp"
                    multiple
                    hidden
                    onChange={(event) =>
                      setFotoDipilih(Array.from(event.target.files ?? []))
                    }
                  />
                </label>
              )}
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => setAlbumAktif(null)}
              >
                <ArrowLeft size={15} />
                Kembali
              </button>
            </div>
          </div>

          {fotoDipilih.length > 0 && (
            <div className={`${styles.alert} ${styles.alertSuccess}`}>
              <UploadCloud size={16} />
              <span>{fotoDipilih.length} foto siap diunggah.</span>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnSm}`}
                onClick={tambahFoto}
                disabled={proses}
                style={{ marginLeft: 'auto' }}
              >
                {proses ? 'Mengunggah...' : 'Unggah'}
              </button>
            </div>
          )}

          {galat && (
            <div className={`${styles.alert} ${styles.alertError}`}>
              <AlertCircle size={16} />
              <span>{galat}</span>
            </div>
          )}

          {albumAktif.foto.length === 0 ? (
            <div className={styles.emptyState}>
              <Inbox size={30} />
              <strong>Album ini masih kosong</strong>
              <p>Tambahkan foto untuk mulai mengisi album ini.</p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                gap: 14,
              }}
            >
              {albumAktif.foto.map((foto) => (
                <div key={foto.id} style={{ position: 'relative' }}>
                  <img
                    src={urlFotoAlbum(foto.urlFoto)}
                    alt=""
                    onClick={() => setPreviewFoto(urlFotoAlbum(foto.urlFoto))}
                    className={styles.posterThumb}
                    style={{ height: 150, cursor: 'pointer' }}
                  />
                  {boleh && (
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => hapusFoto(foto.id)}
                      aria-label="Hapus foto"
                      style={{ position: 'absolute', top: 8, right: 8 }}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {formAlbumTerbuka && (
        <Dialog
          judul="Buat Album"
          onTutup={() => setFormAlbumTerbuka(false)}
          aksi={
            <>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => setFormAlbumTerbuka(false)}
                disabled={proses}
              >
                Batal
              </button>
              <button
                type="button"
                className={styles.btn}
                onClick={buatAlbum}
                disabled={proses}
              >
                {proses ? 'Menyimpan...' : 'Simpan'}
              </button>
            </>
          }
        >
          <div className={styles.formStack}>
            <div className={styles.formField}>
              <label>Judul Album</label>
              <input
                className={styles.formInput}
                value={judulBaru}
                onChange={(event) => setJudulBaru(event.target.value)}
                placeholder="Contoh: Employee Gathering Juni 2026"
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
          </div>
        </Dialog>
      )}

      {previewFoto && (
        <div
          className={styles.previewOverlay}
          onClick={(event) => {
            if (event.target === event.currentTarget) setPreviewFoto(null);
          }}
        >
          <div className={styles.previewBox}>
            <div className={styles.previewHead}>
              <strong>Foto</strong>
              <button
                type="button"
                className={styles.previewClose}
                onClick={() => setPreviewFoto(null)}
                aria-label="Tutup"
              >
                <X size={16} />
              </button>
            </div>
            <div className={styles.previewBody}>
              <img src={previewFoto} alt="" className={styles.previewImage} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
