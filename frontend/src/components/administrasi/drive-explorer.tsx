'use client';

// ==================================================
// FILE: frontend/src/components/administrasi/drive-explorer.tsx
// FUNGSI: Folder & file ala Google Drive - dipakai bersama oleh
// card CSR dan Form Download. Kelola: Admin/Admin HC/Admin Comben/
// Section Head. Lihat & unduh: seluruh akun ber-akses card terkait.
// ==================================================

import {
  AlertCircle,
  ChevronRight,
  Download,
  File as FileIcon,
  Folder,
  FolderPlus,
  Inbox,
  Pencil,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Dialog } from '@/components/mcu/mcu-ui';
import { useStoredUser } from '@/lib/use-stored-user';
import {
  driveApi,
  urlFileDrive,
  type DriveFile,
  type DriveFolder,
  type ScopeDrive,
} from '@/lib/drive-api';
import { bolehKelolaPostingan } from '@/lib/postingan-api';
import styles from '@/app/hc/ir/ir.module.css';

function formatTanggal(iso: string) {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function DriveExplorer({ scope }: { scope: ScopeDrive }) {
  const user = useStoredUser();
  const boleh = bolehKelolaPostingan(user);

  const [path, setPath] = useState<DriveFolder[]>([]);
  const [folders, setFolders] = useState<DriveFolder[]>([]);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [memuat, setMemuat] = useState(true);
  const [galat, setGalat] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);

  const [formFolderTerbuka, setFormFolderTerbuka] = useState(false);
  const [namaFolderBaru, setNamaFolderBaru] = useState('');
  const [proses, setProses] = useState(false);
  const [fileBaru, setFileBaru] = useState<File | null>(null);

  const currentFolderId = path.length > 0 ? path[path.length - 1].id : null;

  const muat = useCallback(() => {
    setMemuat(true);
    setGalat(null);

    driveApi
      .isiFolder(scope, currentFolderId)
      .then((data) => {
        setFolders(data.folders);
        setFiles(data.files);
      })
      .catch((error) => setGalat((error as Error).message))
      .finally(() => setMemuat(false));
  }, [scope, currentFolderId]);

  useEffect(() => {
    muat();
  }, [muat]);

  async function buatFolder() {
    if (!namaFolderBaru.trim()) {
      setGalat('Nama folder wajib diisi');
      return;
    }

    setProses(true);
    setGalat(null);

    try {
      await driveApi.buatFolder(scope, namaFolderBaru.trim(), currentFolderId ?? undefined);
      setSukses('Folder berhasil dibuat');
      setFormFolderTerbuka(false);
      setNamaFolderBaru('');
      muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function ubahNamaFolder(folder: DriveFolder) {
    const namaBaru = prompt('Nama folder baru', folder.namaFolder);
    if (!namaBaru || !namaBaru.trim() || namaBaru.trim() === folder.namaFolder) return;

    try {
      await driveApi.ubahFolder(folder.id, namaBaru.trim());
      muat();
    } catch (error) {
      setGalat((error as Error).message);
    }
  }

  async function hapusFolder(folder: DriveFolder) {
    if (!confirm(`Hapus folder "${folder.namaFolder}" beserta isinya?`)) return;

    try {
      await driveApi.hapusFolder(folder.id);
      setSukses('Folder berhasil dihapus');
      muat();
    } catch (error) {
      setGalat((error as Error).message);
    }
  }

  async function unggahFile() {
    if (!currentFolderId || !fileBaru) return;

    setProses(true);
    setGalat(null);

    try {
      await driveApi.unggahFile(currentFolderId, fileBaru);
      setSukses('File berhasil diunggah');
      setFileBaru(null);
      muat();
    } catch (error) {
      setGalat((error as Error).message);
    } finally {
      setProses(false);
    }
  }

  async function hapusFile(file: DriveFile) {
    if (!confirm(`Hapus file "${file.namaFile}"?`)) return;

    try {
      await driveApi.hapusFile(file.id);
      setSukses('File berhasil dihapus');
      muat();
    } catch (error) {
      setGalat((error as Error).message);
    }
  }

  return (
    <div className={styles.formStack}>
      <div className={styles.driveBreadcrumb}>
        <button type="button" onClick={() => setPath([])}>
          Root
        </button>
        {path.map((folder, index) => (
          <span key={folder.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <ChevronRight size={13} />
            <button type="button" onClick={() => setPath(path.slice(0, index + 1))}>
              {folder.namaFolder}
            </button>
          </span>
        ))}
      </div>

      <div className={styles.driveToolbar}>
        {boleh && (
          <button
            type="button"
            className={`${styles.btn} ${styles.btnGhost} ${styles.btnSm}`}
            onClick={() => setFormFolderTerbuka(true)}
          >
            <FolderPlus size={14} />
            Folder Baru
          </button>
        )}

        {boleh && currentFolderId && (
          <label className={`${styles.btn} ${styles.btnSm}`} style={{ cursor: 'pointer' }}>
            <UploadCloud size={14} />
            Upload File
            <input
              type="file"
              hidden
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setFileBaru(file);
                }
                event.target.value = '';
              }}
            />
          </label>
        )}
      </div>

      {fileBaru && (
        <div className={`${styles.alert} ${styles.alertSuccess}`}>
          <UploadCloud size={16} />
          <span>{fileBaru.name} siap diunggah.</span>
          <button
            type="button"
            className={`${styles.btn} ${styles.btnSm}`}
            onClick={unggahFile}
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
      {sukses && (
        <div className={`${styles.alert} ${styles.alertSuccess}`}>
          <span>{sukses}</span>
        </div>
      )}

      {memuat ? (
        <div className={styles.loadingState}>Memuat...</div>
      ) : folders.length === 0 && files.length === 0 ? (
        <div className={styles.emptyState}>
          <Inbox size={30} />
          <strong>Folder ini masih kosong</strong>
          <p>
            {boleh
              ? currentFolderId
                ? 'Upload file atau buat sub-folder baru di sini.'
                : 'Buat folder baru untuk mulai menyimpan dokumen.'
              : 'Belum ada dokumen di sini.'}
          </p>
        </div>
      ) : (
        <div className={styles.docGrid}>
          {folders.map((folder) => (
            <div key={folder.id} className={styles.docCard}>
              <button
                type="button"
                className={styles.docTop}
                style={{ width: '100%', border: 0, background: 'none', cursor: 'pointer', padding: 0 }}
                onClick={() => setPath([...path, folder])}
              >
                <span className={`${styles.docIcon} ${styles.folderIcon}`}>
                  <Folder size={19} />
                </span>
                <div className={styles.docTitle}>
                  <strong>{folder.namaFolder}</strong>
                  <small>Folder</small>
                </div>
              </button>

              {boleh && (
                <div className={styles.docFooter}>
                  <span className={styles.docDate} />
                  <div className={styles.docActions}>
                    <button
                      type="button"
                      className={styles.iconBtnNetral}
                      onClick={() => ubahNamaFolder(folder)}
                      aria-label="Ganti nama folder"
                    >
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => hapusFolder(folder)}
                      aria-label="Hapus folder"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {files.map((file) => (
            <div key={file.id} className={styles.docCard}>
              <div className={styles.docTop}>
                <span className={styles.docIcon}>
                  <FileIcon size={19} />
                </span>
                <div className={styles.docTitle}>
                  <strong>{file.namaFile}</strong>
                  <small>
                    {file.uploadedBy.name}
                    {file.uploadedBy.nrp ? ` (${file.uploadedBy.nrp})` : ''}
                  </small>
                </div>
              </div>

              <div className={styles.docFooter}>
                <span className={styles.docDate}>{formatTanggal(file.uploadedAt)}</span>

                <div className={styles.docActions}>
                  <a
                    href={urlFileDrive(file.urlFile)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.iconBtnNetral}
                    aria-label="Unduh file"
                  >
                    <Download size={14} />
                  </a>

                  {boleh && (
                    <button
                      type="button"
                      className={styles.iconBtn}
                      onClick={() => hapusFile(file)}
                      aria-label="Hapus file"
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

      {formFolderTerbuka && (
        <Dialog
          judul="Buat Folder Baru"
          onTutup={() => setFormFolderTerbuka(false)}
          aksi={
            <>
              <button
                type="button"
                className={`${styles.btn} ${styles.btnGhost}`}
                onClick={() => setFormFolderTerbuka(false)}
                disabled={proses}
              >
                Batal
              </button>
              <button
                type="button"
                className={styles.btn}
                onClick={buatFolder}
                disabled={proses}
              >
                {proses ? 'Menyimpan...' : 'Simpan'}
              </button>
            </>
          }
        >
          <div className={styles.formField}>
            <label>Nama Folder</label>
            <input
              className={styles.formInput}
              value={namaFolderBaru}
              onChange={(event) => setNamaFolderBaru(event.target.value)}
              autoFocus
            />
          </div>
        </Dialog>
      )}
    </div>
  );
}
