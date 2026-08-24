"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getStoredUser } from "@/lib/access-control";
import {
  epromApi,
  isEpromOwner,
  isEpromVendor,
  LABEL_STATUS_APPROVAL,
  LABEL_TIPE_CLOSING,
  urlFileEprom,
  type ClosingItem,
  type Project,
  type RingkasanPendingClosing,
  type TipeClosing,
} from "@/lib/eprom-api";
import engineerStyles from "../../engineer/engineer.module.css";

const ACCEPT_DOKUMEN =
  ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp,.dwg,.dxf,.zip,.rar";

const TAB_CLOSING: TipeClosing[] = [
  "as-build-drawing",
  "komisioning",
  "serah-terima",
  "masa-pemeliharaan-checklist",
  "ba-serah-terima",
];

export default function ClosingDetailPage() {
  const params = useParams<{ projectId: string }>();
  const searchParams = useSearchParams();
  const projectId = Number(params.projectId);
  const user = getStoredUser();
  const boleh = isEpromOwner(user);
  const vendorSaya = isEpromVendor(user);

  const tabRaw = searchParams.get("tab");
  const tipe = (TAB_CLOSING as string[]).includes(tabRaw ?? "")
    ? (tabRaw as TipeClosing)
    : "as-build-drawing";

  const [project, setProject] = useState<Project | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [ringkasan, setRingkasan] = useState<RingkasanPendingClosing | null>(null);

  useEffect(() => {
    epromApi.project
      .detail(projectId)
      .then(setProject)
      .catch((err: unknown) => setProjectError(err instanceof Error ? err.message : "Gagal memuat project"));
  }, [projectId]);

  useEffect(() => {
    function muat() {
      epromApi.closing.ringkasan(projectId).then(setRingkasan).catch(() => setRingkasan(null));
    }

    muat();
    window.addEventListener("eprom-closing-updated", muat);
    return () => window.removeEventListener("eprom-closing-updated", muat);
  }, [projectId]);

  const totalPending = ringkasan ? Object.values(ringkasan).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className={engineerStyles.page}>
      <Link href="/civil/project/closing" className={engineerStyles.backLink}>
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
        {totalPending > 0 && <span className={engineerStyles.badge}>{totalPending} pending</span>}
      </div>

      <p className={engineerStyles.tabHint}>
        {LABEL_TIPE_CLOSING[tipe]}
        <span> — pilih tahapan lain lewat menu Project Closing di sidebar.</span>
      </p>

      {projectError && <p className={engineerStyles.errorText}>{projectError}</p>}

      <ClosingTab tipe={tipe} projectId={projectId} boleh={boleh} vendorSaya={vendorSaya} />
    </div>
  );
}

function ClosingTab({
  tipe,
  projectId,
  boleh,
  vendorSaya,
}: {
  tipe: TipeClosing;
  projectId: number;
  boleh: boolean;
  vendorSaya: boolean;
}) {
  const [items, setItems] = useState<ClosingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fileBaru, setFileBaru] = useState<File[]>([]);
  const [inputKey, setInputKey] = useState(0);
  const [komentarInput, setKomentarInput] = useState<Record<number, string>>({});

  const muatItems = useCallback(() => {
    setLoading(true);
    epromApi.closing
      .daftar(tipe, projectId)
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat data"))
      .finally(() => setLoading(false));
  }, [tipe, projectId]);

  useEffect(() => {
    muatItems();
    setFileBaru([]);
    setInputKey((current) => current + 1);
  }, [muatItems]);

  async function tambahItem(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await epromApi.closing.buat(tipe, projectId, fileBaru);
      setFileBaru([]);
      setInputKey((current) => current + 1);
      muatItems();
      window.dispatchEvent(new Event("eprom-closing-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah data");
    } finally {
      setSubmitting(false);
    }
  }

  async function review(item: ClosingItem, status: "APPROVED" | "REJECTED") {
    const komentar = komentarInput[item.id];
    try {
      await epromApi.closing.review(tipe, item.id, status, komentar || undefined);
      muatItems();
      window.dispatchEvent(new Event("eprom-closing-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan review");
    }
  }

  async function hapus(item: ClosingItem) {
    if (!confirm(`Hapus ${LABEL_TIPE_CLOSING[tipe]} ini?`)) return;
    try {
      await epromApi.closing.hapus(tipe, item.id);
      muatItems();
      window.dispatchEvent(new Event("eprom-closing-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus data");
    }
  }

  return (
    <div className={engineerStyles.panel}>
      <h2 className={engineerStyles.sectionTitle}>{LABEL_TIPE_CLOSING[tipe]}</h2>

      {(boleh || vendorSaya) && (
        <form className={engineerStyles.formCard} onSubmit={tambahItem} style={{ marginBottom: 18 }}>
          <label>
            File
            <input
              type="file"
              key={inputKey}
              multiple
              accept={ACCEPT_DOKUMEN}
              onChange={(e) => setFileBaru(Array.from(e.target.files ?? []))}
            />
            {fileBaru.length > 0 && (
              <span>{fileBaru.length} file dipilih</span>
            )}
          </label>
          <button type="submit" className={engineerStyles.primaryButton} disabled={submitting}>
            {submitting ? "Mengunggah..." : "Unggah Baru"}
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
              <strong>#{item.id}</strong>
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
  );
}
