"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { compressImage, compressImages } from "@/utils/compress-image";
import styles from "./daily-activities.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type ActivityType = "DAILY_ACTIVITY" | "GRASS_CUTTING";

type ActivityStatus = "OPEN" | "ON_PROGRESS" | "WAITING_APPROVAL" | "CLOSE";

type ApprovalStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

type LoginUser = {
  id: number;
  name: string;
  username: string;
  role: string;
};

type ProgressHistory = {
  id: number;
  progressDate: string;
  previousProgress: number;
  addedProgress: number;
  currentProgress: number;
  pic: string;
  notes: string | null;
  preActivityPhotoPaths: string[];
  photoPaths: string[];
  requestClose: boolean;
  creator?: {
    name: string;
    username: string;
  };
};

type ApprovalHistory = {
  id: number;
  decision: "APPROVED" | "REJECTED";
  comment: string | null;
  actedAt: string;
  actor?: {
    name: string;
    username: string;
  };
};

type DailyActivity = {
  id: number;
  activityType: ActivityType;
  startDate: string;
  lastProgressDate: string | null;
  workName: string;
  location: string;
  description: string | null;
  profilePhotoPath: string;
  preActivityPhotoPaths: string[];
  currentProgress: number;
  lastPic: string | null;
  status: ActivityStatus;
  approvalStatus: ApprovalStatus;
  closeRequestedAt: string | null;
  closedAt: string | null;
  progressHistories?: ProgressHistory[];
  approvals?: ApprovalHistory[];
  creator?: {
    name: string;
    username: string;
  };
};

type MainForm = {
  startDate: string;
  workName: string;
  location: string;
  description: string;
  initialProgress: string;
  pic: string;
  initialNotes: string;
};

type ProgressForm = {
  progressDate: string;
  addedProgress: string;
  pic: string;
  notes: string;
};

