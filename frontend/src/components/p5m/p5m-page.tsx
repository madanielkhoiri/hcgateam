"use client";

import {
  Edit3,
  FileDown,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  Users,
  X,
} from "lucide-react";
import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { compressImages } from "@/lib/compress-image";
import styles from "./p5m.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type P5mRow = {
  id: number;
  activityDate: string;
  location: string;
  speaker: string | null;
  participants: string | null;
  topic: string;
  supervisors: unknown;
  documentationPaths: string[];
  notes: string | null;
  status: "DRAFT" | "OPEN" | "CLOSED";
  startTime: string;
  endTime: string | null;
  _count?: { attendances: number };
  attendances?: Array<{ id: number }>;
  creator?: {
    id: number;
    name: string;
  };
};

type AttendanceForm = {
  sleep72: boolean; sleep48: boolean;
  sleep24: "LESS_THAN_4" | "BETWEEN_4_6" | "MORE_THAN_6";
  nutritionEnough: boolean; noAlcoholMedicine: boolean;
  noExcessActivity: boolean; noExcessStress: boolean;
  noSeriousIllness: boolean; noFamilyProblem: boolean;
  understandsWork: boolean; health: "HEALTHY" | "SICK";
};
type AttendanceRow = AttendanceForm & {
  id: number; nameSnapshot: string; nrpSnapshot: string;
  jobTitleSnapshot: string; departmentSnapshot: string;
  allowedToWork: boolean | null; reviewNote: string | null;
};

const emptyAttendance: AttendanceForm = {
  sleep72: false, sleep48: false, sleep24: "MORE_THAN_6",
  nutritionEnough: false, noAlcoholMedicine: false,
  noExcessActivity: false, noExcessStress: false,
  noSeriousIllness: false, noFamilyProblem: false,
  understandsWork: false, health: "HEALTHY",
};

type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

type FormState = {
  activityDate: string;
  location: string;
  speaker: string;
  participants: string;
  topic: string;
  notes: string;
};

type OpenFormState = {
  activityDate: string;
  location: string;
  startTime: string;
};

const initialSupervisors = [
  "Akhmad Nurul Fahmi",
  "Arief Ahmad Fauzi",
  "Herfit Almiya",
  "Arief Rahman Hakim",
  "Angga Dwi Cahyanto",
  "Lela Kurniawati",
  "Misbahkul Huda",
  "Muhamat Rahmadoni",
  "Muhammad Faiq Dani",
  "Alifia Salsabila Putri",
  "Hady Saputra",
  "Singgieh Prananda",
  "Satrio",
];

function getToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    window.localStorage.getItem("hcga_access_token") ||
    window.sessionStorage.getItem("hcga_access_token") ||
    ""
  );
}

function todayValue() {
  return new Date().toISOString().slice(0, 10);
}

function emptyForm(): FormState {
  return {
    activityDate: todayValue(),
    location: "",
    speaker: "",
    participants: "",
    topic: "",
    notes: "",
  };
}

function currentTimeValue() {
  return new Date()
    .toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    .replace(".", ":");
}

function emptyOpenForm(): OpenFormState {
  return {
    activityDate: todayValue(),
    location: "",
    startTime: currentTimeValue(),
  };
}

function normalizeSupervisors(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed
          .map(String)
          .map((item) => item.trim())
          .filter(Boolean);
      }
    } catch {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
}

