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
  creator?: {
    id: number;
    name: string;
  };
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
  const [editingRow, setEditingRow] = useState<P5mRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<P5mRow | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm());

  const [availableSupervisors, setAvailableSupervisors] =
    useState<string[]>(initialSupervisors);

  const [selectedSupervisors, setSelectedSupervisors] = useState<string[]>([]);
  const [selectedSupervisor, setSelectedSupervisor] = useState("");
  const [manualSupervisor, setManualSupervisor] = useState("");

  const [documentationPaths, setDocumentationPaths] = useState<string[]>([]);

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

  function openCreate() {
    setEditingRow(null);
    setForm(emptyForm());
    setSelectedSupervisors([]);
    setSelectedSupervisor("");
    setManualSupervisor("");
    setDocumentationPaths([]);
    setError("");
    setMessage("");
    setFormOpen(true);
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

        <button className={styles.primaryButton} onClick={openCreate}>
          <Plus size={18} />
          Tambah P5M
        </button>
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
                <th>AKSI</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9}>
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
                        <div className={styles.actions}>
                          <button
                            className={styles.viewButton}
                            title="Buka PDF"
                            type="button"
                            onClick={() => void openPdf(row)}
                          >
                            <FileDown size={16} />
                          </button>

                          <button
                            className={styles.editButton}
                            title="Edit"
                            type="button"
                            onClick={() => openEdit(row)}
                          >
                            <Edit3 size={16} />
                          </button>

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
                  <td colSpan={9}>
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

      {formOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.formModal}>
            <div className={styles.modalHeader}>
              <div>
                <h2>{editingRow ? "Edit P5M" : "Tambah P5M"}</h2>
                <p>Lengkapi data safety meeting sebelum pekerjaan.</p>
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
                    <span>Pemateri</span>
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
                    <span>Peserta</span>
                    <textarea
                      rows={3}
                      value={form.participants}
                      required
                      placeholder="Nama peserta atau jumlah peserta"
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