type PageProps = {
  activityType: ActivityType;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function initialMainForm(): MainForm {
  return {
    startDate: today(),
    workName: "",
    location: "",
    description: "",
    initialProgress: "0",
    pic: "",
    initialNotes: "",
  };
}

function initialProgressForm(): ProgressForm {
  return {
    progressDate: today(),
    addedProgress: "",
    pic: "",
    notes: "",
  };
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function getToken(): string | null {
  return (
    localStorage.getItem("hcga_access_token") ||
    sessionStorage.getItem("hcga_access_token")
  );
}

function getCurrentUser(): LoginUser | null {
  const raw =
    localStorage.getItem("hcga_user") || sessionStorage.getItem("hcga_user");

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as LoginUser;
  } catch {
    return null;
  }
}

function statusLabel(status: ActivityStatus): string {
  const labels: Record<ActivityStatus, string> = {
    OPEN: "Open",
    ON_PROGRESS: "On Progress",
    WAITING_APPROVAL: "Menunggu Approval",
    CLOSE: "Close",
  };

  return labels[status];
}

function approvalLabel(status: ApprovalStatus): string {
  const labels: Record<ApprovalStatus, string> = {
    NONE: "-",
    PENDING: "Pending",
    APPROVED: "Approved",
    REJECTED: "Rejected",
  };

  return labels[status];
}

export default function DailyActivitiesPage({ activityType }: PageProps) {
  const isGrassCutting = activityType === "GRASS_CUTTING";
  const title = isGrassCutting ? "Potong Rumput" : "Daily Activity";
  const scope = isGrassCutting ? "grass-cutting" : "daily-activities";

  const [rows, setRows] = useState<DailyActivity[]>([]);
  const [detail, setDetail] = useState<DailyActivity | null>(null);
  const [editing, setEditing] = useState<DailyActivity | null>(null);
  const [progressTarget, setProgressTarget] = useState<DailyActivity | null>(
    null,
  );

  const [mainForm, setMainForm] = useState<MainForm>(initialMainForm());
  const [progressForm, setProgressForm] = useState<ProgressForm>(
    initialProgressForm(),
  );

  const [profileFile, setProfileFile] = useState<File | null>(null);
  const [preFiles, setPreFiles] = useState<File[]>([]);
  const [progressPreFiles, setProgressPreFiles] = useState<File[]>([]);

  const [progressFiles, setProgressFiles] = useState<File[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [user, setUser] = useState<LoginUser | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const request = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const token = getToken();

      const response = await fetch(`${API_URL}/${endpoint}`, {
        ...options,
        headers: {
          ...(options.body instanceof FormData
            ? {}
            : {
                "Content-Type": "application/json",
              }),
          ...(token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : {}),
          ...options.headers,
        },
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);

        throw new Error(
          payload?.message || payload?.error || "Permintaan gagal diproses",
        );
      }

      if (response.status === 204) {
        return null;
      }

      return response.json();
    },
    [],
  );

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await request(`daily-activities?type=${activityType}`);

      setRows(Array.isArray(result) ? result : []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Data gagal dimuat",
      );
    } finally {
      setLoading(false);
    }
  }, [activityType, request]);

  useEffect(() => {
    setUser(getCurrentUser());
    void loadRows();
  }, [loadRows]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return rows;
    }

    return rows.filter((row) =>
      [row.workName, row.location, row.lastPic, row.status, row.approvalStatus]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }, [rows, search]);

  const canApprove =
    user?.role === "SECTION_HEAD" ||
    user?.role === "GRUP_LEADER" ||
    user?.role === "ADMIN";

  function imageUrl(path: string): string {
    const normalized = path.replace(/\\/g, "/");
    const parts = normalized.split("/");

    return `${API_URL}/daily-activity-images/${parts[1]}/${parts[2]}/${parts[3]}`;
  }

  async function uploadSingle(
    file: File,
    category: "profile",
  ): Promise<string> {
    const compressed = await compressImage(file);
    const formData = new FormData();

    formData.append("file", compressed);

    const result = await request(
      `daily-activity-images/${category}?scope=${scope}`,
      {
        method: "POST",
        body: formData,
      },
    );

    return result.path;
  }

  async function uploadMany(
    files: File[],
    category: "pre-activities" | "progresses",
  ): Promise<string[]> {
    const compressed = await compressImages(files);
    const formData = new FormData();

    compressed.forEach((file) => {
      formData.append("files", file);
    });

    const result = await request(
      `daily-activity-images/${category}?scope=${scope}`,
      {
        method: "POST",
        body: formData,
      },
    );

    return Array.isArray(result.paths) ? result.paths : [];
  }

  function openCreate() {
    setEditing(null);
    setMainForm(initialMainForm());
    setProfileFile(null);
    setPreFiles([]);
    setError("");
    setMessage("");
    setCreateOpen(true);
  }

  function openEdit(row: DailyActivity) {
    setEditing(row);
    setMainForm({
      startDate: row.startDate.slice(0, 10),
      workName: row.workName,
      location: row.location,
      description: row.description ?? "",
      initialProgress: String(row.currentProgress),
      pic: row.lastPic ?? "",
      initialNotes: "",
    });
    setProfileFile(null);
    setPreFiles([]);
    setError("");
    setMessage("");
    setCreateOpen(true);
  }

  function openProgress(row: DailyActivity) {
    setProgressTarget(row);
    setProgressForm({
      ...initialProgressForm(),
      pic: row.lastPic ?? "",
    });
    setProgressPreFiles([]);

    setProgressFiles([]);
    setError("");
    setMessage("");
    setProgressOpen(true);
  }

  async function openDetail(row: DailyActivity) {
    setError("");

    try {
      const result = await request(`daily-activities/${row.id}`);

      setDetail(result);
      setDetailOpen(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Detail gagal dimuat",
      );
    }
  }

  async function submitMain(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editing) {
        await request(`daily-activities/${editing.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            startDate: mainForm.startDate,
            workName: mainForm.workName,
            location: mainForm.location,
            description: mainForm.description,
          }),
        });

        setMessage(`${title} berhasil diperbarui`);
      } else {
        if (!profileFile) {
          throw new Error("Satu foto lokasi sebelum dikerjakan wajib dipilih");
        }

        if (preFiles.length === 0) {
          throw new Error("Minimal satu foto Pre-Activity wajib dipilih");
        }

        const profilePhotoPath = await uploadSingle(profileFile, "profile");

        const preActivityPhotoPaths = await uploadMany(
          preFiles,
          "pre-activities",
        );

        await request("daily-activities", {
          method: "POST",
          body: JSON.stringify({
            activityType,
            startDate: mainForm.startDate,
            workName: mainForm.workName,
            location: mainForm.location,
            description: mainForm.description,
            profilePhotoPath,
            preActivityPhotoPaths,
            initialProgress: Number(mainForm.initialProgress),
            pic: mainForm.pic,
            initialNotes: mainForm.initialNotes,
          }),
        });

        setMessage(`${title} berhasil ditambahkan`);
      }

      setCreateOpen(false);
      await loadRows();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Data gagal disimpan",
      );
    } finally {
      setSaving(false);
    }
  }

  async function submitProgress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!progressTarget) {
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (progressPreFiles.length === 0) {
        throw new Error("Foto Pre-Activity hari ini wajib dipilih");
      }

      if (progressFiles.length === 0) {
        throw new Error("Foto progress wajib dipilih");
      }

      const preActivityPhotoPaths = await uploadMany(
        progressPreFiles,
        "pre-activities",
      );

      const photoPaths = await uploadMany(progressFiles, "progresses");

      await request(`daily-activities/${progressTarget.id}/progress`, {
        method: "POST",
        body: JSON.stringify({
          progressDate: progressForm.progressDate,
          addedProgress: Number(progressForm.addedProgress),
          pic: progressForm.pic,
          notes: progressForm.notes,
          preActivityPhotoPaths,
          photoPaths,
        }),
      });

      setProgressOpen(false);
      setProgressTarget(null);
      setProgressPreFiles([]);
      setProgressFiles([]);

      setMessage("Progress berhasil diperbarui");

      await loadRows();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Progress gagal disimpan",
      );
    } finally {
      setSaving(false);
    }
  }

  async function requestClose(row: DailyActivity) {
    const confirmed = window.confirm(
      `Ajukan close untuk pekerjaan ${row.workName}?`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await request(`daily-activities/${row.id}/request-close`, {
        method: "POST",
      });

      setMessage("Pengajuan close dikirim");
      await loadRows();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Pengajuan close gagal",
      );
    }
  }

  async function approve(row: DailyActivity) {
    const confirmed = window.confirm(`Approve pekerjaan ${row.workName}?`);

    if (!confirmed) {
      return;
    }

    try {
      await request(`daily-activities/${row.id}/approve`, {
        method: "POST",
      });

      setMessage("Pekerjaan berhasil disetujui");
      await loadRows();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Approval gagal",
      );
    }
  }

  async function reject(row: DailyActivity) {
    const comment = window.prompt("Masukkan komentar penolakan:");

    if (!comment?.trim()) {
      return;
    }

    try {
      await request(`daily-activities/${row.id}/reject`, {
        method: "POST",
        body: JSON.stringify({
          comment,
        }),
      });

      setMessage("Pekerjaan ditolak dan dapat diperbarui kembali");
      await loadRows();
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Reject gagal",
      );
    }
  }

  async function remove(row: DailyActivity) {
    const confirmed = window.confirm(`Hapus pekerjaan ${row.workName}?`);

    if (!confirmed) {
      return;
    }

    try {
      await request(`daily-activities/${row.id}`, {
        method: "DELETE",
      });

      setMessage("Pekerjaan berhasil dihapus");
      await loadRows();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Pekerjaan gagal dihapus",
      );
    }
  }

  function handleProfile(event: ChangeEvent<HTMLInputElement>) {
    setProfileFile(event.target.files?.[0] ?? null);
  }

  function handlePreFiles(event: ChangeEvent<HTMLInputElement>) {
    setPreFiles(Array.from(event.target.files ?? []));
  }

  function handleProgressFiles(event: ChangeEvent<HTMLInputElement>) {
    setProgressFiles(Array.from(event.target.files ?? []));
  }

  function handleProgressPreFiles(event: ChangeEvent<HTMLInputElement>) {
    setProgressPreFiles(Array.from(event.target.files ?? []));
  }
  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>{title}</h1>
          <p>
            Riwayat pekerjaan tersimpan dari Pre-Activity sampai selesai dan
            disetujui.
          </p>
        </div>

        <button
          type="button"
          className={styles.primaryButton}
          onClick={openCreate}
        >
          + Tambah {title}
        </button>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}

      {message && <div className={styles.successAlert}>{message}</div>}

      <div className={styles.toolbar}>
        <input
          type="search"
          placeholder="Cari pekerjaan, lokasi, PIC, atau status..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>No</th>
                <th>Foto</th>
                <th>Tanggal Dibuat</th>
                <th>Update Terakhir</th>
                <th>Nama Pekerjaan</th>
                <th>Lokasi</th>
                <th>Progress</th>
                <th>PIC Terakhir</th>
                <th>Status</th>
                <th>Approval</th>
                <th>Detail</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {loading && (
                <tr>
                  <td colSpan={12}>Memuat data...</td>
                </tr>
              )}

              {!loading &&
                filteredRows.map((row, index) => (
                  <tr key={row.id}>
                    <td>{index + 1}</td>
                    <td>
                      <img
                        className={styles.profileThumbnail}
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setPreviewImage(imageUrl(row.profilePhotoPath))
                        }
                        src={imageUrl(row.profilePhotoPath)}
                        alt={row.workName}
                      />
                    </td>
                    <td>{formatDate(row.startDate)}</td>
                    <td>{formatDate(row.lastProgressDate)}</td>
                    <td>{row.workName}</td>
                    <td>{row.location}</td>
                    <td>
                      <div className={styles.progressCell}>
                        <span>{row.currentProgress}%</span>
                        <div className={styles.progressTrack}>
                          <div
                            className={styles.progressValue}
                            style={{
                              width: `${row.currentProgress}%`,
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td>{row.lastPic ?? "-"}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          styles[`status${row.status}`]
                        }`}
                      >
                        {statusLabel(row.status)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          styles[`approval${row.approvalStatus}`]
                        }`}
                      >
                        {approvalLabel(row.approvalStatus)}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={styles.detailButton}
                        onClick={() => void openDetail(row)}
                      >
                        Detail
                      </button>
                    </td>
                    <td>
                      <div className={styles.actionButtons}>
                        {row.status !== "CLOSE" &&
                          row.status !== "WAITING_APPROVAL" && (
                            <button
                              type="button"
                              className={styles.updateButton}
                              onClick={() => openProgress(row)}
                            >
                              Update
                            </button>
                          )}

                        {row.status !== "CLOSE" && (
                          <button
                            type="button"
                            className={styles.editButton}
                            onClick={() => openEdit(row)}
                          >
                            Edit
                          </button>
                        )}

                        {row.currentProgress === 100 &&
                          row.status !== "CLOSE" &&
                          row.status !== "WAITING_APPROVAL" && (
                            <button
                              type="button"
                              className={styles.closeRequestButton}
                              onClick={() => void requestClose(row)}
                            >
                              Ajukan Close
                            </button>
                          )}

                        {canApprove && row.status === "WAITING_APPROVAL" && (
                          <>
                            <button
                              type="button"
                              className={styles.approveButton}
                              onClick={() => void approve(row)}
                            >
                              Approve
                            </button>

                            <button
                              type="button"
                              className={styles.rejectButton}
                              onClick={() => void reject(row)}
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {row.status !== "CLOSE" && (
                          <button
                            type="button"
                            className={styles.deleteButton}
                            onClick={() => void remove(row)}
                          >
                            Hapus
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}

              {!loading && filteredRows.length === 0 && (
                <tr>
                  <td colSpan={12}>Belum ada data {title}.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {createOpen && (
        <div className={styles.modalBackdrop}>
          <form className={styles.modal} onSubmit={submitMain}>
            <div className={styles.modalHeader}>
              <div>
                <h2>{editing ? `Edit ${title}` : `Tambah ${title}`}</h2>
                <p>Foto profil hanya ditentukan saat pekerjaan dibuat.</p>
              </div>

              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setCreateOpen(false)}
              >
                Tutup
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                <label>
                  <span>Tanggal Dibuat</span>
                  <input
                    type="date"
                    required
                    value={mainForm.startDate}
                    onChange={(event) =>
                      setMainForm((current) => ({
                        ...current,
                        startDate: event.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  <span>PIC</span>
                  <input
                    required={!editing}
                    disabled={Boolean(editing)}
                    value={mainForm.pic}
                    onChange={(event) =>
                      setMainForm((current) => ({
                        ...current,
                        pic: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className={styles.fullField}>
                  <span>Nama Pekerjaan</span>
                  <input
                    required
                    value={mainForm.workName}
                    onChange={(event) =>
                      setMainForm((current) => ({
                        ...current,
                        workName: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className={styles.fullField}>
                  <span>Lokasi</span>
                  <input
                    required
                    value={mainForm.location}
                    onChange={(event) =>
                      setMainForm((current) => ({
                        ...current,
                        location: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className={styles.fullField}>
                  <span>Keterangan</span>
                  <textarea
                    rows={3}
                    value={mainForm.description}
                    onChange={(event) =>
                      setMainForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                  />
                </label>

                {!editing && (
                  <>
                    <label>
                      <span>Progress Awal</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        required
                        value={mainForm.initialProgress}
                        onChange={(event) =>
                          setMainForm((current) => ({
                            ...current,
                            initialProgress: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label>
                      <span>Catatan Awal</span>
                      <input
                        value={mainForm.initialNotes}
                        onChange={(event) =>
                          setMainForm((current) => ({
                            ...current,
                            initialNotes: event.target.value,
                          }))
                        }
                      />
                    </label>

                    <label className={styles.fullField}>
                      <span>Foto Lokasi Sebelum Dikerjakan</span>
                      <input
                        type="file"
                        accept="image/*"
                        required
                        onChange={handleProfile}
                      />
                      <small>
                        Satu foto ini menjadi foto profil pekerjaan dan tidak
                        dapat diganti.
                      </small>
                    </label>

                    <label className={styles.fullField}>
                      <span>Foto Pre-Activity</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        required
                        onChange={handlePreFiles}
                      />
                      <small>Dapat memilih banyak foto sekaligus.</small>
                    </label>
                  </>
                )}

                {editing && (
                  <div className={styles.lockedPhotoInfo}>
                    Foto profil dan foto Pre-Activity dikunci agar dokumentasi
                    awal tetap sama.
                  </div>
                )}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setCreateOpen(false)}
              >
                Batal
              </button>

              <button
                type="submit"
                className={styles.primaryButton}
                disabled={saving}
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {progressOpen && progressTarget && (
        <div className={styles.modalBackdrop}>
          <form className={styles.modal} onSubmit={submitProgress}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Update Progress</h2>
                <p>{progressTarget.workName}</p>
              </div>

              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setProgressOpen(false)}
              >
                Tutup
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.currentProgressBox}>
                Progress saat ini:{" "}
                <strong>{progressTarget.currentProgress}%</strong>
              </div>

              <div className={styles.formGrid}>
                <label>
                  <span>Tanggal Update</span>
                  <input
                    type="date"
                    required
                    min={progressTarget.startDate.slice(0, 10)}
                    value={progressForm.progressDate}
                    onChange={(event) =>
                      setProgressForm((current) => ({
                        ...current,
                        progressDate: event.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  <span>Penambahan Progress</span>
                  <input
                    type="number"
                    min="1"
                    max={100 - progressTarget.currentProgress}
                    required
                    value={progressForm.addedProgress}
                    onChange={(event) =>
                      setProgressForm((current) => ({
                        ...current,
                        addedProgress: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className={styles.fullField}>
                  <span>PIC Hari Ini</span>
                  <input
                    required
                    value={progressForm.pic}
                    onChange={(event) =>
                      setProgressForm((current) => ({
                        ...current,
                        pic: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className={styles.fullField}>
                  <span>Keterangan Progress</span>
                  <textarea
                    rows={3}
                    value={progressForm.notes}
                    onChange={(event) =>
                      setProgressForm((current) => ({
                        ...current,
                        notes: event.target.value,
                      }))
                    }
                  />
                </label>
                <label className={styles.fullField}>
                  <span>Foto Pre-Activity Hari Ini</span>

                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    required
                    onChange={handleProgressPreFiles}
                  />

                  <small>
                    Foto kondisi sebelum pekerjaan dimulai pada tanggal update.
                  </small>
                </label>

                <label className={styles.fullField}>
                  <span>Foto Progress</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    required
                    onChange={handleProgressFiles}
                  />
                </label>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={() => setProgressOpen(false)}
              >
                Batal
              </button>

              <button
                type="submit"
                className={styles.primaryButton}
                disabled={saving}
              >
                {saving ? "Menyimpan..." : "Simpan Update"}
              </button>
            </div>
          </form>
        </div>
      )}

      {detailOpen && detail && (
        <div className={styles.modalBackdrop}>
          <div className={`${styles.modal} ${styles.detailModal}`}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Detail Pekerjaan</h2>
                <p>{detail.workName}</p>
              </div>

              <button
                type="button"
                className={styles.modalClose}
                onClick={() => setDetailOpen(false)}
              >
                Tutup
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.detailSummary}>
                <img
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    setPreviewImage(imageUrl(detail.profilePhotoPath))
                  }
                  src={imageUrl(detail.profilePhotoPath)}
                  alt={detail.workName}
                />

                <div>
                  <h3>{detail.workName}</h3>
                  <p>Lokasi: {detail.location}</p>
                  <p>Tanggal dibuat: {formatDate(detail.startDate)}</p>
                  <p>Update terakhir: {formatDate(detail.lastProgressDate)}</p>
                  <p>Progress: {detail.currentProgress}%</p>
                  <p>Status: {statusLabel(detail.status)}</p>
                </div>
              </div>

              <h3 className={styles.sectionTitle}>Riwayat Progress</h3>

              <div className={styles.timeline}>
                {detail.progressHistories?.map((history) => (
                  <article key={history.id} className={styles.timelineItem}>
                    <div className={styles.timelineHeader}>
                      <strong>{formatDate(history.progressDate)}</strong>

                      <div className={styles.historyProgress}>
                        <strong>{history.currentProgress}%</strong>

                        {history.addedProgress > 0 && (
                          <span className={styles.progressIncrease}>
                            <span
                              className={styles.increaseArrow}
                              aria-hidden="true"
                            />
                            <span>Naik {history.addedProgress}%</span>
                          </span>
                        )}
                      </div>
                    </div>

                    <p>PIC: {history.pic}</p>

                    {history.notes && <p>Keterangan: {history.notes}</p>}

                    <strong className={styles.photoGroupTitle}>
                      Foto Pre-Activity
                    </strong>

                    {(history.preActivityPhotoPaths ?? []).length > 0 ? (
                      <div className={styles.imageGrid}>
                        {(history.preActivityPhotoPaths ?? []).map((path) => (
                          <button
                            key={path}
                            type="button"
                            className={styles.imageButton}
                            onClick={() => setPreviewImage(imageUrl(path))}
                          >
                            <img src={imageUrl(path)} alt="Pre-Activity" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.emptyPhotoText}>
                        Foto Pre-Activity belum tersedia.
                      </p>
                    )}

                    <strong className={styles.photoGroupTitle}>
                      Foto Progress
                    </strong>

                    {history.photoPaths.length > 0 ? (
                      <div className={styles.imageGrid}>
                        {history.photoPaths.map((path) => (
                          <button
                            key={path}
                            type="button"
                            className={styles.imageButton}
                            onClick={() => setPreviewImage(imageUrl(path))}
                          >
                            <img src={imageUrl(path)} alt="Progress" />
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className={styles.emptyPhotoText}>
                        Foto progress belum tersedia.
                      </p>
                    )}
                  </article>
                ))}
              </div>

              {Boolean(detail.approvals?.length) && (
                <>
                  <h3 className={styles.sectionTitle}>Riwayat Approval</h3>

                  <div className={styles.approvalHistory}>
                    {detail.approvals?.map((approval) => (
                      <article key={approval.id}>
                        <strong>{approval.decision}</strong>
                        <span>{formatDate(approval.actedAt)}</span>
                        <p>{approval.comment || "-"}</p>
                        <small>
                          Oleh:{" "}
                          {approval.actor?.name ||
                            approval.actor?.username ||
                            "-"}
                        </small>
                      </article>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {previewImage && (
        <div
          className={styles.imagePreviewBackdrop}
          role="presentation"
          onClick={() => setPreviewImage(null)}
        >
          <div
            className={styles.imagePreviewModal}
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className={styles.imagePreviewClose}
              onClick={() => setPreviewImage(null)}
            >
              Tutup
            </button>

            <img src={previewImage} alt="Preview dokumentasi" />
          </div>
        </div>
      )}
    </section>
  );
}
