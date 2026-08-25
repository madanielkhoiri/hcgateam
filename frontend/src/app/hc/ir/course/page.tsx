'use client';

// ==================================================
// FILE: frontend/src/app/hc/ir/course/page.tsx
// FUNGSI: IR Course - Admin/Admin HC/Section Head mengunggah video
// pelatihan, akun lain menonton (status tontonan tercatat per akun).
// ==================================================

import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  Inbox,
  PlayCircle,
  Plus,
  Trash2,
  UploadCloud,
  Users,
  Video,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Dialog } from '@/components/mcu/mcu-ui';
import { getStoredUser } from '@/lib/access-control';
import {
  irApi,
  isIrPengelola,
  urlFileIr,
  type IrCoursePenonton,
  type IrCourseVideo,
} from '@/lib/ir-api';
import styles from '../ir.module.css';

function formatTanggalJam(iso: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export default function IrCoursePage() {
  const user = getStoredUser();
  const boleh = isIrPengelola(user);

  const [daftar, setDaftar] = useState<IrCourseVideo[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);
  const [proses, setProses] = useState(false);

  const [formTerbuka, setFormTerbuka] = useState(false);
  const [judulBaru, setJudulBaru] = useState('');
  const [deskripsiBaru, setDeskripsiBaru] = useState('');
  const [fileBaru, setFileBaru] = useState<File | null>(null);

  const [videoDitonton, setVideoDitonton] = useState<IrCourseVideo | null>(null);
  const [penonton, setPenonton] = useState<IrCoursePenonton | null>(null);

  const muat = useCallback(async () => {
    setMemuat(true);
    setGalat(null);

    try {
      setDaftar(await irApi.course.daftar());
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
    setFileBaru(null);
    setGalat(null);
    setFormTerbuka(true);
  }

  async function unggah() {
    if (!judulBaru.trim() || !fileBaru) {
      setGalat('Judul dan file video wajib diisi');
      return;
    }

    setProses(true);
    setGalat(null);

    try {
      await irApi.course.unggah(
        judulBaru.trim(),
        deskripsiBaru.trim() || undefined,
        fileBaru,
      );
      setSukses('Video berhasil diunggah');
      setFormTerbuka(false);
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function hapus(item: IrCourseVideo) {
    if (!confirm(`Hapus video "${item.judul}"?`)) return;

    try {
      await irApi.course.hapus(item.id);
      setSukses('Video berhasil dihapus');
      await muat();
    } catch (error) {
      setGalat((error as Error).message);
    }
  }

  async function buka(item: IrCourseVideo) {
    setVideoDitonton(item);

    if (!item.sudahDitonton) {
      try {
        await irApi.course.tandaiDitonton(item.id);
        await muat();
      } catch {
        // Gagal mencatat tontonan tidak menghalangi karyawan menonton videonya.
      }
    }
  }

  async function bukaPenonton(item: IrCourseVideo) {
    try {
      setPenonton(await irApi.course.penonton(item.id));
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
        <strong>IR Course</strong>
      </div>

      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>
          <span className={styles.pageIcon}>
            <Video size={26} />
          </span>

          <div>
            <h1>IR Course</h1>
            <p>Video pelatihan Industrial Relations.</p>
          </div>
        </div>

        <div className={styles.headActions}>
          {boleh && (
            <button type="button" className={styles.btn} onClick={bukaForm}>
              <Plus size={15} />
              Upload Video
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

      {memuat ? (
        <div className={styles.loadingState}>Memuat video...</div>
      ) : daftar.length === 0 ? (
        <div className={styles.emptyState}>
          <Inbox size={30} />
          <strong>Belum ada video</strong>
          <p>Video IR Course yang diunggah akan muncul di sini.</p>
        </div>
      ) : (
        <div className={styles.videoGrid}>
          {daftar.map((item) => (
            <div key={item.id} className={styles.videoCard}>
              <div className={styles.videoThumb}>
                <PlayCircle size={34} />
              </div>

              <h2 className={styles.videoTitle}>{item.judul}</h2>
              {item.deskripsi ? (
                <p className={styles.videoDesc}>{item.deskripsi}</p>
              ) : null}

              <span className={styles.videoMeta}>
                Diunggah {item.uploadedBy.name}
                {item.uploadedBy.nrp ? ` (${item.uploadedBy.nrp})` : ''} - {item.totalDitonton}x ditonton
              </span>

              {item.sudahDitonton && (
                <span className={styles.watchedTag}>
                  <CheckCircle2 size={12} />
                  Sudah ditonton
                </span>
              )}

              <div className={styles.videoActions}>
                <button
                  type="button"
                  className={`${styles.btn} ${styles.btnSm}`}
                  onClick={() => buka(item)}
                >
                  <PlayCircle size={13} />
                  Tonton
                </button>

                {boleh && (
                  <>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
                      onClick={() => bukaPenonton(item)}
                    >
                      <Users size={13} />
                      Penonton
                    </button>
                    <button
                      type="button"
                      className={`${styles.btn} ${styles.btnDanger} ${styles.btnSm}`}
                      onClick={() => hapus(item)}
                    >
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {formTerbuka && (
        <Dialog
          judul="Upload Video IR Course"
          keterangan="Format MP4/WEBM/MOV, maksimal 300 MB."
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
              <label>Judul Video</label>
              <input
                className={styles.formInput}
                value={judulBaru}
                onChange={(event) => setJudulBaru(event.target.value)}
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
              <label>File Video</label>
              <label className={styles.dropzone}>
                <input
                  type="file"
                  accept=".mp4,.webm,.mov"
                  onChange={(event) =>
                    setFileBaru(event.target.files?.[0] ?? null)
                  }
                />
                <UploadCloud size={26} className={styles.dropzoneIcon} />
                <span className={styles.dropzoneText}>Klik untuk pilih video</span>
                <span className={styles.dropzoneHint}>MP4, WEBM, MOV - maks 300 MB</span>
                {fileBaru ? (
                  <span className={styles.dropzoneFile}>{fileBaru.name}</span>
                ) : null}
              </label>
            </div>
          </div>
        </Dialog>
      )}

      {videoDitonton && (
        <div
          className={styles.previewOverlay}
          onClick={(event) => {
            if (event.target === event.currentTarget) setVideoDitonton(null);
          }}
        >
          <div className={styles.previewBox}>
            <div className={styles.previewHead}>
              <strong>{videoDitonton.judul}</strong>
              <button
                type="button"
                className={styles.previewClose}
                onClick={() => setVideoDitonton(null)}
                aria-label="Tutup video"
              >
                <X size={16} />
              </button>
            </div>

            <div className={styles.previewBody}>
              <video
                src={urlFileIr(videoDitonton.urlVideo)}
                controls
                autoPlay
                className={styles.previewVideo}
              />
            </div>
          </div>
        </div>
      )}

      {penonton && (
        <Dialog
          judul={`Penonton: ${penonton.judul}`}
          keterangan={`Total ${penonton.tontonan.length} akun sudah menonton.`}
          onTutup={() => setPenonton(null)}
        >
          {penonton.tontonan.length === 0 ? (
            <div className={styles.emptyState}>
              <Eye size={26} />
              <strong>Belum ada penonton</strong>
              <p>Belum ada akun yang menonton video ini.</p>
            </div>
          ) : (
            <div className={styles.simpleTableWrap}>
              <table className={styles.simpleTable}>
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>NRP</th>
                    <th>Ditonton Pada</th>
                  </tr>
                </thead>
                <tbody>
                  {penonton.tontonan.map((item, index) => (
                    <tr key={index}>
                      <td>{item.user.name}</td>
                      <td>{item.user.nrp ?? '-'}</td>
                      <td>{formatTanggalJam(item.ditontonPada)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
