"use client";

import { useEffect, useState } from "react";
import { Download, File, Folder, FolderDown, FolderPlus, Pencil, Trash2, Upload } from "lucide-react";
import { getStoredUser } from "@/lib/access-control";
import {
  epromApi,
  formatTanggal,
  isEpromOwner,
  type DocumentFolder,
  type FileUpload,
  type ScopeDocumentFolder,
} from "@/lib/eprom-api";
import styles from "./folder-explorer.module.css";

type FolderExplorerProps = {
  scope: ScopeDocumentFolder;
  tenderId?: number;
  vendorId?: number;
};

export function FolderExplorer({ scope, tenderId, vendorId }: FolderExplorerProps) {
  const boleh = isEpromOwner(getStoredUser());
  const [path, setPath] = useState<DocumentFolder[]>([]);
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [selectedFileIds, setSelectedFileIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [namaFolderBaru, setNamaFolderBaru] = useState("");
  const [showFolderForm, setShowFolderForm] = useState(false);
  const [downloadingSemua, setDownloadingSemua] = useState(false);

  const currentFolderId = path.length > 0 ? path[path.length - 1].id : null;

  function muatUlang() {
    setLoading(true);
    epromApi.documents
      .isiFolder({ scope, tenderId, vendorId, parentFolderId: currentFolderId })
      .then((data) => {
        setFolders(data.folders);
        setFiles(data.files);
        setSelectedFileIds([]);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat folder"))
      .finally(() => setLoading(false));
  }

  useEffect(muatUlang, [scope, tenderId, vendorId, currentFolderId]);

  async function buatFolder() {
    if (!namaFolderBaru.trim()) return;
    setError(null);
    try {
      await epromApi.documents.buatFolder({
        scope,
        tenderId,
        vendorId,
        namaFolder: namaFolderBaru.trim(),
        parentFolderId: currentFolderId ?? undefined,
      });
      setNamaFolderBaru("");
      setShowFolderForm(false);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat folder");
    }
  }

  async function unggahFile(file: File) {
    if (!currentFolderId) {
      setError("Buka atau buat folder terlebih dahulu sebelum mengunggah file");
      return;
    }

    setError(null);
    try {
      await epromApi.documents.unggahFile(currentFolderId, file);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah file");
    }
  }

  async function unduhTerpilih() {
    if (selectedFileIds.length === 0) return;
    try {
      await epromApi.documents.unduhSemua(selectedFileIds);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunduh file");
    }
  }

  async function unduhSemuaDokumen() {
    setDownloadingSemua(true);
    setError(null);
    try {
      await epromApi.documents.unduhSemuaDokumen({ scope, tenderId, vendorId });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunduh semua dokumen");
    } finally {
      setDownloadingSemua(false);
    }
  }

  async function ubahNamaFolder(folder: DocumentFolder) {
    const namaBaru = prompt("Nama folder baru", folder.namaFolder);
    if (!namaBaru || !namaBaru.trim() || namaBaru.trim() === folder.namaFolder) return;
    try {
      await epromApi.documents.ubahFolder(folder.id, namaBaru.trim());
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah nama folder");
    }
  }

  async function hapusFolder(folder: DocumentFolder) {
    if (!confirm(`Hapus folder "${folder.namaFolder}" beserta isinya?`)) return;
    try {
      await epromApi.documents.hapusFolder(folder.id);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus folder");
    }
  }

  async function hapusFile(file: FileUpload) {
    if (!confirm(`Hapus file "${file.namaFile}"?`)) return;
    try {
      await epromApi.documents.hapusFile(file.id);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus file");
    }
  }

  return (
    <div className={styles.explorer}>
      <div className={styles.breadcrumb}>
        <button type="button" onClick={() => setPath([])} className={styles.crumb}>
          Root
        </button>
        {path.map((folder, index) => (
          <span key={folder.id}>
            <span className={styles.crumbSep}>/</span>
            <button
              type="button"
              className={styles.crumb}
              onClick={() => setPath(path.slice(0, index + 1))}
            >
              {folder.namaFolder}
            </button>
          </span>
        ))}
      </div>

      <div className={styles.toolbar}>
        <button type="button" className={styles.toolButton} onClick={() => setShowFolderForm((v) => !v)}>
          <FolderPlus size={15} /> Folder Baru
        </button>

        <label className={styles.toolButton}>
          <Upload size={15} /> Upload File
          <input
            type="file"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void unggahFile(file);
              e.target.value = "";
            }}
          />
        </label>

        <button
          type="button"
          className={styles.toolButton}
          onClick={unduhTerpilih}
          disabled={selectedFileIds.length === 0}
        >
          <Download size={15} /> Download {selectedFileIds.length > 0 ? `(${selectedFileIds.length})` : "All"}
        </button>

        <button
          type="button"
          className={styles.toolButton}
          onClick={unduhSemuaDokumen}
          disabled={downloadingSemua}
          title="Unduh semua file di seluruh folder sekaligus (zip, struktur folder dipertahankan)"
        >
          <FolderDown size={15} /> {downloadingSemua ? "Menyiapkan..." : "Download Semua Dokumen"}
        </button>
      </div>

      {showFolderForm && (
        <div className={styles.folderForm}>
          <input
            value={namaFolderBaru}
            onChange={(e) => setNamaFolderBaru(e.target.value)}
            placeholder="Nama folder"
          />
          <button type="button" className={styles.toolButton} onClick={buatFolder}>
            Simpan
          </button>
        </div>
      )}

      {error && <p className={styles.errorText}>{error}</p>}
      {loading && <p className={styles.emptyText}>Memuat...</p>}
      {!loading && folders.length === 0 && files.length === 0 && (
        <p className={styles.emptyText}>Folder ini masih kosong.</p>
      )}

      <div className={styles.grid}>
        {folders.map((folder) => (
          <div key={folder.id} className={`${styles.itemCard} ${styles.fileCard}`}>
            <button
              type="button"
              className={styles.fileButton}
              onDoubleClick={() => setPath([...path, folder])}
              onClick={() => setPath([...path, folder])}
            >
              <Folder size={26} />
              <span>{folder.namaFolder}</span>
            </button>
            {boleh && (
              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.downloadButton}
                  onClick={() => ubahNamaFolder(folder)}
                  title="Ganti nama folder"
                >
                  <Pencil size={13} />
                </button>
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => hapusFolder(folder)}
                  title="Hapus folder"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )}
          </div>
        ))}

        {files.map((file) => (
          <div key={file.id} className={`${styles.itemCard} ${styles.fileCard}`}>
            <label className={styles.fileCheckLabel}>
              <input
                type="checkbox"
                checked={selectedFileIds.includes(file.id)}
                onChange={(e) =>
                  setSelectedFileIds((cur) =>
                    e.target.checked ? [...cur, file.id] : cur.filter((id) => id !== file.id),
                  )
                }
              />
            </label>
            <button
              type="button"
              className={styles.fileButton}
              onClick={() => epromApi.documents.previewSatu(file.id)}
              title="Preview file di tab baru"
            >
              <File size={26} />
              <span>{file.namaFile}</span>
              <small>{formatTanggal(file.uploadedAt)}</small>
            </button>
            <div className={styles.actionRow}>
              <button
                type="button"
                className={styles.downloadButton}
                onClick={() => epromApi.documents.unduhSatu(file.id)}
                title="Download file"
              >
                <Download size={13} />
              </button>
              {boleh && (
                <button
                  type="button"
                  className={styles.deleteButton}
                  onClick={() => hapusFile(file)}
                  title="Hapus file"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
