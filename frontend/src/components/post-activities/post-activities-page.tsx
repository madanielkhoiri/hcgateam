"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  CalendarDays,
  CloudSun,
  FileText,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import styles from "./post-activities.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

const WEATHER_OPTIONS = ["CERAH", "HUJAN", "MENDUNG"];

type Creator = {
  id: number;
  name: string;
  username: string;
  role: string;
};

type PostActivity = {
  id: number;
  activityDate: string;
  startTime: string;
  endTime: string;
  workName: string;
  progressPercent: number;
  morningWeather: string;
  afternoonWeather: string;
  eveningWeather: string;
  coordinatorCount: number;
  carpenterCount: number;
  helperCount: number;
  approverName: string;
  photoPaths: string[];
  creator: Creator;
};

type ApiResponse = {
  data: PostActivity[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type FormState = {
  activityDate: string;
  startTime: string;
  endTime: string;
  workName: string;
  progressPercent: string;
  morningWeather: string;
  afternoonWeather: string;
  eveningWeather: string;
  coordinatorCount: string;
  carpenterCount: string;
  helperCount: string;
  approverName: string;
};

const initialForm = (): FormState => ({
  activityDate: new Date().toISOString().slice(0, 10),
  startTime: "07:00",
  endTime: "17:00",
  workName: "",
  progressPercent: "5",
  morningWeather: "CERAH",
  afternoonWeather: "CERAH",
  eveningWeather: "CERAH",
  coordinatorCount: "1",
  carpenterCount: "1",
  helperCount: "1",
  approverName: "ARIEF RAHIM",
});

function getToken() {
  return (
    localStorage.getItem("hcga_access_token") ??
    sessionStorage.getItem("hcga_access_token") ??
    localStorage.getItem("access_token") ??
    sessionStorage.getItem("access_token") ??
    ""
  );
}

function imageUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const backendRoot = API_URL.replace(/\/api\/?$/, "");

  return `${backendRoot}${path.startsWith("/") ? "" : "/"}${path}`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default function PostActivitiesPage() {
  const [rows, setRows] = useState<PostActivity[]>([]);
  const [form, setForm] = useState<FormState>(initialForm);
  const [editing, setEditing] = useState<PostActivity | null>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [retainedPhotos, setRetainedPhotos] = useState<string[]>([]);
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();

    return Array.from({ length: 7 }, (_, index) => currentYear - 3 + index);
  }, []);

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "10",
      });

      if (search.trim()) params.set("search", search.trim());
      if (month) params.set("month", month);
      if (year) params.set("year", year);

      const response = await fetch(`${API_URL}/post-activities?${params}`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Gagal mengambil data Post Activity");
      }

      const payload = (await response.json()) as ApiResponse;

      setRows(payload.data);
      setTotal(payload.pagination.total);
      setTotalPages(payload.pagination.totalPages);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Terjadi kesalahan saat mengambil data",
      );
    } finally {
      setLoading(false);
    }
  }, [month, page, search, year]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  function openCreate() {
    setEditing(null);
    setForm(initialForm());
    setNewFiles([]);
    setRetainedPhotos([]);
    setError("");
    setModalOpen(true);
  }

  function openEdit(row: PostActivity) {
    setEditing(row);
    setForm({
      activityDate: row.activityDate.slice(0, 10),
      startTime: row.startTime,
      endTime: row.endTime,
      workName: row.workName,
      progressPercent: String(row.progressPercent),
      morningWeather: row.morningWeather,
      afternoonWeather: row.afternoonWeather,
      eveningWeather: row.eveningWeather,
      coordinatorCount: String(row.coordinatorCount),
      carpenterCount: String(row.carpenterCount),
      helperCount: String(row.helperCount),
      approverName: row.approverName,
    });
    setRetainedPhotos(row.photoPaths);
    setNewFiles([]);
    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;

    setModalOpen(false);
    setEditing(null);
    setNewFiles([]);
    setRetainedPhotos([]);
  }

  function updateForm(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);

    setNewFiles((current) => [...current, ...files]);
    event.target.value = "";
  }

  function removeNewFile(index: number) {
    setNewFiles((current) =>
      current.filter((_, fileIndex) => fileIndex !== index),
    );
  }

  function removeRetainedPhoto(path: string) {
    setRetainedPhotos((current) =>
      current.filter((photoPath) => photoPath !== path),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!editing && newFiles.length === 0) {
      setError("Minimal satu foto wajib diunggah");
      return;
    }

    if (editing && retainedPhotos.length + newFiles.length === 0) {
      setError("Minimal satu foto wajib tersedia");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const body = new FormData();

      Object.entries(form).forEach(([key, value]) => {
        body.append(key, value);
      });

      newFiles.forEach((file) => {
        body.append("photos", file);
      });

      if (editing) {
        body.append("retainedPhotoPaths", JSON.stringify(retainedPhotos));
      }

      const response = await fetch(
        editing
          ? `${API_URL}/post-activities/${editing.id}`
          : `${API_URL}/post-activities`,
        {
          method: editing ? "PATCH" : "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
          body,
        },
      );

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        const message = Array.isArray(payload?.message)
          ? payload.message.join(", ")
          : payload?.message;

        throw new Error(message || "Gagal menyimpan Post Activity");
      }

      closeModal();
      await loadRows();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Terjadi kesalahan saat menyimpan data",
      );
    } finally {
      setSaving(false);
    }
  }

  async function removeRow(row: PostActivity) {
    const confirmed = window.confirm(`Hapus Post Activity "${row.workName}"?`);

    if (!confirmed) return;

    try {
      const response = await fetch(`${API_URL}/post-activities/${row.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error("Gagal menghapus Post Activity");
      }

      await loadRows();
    } catch (removeError) {
      setError(
        removeError instanceof Error
          ? removeError.message
          : "Terjadi kesalahan saat menghapus data",
      );
    }
  }

  async function openPdf(row: PostActivity) {
    const pdfWindow = window.open("about:blank", "_blank");

    if (!pdfWindow) {
      setError("Tab PDF diblokir browser. Izinkan pop-up untuk localhost.");
      return;
    }

    pdfWindow.document.title = "Memuat PDF...";
    pdfWindow.document.body.innerHTML = `
      <div style="
        display:flex;
        min-height:100vh;
        align-items:center;
        justify-content:center;
        font-family:Arial,sans-serif;
        color:#36536d;
      ">
        Memuat PDF Post Activity...
      </div>
    `;

    try {
      setError("");

      const response = await fetch(
        `${API_URL}/post-activities/${row.id}/pdf?v=${Date.now()}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const payload = await response.json().catch(() => null);

        throw new Error(
          payload?.message || `Gagal membuka PDF (${response.status})`,
        );
      }

      const pdfBlob = await response.blob();

      const pdfUrl = URL.createObjectURL(
        new Blob([pdfBlob], {
          type: "application/pdf",
        }),
      );

      pdfWindow.location.replace(pdfUrl);

      window.setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 120_000);
    } catch (pdfError) {
      pdfWindow.close();

      setError(
        pdfError instanceof Error
          ? pdfError.message
          : "Gagal membuka PDF Post Activity",
      );
    }
  }

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroIcon}>
          <FileText size={24} />
        </div>

        <div className={styles.heroText}>
          <h1>Post Activity</h1>
          <p>Laporan hasil pekerjaan dan dokumentasi pelaksanaan.</p>
        </div>

        <button className={styles.primaryButton} onClick={openCreate}>
          <Plus size={18} />
          Tambah Post Activity
        </button>
      </section>

      {error && <div className={styles.error}>{error}</div>}

      <section className={styles.filterCard}>
        <label className={styles.searchBox}>
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Cari nama pekerjaan atau pembuat..."
          />
        </label>

        <select
          value={month}
          onChange={(event) => {
            setMonth(event.target.value);
            setPage(1);
          }}
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

        <select
          value={year}
          onChange={(event) => {
            setYear(event.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua Tahun</option>
          {years.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <button
          className={styles.resetButton}
          onClick={() => {
            setSearch("");
            setMonth("");
            setYear("");
            setPage(1);
          }}
        >
          Reset
        </button>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableHeading}>
          <div>
            <h2>Daftar Post Activity</h2>
            <span>Total {total} data</span>
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Nama Pekerjaan</th>
                <th>Jam</th>
                <th>Tenaga Kerja</th>
                <th>Progress</th>
                <th>Cuaca</th>
                <th>Dokumentasi</th>

                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className={styles.emptyCell}>
                    Memuat data...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className={styles.emptyCell}>
                    Belum ada data Post Activity.
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.id}>
                    <td>{(page - 1) * 10 + index + 1}</td>
                    <td>{formatDate(row.activityDate)}</td>
                    <td className={styles.workName}>{row.workName}</td>
                    <td>
                      {row.startTime}–{row.endTime}
                    </td>
                    <td>
                      K: {row.coordinatorCount}, C: {row.carpenterCount}, H:{" "}
                      {row.helperCount}
                    </td>
                    <td>
                      <span className={styles.progressBadge}>
                        {row.progressPercent}%
                      </span>
                    </td>
                    <td>
                      <span className={styles.weatherText}>
                        {row.morningWeather}/{row.afternoonWeather}/
                        {row.eveningWeather}
                      </span>
                    </td>
                    <td>
                      <div className={styles.photoStack}>
                        {row.photoPaths.slice(0, 3).map((path) => (
                          <button
                            key={path}
                            className={styles.photoButton}
                            onClick={() => setPreviewPhoto(imageUrl(path))}
                            type="button"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={imageUrl(path)} alt="Dokumentasi" />
                          </button>
                        ))}

                        {row.photoPaths.length > 3 && (
                          <span className={styles.morePhotos}>
                            +{row.photoPaths.length - 3}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          title="Lihat PDF"
                          aria-label="Lihat PDF"
                          className={`${styles.actionButton} ${styles.pdfButton}`}
                          onClick={() => void openPdf(row)}
                        >
                          <FileText size={16} strokeWidth={2} />
                        </button>

                        <button
                          type="button"
                          title="Edit"
                          aria-label="Edit"
                          className={`${styles.actionButton} ${styles.editButton}`}
                          onClick={() => openEdit(row)}
                        >
                          <Pencil size={16} strokeWidth={2} />
                        </button>

                        <button
                          type="button"
                          title="Hapus"
                          aria-label="Hapus"
                          className={`${styles.actionButton} ${styles.deleteButton}`}
                          onClick={() => void removeRow(row)}
                        >
                          <Trash2 size={16} strokeWidth={2} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <span>
            Halaman {page} dari {totalPages}
          </span>

          <div>
            <button
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Sebelumnya
            </button>

            <button
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>

      {modalOpen && (
        <div className={styles.modalOverlay}>
          <section className={styles.modal}>
            <header className={styles.modalHeader}>
              <div>
                <h2>
                  {editing ? "Edit Post Activity" : "Tambah Post Activity"}
                </h2>
                <p>Isi data laporan pekerjaan secara lengkap.</p>
              </div>

              <button type="button" onClick={closeModal}>
                <X size={20} />
              </button>
            </header>

            <form onSubmit={submit}>
              <div className={styles.formGrid}>
                <label>
                  <span>
                    <CalendarDays size={15} />
                    Tanggal
                  </span>
                  <input
                    type="date"
                    name="activityDate"
                    value={form.activityDate}
                    onChange={updateForm}
                    required
                  />
                </label>

                <label>
                  <span>Jam Mulai</span>
                  <input
                    type="time"
                    name="startTime"
                    value={form.startTime}
                    onChange={updateForm}
                    required
                  />
                </label>

                <label>
                  <span>Jam Selesai</span>
                  <input
                    type="time"
                    name="endTime"
                    value={form.endTime}
                    onChange={updateForm}
                    required
                  />
                </label>

                <label className={styles.fullField}>
                  <span>Nama Pekerjaan</span>
                  <input
                    type="text"
                    name="workName"
                    value={form.workName}
                    onChange={updateForm}
                    placeholder="Contoh: Pemasangan Rangka Atap"
                    required
                  />
                </label>

                <label>
                  <span>Estimasi Progress</span>
                  <select
                    name="progressPercent"
                    value={form.progressPercent}
                    onChange={updateForm}
                  >
                    {Array.from(
                      { length: 20 },
                      (_, index) => (index + 1) * 5,
                    ).map((value) => (
                      <option key={value} value={value}>
                        {value}%
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>
                    <Users size={15} />
                    Koordinator
                  </span>
                  <input
                    type="number"
                    min="0"
                    name="coordinatorCount"
                    value={form.coordinatorCount}
                    onChange={updateForm}
                    required
                  />
                </label>

                <label>
                  <span>Carpenter</span>
                  <input
                    type="number"
                    min="0"
                    name="carpenterCount"
                    value={form.carpenterCount}
                    onChange={updateForm}
                    required
                  />
                </label>

                <label>
                  <span>Helper GA</span>
                  <input
                    type="number"
                    min="0"
                    name="helperCount"
                    value={form.helperCount}
                    onChange={updateForm}
                    required
                  />
                </label>

                <label>
                  <span>
                    <CloudSun size={15} />
                    Cuaca Pagi
                  </span>
                  <select
                    name="morningWeather"
                    value={form.morningWeather}
                    onChange={updateForm}
                  >
                    {WEATHER_OPTIONS.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Cuaca Siang</span>
                  <select
                    name="afternoonWeather"
                    value={form.afternoonWeather}
                    onChange={updateForm}
                  >
                    {WEATHER_OPTIONS.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Cuaca Sore</span>
                  <select
                    name="eveningWeather"
                    value={form.eveningWeather}
                    onChange={updateForm}
                  >
                    {WEATHER_OPTIONS.map((value) => (
                      <option key={value}>{value}</option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Disetujui Oleh</span>
                  <input
                    name="approverName"
                    value={form.approverName}
                    onChange={updateForm}
                    required
                  />
                </label>
              </div>

              <div className={styles.uploadArea}>
                <div>
                  <ImagePlus size={21} />
                  <strong>Dokumentasi Pekerjaan</strong>
                  <span>Minimal satu foto. JPG, PNG, atau WEBP.</span>
                </div>

                <label className={styles.uploadButton}>
                  Pilih Foto
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    multiple
                    onChange={selectFiles}
                  />
                </label>
              </div>

              {(retainedPhotos.length > 0 || newFiles.length > 0) && (
                <div className={styles.previewGrid}>
                  {retainedPhotos.map((path) => (
                    <article key={path}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={imageUrl(path)} alt="Foto tersimpan" />
                      <button
                        type="button"
                        onClick={() => removeRetainedPhoto(path)}
                      >
                        <X size={14} />
                      </button>
                    </article>
                  ))}

                  {newFiles.map((file, index) => (
                    <article key={`${file.name}-${file.lastModified}-${index}`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={URL.createObjectURL(file)} alt={file.name} />
                      <button
                        type="button"
                        onClick={() => removeNewFile(index)}
                      >
                        <X size={14} />
                      </button>
                    </article>
                  ))}
                </div>
              )}

              <footer className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={closeModal}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className={styles.saveButton}
                  disabled={saving}
                >
                  {saving
                    ? "Menyimpan..."
                    : editing
                      ? "Simpan Perubahan"
                      : "Simpan Post Activity"}
                </button>
              </footer>
            </form>
          </section>
        </div>
      )}

      {previewPhoto && (
        <div
          className={styles.imageOverlay}
          onClick={() => setPreviewPhoto(null)}
        >
          <button type="button" onClick={() => setPreviewPhoto(null)}>
            <X size={22} />
          </button>

          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewPhoto}
            alt="Preview dokumentasi"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </main>
  );
}
