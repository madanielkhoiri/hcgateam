"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, Pencil, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Modal } from "@/components/civil-project/modal";
import { DailyReportForm, InspectionForm } from "@/components/eprom/EpromStructuredReportForm";
import { ConstructionChecklistPopup, KtaTtaPopup } from "@/components/eprom/EpromSafetyForms";
import { getStoredUser } from "@/lib/access-control";
import {
  epromApi,
  formatBulanLabel,
  formatTanggal,
  formatWaktuWITA,
  isEpromOwner,
  isEpromVendor,
  LABEL_STATUS_APPROVAL,
  LABEL_STATUS_DEVIASI,
  LABEL_TIPE_KONSTRUKSI,
  LABEL_TIPE_PROGRESS,
  urlFileEprom,
  type JamUploadInfo,
  type JsaDenganSosialisasi,
  type KonstruksiItem,
  type PerformaBulanIni,
  type Project,
  type ProgressItem,
  type RingkasanPendingKonstruksi,
  type TipeKonstruksi,
  type TipeProgress,
} from "@/lib/eprom-api";
import engineerStyles from "../../engineer/engineer.module.css";
import styles from "../konstruksi.module.css";

function waktuWitaDiLuarJadwal(
  nilai: string,
  jamBuka: string | null,
  jamTutup: string | null,
): boolean {
  if (!jamBuka || !jamTutup) return false;
  const waktu = new Date(nilai);
  if (Number.isNaN(waktu.getTime())) return false;
  const wita = new Date(waktu.getTime() + 8 * 60 * 60 * 1000);
  const menit = wita.getUTCHours() * 60 + wita.getUTCMinutes();
  const keMenit = (jam: string) => {
    const [hour, minute] = jam.split(":").map(Number);
    return hour * 60 + minute;
  };
  return menit < keMenit(jamBuka) || menit >= keMenit(jamTutup);
}

const ACCEPT_DOKUMEN =
  ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp,.dwg,.dxf,.zip,.rar";

const TAB_APPROVAL: TipeKonstruksi[] = ["checklist-tahapan", "ibpr", "jsa"];
const TAB_PERFORMA: ("tta" | "kta")[] = ["tta", "kta"];
const TAB_PROGRESS_LAINNYA: TipeProgress[] = [
  "inspeksi-area",
  "inspeksi-peralatan",
  "progress-harian",
  "progress-mingguan",
  "progress-bulanan",
];

const PAKAI_NAMA: Partial<Record<TipeKonstruksi, string>> = {
  "checklist-tahapan": "Nama Tahap",
  jsa: "Nama Pekerjaan",
};

type TabKonstruksi = TipeKonstruksi | TipeProgress | "sosialisasi-jsa";

function labelTab(tab: TabKonstruksi): string {
  if (tab === "sosialisasi-jsa") return "Sosialisasi JSA";
  if ((TAB_APPROVAL as string[]).includes(tab)) return LABEL_TIPE_KONSTRUKSI[tab as TipeKonstruksi];
  return LABEL_TIPE_PROGRESS[tab as TipeProgress];
}

function labelEkstra(tipe: TipeProgress, item: ProgressItem): string {
  if (tipe === "progress-harian") return formatTanggal(item.tanggal);
  if (tipe === "progress-mingguan") return `Minggu ke-${item.mingguKe ?? "-"}`;
  if (tipe === "progress-bulanan") return formatBulanLabel(item.bulan);
  return LABEL_TIPE_PROGRESS[tipe];
}

function namaProgress(tipe: TipeProgress, item: ProgressItem): string {
  const ekstra = tipe === "progress-harian" || tipe === "progress-mingguan" || tipe === "progress-bulanan"
    ? labelEkstra(tipe, item)
    : item.bulan
      ? formatBulanLabel(item.bulan)
      : "";
  return ekstra ? `${LABEL_TIPE_PROGRESS[tipe]} (${ekstra})` : LABEL_TIPE_PROGRESS[tipe];
}

export default function KonstruksiDetailPage() {
  const params = useParams<{ projectId: string }>();
  const searchParams = useSearchParams();
  const projectId = Number(params.projectId);
  const user = getStoredUser();
  const boleh = isEpromOwner(user);
  const vendorSaya = isEpromVendor(user);

  const tab = searchParams.get("tab") as TabKonstruksi | null;

  const [project, setProject] = useState<Project | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [ringkasan, setRingkasan] = useState<RingkasanPendingKonstruksi | null>(null);

  useEffect(() => {
    epromApi.project
      .detail(projectId)
      .then(setProject)
      .catch((err: unknown) => setProjectError(err instanceof Error ? err.message : "Gagal memuat project"));
  }, [projectId]);

  useEffect(() => {
    function muat() {
      epromApi.konstruksi.ringkasan(projectId).then(setRingkasan).catch(() => setRingkasan(null));
    }

    muat();
    window.addEventListener("eprom-konstruksi-updated", muat);
    return () => window.removeEventListener("eprom-konstruksi-updated", muat);
  }, [projectId]);

  const totalPending = ringkasan ? Object.values(ringkasan).reduce((a, b) => a + b, 0) : 0;

  return (
    <div className={engineerStyles.page}>
      <Link href="/civil/project/konstruksi" className={engineerStyles.backLink}>
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
        {tab ? labelTab(tab) : "Pilih menu Konstruksi"}
        <span>{tab ? " — pilih tahapan lain lewat menu Konstruksi di sidebar." : " — pilih salah satu menu di sidebar untuk mulai mengelola proyek."}</span>
      </p>

      {projectError && <p className={engineerStyles.errorText}>{projectError}</p>}

      {tab && (TAB_APPROVAL as string[]).includes(tab) && (
        <ApprovalTab tipe={tab as TipeKonstruksi} projectId={projectId} boleh={boleh} vendorSaya={vendorSaya} project={project} />
      )}
      {tab && (TAB_PERFORMA as string[]).includes(tab) && (
        <PerformaTab tipe={tab as "tta" | "kta"} projectId={projectId} boleh={boleh} vendorSaya={vendorSaya} project={project} />
      )}
      {tab && (TAB_PROGRESS_LAINNYA as string[]).includes(tab) && (
        <ProgressTab tipe={tab as TipeProgress} projectId={projectId} boleh={boleh} vendorSaya={vendorSaya} project={project} />
      )}
      {tab === "sosialisasi-jsa" && (
        <SosialisasiTab projectId={projectId} boleh={boleh} vendorSaya={vendorSaya} />
      )}
    </div>
  );
}

