"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileText, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/civil-project/modal";
import { getStoredUser } from "@/lib/access-control";
import {
  epromApi,
  isEpromOwner,
  isEpromVendor,
  LABEL_STATUS_APPROVAL,
  urlFileEprom,
  type OpnameItem,
  type Project,
} from "@/lib/eprom-api";
import engineerStyles from "../../engineer/engineer.module.css";

const ACCEPT_DOKUMEN =
  ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp,.dwg,.dxf,.zip,.rar";

export default function FinancialDetailPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = Number(params.projectId);
  const user = getStoredUser();
  const boleh = isEpromOwner(user);
  const vendorSaya = isEpromVendor(user);

  const [project, setProject] = useState<Project | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [items, setItems] = useState<OpnameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progressPersen, setProgressPersen] = useState("");
  const [fileBaru, setFileBaru] = useState<File | null>(null);
  const [komentarInput, setKomentarInput] = useState<Record<number, string>>({});
  const [editItem, setEditItem] = useState<OpnameItem | null>(null);
  const [editPersen, setEditPersen] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  useEffect(() => {
    epromApi.project
      .detail(projectId)
      .then(setProject)
      .catch((err: unknown) => setProjectError(err instanceof Error ? err.message : "Gagal memuat project"));
  }, [projectId]);

  const muatItems = useCallback(() => {
    setLoading(true);
    epromApi.financial
      .daftar(projectId)
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat data"))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(() => {
    muatItems();
    setProgressPersen("");
    setFileBaru(null);
  }, [muatItems]);

  async function tambah(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await epromApi.financial.buat({ projectId, progressPersen: Number(progressPersen) }, fileBaru);
      setProgressPersen("");
      setFileBaru(null);
      muatItems();
      window.dispatchEvent(new Event("eprom-financial-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah data");
    } finally {
      setSubmitting(false);
    }
  }

  async function review(item: OpnameItem, status: "APPROVED" | "REJECTED") {
    const komentar = komentarInput[item.id];
    try {
      await epromApi.financial.review(item.id, status, komentar || undefined);
      muatItems();
      window.dispatchEvent(new Event("eprom-financial-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan review");
    }
  }

  function bukaEdit(item: OpnameItem) {
    setEditItem(item);
    setEditPersen(String(item.progressPersen));
    setEditError(null);
  }

  async function simpanEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editItem) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      await epromApi.financial.ubah(editItem.id, { progressPersen: Number(editPersen) });
      setEditItem(null);
      muatItems();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Gagal menyimpan perubahan");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function hapus(item: OpnameItem) {
    if (
      !confirm(
        `Yakin ingin menghapus Opname Pekerjaan (progress ${item.progressPersen}%)? Data yang dihapus tidak bisa dikembalikan.`,
      )
    )
      return;
    try {
      await epromApi.financial.hapus(item.id);
      muatItems();
      window.dispatchEvent(new Event("eprom-financial-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus data");
    }
  }

  return (
    <div className={engineerStyles.page}>
      <Link href="/civil/project/financial" className={engineerStyles.backLink}>
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

      <p className={engineerStyles.tabHint}>Opname Pekerjaan</p>

      {projectError && <p className={engineerStyles.errorText}>{projectError}</p>}

      <div className={engineerStyles.panel}>
        <h2 className={engineerStyles.sectionTitle}>Opname Pekerjaan</h2>

        {(boleh || vendorSaya) && (
          <form className={engineerStyles.formCard} onSubmit={tambah} style={{ marginBottom: 18 }}>
            <label>
              Progress (%)
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={progressPersen}
                onChange={(e) => setProgressPersen(e.target.value)}
                required
              />
            </label>
            <label>
              File Pendukung
              <input
                type="file"
                accept={ACCEPT_DOKUMEN}
                onChange={(e) => setFileBaru(e.target.files?.[0] ?? null)}
              />
            </label>
            <button type="submit" className={engineerStyles.primaryButton} disabled={submitting}>
              {submitting ? "Menyimpan..." : "Unggah Baru"}
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
                <strong>Progress {item.progressPersen}%</strong>
                <span className={`${engineerStyles.statusPill} ${engineerStyles[`status_${item.status}`]}`}>
                  {LABEL_STATUS_APPROVAL[item.status]}
                </span>
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

              {item.komentar && <div className={engineerStyles.komentarBox}>&ldquo;{item.komentar}&rdquo;</div>}

              {boleh && item.status === "PENDING" && (
                <div className={engineerStyles.inlineForm} style={{ marginTop: 10 }}>
                  <input
                    placeholder="Komentar (opsional)"
                    value={komentarInput[item.id] ?? ""}
                    onChange={(e) =>
                      setKomentarInput((cur) => ({ ...cur, [item.id]: e.target.value }))
                    }
                  />
                  <button
                    type="button"
                    className={engineerStyles.secondaryButton}
                    onClick={() => review(item, "APPROVED")}
                  >
                    Approve
                  </button>
                  <button
                    type="button"
                    className={engineerStyles.dangerButton}
                    onClick={() => review(item, "REJECTED")}
                  >
                    Reject
                  </button>
                </div>
              )}

              {item.status === "PENDING" && (boleh || vendorSaya) && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  <button
                    type="button"
                    className={engineerStyles.iconButton}
                    onClick={() => bukaEdit(item)}
                    title="Edit"
                  >
                    <Pencil size={13} />
                  </button>
                  <button
                    type="button"
                    className={engineerStyles.iconButtonDanger}
                    onClick={() => hapus(item)}
                    title="Hapus"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {editItem && (
        <Modal title="Edit Opname Pekerjaan" onClose={() => setEditItem(null)}>
          <form
            className={engineerStyles.formCard}
            onSubmit={simpanEdit}
            style={{ flexDirection: "column", alignItems: "stretch" }}
          >
            <label>
              Progress (%)
              <input
                type="number"
                min={0}
                max={100}
                step="0.01"
                value={editPersen}
                onChange={(e) => setEditPersen(e.target.value)}
                required
              />
            </label>
            <small style={{ color: "#5b7391" }}>File opname tidak dapat diganti lewat Edit.</small>
            {editError && <p className={engineerStyles.errorText}>{editError}</p>}
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className={engineerStyles.primaryButton} disabled={editSubmitting}>
                {editSubmitting ? "Menyimpan..." : "Simpan"}
              </button>
              <button type="button" className={engineerStyles.secondaryButton} onClick={() => setEditItem(null)}>
                Batal
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
