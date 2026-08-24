"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getStoredUser } from "@/lib/access-control";
import {
  epromApi,
  formatTanggal,
  isEpromOwner,
  isEpromVendor,
  LABEL_TIPE_DOKUMEN_SURAT,
  urlFileEprom,
  type DokumenSuratItem,
  type Project,
  type TipeDokumenSurat,
} from "@/lib/eprom-api";
import engineerStyles from "../../engineer/engineer.module.css";

const ACCEPT_DOKUMEN =
  ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp,.dwg,.dxf,.zip,.rar";

const TAB_KE_TIPE: Record<string, TipeDokumenSurat> = {
  "surat-teguran": "SURAT_TEGURAN",
  "surat-peringatan": "SURAT_PERINGATAN",
  "coaching-counseling": "COACHING_COUNSELING",
  memo: "MEMO",
};

export default function DokumenDetailPage() {
  const params = useParams<{ projectId: string }>();
  const searchParams = useSearchParams();
  const projectId = Number(params.projectId);
  const user = getStoredUser();
  const boleh = isEpromOwner(user);
  const vendorSaya = isEpromVendor(user);

  const tabRaw = searchParams.get("tab") ?? "surat-teguran";
  const tipe = TAB_KE_TIPE[tabRaw] ?? "SURAT_TEGURAN";

  const [project, setProject] = useState<Project | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [items, setItems] = useState<DokumenSuratItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [tanggal, setTanggal] = useState("");
  const [fileBaru, setFileBaru] = useState<File | null>(null);

  useEffect(() => {
    epromApi.project
      .detail(projectId)
      .then(setProject)
      .catch((err: unknown) => setProjectError(err instanceof Error ? err.message : "Gagal memuat project"));
  }, [projectId]);

  const muatItems = useCallback(() => {
    setLoading(true);
    epromApi.dokumen
      .daftar(tipe, projectId)
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat data"))
      .finally(() => setLoading(false));
  }, [tipe, projectId]);

  useEffect(() => {
    muatItems();
    setTanggal("");
    setFileBaru(null);
  }, [muatItems]);

  async function tambah(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await epromApi.dokumen.buat({ projectId, tipe, tanggal }, fileBaru);
      setTanggal("");
      setFileBaru(null);
      muatItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah data");
    } finally {
      setSubmitting(false);
    }
  }

  async function hapus(item: DokumenSuratItem) {
    if (!confirm(`Hapus ${LABEL_TIPE_DOKUMEN_SURAT[tipe]} ini?`)) return;
    try {
      await epromApi.dokumen.hapus(item.id);
      muatItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus data");
    }
  }

  return (
    <div className={engineerStyles.page}>
      <Link href="/civil/project/dokumen" className={engineerStyles.backLink}>
        <ArrowLeft size={16} /> Kembali ke daftar Project
      </Link>

      <div className={engineerStyles.detailHeader}>
        <div>
          <h1>{project?.namaProject ?? "Memuat..."}</h1>
          {project && (
            <p>
              Kontrak {project.kontrak.nomorKontrak} — {project.kontrak.vendor.namaVendor}
            </p>
          )}
        </div>
      </div>

      <p className={engineerStyles.tabHint}>
        {LABEL_TIPE_DOKUMEN_SURAT[tipe]}
        <span> — pilih tipe dokumen lain lewat menu Dokumen di sidebar.</span>
      </p>

      {projectError && <p className={engineerStyles.errorText}>{projectError}</p>}

      <div className={engineerStyles.panel}>
        <h2 className={engineerStyles.sectionTitle}>{LABEL_TIPE_DOKUMEN_SURAT[tipe]}</h2>

        {(boleh || vendorSaya) && (
          <form className={engineerStyles.formCard} onSubmit={tambah} style={{ marginBottom: 18 }}>
            <label>
              Tanggal
              <input type="date" value={tanggal} onChange={(e) => setTanggal(e.target.value)} required />
            </label>
            <label>
              File
              <input
                type="file"
                accept={ACCEPT_DOKUMEN}
                onChange={(e) => setFileBaru(e.target.files?.[0] ?? null)}
              />
            </label>
            <button type="submit" className={engineerStyles.primaryButton} disabled={submitting}>
              {submitting ? "Menyimpan..." : "Tambah Dokumen"}
            </button>
          </form>
        )}

        {error && <p className={engineerStyles.errorText}>{error}</p>}
        {loading && <p className={engineerStyles.emptyText}>Memuat...</p>}
        {!loading && items.length === 0 && <p className={engineerStyles.emptyText}>Belum ada data.</p>}

        <div className={engineerStyles.itemList}>
          {items.map((item) => (
            <div key={item.id} className={engineerStyles.itemRow}>
              <div className={engineerStyles.itemRowTop}>
                <strong>{formatTanggal(item.tanggal)}</strong>
              </div>

              <div className={engineerStyles.itemRowMeta}>
                {item.fileUrl ? (
                  <a href={urlFileEprom(item.fileUrl)} target="_blank" rel="noreferrer">
                    <FileText size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
                    Lihat File
                  </a>
                ) : (
                  <span>Belum ada file</span>
                )}
              </div>

              {(boleh || vendorSaya) && (
                <button
                  type="button"
                  className={engineerStyles.iconButtonDanger}
                  onClick={() => hapus(item)}
                  title="Hapus"
                  style={{ marginTop: 10 }}
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