type TabProps = { projectId: number; boleh: boolean; vendorSaya: boolean };

function ApprovalTab({ tipe, projectId, boleh, vendorSaya, project }: TabProps & { tipe: TipeKonstruksi; project: Project | null }) {
  const [items, setItems] = useState<KonstruksiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [namaBaru, setNamaBaru] = useState("");
  const [fileBaru, setFileBaru] = useState<File[]>([]);
  const [komentarInput, setKomentarInput] = useState<Record<number, string>>({});
  const [reviewItem, setReviewItem] = useState<KonstruksiItem | null>(null);
  const [reviewRows, setReviewRows] = useState<Array<{ bagian?: string; pertanyaan: string; hasil: string; catatan?: string }>>([]);
  const [reviewInspector, setReviewInspector] = useState("");
  const [reviewCatatan, setReviewCatatan] = useState("");
  const [reviewForm, setReviewForm] = useState<Record<string, string>>({});
  const [reviewMode, setReviewMode] = useState<"owner" | "vendor">("owner");
  const [editItem, setEditItem] = useState<KonstruksiItem | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const muatItems = useCallback(() => {
    setLoading(true);
    const permintaan = tipe === "checklist-tahapan"
      ? epromApi.engineer.daftar("checklist-tahapan", projectId) as unknown as Promise<KonstruksiItem[]>
      : epromApi.konstruksi.daftar(tipe, projectId);
    permintaan
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat data"))
      .finally(() => setLoading(false));
  }, [tipe, projectId]);

  useEffect(() => {
    muatItems();
    setNamaBaru("");
    setFileBaru([]);
  }, [muatItems]);

  async function tambahItem(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const daftarFile: Array<File | null> = fileBaru.length ? fileBaru : [null];
      await Promise.all(daftarFile.map((file) =>
        tipe === "checklist-tahapan"
          ? epromApi.engineer.buat("checklist-tahapan", projectId, namaBaru || undefined, file)
          : epromApi.konstruksi.buat(tipe, projectId, namaBaru || undefined, file),
      ));
      setNamaBaru("");
      setFileBaru([]);
      muatItems();
      window.dispatchEvent(new Event("eprom-konstruksi-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah data");
    } finally {
      setSubmitting(false);
    }
  }

  async function tambahChecklistForm(payload: { nama: string; data: Record<string, unknown>; files: File[] }) {
    setSubmitting(true);
    setError(null);
    try {
      await epromApi.engineer.buat("checklist-tahapan", projectId, payload.nama, payload.files, payload.data);
      muatItems();
      window.dispatchEvent(new Event("eprom-konstruksi-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan checklist");
      throw err;
    } finally {
      setSubmitting(false);
    }
  }

  function bukaReviewChecklist(item: KonstruksiItem, mode: "owner" | "vendor" = "owner") {
    const rows = Array.isArray(item.formData?.checklist) ? item.formData.checklist : [];
    setReviewRows(rows.map((row) => {
      const value = row && typeof row === "object" ? row as Record<string, unknown> : {};
      return { bagian: String(value.bagian ?? "E"), pertanyaan: String(value.pertanyaan ?? "-"), hasil: String(value.hasil ?? ""), catatan: String(value.catatan ?? "") };
    }));
    setReviewInspector(typeof item.formData?.inspector === "string" ? item.formData.inspector : "");
    setReviewCatatan(typeof item.formData?.catatanInspector === "string" ? item.formData.catatanInspector : "");
    setReviewForm(Object.fromEntries(Object.entries(item.formData ?? {}).filter(([, value]) => typeof value === "string")) as Record<string, string>);
    setReviewItem(item);
    setReviewMode(mode);
  }

  async function kirimRevisiChecklist() {
    if (!reviewItem) return;
    try {
      await epromApi.engineer.revisionChecklistForm(reviewItem.id, { formData: reviewForm, checklist: reviewRows });
      setReviewItem(null);
      muatItems();
      window.dispatchEvent(new Event("eprom-konstruksi-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim revisi checklist");
    }
  }

  async function reviewChecklist(status: "APPROVED" | "REJECTED") {
    if (!reviewItem) return;
    try {
      const inspector = reviewInspector.trim();
      const komentar = reviewCatatan.trim();
      if (!inspector) throw new Error("Nama Inspector PPA wajib diisi");
      if (status === "REJECTED" && !komentar) throw new Error("Catatan Inspector wajib diisi untuk Reject");
      await epromApi.engineer.reviewChecklistForm(reviewItem.id, {
        inspector,
        status,
        keputusan: status === "APPROVED" ? (komentar ? "Approve dengan Catatan" : "Approve Langsung") : "Reject dengan Catatan",
        catatanInspector: komentar,
        checklist: reviewRows,
        formData: reviewForm,
      });
      setReviewItem(null);
      muatItems();
      window.dispatchEvent(new Event("eprom-konstruksi-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan review");
    }
  }

  async function review(item: KonstruksiItem, status: "APPROVED" | "REJECTED") {
    const komentar = komentarInput[item.id];
    try {
      await epromApi.konstruksi.review(tipe, item.id, status, komentar || undefined);
      muatItems();
      window.dispatchEvent(new Event("eprom-konstruksi-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan review");
    }
  }

  function bukaEdit(item: KonstruksiItem) {
    setEditItem(item);
    setEditNama(item.namaTahap ?? item.namaPekerjaan ?? "");
    setEditError(null);
  }

  async function simpanEdit(event: React.FormEvent) {
    event.preventDefault();
    if (!editItem) return;
    setEditSubmitting(true);
    setEditError(null);
    try {
      await epromApi.konstruksi.ubah(tipe, editItem.id, editNama.trim());
      setEditItem(null);
      muatItems();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Gagal menyimpan perubahan");
    } finally {
      setEditSubmitting(false);
    }
  }

  async function hapus(item: KonstruksiItem) {
    const nama = item.namaTahap ?? item.namaPekerjaan;
    const label = nama ? `${LABEL_TIPE_KONSTRUKSI[tipe]} "${nama}"` : LABEL_TIPE_KONSTRUKSI[tipe];
    if (!confirm(`Yakin ingin menghapus ${label}? Data yang dihapus tidak bisa dikembalikan.`)) return;
    try {
      await epromApi.konstruksi.hapus(tipe, item.id);
      muatItems();
      window.dispatchEvent(new Event("eprom-konstruksi-updated"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus data");
    }
  }

  const namaField = PAKAI_NAMA[tipe];

  return (
    <div className={engineerStyles.panel}>
      <h2 className={engineerStyles.sectionTitle}>{LABEL_TIPE_KONSTRUKSI[tipe]}</h2>

      {tipe === "checklist-tahapan" && (boleh || vendorSaya) && (
        <div style={{ marginBottom: 18 }}>
          <ConstructionChecklistPopup
            projectName={project?.namaProject ?? "Project aktif"}
            vendorName={project?.kontrak.vendor.namaVendor ?? "Vendor project"}
            owner={boleh}
            onSubmit={tambahChecklistForm}
            submitting={submitting}
          />
        </div>
      )}

      {(boleh || vendorSaya) && tipe !== "checklist-tahapan" && (
        <form id="konstruksi-upload" className={engineerStyles.formCard} onSubmit={tambahItem} style={{ marginBottom: 18 }}>
          {namaField && (
            <label>
              {namaField}
              <input value={namaBaru} onChange={(e) => setNamaBaru(e.target.value)} required />
            </label>
          )}
          <label>
            File
            <input
              type="file"
              multiple
              accept="*/*"
              onChange={(e) => setFileBaru(Array.from(e.target.files ?? []))}
            />
            {fileBaru.length > 0 && <span>{fileBaru.length} file dipilih</span>}
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
          <div
            key={item.id}
            className={`${engineerStyles.itemRow} ${engineerStyles[`itemStatus_${item.status}`]}`}
          >
            <div className={engineerStyles.itemRowTop}>
              <strong>{item.namaTahap ?? item.namaPekerjaan ?? `#${item.id}`}</strong>
              <span className={`${engineerStyles.statusPill} ${engineerStyles[`status_${item.status}`]}`}>
                {LABEL_STATUS_APPROVAL[item.status]}
              </span>
            </div>

            <div className={engineerStyles.itemRowMeta}>
              {(item.effectiveFileUrl ?? item.fileUrl) ? (
                <a href={urlFileEprom(item.effectiveFileUrl ?? item.fileUrl!)} target="_blank" rel="noreferrer">
                  <FileText size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
                  {item.originalFileName ?? "Lihat File"}{item.revision && item.revision > 0 ? ` - R${String(item.revision).padStart(2, "0")}` : ""}
                </a>
              ) : (
                <span>Belum ada file</span>
              )}
            </div>

            {item.komentar && <div className={engineerStyles.komentarBox}>&ldquo;{item.komentar}&rdquo;</div>}

            {tipe === "checklist-tahapan" && item.formData && (
              <details style={{ marginTop: 10, padding: 10, borderRadius: 9, background: "#f4f8fc" }}>
                <summary style={{ cursor: "pointer", fontWeight: 800 }}>Lihat isian Construction Inspection</summary>
                <div style={{ display: "grid", gap: 5, marginTop: 10, fontSize: 13 }}>
                  <span>Nomor: {String(item.formData.nomorInspeksi ?? "-")}</span>
                  <span>Kategori: {String(item.formData.kategori ?? "-")}</span>
                  <span>Area/Lokasi: {String(item.formData.area ?? "-")} / {String(item.formData.lokasi ?? "-")}</span>
                  <span>Pengawas Vendor: {String(item.formData.pengawasVendor ?? "-")}</span>
                  <span>Status Kesiapan: {String(item.formData.statusKesiapan ?? "-")}</span>
                  {item.formData.inspector ? <span>Inspector PPA: {String(item.formData.inspector)}</span> : null}
                </div>
              </details>
            )}

            {boleh && item.status === "PENDING" && tipe === "checklist-tahapan" && (
              <div className={engineerStyles.inlineForm} style={{ marginTop: 10 }}>
                <button type="button" className={engineerStyles.secondaryButton} onClick={() => bukaReviewChecklist(item)}>Buka & Review Checklist</button>
              </div>
            )}

            {boleh && item.status === "PENDING" && tipe !== "checklist-tahapan" && (
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
                {namaField && (
                  <button
                    type="button"
                    className={engineerStyles.iconButton}
                    onClick={() => bukaEdit(item)}
                    title="Edit"
                  >
                    <Pencil size={13} />
                  </button>
                )}
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

            {boleh && item.status !== "PENDING" && (
              <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                {tipe === "checklist-tahapan" ? (
                  <button type="button" className={engineerStyles.secondaryButton} onClick={() => bukaReviewChecklist(item)}>
                    Edit Isian & Status
                  </button>
                ) : item.fileUrl ? (
                  <button type="button" className={engineerStyles.secondaryButton} onClick={() => review(item, item.status === "APPROVED" ? "REJECTED" : "APPROVED")}>
                    Ubah Status
                  </button>
                ) : null}
                <button type="button" className={engineerStyles.iconButtonDanger} onClick={() => hapus(item)} title="Hapus">
                  <Trash2 size={13} />
                </button>
              </div>
            )}

            {vendorSaya && item.status === "REJECTED" && (
              <button type="button" className={engineerStyles.primaryButton} style={{ marginTop: 10 }} onClick={() => bukaReviewChecklist(item, "vendor")}>
                Buka & Revisi Checklist
              </button>
            )}
          </div>
        ))}
      </div>

      {reviewItem && (
        <Modal title="Review Construction Inspection Checklist" onClose={() => setReviewItem(null)}>
          <div style={{ display: "grid", gap: 14, maxHeight: "76vh", overflow: "auto", paddingRight: 4 }}>
            <div style={{ padding: 12, borderRadius: 10, background: "#f4f8fc", display: "grid", gap: 4 }}>
              <strong>{reviewItem.namaTahap ?? reviewItem.namaPekerjaan}</strong>
              <span>Nomor: {String(reviewItem.formData?.nomorInspeksi ?? "-")}</span>
              <span>Area: {String(reviewItem.formData?.area ?? "-")} / {String(reviewItem.formData?.lokasi ?? "-")}</span>
            </div>
            <div style={{ padding: 12, border: "1px solid #dce5ef", borderRadius: 10, display: "grid", gap: 10 }}>
              <strong>A. Informasi Umum Pekerjaan</strong>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 10 }}>
                {[['nomorInspeksi','Nomor Inspeksi'],['tanggal','Tanggal Inspeksi'],['kategori','Kategori'],['jenisPekerjaan','Jenis Pekerjaan'],['area','Gedung / Area'],['lokasi','Lantai / Elevasi / Lokasi'],['shopDrawing','Nomor / Nama Shop Drawing'],['manpower','Jumlah Manpower'],['pengawasVendor','Nama Pengawas Vendor'],['peralatan','Peralatan Kerja']].map(([key,label]) => (
                  <label key={key} style={{ display: "grid", gap: 5, fontWeight: 700, fontSize: 13 }}>{label}
                    <input type={key === 'tanggal' ? 'date' : key === 'manpower' ? 'number' : 'text'} value={reviewForm[key] ?? ""} onChange={(event) => setReviewForm(current => ({ ...current, [key]: event.target.value }))} style={{ padding: 9, border: "1px solid #cbd5e1", borderRadius: 8 }}/>
                  </label>
                ))}
              </div>
            </div>
            {reviewRows.map((row, index) => (
              <div key={`${row.bagian}-${index}`} style={{ padding: 12, border: "1px solid #dce5ef", borderRadius: 10, display: "grid", gap: 8 }}>
                <strong>{row.bagian}.{index + 1} {row.pertanyaan}</strong>
                <select value={row.hasil} onChange={(event) => setReviewRows(current => current.map((item, rowIndex) => rowIndex === index ? { ...item, hasil: event.target.value } : item))} style={{ padding: 9, border: "1px solid #cbd5e1", borderRadius: 8 }}>
                  <option value="">Pilih</option><option>OK</option><option>Tidak OK</option><option>N/A</option>
                </select>
                <input placeholder="Catatan temuan pada poin ini" value={row.catatan ?? ""} onChange={(event) => setReviewRows(current => current.map((item, rowIndex) => rowIndex === index ? { ...item, catatan: event.target.value } : item))} style={{ padding: 9, border: "1px solid #cbd5e1", borderRadius: 8 }}/>
              </div>
            ))}
            {reviewMode === "owner" ? <>
              <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>Nama Inspector PPA<input value={reviewInspector} onChange={(event) => setReviewInspector(event.target.value)} style={{ padding: 10, border: "1px solid #cbd5e1", borderRadius: 8 }}/></label>
              <label style={{ display: "grid", gap: 6, fontWeight: 700 }}>Catatan Inspector<textarea value={reviewCatatan} onChange={(event) => setReviewCatatan(event.target.value)} style={{ padding: 10, border: "1px solid #cbd5e1", borderRadius: 8, minHeight: 80 }}/></label>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                <button type="button" className={engineerStyles.dangerButton} onClick={() => reviewChecklist("REJECTED")}>Simpan Isian & Reject</button>
                <button type="button" className={engineerStyles.primaryButton} onClick={() => reviewChecklist("APPROVED")}>Simpan Isian, Approve & Buat PDF</button>
              </div>
            </> : <div style={{ display: "flex", justifyContent: "flex-end" }}><button type="button" className={engineerStyles.primaryButton} onClick={kirimRevisiChecklist}>Kirim Revisi ke Owner</button></div>}
          </div>
        </Modal>
      )}

      {editItem && namaField && (
        <Modal title={`Edit ${LABEL_TIPE_KONSTRUKSI[tipe]}`} onClose={() => setEditItem(null)}>
          <form
            className={engineerStyles.formCard}
            onSubmit={simpanEdit}
            style={{ flexDirection: "column", alignItems: "stretch" }}
          >
            <label>
              {namaField}
              <input value={editNama} onChange={(e) => setEditNama(e.target.value)} required />
            </label>
            <small style={{ color: "#5b7391" }}>File dokumen tidak dapat diganti lewat Edit.</small>
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

function ProgressTab({ tipe, projectId, boleh, vendorSaya, project }: TabProps & { tipe: TipeProgress; project: Project | null }) {
  const mingguan = tipe === "progress-mingguan";
  const formTerstruktur = tipe === "inspeksi-area" || tipe === "progress-harian";

  const [items, setItems] = useState<ProgressItem[]>([]);
  const [jam, setJam] = useState<JamUploadInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fileBaru, setFileBaru] = useState<File[]>([]);
  const [namaPekerjaan, setNamaPekerjaan] = useState("");
  const [planned, setPlanned] = useState("");
  const [actual, setActual] = useState("");
  const [tanggalUpload, setTanggalUpload] = useState(() => new Date().toISOString().slice(0, 10));
  const [mingguKe, setMingguKe] = useState("");
  const [editProgressId, setEditProgressId] = useState<number | null>(null);

  const muat = useCallback(() => {
    setLoading(true);
    epromApi.progress
      .daftar(tipe, projectId)
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat data"))
      .finally(() => setLoading(false));

    epromApi.progress.jamUpload(tipe).then(setJam).catch(() => setJam(null));
  }, [tipe, projectId]);

  useEffect(() => {
    muat();
    setFileBaru([]);
    setNamaPekerjaan("");
    setPlanned("");
    setActual("");
    setTanggalUpload(new Date().toISOString().slice(0, 10));
    setMingguKe("");
    setEditProgressId(null);
  }, [muat]);

  const terkunci = Boolean(jam?.dibatasi && !jam.bukaSekarang);
  const terlambat = (item: ProgressItem) =>
    jam?.dibatasi === true &&
    Boolean(item.uploadedAt) &&
    waktuWitaDiLuarJadwal(item.uploadedAt!, jam.jamBuka, jam.jamTutup);

  async function unggah(event: React.FormEvent) {
    event.preventDefault();

    if (mingguan) {
      if (!mingguKe || !namaPekerjaan.trim() || planned === "" || actual === "") {
        setError("Week, Nama Pekerjaan, Planned, dan Actual wajib diisi");
        return;
      }
    } else if (fileBaru.length === 0 && editProgressId === null) {
      setError("Pilih file terlebih dahulu");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const data = mingguan
          ? { namaPekerjaan: namaPekerjaan.trim(), planned: Number(planned), actual: Number(actual), mingguKe: Number(mingguKe) }
          : { namaPekerjaan: "", planned: 0, actual: 0, tanggal: tanggalUpload };
      if (editProgressId !== null) {
        await epromApi.progress.ubah(tipe, editProgressId, fileBaru[0] ?? null, data);
        await Promise.all(fileBaru.slice(1).map((file) => epromApi.progress.buat(tipe, projectId, file, data)));
      } else {
        const daftarFile: Array<File | null> = fileBaru.length ? fileBaru : [null];
        await Promise.all(daftarFile.map((file) => epromApi.progress.buat(tipe, projectId, file, data)));
      }
      setFileBaru([]);
      setNamaPekerjaan("");
      setPlanned("");
      setActual("");
      setTanggalUpload(new Date().toISOString().slice(0, 10));
      setMingguKe("");
      setEditProgressId(null);
      muat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah");
    } finally {
      setSubmitting(false);
    }
  }

  function mulaiEdit(item: ProgressItem) {
    setEditProgressId(item.id);
    setNamaPekerjaan(item.namaPekerjaan ?? "");
    setPlanned(item.planned === undefined ? "" : String(item.planned));
    setActual(item.actual === undefined ? "" : String(item.actual));
    setTanggalUpload((item.uploadedAt ?? item.tanggal ?? new Date().toISOString()).slice(0, 10));
    setMingguKe(item.mingguKe === undefined ? "" : String(item.mingguKe));
    setFileBaru([]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function hapus(item: ProgressItem) {
    if (
      !confirm(
        `Yakin ingin menghapus ${namaProgress(tipe, item)}? Data yang dihapus tidak bisa dikembalikan.`,
      )
    )
      return;
    try {
      await epromApi.progress.hapus(tipe, item.id);
      muat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus data");
    }
  }

  const pilihanMinggu = (() => {
    if (!mingguan || !project?.kontrak.tanggalMulai || !project.kontrak.tanggalSelesai) return [];
    const mulai = new Date(`${project.kontrak.tanggalMulai.slice(0, 10)}T00:00:00`);
    const selesai = new Date(`${project.kontrak.tanggalSelesai.slice(0, 10)}T00:00:00`);
    if (Number.isNaN(mulai.getTime()) || Number.isNaN(selesai.getTime()) || selesai < mulai) return [];
    const total = Math.max(1, Math.ceil((Math.floor((selesai.getTime() - mulai.getTime()) / 86400000) + 1) / 7));
    return Array.from({ length: total }, (_, index) => {
      const awal = new Date(mulai);
      awal.setDate(mulai.getDate() + index * 7);
      const akhir = new Date(awal);
      akhir.setDate(awal.getDate() + 6);
      if (akhir > selesai) akhir.setTime(selesai.getTime());
      return { nomor: index + 1, label: `Week ${index + 1} (${formatTanggal(awal.toISOString())} - ${formatTanggal(akhir.toISOString())})` };
    });
  })();

  return (
    <div className={engineerStyles.panel}>
      <h2 className={engineerStyles.sectionTitle}>{LABEL_TIPE_PROGRESS[tipe]}</h2>

      {jam?.dibatasi && (
        <div className={`${styles.gateBanner} ${jam.bukaSekarang ? styles.gateBannerOpen : ""}`}>
          {jam.bebasSebagaiOwner
            ? `Jam upload normal pukul ${jam.jamBuka}-${jam.jamTutup} WITA, tapi Owner/Admin bebas upload kapan saja.`
            : jam.dalamJadwal
              ? `Upload sedang dibuka, tutup pukul ${jam.jamTutup} WITA.`
              : `Upload Vendor ditutup. Jadwal upload pukul ${jam.jamBuka}-${jam.jamTutup} WITA; hubungi Admin/Owner bila perlu dibantu mengunggah.`}
        </div>
      )}

      {(boleh || vendorSaya) && tipe === "progress-harian" && (
        <DailyReportForm projectId={projectId} disabled={terkunci} onSaved={muat} />
      )}
      {(boleh || vendorSaya) && tipe === "inspeksi-area" && (
        <InspectionForm projectId={projectId} disabled={terkunci} onSaved={muat} />
      )}

      {(boleh || vendorSaya) && !formTerstruktur && (
        <form className={engineerStyles.formCard} onSubmit={unggah} style={{ marginBottom: 18 }}>
          {mingguan && (
            <>
              <label>
                Week Laporan
                <select value={mingguKe} onChange={(e) => setMingguKe(e.target.value)} disabled={terkunci || pilihanMinggu.length === 0} required>
                  <option value="">Pilih week project</option>
                  {pilihanMinggu.map((week) => <option key={week.nomor} value={week.nomor}>{week.label}</option>)}
                </select>
              </label>
              <label>
                Nama Pekerjaan
                <input
                  value={namaPekerjaan}
                  onChange={(e) => setNamaPekerjaan(e.target.value)}
                  placeholder="mis. Pekerjaan Struktur"
                  disabled={terkunci}
                  required
                />
              </label>
              <label>
                Planned (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={planned}
                  onChange={(e) => setPlanned(e.target.value)}
                  disabled={terkunci}
                  required
                />
              </label>
              <label>
                Actual (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={actual}
                  onChange={(e) => setActual(e.target.value)}
                  disabled={terkunci}
                  required
                />
              </label>
            </>
          )}
          {!mingguan && <label>
            Tanggal Upload
            <input type="date" value={tanggalUpload} onChange={(e) => setTanggalUpload(e.target.value)} disabled={terkunci} required />
          </label>}
          <label>
            File {mingguan && "(opsional)"}
            <input
              type="file"
              multiple
              accept="*/*"
              onChange={(e) => setFileBaru(Array.from(e.target.files ?? []))}
              disabled={terkunci}
            />
          </label>
          <button type="submit" className={engineerStyles.primaryButton} disabled={submitting || terkunci}>
            {submitting ? "Menyimpan..." : editProgressId !== null ? "Simpan Perubahan" : mingguan ? "Simpan Update" : "Unggah"}
          </button>
          {editProgressId !== null && (
            <button type="button" className={engineerStyles.secondaryButton} onClick={() => { setEditProgressId(null); setNamaPekerjaan(""); setPlanned(""); setActual(""); setMingguKe(""); setFileBaru([]); }}>
              Batal Edit
            </button>
          )}
        </form>
      )}

      {error && <p className={engineerStyles.errorText}>{error}</p>}
      {loading && <p className={engineerStyles.emptyText}>Memuat...</p>}
      {!loading && items.length === 0 && <p className={engineerStyles.emptyText}>Belum ada data.</p>}

      {mingguan && items.length > 0 ? (
        <div className={engineerStyles.tableWrap}>
          <table className={engineerStyles.table}>
            <thead>
              <tr>
                <th>Week</th>
                <th>Pekerjaan</th>
                <th>Tanggal Upload</th>
                <th>Planned</th>
                <th>Actual</th>
                <th>Deviasi</th>
                <th>Status</th>
                <th>File</th>
                {(boleh || vendorSaya) && <th>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className={terlambat(item) ? engineerStyles.rowLate : undefined}>
                  <td>Week {item.mingguKe ?? "-"}</td>
                  <td>{item.namaPekerjaan}</td>
                  <td>{formatTanggal(item.uploadedAt)}</td>
                  <td>{item.planned}%</td>
                  <td>{item.actual}%</td>
                  <td>
                    {item.deviasi !== undefined
                      ? `${item.deviasi > 0 ? "+" : ""}${item.deviasi}%`
                      : "-"}
                  </td>
                  <td>
                    {item.status && (
                      <span
                        className={`${engineerStyles.statusPill} ${
                          item.status === "ON_TRACK"
                            ? engineerStyles.status_APPROVED
                            : item.status === "WASPADA"
                              ? engineerStyles.status_PENDING
                              : engineerStyles.status_REJECTED
                        }`}
                      >
                        {LABEL_STATUS_DEVIASI[item.status]}
                      </span>
                    )}
                  </td>
                  <td>
                    {item.fileUrl ? (
                      <a href={urlFileEprom(item.fileUrl)} target="_blank" rel="noreferrer">
                        <FileText size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
                        Lihat
                      </a>
                    ) : (
                      "-"
                    )}
                  </td>
                  {(boleh || vendorSaya) && (
                    <td>
                      <button type="button" className={engineerStyles.iconButton} onClick={() => mulaiEdit(item)} title="Edit">
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
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={engineerStyles.itemList}>
          {items.map((item) => (
            <div
              key={item.id}
              className={`${engineerStyles.itemRow} ${terlambat(item) ? engineerStyles.itemLate : ""}`}
            >
              <div className={engineerStyles.itemRowTop}>
                <strong>{labelEkstra(tipe, item)}</strong>
                {item.fileUrl ? (
                  <a href={urlFileEprom(item.fileUrl)} target="_blank" rel="noreferrer">
                    <FileText size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
                    Lihat File
                  </a>
                ) : (
                  <span className={engineerStyles.emptyText}>Belum ada file</span>
                )}
              </div>

              <div className={engineerStyles.itemRowMeta}>
                <span>Diunggah {formatWaktuWITA(item.uploadedAt ?? item.tanggalUpload)}</span>
                {terlambat(item) && <span className={engineerStyles.lateText}>Terlambat / di luar jadwal</span>}
              </div>

              {(boleh || vendorSaya) && (
                <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                  {!formTerstruktur && (
                    <button type="button" className={engineerStyles.iconButton} onClick={() => mulaiEdit(item)} title="Edit">
                      <Pencil size={13} />
                    </button>
                  )}
                  <button type="button" className={engineerStyles.iconButtonDanger} onClick={() => hapus(item)} title="Hapus">
                    <Trash2 size={13} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PerformaTab({ tipe, projectId, boleh, vendorSaya, project }: TabProps & { tipe: "tta" | "kta"; project: Project | null }) {
  const [items, setItems] = useState<ProgressItem[]>([]);
  const [performa, setPerforma] = useState<PerformaBulanIni | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [fileBaru, setFileBaru] = useState<File[]>([]);

  const muat = useCallback(() => {
    setLoading(true);
    epromApi.progress
      .daftar(tipe, projectId)
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat data"))
      .finally(() => setLoading(false));

    epromApi.progress.performa(tipe, projectId).then(setPerforma).catch(() => setPerforma(null));
  }, [tipe, projectId]);

  useEffect(() => {
    muat();
    setFileBaru([]);
  }, [muat]);

  async function unggah(event: React.FormEvent) {
    event.preventDefault();
    if (fileBaru.length === 0) {
      setError("Pilih file terlebih dahulu");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await Promise.all(fileBaru.map((file) => epromApi.progress.buat(tipe, projectId, file)));
      setFileBaru([]);
      muat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah");
    } finally {
      setSubmitting(false);
    }
  }

  async function simpanForm(payload: { data: Record<string, unknown>; files: File[] }) {
    setSubmitting(true); setError(null);
    try { await epromApi.progress.buatForm(tipe, projectId, payload.data, payload.files); muat(); }
    catch (err) { setError(err instanceof Error ? err.message : "Gagal menyimpan form"); throw err; }
    finally { setSubmitting(false); }
  }

  async function hapus(item: ProgressItem) {
    if (
      !confirm(
        `Yakin ingin menghapus ${namaProgress(tipe, item)}? Data yang dihapus tidak bisa dikembalikan.`,
      )
    )
      return;
    try {
      await epromApi.progress.hapus(tipe, item.id);
      muat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus data");
    }
  }

  async function ubahStatusTindakLanjut(item: ProgressItem, status: "Open" | "Closed") {
    setError(null);
    try {
      await epromApi.progress.ubahStatusTindakLanjut(tipe, item.id, status);
      muat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status tindak lanjut");
    }
  }

  return (
    <div className={engineerStyles.panel}>
      <h2 className={engineerStyles.sectionTitle}>{LABEL_TIPE_PROGRESS[tipe]}</h2>

      {(boleh || vendorSaya) && (
        <div style={{ marginBottom: 18 }}><KtaTtaPopup tipe={tipe.toUpperCase() as "KTA"|"TTA"} projectName={project?.namaProject ?? "Project aktif"} vendorName={project?.kontrak.vendor.namaVendor ?? "Vendor project"} onSubmit={simpanForm} submitting={submitting}/></div>
      )}

      {performa && (
        <div className={`${styles.performaWrap} ${performa.persen >= 100 ? styles.performaFull : ""}`}>
          <div className={styles.performaHeader}>
            <strong>Performa Bulan Ini ({formatBulanLabel(performa.bulan)})</strong>
            <span>{performa.persen}%</span>
          </div>
          <div className={styles.performaBarTrack}>
            <div
              className={styles.performaBarFill}
              style={{ width: `${Math.min(100, performa.persen)}%` }}
            />
          </div>
          <p className={styles.performaNote}>
            {performa.jumlah} dari target {performa.target} upload bulan ini. Reset otomatis tiap
            awal bulan.
          </p>
        </div>
      )}

      {false && (boleh || vendorSaya) && (
        <form className={engineerStyles.formCard} onSubmit={unggah} style={{ marginBottom: 18 }}>
          <label>
            File
            <input
              type="file"
              multiple
              accept="*/*"
              onChange={(e) => setFileBaru(Array.from(e.target.files ?? []))}
            />
          </label>
          <button type="submit" className={engineerStyles.primaryButton} disabled={submitting}>
            {submitting ? "Mengunggah..." : "Unggah"}
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
              <strong>{formatBulanLabel(item.bulan)}</strong>
              {item.fileUrl ? (
                <a href={urlFileEprom(item.fileUrl)} target="_blank" rel="noreferrer">
                  <FileText size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
                  Lihat File
                </a>
              ) : (
                <span className={engineerStyles.emptyText}>Belum ada file</span>
              )}
            </div>

            <div className={engineerStyles.itemRowMeta}>
              <span>Diunggah {formatWaktuWITA(item.uploadedAt ?? item.tanggalUpload)}</span>
            </div>

            {item.formData && (
              <details style={{ marginTop: 10, padding: 10, borderRadius: 9, background: "#f4f8fc" }}>
                <summary style={{ cursor: "pointer", fontWeight: 800 }}>Lihat detail observasi</summary>
                <div style={{ display: "grid", gap: 5, marginTop: 10, fontSize: 13 }}>
                  <span>Pelapor: {String(item.formData.pelapor ?? "-")}</span>
                  <span>Area/Lokasi: {String(item.formData.area ?? "-")} / {String(item.formData.lokasi ?? "-")}</span>
                  <span>Temuan: {String(item.formData.kategori ?? "-")} — {String(item.formData.temuan ?? "-")}</span>
                  <span>Risiko: {String(item.formData.risiko ?? "-")}</span>
                  <label style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    Status tindak lanjut:
                    <select
                      value={String(item.formData.statusTindakLanjut ?? "Open")}
                      onChange={(event) => ubahStatusTindakLanjut(item, event.target.value as "Open" | "Closed")}
                      style={{ padding: "7px 10px", border: "1px solid #cbd8e6", borderRadius: 8 }}
                    >
                      <option value="Open">Open</option>
                      <option value="Closed">Closed</option>
                    </select>
                  </label>
                </div>
              </details>
            )}

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
  );
}

function SosialisasiTab({ projectId, boleh, vendorSaya }: TabProps) {
  const [items, setItems] = useState<JsaDenganSosialisasi[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  const muat = useCallback(() => {
    setLoading(true);
    epromApi.sosialisasiJsa
      .daftar(projectId)
      .then(setItems)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat data"))
      .finally(() => setLoading(false));
  }, [projectId]);

  useEffect(muat, [muat]);

  async function unggah(jsaId: number, files: File[]) {
    setUploadingId(jsaId);
    setError(null);
    try {
      await epromApi.sosialisasiJsa.unggah(jsaId, files);
      muat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah");
    } finally {
      setUploadingId(null);
    }
  }

  return (
    <div className={engineerStyles.panel}>
      <h2 className={engineerStyles.sectionTitle}>Sosialisasi JSA</h2>
      <p className={engineerStyles.emptyText} style={{ marginBottom: 14 }}>
        Slot otomatis mengikuti jumlah JSA yang sudah dibuat — 1 JSA hanya bisa diisi 1 file
        sosialisasi (bisa diganti/replace file yang sama).
      </p>

      {error && <p className={engineerStyles.errorText}>{error}</p>}
      {loading && <p className={engineerStyles.emptyText}>Memuat...</p>}
      {!loading && items.length === 0 && (
        <p className={engineerStyles.emptyText}>Belum ada JSA — buat JSA dulu di tab JSA.</p>
      )}

      <div className={engineerStyles.itemList}>
        {items.map((jsa) => (
          <div key={jsa.id} className={engineerStyles.itemRow}>
            <div className={engineerStyles.itemRowTop}>
              <strong>{jsa.namaPekerjaan ?? `JSA #${jsa.id}`}</strong>
              <span className={styles.metaTag}>{jsa.sosialisasi ? "Sudah diunggah" : "Belum diunggah"}</span>
            </div>

            <div className={engineerStyles.itemRowMeta}>
              {(jsa.sosialisasi?.fileUrls?.length
                ? jsa.sosialisasi.fileUrls
                : jsa.sosialisasi?.fileUrl
                  ? [jsa.sosialisasi.fileUrl]
                  : []).map((file, index) => (
                <a key={`${file}-${index}`} href={urlFileEprom(file)} target="_blank" rel="noreferrer">
                  <FileText size={12} style={{ verticalAlign: "middle", marginRight: 4 }} />
                  Lihat File {index + 1}
                </a>
              ))}
              {!jsa.sosialisasi?.fileUrl && !jsa.sosialisasi?.fileUrls?.length && (
                <span>Belum ada file</span>
              )}
              {jsa.sosialisasi?.tanggal && <span>&middot; {formatTanggal(jsa.sosialisasi.tanggal)}</span>}
            </div>

            {(boleh || vendorSaya) && (
              <div className={engineerStyles.inlineForm} style={{ marginTop: 10 }}>
                <input
                  type="file"
                  multiple
                  accept="*/*"
                  disabled={uploadingId === jsa.id}
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    e.target.value = "";
                    if (files.length) unggah(jsa.id, files);
                  }}
                />
                {uploadingId === jsa.id && <span className={engineerStyles.emptyText}>Mengunggah...</span>}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
