"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, FileText, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { getStoredUser } from "@/lib/access-control";
import {
  epromApi,
  formatWaktuWITA,
  isEpromOwner,
  isEpromVendor,
  LABEL_TIPE_SAFETY_MEETING,
  urlFileEprom,
  type Project,
  type SafetyMeetingFileItem,
  type TipeSafetyMeeting,
} from "@/lib/eprom-api";
import styles from "../../engineer/engineer.module.css";

const ACCEPT_DOKUMEN =
  ".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp,.dwg,.dxf,.zip,.rar";

const TAB_SAFETY_MEETING: TipeSafetyMeeting[] = [
  "p5m",
  "safety-talk",
  "fatigue-test",
];

export default function SafetyMeetingDetailPage() {
  const params = useParams<{ projectId: string }>();
  const searchParams = useSearchParams();
  const projectId = Number(params.projectId);
  const user = getStoredUser();
  const bolehMengelola = isEpromOwner(user) || isEpromVendor(user);
  const tabRaw = searchParams.get("tab");
  const tipe = TAB_SAFETY_MEETING.includes(tabRaw as TipeSafetyMeeting)
    ? (tabRaw as TipeSafetyMeeting)
    : "p5m";

  const [project, setProject] = useState<Project | null>(null);
  const [projectError, setProjectError] = useState<string | null>(null);

  useEffect(() => {
    epromApi.project
      .detail(projectId)
      .then(setProject)
      .catch((err: unknown) =>
        setProjectError(
          err instanceof Error ? err.message : "Gagal memuat tender",
        ),
      );
  }, [projectId]);

  return (
    <div className={styles.page}>
      <Link href="/civil/project/safety-meeting" className={styles.backLink}>
        <ArrowLeft size={16} /> Kembali ke daftar Tender
      </Link>

      <div className={styles.detailHeader}>
        <div>
          <h1>{project?.kontrak.tender.namaTender ?? "Memuat..."}</h1>
          {project && (
            <p>
              Project {project.namaProject} &mdash; Kontrak{" "}
              {project.kontrak.nomorKontrak} &mdash;{" "}
              {project.kontrak.vendor.namaVendor}
            </p>
          )}
        </div>
      </div>

      <p className={styles.tabHint}>
        {LABEL_TIPE_SAFETY_MEETING[tipe]}
        <span>
          {" "}
          &mdash; pilih kategori lain lewat menu Safety Meeting di sidebar.
        </span>
      </p>

      {projectError && <p className={styles.errorText}>{projectError}</p>}

      <SafetyMeetingFileTab
        key={`${projectId}-${tipe}`}
        projectId={projectId}
        tipe={tipe}
        bolehMengelola={bolehMengelola}
        vendorDibatasi={isEpromVendor(user)}
      />
    </div>
  );
}

function SafetyMeetingFileTab({
  projectId,
  tipe,
  bolehMengelola,
  vendorDibatasi,
}: {
  projectId: number;
  tipe: TipeSafetyMeeting;
  bolehMengelola: boolean;
  vendorDibatasi: boolean;
}) {
  const [items, setItems] = useState<SafetyMeetingFileItem[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [inputKey, setInputKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [p5mDitutup, setP5mDitutup] = useState(false);

  useEffect(() => {
    const perbaruiStatusP5m = () => {
      const wita = new Date(Date.now() + 8 * 60 * 60 * 1000);
      setP5mDitutup(
        vendorDibatasi &&
          tipe === "p5m" &&
          wita.getUTCHours() * 60 + wita.getUTCMinutes() >= 10 * 60,
      );
    };
    perbaruiStatusP5m();
    const timer = window.setInterval(perbaruiStatusP5m, 30_000);
    return () => window.clearInterval(timer);
  }, [tipe, vendorDibatasi]);

  const muat = useCallback(() => {
    setLoading(true);
    epromApi.safetyMeeting
      .daftar(tipe, projectId)
      .then(setItems)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Gagal memuat file"),
      )
      .finally(() => setLoading(false));
  }, [projectId, tipe]);

  useEffect(() => {
    // Muat ulang setiap tender/kategori berubah.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    muat();
  }, [muat]);

  async function unggah(event: React.FormEvent) {
    event.preventDefault();
    if (files.length === 0) {
      setError("Pilih minimal satu file");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await epromApi.safetyMeeting.unggah(tipe, projectId, files);
      setFiles([]);
      setInputKey((current) => current + 1);
      muat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengunggah file");
    } finally {
      setSubmitting(false);
    }
  }

  async function hapus(item: SafetyMeetingFileItem) {
    if (!confirm(`Hapus file ${item.originalFileName}?`)) return;
    try {
      await epromApi.safetyMeeting.hapus(tipe, item.id);
      muat();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus file");
    }
  }

  return (
    <div className={styles.panel}>
      <h2 className={styles.sectionTitle}>
        File {LABEL_TIPE_SAFETY_MEETING[tipe]}
      </h2>

      {tipe === "p5m" && (
        <p className={styles.tabHint}>
          {vendorDibatasi
            ? "Batas unggah Vendor pukul 10.00 WITA."
            : "Batas pukul 10.00 WITA hanya berlaku untuk Vendor; Owner/Admin bebas mengelola file."}
        </p>
      )}

      {bolehMengelola && !p5mDitutup && (
        <form
          className={styles.formCard}
          onSubmit={unggah}
          style={{ marginBottom: 18 }}
        >
          <label>
            Pilih File
            <input
              key={inputKey}
              type="file"
              multiple
              accept="*/*"
              onChange={(event) =>
                setFiles(Array.from(event.target.files ?? []))
              }
            />
            {files.length > 0 && <span>{files.length} file dipilih</span>}
          </label>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={submitting || files.length === 0}
          >
            <Upload size={14} />
            {submitting ? "Mengunggah..." : "Unggah File"}
          </button>
        </form>
      )}

      {bolehMengelola && p5mDitutup && (
        <p className={styles.errorText}>
          Unggah P5M ditutup. Batas unggah pukul 10.00 WITA.
        </p>
      )}

      {error && <p className={styles.errorText}>{error}</p>}
      {loading && <p className={styles.emptyText}>Memuat file...</p>}
      {!loading && items.length === 0 && (
        <p className={styles.emptyText}>
          Belum ada file {LABEL_TIPE_SAFETY_MEETING[tipe]}.
        </p>
      )}

      <div className={styles.itemList}>
        {items.map((item) => (
          <div key={item.id} className={styles.itemRow}>
            <div className={styles.itemRowTop}>
              <strong>{item.originalFileName}</strong>
              {bolehMengelola && (
                <button
                  type="button"
                  className={styles.iconButtonDanger}
                  onClick={() => hapus(item)}
                  title="Hapus file"
                >
                  <Trash2 size={13} />
                </button>
              )}
            </div>
            <div className={styles.itemRowMeta}>
              <a
                href={urlFileEprom(item.fileUrl)}
                target="_blank"
                rel="noreferrer"
              >
                <FileText
                  size={12}
                  style={{ verticalAlign: "middle", marginRight: 4 }}
                />
                Lihat File
              </a>
              <span>
                Diunggah oleh {item.uploadedBy.name} &middot;{" "}
                {formatWaktuWITA(item.uploadedAt)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
