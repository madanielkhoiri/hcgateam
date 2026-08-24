"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { getStoredUser } from "@/lib/access-control";
import {
  epromApi,
  isEpromOwner,
  isEpromVendor,
  LABEL_STATUS_APPROVAL,
  LABEL_TIPE_ENGINEER,
  urlFileEprom,
  type EngineerItem,
  type Project,
  type RingkasanPendingEngineer,
  type TipeEngineer,
} from "@/lib/eprom-api";
import styles from "../engineer.module.css";

const PAKAI_NAMA: Record<TipeEngineer, string | null> = {
  "shop-drawing": "Nama Pekerjaan",
  "material-approval": "Nama Material",
  "metode-pekerjaan": "Nama Metode",
  "sertifikasi-pekerjaan": null,
  "peralatan-list": null,
  "komisioning-alat-berat": null,
};

function namaItem(item: EngineerItem): string | null {
  return item.namaPekerjaan ?? item.namaMaterial ?? item.namaMetode ?? null;
}

function namaFileTampil(item: EngineerItem): string {
  const original = item.originalFileName ?? "Lihat File";
  return item.latestApproval
    ? original.replace(/\.pdf$/i, "-signed.pdf")
    : original;
}

function namaTandaTangan(filename: string): string {
  return filename
    .replace(/\.(?:png|jpe?g)$/i, "")
    .replace(/^ttd[-_\s]*/i, "")
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export default function EngineerDetailPage() {
  const params = useParams<{ projectId: string }>();
  const searchParams = useSearchParams();
  const projectId = Number(params.projectId);
  const user = getStoredUser();
  const boleh = isEpromOwner(user);
  const vendorSaya = isEpromVendor(user);

  const tab =
    (searchParams.get("tab") as TipeEngineer | null) ?? "shop-drawing";

  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<EngineerItem[]>([]);
  const [ringkasan, setRingkasan] = useState<RingkasanPendingEngineer | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [namaBaru, setNamaBaru] = useState("");
  const [fileBaru, setFileBaru] = useState<File | null>(null);
  const [rejectItem, setRejectItem] = useState<EngineerItem | null>(null);
  const [alasanReject, setAlasanReject] = useState("");
  const [rejecting, setRejecting] = useState(false);

  function muatProject() {
    epromApi.project
      .detail(projectId)
      .then(setProject)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Gagal memuat project"),
      );
  }

  function muatItems() {
    setLoading(true);
    epromApi.engineer
      .daftar(tab, projectId)
      .then(setItems)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Gagal memuat data"),
      )
      .finally(() => setLoading(false));

    epromApi.engineer
      .ringkasan(projectId)
      .then((data) => {
        setRingkasan(data);
        window.dispatchEvent(new Event("eprom-engineer-updated"));
      })
      .catch(() => setRingkasan(null));
  }

  useEffect(muatProject, [projectId]);
  useEffect(() => {
    // Data harus dimuat ulang saat tab Engineer berubah.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    muatItems();
    setNamaBaru("");
    setFileBaru(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, projectId]);

  async function tambahItem(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await epromApi.engineer.buat(
        tab,
        projectId,
        namaBaru || undefined,
        fileBaru,
      );
      setNamaBaru("");
      setFileBaru(null);
      muatItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah data");
    } finally {
      setSubmitting(false);
    }
  }

  async function reject() {
    if (!rejectItem || !alasanReject.trim()) return;
    setRejecting(true);
    setError(null);
    try {
      await epromApi.engineer.reject(tab, rejectItem.id, alasanReject.trim());
      setRejectItem(null);
      setAlasanReject("");
      muatItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan review");
    } finally {
      setRejecting(false);
    }
  }

  async function hapus(item: EngineerItem) {
    if (!confirm(`Hapus ${LABEL_TIPE_ENGINEER[tab]} ini?`)) return;
    try {
      await epromApi.engineer.hapus(tab, item.id);
      muatItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus data");
    }
  }

  const namaField = PAKAI_NAMA[tab];
  const totalPending = ringkasan
    ? Object.values(ringkasan).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <div className={styles.page}>
      <Link href="/civil/project/engineer" className={styles.backLink}>
        <ArrowLeft size={16} /> Kembali ke daftar Project
      </Link>

      <div className={styles.detailHeader}>
        <div>
          <h1>{project?.namaProject ?? "Memuat..."}</h1>
          {project && (
            <p>
              Kontrak {project.kontrak.nomorKontrak} —{" "}
              {project.kontrak.vendor.namaVendor}
            </p>
          )}
        </div>
        {totalPending > 0 && (
          <span className={styles.badge}>{totalPending} pending</span>
        )}
      </div>

      <p className={styles.tabHint}>
        {LABEL_TIPE_ENGINEER[tab]}
        <span> — pilih tahapan lain lewat menu Engineer di sidebar.</span>
      </p>

      {error && <p className={styles.errorText}>{error}</p>}

      <div className={styles.panel}>
        <h2 className={styles.sectionTitle}>{LABEL_TIPE_ENGINEER[tab]}</h2>

        {(boleh || vendorSaya) && (
          <form
            className={styles.formCard}
            onSubmit={tambahItem}
            style={{ marginBottom: 18 }}
          >
            {namaField && (
              <label>
                {namaField}
                <input
                  value={namaBaru}
                  onChange={(e) => setNamaBaru(e.target.value)}
                  required
                />
              </label>
            )}
            <label>
              File
              <input
                type="file"
                accept={
                  tab === "komisioning-alat-berat"
                    ? ".pdf"
                    : ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp,.dwg,.dxf,.zip,.rar"
                }
                onChange={(e) => setFileBaru(e.target.files?.[0] ?? null)}
                required={tab === "komisioning-alat-berat"}
              />
            </label>
            <button
              type="submit"
              className={styles.primaryButton}
              disabled={submitting}
            >
              {submitting ? "Mengunggah..." : "Unggah Baru"}
            </button>
          </form>
        )}

        {loading && <p className={styles.emptyText}>Memuat...</p>}
        {!loading && items.length === 0 && (
          <p className={styles.emptyText}>Belum ada data.</p>
        )}

        <div className={styles.itemList}>
          {items.map((item) => (
            <div key={item.id} className={styles.itemRow}>
              <div className={styles.itemRowTop}>
                <strong>{namaItem(item) ?? `#${item.id}`}</strong>
                <span
                  className={`${styles.statusPill} ${styles[`status_${item.status}`]}`}
                >
                  {LABEL_STATUS_APPROVAL[item.status]}
                </span>
              </div>

              <div className={styles.itemRowMeta}>
                {(item.effectiveFileUrl ?? item.fileUrl) ? (
                  <a
                    href={urlFileEprom(item.effectiveFileUrl ?? item.fileUrl!)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText
                      size={12}
                      style={{ verticalAlign: "middle", marginRight: 4 }}
                    />
                    {namaFileTampil(item)}
                  </a>
                ) : (
                  <span>Belum ada file</span>
                )}
              </div>

              {item.komentar && (
                <div className={styles.komentarBox}>
                  &ldquo;{item.komentar}&rdquo;
                </div>
              )}

              {item.latestApproval && (
                <div className={styles.approvalAudit}>
                  Approved by: {item.latestApproval.approvedBy.name}
                  <span>
                    Signature:{" "}
                    {namaTandaTangan(item.latestApproval.signatureFile)}
                  </span>
                </div>
              )}

              {boleh && item.status === "PENDING" && (
                <div className={styles.inlineForm} style={{ marginTop: 10 }}>
                  {item.fileUrl?.toLowerCase().endsWith(".pdf") ? (
                    <Link
                      className={styles.secondaryButton}
                      href={`/civil/project/engineer/${projectId}/approval/${tab}/${item.id}`}
                    >
                      Approve
                    </Link>
                  ) : (
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      disabled
                    >
                      Approve
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.dangerButton}
                    onClick={() => {
                      setRejectItem(item);
                      setAlasanReject("");
                    }}
                  >
                    Reject
                  </button>
                </div>
              )}

              {boleh &&
                item.status === "PENDING" &&
                !item.fileUrl?.toLowerCase().endsWith(".pdf") && (
                  <p className={styles.signingHint}>
                    Tanda tangan hanya dapat ditempatkan pada dokumen PDF.
                  </p>
                )}

              {item.status === "PENDING" && (boleh || vendorSaya) && (
                <button
                  type="button"
                  className={styles.iconButtonDanger}
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

      {rejectItem && (
        <div className={styles.modalBackdrop} role="presentation">
          <div
            className={styles.rejectDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reject-title"
          >
            <h2 id="reject-title">Alasan Penolakan</h2>
            <p>Jelaskan alasan dokumen ini ditolak. Alasan wajib diisi.</p>
            <textarea
              autoFocus
              rows={5}
              value={alasanReject}
              onChange={(event) => setAlasanReject(event.target.value)}
              placeholder="Masukkan alasan penolakan"
            />
            <div className={styles.dialogActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setRejectItem(null)}
                disabled={rejecting}
              >
                Batal
              </button>
              <button
                type="button"
                className={styles.dangerButton}
                onClick={reject}
                disabled={rejecting || !alasanReject.trim()}
              >
                {rejecting ? "Menyimpan..." : "Reject Dokumen"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
