'use client';

// ==================================================
// FILE: frontend/src/app/hc/ir/dokumen/page.tsx
// FUNGSI: Upload Dokumen IR (SK/IM/FORM) - kelola: Admin/Admin HC/
// Section Head, lihat & unduh: seluruh akun ber-akses Portal IR.
// ==================================================

import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Database,
  Download,
  Eye,
  FileText,
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
  irApi,
  isIrPengelola,
  urlFileIr,
  type DokumenIr,
  type KategoriDokumenIr,
} from '@/lib/ir-api';
import styles from '../ir.module.css';

const TAB: { key: KategoriDokumenIr | 'SEMUA'; label: string }[] = [
  { key: 'SEMUA', label: 'Semua' },
  { key: 'SK', label: 'SK' },
  { key: 'IM', label: 'IM' },
  { key: 'FORM', label: 'FORM' },
];

const EKSTENSI_GAMBAR = ['.jpg', '.jpeg', '.png', '.webp'];

function apakahGambar(namaFile: string) {
  const lower = namaFile.toLowerCase();
  return EKSTENSI_GAMBAR.some((ekstensi) => lower.endsWith(ekstensi));
}

function formatTanggal(iso: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export default function DokumenIrPage() {
  const user = getStoredUser();
  const boleh = isIrPengelola(user);

  const [tab, setTab] = useState<KategoriDokumenIr | 'SEMUA'>('SEMUA');
  const [daftar, setDaftar] = useState<DokumenIr[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);
  const [proses, setProses] = useState(false);

  const [formTerbuka, setFormTerbuka] = useState(false);
  const [kategoriBaru, setKategoriBaru] = useState<KategoriDokumenIr>('SK');
  const [judulBaru, setJudulBaru] = useState('');
  const [fileBaru, setFileBaru] = useState<File | null>(null);

  const [preview, setPreview] = useState<DokumenIr | null>(null);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      setDaftar(await irApi.dokumen.daftar(tab === 'SEMUA' ? undefined : tab));
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setMemuat(false);
    }
  }, [tab]);

  useEffect(() => {
    void muat();
  }, [muat]);

  function bukaForm() {
    setKategoriBaru('SK');
    setJudulBaru('');
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
      await irApi.dokumen.unggah(kategoriBaru, judulBaru.trim(), fileBaru);
      setSukses('Dokumen berhasil diunggah');
      setFormTerbuka(false);
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function hapus(item: DokumenIr) {
    if (!confirm(`Hapus dokumen "${item.judul}"?`)) return;

    try {
      await irApi.dokumen.hapus(item.id);
      setSukses('Dokumen berhasil dihapus');
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.breadcrumb}>
        <Link href="/hc">HC</Link>
        <span>/</span>
        <Link href="/hc/ir">PORTAL IR</Link>
        <span>/</span>
        <strong>Upload Dokumen</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <Database size={26} />
          </span>

          <div>
            <h1>Upload Dokumen</h1>
            <p>Dokumen SK, IM, dan FORM. Pilih kategori untuk menyaring daftar.</p>
          </div>
        </div>

        <div className={styles.headActions}>
          {boleh && (
            <button type="button" className={styles.btn} onClick={bukaForm}>
              <Plus size={15} />
              Upload Dokumen
            </button>
          )}
          <Link href="/hc/ir" className={`${styles.btn} ${styles.btnGhost}`}>
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

      <div className={styles.tabRow}>
        {TAB.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`${styles.tabBtn} ${tab === item.key ? styles.tabBtnAktif : ''}`}
            onClick={() => setTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {memuat ? (
        <div className={styles.loadingState}>Memuat dokumen...</div>
      ) : daftar.length === 0 ? (
        <div className={styles.emptyState}>
          <Inbox size={30} />
          <strong>Belum ada dokumen</strong>
          <p>Dokumen SK/IM/FORM yang diunggah akan muncul di sini.</p>
        </div>
      ) : (
        <div className={styles.docGrid}>
          {daftar.map((item) => (
            <div key={item.id} className={styles.docCard}>
              <div className={styles.docTop}>
                <span className={styles.docIcon}>
                  <FileText size={19} />
                </span>
                <div className={styles.docTitle}>
                  <strong>{item.judul}</strong>
                  <small>
                    {item.kategori} - {item.uploadedBy.name}
                    {item.uploadedBy.nrp ? ` (${item.uploadedBy.nrp})` : ''}
                  </small>
                </div>
              </div>

              <div className={styles.docFooter}>
                <span className={styles.docDate}>{formatTanggal(item.createdAt)}</span>

                <div className={styles.docActions}>
                  <button
                    type="button"
                    className={styles.linkBtn}
                    onClick={() => setPreview(item)}
                  >
                    <Eye size={13} />
                    Preview
                  </button>

                  <a
                    href={urlFileIr(item.urlFile)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.iconBtnNetral}
                    aria-label="Unduh dokumen"
                  >
                    <Download size={14} />
                  </a>

                  {boleh && (
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => hapus(item)}
                      aria-label="Hapus dokumen"
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

      {formTerbuka && (
        <Dialog
          judul="Upload Dokumen"
          keterangan="Pilih kategori, isi judul, dan unggah file (PDF/JPG/PNG, maks 15 MB)."
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
              <label>Kategori</label>
              <select
                className={styles.formSelect}
                value={kategoriBaru}
                onChange={(event) =>
                  setKategoriBaru(event.target.value as KategoriDokumenIr)
                }
              >
                <option value="SK">SK</option>
                <option value="IM">IM</option>
                <option value="FORM">FORM</option>
              </select>
            </div>

            <div className={styles.formField}>
              <label>Judul Dokumen</label>
              <input
                className={styles.formInput}
                value={judulBaru}
                onChange={(event) => setJudulBaru(event.target.value)}
                placeholder="Contoh: SK Pengangkatan Karyawan Tetap"
              />
            </div>

            <div className={styles.formField}>
              <label>File Dokumen</label>
              <label className={styles.dropzone}>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(event) =>
                    setFileBaru(event.target.files?.[0] ?? null)
                  }
                />
                <UploadCloud size={26} className={styles.dropzoneIcon} />
                <span className={styles.dropzoneText}>
                  Klik untuk pilih file
                </span>
                <span className={styles.dropzoneHint}>PDF, JPG, PNG - maks 15 MB</span>
                {fileBaru ? (
                  <span className={styles.dropzoneFile}>{fileBaru.name}</span>
                ) : null}
              </label>
            </div>
          </div>
        </Dialog>
      )}

      {preview && (
        <div
          className={styles.previewOverlay}
          onClick={(event) => {
            if (event.target === event.currentTarget) setPreview(null);
          }}
        >
          <div className={styles.previewBox}>
            <div className={styles.previewHead}>
              <strong>{preview.judul}</strong>
              <button
                type="button"
                className={styles.previewClose}
                onClick={() => setPreview(null)}
                aria-label="Tutup preview"
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.previewBody}>
              {apakahGambar(preview.namaFile) ? (
                <img
                  src={urlFileIr(preview.urlFile)}
                  alt={preview.judul}
                  className={styles.previewImage}
                />
              ) : (
                <iframe
                  src={urlFileIr(preview.urlFile)}
                  title={preview.judul}
                  className={styles.previewFrame}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