function formatDate(value: string) {
  const date = new Date(value);

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function fileUrl(path: string) {
  if (!path) {
    return "";
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  return `${API_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

async function readError(response: Response) {
  try {
    const data = await response.json();

    if (Array.isArray(data.message)) {
      return data.message.join(", ");
    }

    return data.message ?? "Proses gagal.";
  } catch {
    return "Proses gagal.";
  }
}

export default function P5mPage() {
  const [canManage, setCanManage] = useState(false);
  const [rows, setRows] = useState<P5mRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [openFormVisible, setOpenFormVisible] = useState(false);
  const [openForm, setOpenForm] = useState<OpenFormState>(emptyOpenForm);
  const [editingRow, setEditingRow] = useState<P5mRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<P5mRow | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm());

  const [availableSupervisors, setAvailableSupervisors] =
    useState<string[]>(initialSupervisors);

  const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState("");
  const [manualSupervisor, setManualSupervisor] = useState("");

  const [documentationPaths, setDocumentationPaths] = useState<string[]>([]);
  const [attendanceTarget, setAttendanceTarget] = useState<P5mRow | null>(null);
  const [attendanceForm, setAttendanceForm] = useState<AttendanceForm>(emptyAttendance);
  const [reviewTarget, setReviewTarget] = useState<(Omit<P5mRow, "attendances"> & { attendances: AttendanceRow[] }) | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("hcga_user") || sessionStorage.getItem("hcga_user") || localStorage.getItem("user") || sessionStorage.getItem("user");
      const role = raw ? JSON.parse(raw).role : "";
      setCanManage(["SUPER_ADMIN", "ADMIN", "SECTION_HEAD", "GRUP_LEADER", "GRUP_LEADER_IR", "GRUP_LEADER_COMBEN", "GRUP_LEADER_GA", "GRUP_LEADER_RND"].includes(role));
    } catch { setCanManage(false); }
  }, []);

  const availableYears = useMemo(() => {
    const current = new Date().getFullYear();

    return Array.from({ length: 7 }, (_, index) => current - 5 + index);
  }, []);

  const loadData = useCallback(
    async (targetPage = 1) => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        params.set("page", String(targetPage));
        params.set("limit", "10");

        if (search.trim()) {
          params.set("search", search.trim());
        }

        if (month) {
          params.set("month", month);
        }

        if (year) {
          params.set("year", year);
        }

        const response = await fetch(`${API_URL}/p5m?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        });

        if (!response.ok) {
          throw new Error(await readError(response));
        }

        const result = (await response.json()) as {
          data: P5mRow[];
          pagination: Pagination;
        };

        setRows(result.data ?? []);
        setPagination(result.pagination);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Data P5M gagal dimuat.",
        );
      } finally {
        setLoading(false);
      }
    },
    [month, search, year],
  );

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadData(1);
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [loadData]);

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function showOpenP5m() {
    setOpenForm(emptyOpenForm());
    setError("");
    setMessage("");
    setOpenFormVisible(true);
  }

  async function createAndOpenP5m(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const createResponse = await fetch(`${API_URL}/p5m`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          activityDate: openForm.activityDate,
          location: openForm.location.trim(),
          speaker: "",
          participants: "",
          topic: "Menunggu hasil pelaksanaan P5M",
          supervisors: [],
          documentationPaths: [],
        }),
      });

      if (!createResponse.ok) {
        throw new Error(await readError(createResponse));
      }

      const created = (await createResponse.json()) as P5mRow;
      const openResponse = await fetch(`${API_URL}/p5m/${created.id}/open`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ startTime: openForm.startTime }),
      });

      if (!openResponse.ok) {
        throw new Error(await readError(openResponse));
      }

      setOpenFormVisible(false);
      setMessage("P5M dibuka. Karyawan sudah dapat melakukan absensi.");
      await loadData(1);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "P5M gagal dibuka.");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(row: P5mRow) {
    const supervisors = normalizeSupervisors(row.supervisors);

    setEditingRow(row);
    setForm({
      activityDate: row.activityDate.slice(0, 10),
      location: row.location,
      speaker: row.speaker ?? "",
      participants: row.participants ?? "",
      topic: row.topic,
      notes: row.notes ?? "",
    });

    setSelectedSupervisors(supervisors);
    setAvailableSupervisors((current) =>
      Array.from(new Set([...current, ...supervisors])),
    );

    setSelectedSupervisor("");
    setManualSupervisor("");
    setDocumentationPaths(row.documentationPaths ?? []);
    setError("");
    setMessage("");
    setFormOpen(true);
  }

  function addSelectedSupervisor() {
    const name = selectedSupervisor.trim();

    if (!name) {
      return;
    }

    setSelectedSupervisors((current) =>
      current.includes(name) ? current : [...current, name],
    );

    setSelectedSupervisor("");
  }

  function addManualSupervisor() {
    const name = manualSupervisor.trim();

    if (!name) {
      return;
    }

    setAvailableSupervisors((current) =>
      current.includes(name) ? current : [...current, name],
    );

    setSelectedSupervisors((current) =>
      current.includes(name) ? current : [...current, name],
    );

    setManualSupervisor("");
  }

  function removeSupervisor(name: string) {
    setSelectedSupervisors((current) =>
      current.filter((item) => item !== name),
    );
  }

  async function uploadFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) {
      return;
    }

    if (documentationPaths.length + files.length > 4) {
      setError("Dokumentasi maksimal 4 foto.");
      event.target.value = "";
      return;
    }

    setUploading(true);
    setError("");

    try {
      const filesTerkompres = await compressImages(files);
      const formData = new FormData();

      filesTerkompres.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(`${API_URL}/p5m/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const result = (await response.json()) as {
        paths: string[];
      };

      setDocumentationPaths((current) => [...current, ...(result.paths ?? [])]);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Foto gagal diunggah.",
      );
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  }

  function removePhoto(index: number) {
    setDocumentationPaths((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (!selectedSupervisors.length) {
        throw new Error("Minimal satu pengawas wajib dipilih.");
      }

      if (!documentationPaths.length) {
        throw new Error("Minimal satu foto dokumentasi wajib diunggah.");
      }

      const payload = {
        activityDate: form.activityDate,
        location: form.location.trim(),
        speaker: form.speaker.trim(),
        participants: form.participants.trim(),
        topic: form.topic.trim(),
        supervisors: selectedSupervisors,
        documentationPaths,
        notes: form.notes.trim() || undefined,
      };

      const response = await fetch(
        editingRow ? `${API_URL}/p5m/${editingRow.id}` : `${API_URL}/p5m`,
        {
          method: editingRow ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setFormOpen(false);
      setMessage(
        editingRow
          ? "Data P5M berhasil diperbarui."
          : "Data P5M berhasil dibuat.",
      );

      await loadData(editingRow ? pagination.page : 1);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Data P5M gagal disimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function openPdf(row: P5mRow) {
    setError("");

    try {
      const response = await fetch(`${API_URL}/p5m/${row.id}/pdf`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      window.open(url, "_blank", "noopener,noreferrer");

      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 60000);
    } catch (pdfError) {
      setError(
        pdfError instanceof Error ? pdfError.message : "PDF gagal dibuka.",
      );
    }
  }

  async function deleteRow() {
    if (!deleteTarget) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/p5m/${deleteTarget.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setDeleteTarget(null);
      setMessage("Data P5M berhasil dihapus.");
      await loadData(pagination.page);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Data P5M gagal dihapus.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function sessionAction(row: P5mRow, action: "open" | "close") {
    setError("");
    try {
      let body: string | undefined;
      if (action === "open") {
        const current = new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(".", ":");
        const startTime = window.prompt("Tentukan jam mulai P5M (HH:mm)", current);
        if (!startTime) return;
        body = JSON.stringify({ startTime });
      }
      const response = await fetch(`${API_URL}/p5m/${row.id}/${action}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}`, ...(body ? { "Content-Type": "application/json" } : {}) },
        body,
      });
      if (!response.ok) throw new Error(await readError(response));
      setMessage(action === "open" ? "Sesi P5M dibuka. Karyawan sudah dapat mengisi absensi." : "Sesi P5M ditutup.");
      await loadData(pagination.page);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Status sesi gagal diperbarui."); }
  }

  async function submitAttendance(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!attendanceTarget) return;
    setSaving(true); setError("");
    try {
      const response = await fetch(`${API_URL}/p5m/${attendanceTarget.id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(attendanceForm),
      });
      if (!response.ok) throw new Error(await readError(response));
      setAttendanceTarget(null);
      setMessage("Absensi dan pemeriksaan kesiapan kerja berhasil dikirim.");
      await loadData(pagination.page);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Absensi gagal dikirim."); }
    finally { setSaving(false); }
  }

  async function openReview(row: P5mRow) {
    setError("");
    try {
      const response = await fetch(`${API_URL}/p5m/${row.id}`, { headers: { Authorization: `Bearer ${getToken()}` } });
      if (!response.ok) throw new Error(await readError(response));
      setReviewTarget(await response.json());
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Absensi gagal dimuat."); }
  }

  async function reviewAttendance(item: AttendanceRow, allowedToWork: boolean) {
    if (!reviewTarget) return;
    const reviewNote = window.prompt(allowedToWork ? "Keterangan (boleh dikosongkan)" : "Alasan tidak boleh kerja", item.reviewNote || "");
    if (reviewNote === null) return;
    try {
      const response = await fetch(`${API_URL}/p5m/${reviewTarget.id}/attendance/${item.id}/review`, {
        method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ allowedToWork, reviewNote }),
      });
      if (!response.ok) throw new Error(await readError(response));
      await openReview(reviewTarget);
      setMessage("Hasil pemeriksaan peserta diperbarui.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Review gagal disimpan."); }
  }

  function resetFilters() {
    setSearch("");
    setMonth("");
    setYear("");
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroTitle}>
          <span className={styles.heroIcon}>
            <Users size={25} />
          </span>

          <div>
            <h1>P5M</h1>
            <p>
              Pencatatan pelaksanaan safety meeting sebelum pekerjaan dimulai.
            </p>
          </div>
        </div>

        {canManage && <button className={styles.primaryButton} onClick={showOpenP5m}>
          <Plus size={18} />
          Open P5M
        </button>}
      </section>

      {message && <div className={styles.success}>{message}</div>}
      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.filterCard}>
        <label className={styles.searchBox}>
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari materi, lokasi, pemateri, atau peserta..."
          />
        </label>

        <select
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        >
          <option value="">Semua Bulan</option>
          {Array.from({ length: 12 }, (_, index) => (
            <option key={index + 1} value={index + 1}>
              {new Intl.DateTimeFormat("id-ID", {
                month: "long",
              }).format(new Date(2026, index, 1))}
            </option>
          ))}
        </select>

        <select value={year} onChange={(event) => setYear(event.target.value)}>
          <option value="">Semua Tahun</option>
          {availableYears.map((item) => (
            <option value={item} key={item}>
              {item}
            </option>
          ))}
        </select>

        <button className={styles.secondaryButton} onClick={resetFilters}>
          Reset
        </button>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div>
            <h2>Daftar P5M</h2>
            <p>Total {pagination.total} data</p>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>NO</th>
                <th>TANGGAL</th>
                <th>LOKASI</th>
                <th>PEMATERI</th>
                <th>PENGAWAS</th>
                <th>PESERTA</th>
                <th>MATERI</th>
                <th>DOKUMENTASI</th>
                <th>STATUS / ABSENSI</th>
                <th>AKSI</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10}>
                    <div className={styles.emptyState}>
                      <Loader2 className={styles.spinner} size={28} />
                      Memuat data P5M...
                    </div>
                  </td>
                </tr>
              ) : rows.length ? (
                rows.map((row, index) => {
                  const supervisors = normalizeSupervisors(row.supervisors);

                  return (
                    <tr key={row.id}>
                      <td>
                        {(pagination.page - 1) * pagination.limit + index + 1}
                      </td>
                      <td>{formatDate(row.activityDate)}</td>
                      <td>
                        <span className={styles.location}>
                          <MapPin size={14} />
                          {row.location}
                        </span>
                      </td>
                      <td>{row.speaker || "-"}</td>
                      <td>{supervisors.join(", ") || "-"}</td>
                      <td>{row.participants || "-"}</td>
                      <td>{row.topic}</td>
                      <td>{row.documentationPaths.length} foto</td>
                      <td>
                        <strong>{row.status === "OPEN" ? "Dibuka" : row.status === "CLOSED" ? "Ditutup" : "Draft"}</strong><br />
                        {row._count?.attendances ?? 0} peserta
                      </td>
                      <td>
                        <div className={styles.actions}>
                          {canManage && row.status === "OPEN" && (
                            <button className={styles.viewButton} type="button" onClick={() => void sessionAction(row, row.status === "OPEN" ? "close" : "open")}>
                              Tutup P5M
                            </button>
                          )}
                          {canManage && (
                            <button className={styles.viewButton} type="button" onClick={() => void openReview(row)}>Review</button>
                          )}
                          {!canManage && row.status === "OPEN" && (
                            <button className={styles.viewButton} type="button" disabled={Boolean(row.attendances?.length)} onClick={() => { setAttendanceForm(emptyAttendance); setAttendanceTarget(row); }}>
                              {row.attendances?.length ? "Sudah Absen" : "Isi Absensi"}
                            </button>
                          )}
                          {canManage && row.status === "CLOSED" && row.speaker && row.topic !== "Menunggu hasil pelaksanaan P5M" && row.documentationPaths.length > 0 && <button
                            className={styles.viewButton}
                            title="Buka PDF"
                            type="button"
                            onClick={() => void openPdf(row)}
                          >
                            <FileDown size={16} />
                          </button>}

                          {canManage && row.status === "CLOSED" && <button
                            className={styles.editButton}
                            title="Lengkapi hasil P5M"
                            type="button"
                            onClick={() => openEdit(row)}
                          >
                            <Edit3 size={16} /> Lengkapi Hasil
                          </button>}

                          <button
                            className={styles.deleteButton}
                            title="Hapus"
                            type="button"
                            onClick={() => setDeleteTarget(row)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={10}>
                    <div className={styles.emptyState}>Belum ada data P5M.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <span>
            Halaman {pagination.page} dari {pagination.totalPages}
          </span>

          <div>
            <button
              className={styles.secondaryButton}
              disabled={pagination.page <= 1}
              onClick={() => void loadData(pagination.page - 1)}
            >
              Sebelumnya
            </button>

            <button
              className={styles.secondaryButton}
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => void loadData(pagination.page + 1)}
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>

      {openFormVisible && (
        <div className={styles.modalBackdrop}>
          <div className={styles.formModal}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Open P5M</h2>
                <p>Buka sesi absensi terlebih dahulu. Data pelaksanaan dilengkapi setelah P5M selesai.</p>
              </div>
              <button className={styles.closeButton} type="button" onClick={() => setOpenFormVisible(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={createAndOpenP5m}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <label>
                    <span>Tanggal P5M</span>
                    <input type="date" required value={openForm.activityDate} onChange={(event) => setOpenForm((current) => ({ ...current, activityDate: event.target.value }))} />
                  </label>
                  <label>
                    <span>Jam Mulai Absensi</span>
                    <input type="time" required value={openForm.startTime} onChange={(event) => setOpenForm((current) => ({ ...current, startTime: event.target.value }))} />
                  </label>
                  <label className={styles.fullField}>
                    <span>Lokasi</span>
                    <input required value={openForm.location} placeholder="Lokasi pelaksanaan P5M" onChange={(event) => setOpenForm((current) => ({ ...current, location: event.target.value }))} />
                  </label>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.secondaryButton} type="button" onClick={() => setOpenFormVisible(false)}>Batal</button>
                <button className={styles.primaryButton} type="submit" disabled={saving}>
                  {saving ? "Membuka..." : "Buka Absensi P5M"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {formOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.formModal}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Lengkapi Hasil P5M</h2>
                <p>Isi penyaji, materi, pengawas, catatan, dan dokumentasi setelah pelaksanaan selesai.</p>
              </div>

              <button
                className={styles.closeButton}
                type="button"
                onClick={() => setFormOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={submitForm}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <label>
                    <span>Tanggal</span>
                    <input
                      type="date"
                      value={form.activityDate}
                      required
                      onChange={(event) =>
                        updateField("activityDate", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    <span>Lokasi</span>
                    <input
                      value={form.location}
                      required
                      placeholder="Lokasi meeting"
                      onChange={(event) =>
                        updateField("location", event.target.value)
                      }
                    />
                  </label>

                  <label className={styles.fullField}>
                    <span>Penyaji / Pemateri</span>
                    <input
                      value={form.speaker}
                      required
                      placeholder="Nama pemateri"
                      onChange={(event) =>
                        updateField("speaker", event.target.value)
                      }
                    />
                  </label>

                  <div className={styles.fullField}>
                    <span className={styles.fieldTitle}>Pengawas</span>

                    <div className={styles.supervisorInputGrid}>
                      <div>
                        <span className={styles.inputCaption}>
                          Pilih nama Pengawas dari daftar GL
                        </span>

                        <div className={styles.inlineInput}>
                          <select
                            value={selectedSupervisor}
                            onChange={(event) =>
                              setSelectedSupervisor(event.target.value)
                            }
                          >
                            <option value="">Pilih nama GL</option>
                            {availableSupervisors.map((name) => (
                              <option value={name} key={name}>
                                {name}
                              </option>
                            ))}
                          </select>

                          <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={addSelectedSupervisor}
                          >
                            Tambah
                          </button>
                        </div>
                      </div>

                      <div>
                        <span className={styles.inputCaption}>
                          Tambah nama Pengawas secara manual bila belum tersedia
                        </span>

                        <div className={styles.inlineInput}>
                          <input
                            value={manualSupervisor}
                            placeholder="Ketik nama pengawas"
                            onChange={(event) =>
                              setManualSupervisor(event.target.value)
                            }
                          />

                          <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={addManualSupervisor}
                          >
                            Tambah Manual
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className={styles.selectedSupervisorLabel}>
                      Daftar Pengawas Dipilih
                    </div>

                    <div className={styles.selectedSupervisors}>
                      {selectedSupervisors.length ? (
                        selectedSupervisors.map((name, index) => (
                          <div key={name} className={styles.supervisorChip}>
                            <span>
                              {index + 1}. {name}
                            </span>

                            <button
                              type="button"
                              onClick={() => removeSupervisor(name)}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))
                      ) : (
                        <div className={styles.noImage}>
                          Belum ada pengawas dipilih.
                        </div>
                      )}
                    </div>
                  </div>

                  <label className={styles.fullField}>
                    <span>Peserta (otomatis dari absensi online)</span>
                    <textarea
                      rows={3}
                      value={form.participants}
                      placeholder="Akan terisi otomatis setelah karyawan melakukan absensi"
                      disabled={!editingRow}
                      onChange={(event) =>
                        updateField("participants", event.target.value)
                      }
                    />
                  </label>

                  <label className={styles.fullField}>
                    <span>Materi</span>
                    <textarea
                      rows={5}
                      value={form.topic}
                      required
                      placeholder="Isi materi safety meeting"
                      onChange={(event) =>
                        updateField("topic", event.target.value)
                      }
                    />
                  </label>

                  <label className={styles.fullField}>
                    <span>Catatan</span>
                    <textarea
                      rows={2}
                      value={form.notes}
                      onChange={(event) =>
                        updateField("notes", event.target.value)
                      }
                    />
                  </label>
                </div>

                <div className={styles.uploadHeader}>
                  <div>
                    <h3>Dokumentasi</h3>
                    <p>Maksimal 4 foto dokumentasi.</p>
                  </div>

                  <label className={styles.uploadButton}>
                    {uploading ? (
                      <Loader2 className={styles.spinner} size={17} />
                    ) : (
                      <UploadCloud size={17} />
                    )}

                    {uploading ? "Mengunggah..." : "Tambah Gambar"}

                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      disabled={uploading || documentationPaths.length >= 4}
                      onChange={uploadFiles}
                    />
                  </label>
                </div>

                <div className={styles.imageGrid}>
                  {documentationPaths.map((path, index) => (
                    <div className={styles.imageCard} key={`${path}-${index}`}>
                      <img
                        src={fileUrl(path)}
                        alt={`Dokumentasi ${index + 1}`}
                      />

                      <button type="button" onClick={() => removePhoto(index)}>
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}

                  {!documentationPaths.length && (
                    <div className={styles.noImage}>
                      <ImagePlus size={28} />
                      Belum ada dokumentasi.
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  className={styles.secondaryButton}
                  type="button"
                  onClick={() => setFormOpen(false)}
                >
                  Batal
                </button>

                <button
                  className={styles.primaryButton}
                  type="submit"
                  disabled={saving || uploading}
                >
                  {saving && <Loader2 className={styles.spinner} size={17} />}
                  {editingRow ? "Simpan Perubahan" : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {attendanceTarget && (
        <div className={styles.modalBackdrop}>
          <div className={styles.formModal}>
            <div className={styles.modalHeader}>
              <div><h2>Absensi & Kesiapan Kerja</h2><p>{attendanceTarget.topic} · {attendanceTarget.location}</p></div>
              <button className={styles.closeButton} type="button" onClick={() => setAttendanceTarget(null)}><X size={20} /></button>
            </div>
            <form onSubmit={submitAttendance}>
              <div className={styles.modalBody}>
                <p>Nama, NRP, jabatan, dan departemen diambil otomatis dari akun Anda.</p>
                {([
                  ["sleep72", "Tidur cukup 72 jam terakhir (minimal 18 jam)"],
                  ["sleep48", "Tidur cukup 48 jam terakhir (minimal 12 jam)"],
                  ["nutritionEnough", "Asupan gizi cukup"],
                  ["noAlcoholMedicine", "Tidak konsumsi alkohol/obat termasuk herbal"],
                  ["noExcessActivity", "Tidak melakukan aktivitas berlebih sebelum kerja"],
                  ["noExcessStress", "Bebas beban pikiran/stres"],
                  ["noSeriousIllness", "Bebas penyakit serius dan telah diobati"],
                  ["noFamilyProblem", "Bebas masalah keluarga"],
                  ["understandsWork", "Memahami pekerjaan yang akan dilakukan"],
                ] as Array<[keyof AttendanceForm, string]>).map(([key, label]) => (
                  <label key={key} style={{ display: "flex", gap: 10, alignItems: "center", margin: "12px 0" }}>
                    <input type="checkbox" checked={Boolean(attendanceForm[key])} onChange={(e) => setAttendanceForm((v) => ({ ...v, [key]: e.target.checked }))} /> {label}
                  </label>
                ))}
                <label><span>Tidur 24 jam terakhir</span><select value={attendanceForm.sleep24} onChange={(e) => setAttendanceForm((v) => ({ ...v, sleep24: e.target.value as AttendanceForm["sleep24"] }))}><option value="LESS_THAN_4">Kurang dari 4 jam</option><option value="BETWEEN_4_6">4–6 jam</option><option value="MORE_THAN_6">Lebih dari 6 jam</option></select></label>
                <label><span>Kondisi kesehatan</span><select value={attendanceForm.health} onChange={(e) => setAttendanceForm((v) => ({ ...v, health: e.target.value as AttendanceForm["health"] }))}><option value="HEALTHY">Sehat</option><option value="SICK">Sakit</option></select></label>
              </div>
              <div className={styles.modalFooter}><button type="button" className={styles.secondaryButton} onClick={() => setAttendanceTarget(null)}>Batal</button><button className={styles.primaryButton} disabled={saving}>{saving ? "Mengirim..." : "Kirim Absensi"}</button></div>
            </form>
          </div>
        </div>
      )}

      {reviewTarget && (
        <div className={styles.modalBackdrop}>
          <div className={styles.formModal}>
            <div className={styles.modalHeader}>
              <div><h2>Review Absensi P5M</h2><p>{reviewTarget.attendances.length} peserta · keputusan Boleh Kerja oleh GL</p></div>
              <button className={styles.closeButton} type="button" onClick={() => setReviewTarget(null)}><X size={20} /></button>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.tableWrap}><table><thead><tr><th>Nama / NRP</th><th>Jabatan</th><th>Kesehatan</th><th>Boleh Kerja</th><th>Keterangan</th><th>Aksi GL</th></tr></thead><tbody>
                {reviewTarget.attendances.map((item) => <tr key={item.id}>
                  <td><strong>{item.nameSnapshot}</strong><br />{item.nrpSnapshot}</td><td>{item.jobTitleSnapshot}</td>
                  <td>{item.health === "HEALTHY" ? "Sehat" : "Sakit"}</td>
                  <td>{item.allowedToWork == null ? "Belum direview" : item.allowedToWork ? "Ya" : "Tidak"}</td><td>{item.reviewNote || "-"}</td>
                  <td><div className={styles.actions}><button className={styles.viewButton} type="button" onClick={() => void reviewAttendance(item, true)}>Boleh</button><button className={styles.deleteButton} type="button" onClick={() => void reviewAttendance(item, false)}>Tidak</button></div></td>
                </tr>)}
                {!reviewTarget.attendances.length && <tr><td colSpan={6}>Belum ada karyawan yang mengisi absensi.</td></tr>}
              </tbody></table></div>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className={styles.modalBackdrop}>
          <div className={styles.confirmModal}>
            <h2>Hapus data P5M?</h2>
            <p>Data materi P5M akan dihapus.</p>

            <div className={styles.confirmActions}>
              <button
                className={styles.secondaryButton}
                type="button"
                onClick={() => setDeleteTarget(null)}
              >
                Batal
              </button>

              <button
                className={styles.dangerButton}
                type="button"
                disabled={saving}
                onClick={() => void deleteRow()}
              >
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
