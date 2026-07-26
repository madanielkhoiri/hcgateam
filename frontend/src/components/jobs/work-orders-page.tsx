"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import styles from "./jobs.module.css";
import { compressImages } from "@/lib/compress-image";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type WorkOrderStatus = "OPEN" | "ON_PROGRESS" | "CLOSE";

type WorkOrderPriority = "P1" | "P2";

type WorkOrderPic = "GA_INFRAS" | "GA_ELECTRIC";

type WorkOrder = {
  id: number;
  workOrderNumber: string;
  workOrderName: string;
  department: string;
  position: string | null;
  pic: WorkOrderPic;
  jobType: string;
  userDepartmentName: string;
  description: string;
  location: string | null;
  requestedAt: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  closedAt: string | null;
  closedDurationDays: number | null;
  imagePaths: string[];
  handover?: {
    id: number;
    stpNumber: string;
  } | null;
};

type WorkOrderForm = {
  workOrderName: string;
  department: string;
  applicantName: string;
  position: string;
  description: string;
  requestedAt: string;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  pic: WorkOrderPic;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function initialForm(): WorkOrderForm {
  return {
    workOrderName: "",
    department: "",
    applicantName: "",
    position: "",
    description: "",
    requestedAt: today(),
    status: "OPEN",
    priority: "P2",
    pic: "GA_INFRAS",
  };
}

function getToken(): string {
  return (
    localStorage.getItem("hcga_access_token") ??
    sessionStorage.getItem("hcga_access_token") ??
    localStorage.getItem("access_token") ??
    sessionStorage.getItem("access_token") ??
    ""
  );
}

function formatDate(value: string | null): string {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function statusLabel(status: WorkOrderStatus): string {
  if (status === "ON_PROGRESS") {
    return "On Progress";
  }

  if (status === "CLOSE") {
    return "Close";
  }

  return "Open";
}

function photoUrl(filename: string): string {
  const apiOrigin = API_URL.replace(/\/api\/?$/, "");

  const cleanFilename =
    filename.replace(/\\/g, "/").split("/").pop() ?? filename;

  return `${apiOrigin}/uploads/work-orders/${encodeURIComponent(
    cleanFilename,
  )}`;
}

export default function WorkOrdersPage() {
  const [rows, setRows] = useState<WorkOrder[]>([]);
  const [form, setForm] = useState<WorkOrderForm>(initialForm());

  const [editingId, setEditingId] = useState<number | null>(null);

  const [existingImages, setExistingImages] = useState<string[]>([]);

  const [newFiles, setNewFiles] = useState<File[]>([]);

  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const [zoomImage, setZoomImage] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);

  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [message, setMessage] = useState("");

  const request = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const response = await fetch(`${API_URL}/${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${getToken()}`,
          ...(options.headers ?? {}),
        },
      });

      const text = await response.text();

      let result: any = {};

      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        result = {
          message: text || "Respons server tidak valid",
        };
      }

      if (response.status === 401) {
        localStorage.removeItem("hcga_access_token");
        sessionStorage.removeItem("hcga_access_token");
        localStorage.removeItem("access_token");
        sessionStorage.removeItem("access_token");

        window.location.href = "/login";

        throw new Error("Sesi login berakhir. Silakan login kembali.");
      }

      if (!response.ok) {
        const responseMessage = Array.isArray(result.message)
          ? result.message[0]
          : result.message;

        throw new Error(responseMessage || "Permintaan gagal diproses");
      }

      return result;
    },
    [],
  );

  const loadRows = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await request("work-orders");

      setRows(Array.isArray(result) ? result : []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Data Work Order gagal dimuat",
      );
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void loadRows();
  }, [loadRows]);

  useEffect(() => {
    const urls = newFiles.map((file) => URL.createObjectURL(file));

    setPreviewUrls(urls);

    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [newFiles]);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return rows;
    }

    return rows.filter((row) =>
      [
        row.workOrderNumber,
        row.workOrderName,
        row.department,
        row.description,
        row.userDepartmentName,
        row.status,
        row.priority,
        row.pic,
      ].some((value) => String(value).toLowerCase().includes(keyword)),
    );
  }, [rows, search]);

  function resetModalState() {
    setForm(initialForm());
    setEditingId(null);
    setExistingImages([]);
    setNewFiles([]);
    setError("");
  }

  function closeModal() {
    setModalOpen(false);
    resetModalState();
  }

  function openCreate() {
    resetModalState();
    setMessage("");
    setModalOpen(true);
  }
  async function updateQuickField(
    row: WorkOrder,
    field: "pic" | "status" | "priority",
    value: string,
  ) {
    setError("");
    setSuccess("");

    const previousValue = row[field];

    setRows((currentRows) =>
      currentRows.map((currentRow) =>
        currentRow.id === row.id
          ? {
              ...currentRow,
              [field]: value,
            }
          : currentRow,
      ),
    );

    try {
      const response = await fetch(`${API_URL}/work-orders/${row.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({
          [field]: value,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));

        const responseMessage = Array.isArray(result.message)
          ? result.message[0]
          : result.message;

        throw new Error(responseMessage || "Work Order gagal diperbarui");
      }

      const fieldLabel =
        field === "pic" ? "PIC" : field === "status" ? "Status" : "Prioritas";

      setSuccess(`${fieldLabel} berhasil diperbarui`);
    } catch (updateError) {
      setRows((currentRows) =>
        currentRows.map((currentRow) =>
          currentRow.id === row.id
            ? {
                ...currentRow,
                [field]: previousValue,
              }
            : currentRow,
        ),
      );

      setError(
        updateError instanceof Error
          ? updateError.message
          : "Work Order gagal diperbarui",
      );
    }
  }

  function openEdit(row: WorkOrder) {
    setEditingId(row.id);

    setForm({
      workOrderName: row.workOrderName,
      department: row.department,
      applicantName: row.userDepartmentName ?? "",
      position: row.position ?? "",
      description: row.description,
      requestedAt: row.requestedAt.slice(0, 10),
      status: row.status,
      priority: row.priority,
      pic: row.pic,
    });

    setExistingImages(row.imagePaths ?? []);
    setNewFiles([]);
    setError("");
    setMessage("");
    setModalOpen(true);
  }

  async function selectFiles(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);

    event.target.value = "";

    if (selectedFiles.length === 0) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

    const imageFiles = selectedFiles.filter((file) =>
      allowedTypes.includes(file.type),
    );

    if (imageFiles.length !== selectedFiles.length) {
      setError("Foto hanya boleh berformat JPG, PNG, atau WEBP");
    } else {
      setError("");
    }

    if (imageFiles.length === 0) {
      return;
    }

    setCompressing(true);

    try {
      const compressedFiles = await compressImages(imageFiles);

      setNewFiles((current) => [...current, ...compressedFiles]);
    } catch (compressionError) {
      setError(
        compressionError instanceof Error
          ? compressionError.message
          : "Foto gagal dikompres",
      );
    } finally {
      setCompressing(false);
    }
  }

  function removeNewFile(index: number) {
    setNewFiles((current) =>
      current.filter((_file, fileIndex) => fileIndex !== index),
    );
  }

  async function removeExistingImage(filename: string) {
    if (editingId === null) {
      return;
    }

    const confirmed = window.confirm("Hapus foto ini dari Work Order?");

    if (!confirmed) {
      return;
    }

    setError("");

    try {
      await request(
        `work-orders/${editingId}/images/${encodeURIComponent(filename)}`,
        {
          method: "DELETE",
        },
      );

      setExistingImages((current) =>
        current.filter((image) => image !== filename),
      );

      setMessage("Foto berhasil dihapus");
      await loadRows();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Foto gagal dihapus",
      );
    }
  }

  async function uploadImages(workOrderId: number) {
    if (newFiles.length === 0) {
      return;
    }

    const formData = new FormData();

    newFiles.forEach((file) => {
      formData.append("images", file);
    });

    await request(`work-orders/${workOrderId}/images`, {
      method: "POST",
      body: formData,
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const payload = {
        workOrderName: form.workOrderName.trim(),
        department: form.department.trim(),
        position: form.position.trim() || undefined,
        pic: form.pic,

        jobType: "PERMINTAAN PEKERJAAN",

        userDepartmentName: form.applicantName.trim() || form.department.trim(),

        description: form.description.trim(),

        location: undefined,
        requestedAt: form.requestedAt,
        status: form.status,
        priority: form.priority,
      };

      const result = await request(
        editingId === null ? "work-orders" : `work-orders/${editingId}`,
        {
          method: editingId === null ? "POST" : "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const workOrderId = editingId ?? Number(result.id);

      if (!Number.isInteger(workOrderId) || workOrderId <= 0) {
        throw new Error("ID Work Order tidak ditemukan setelah penyimpanan");
      }

      await uploadImages(workOrderId);

      closeModal();

      setMessage(
        editingId === null
          ? "Work Order dan foto berhasil ditambahkan"
          : "Work Order berhasil diperbarui",
      );

      await loadRows();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Work Order gagal disimpan",
      );
    } finally {
      setSaving(false);
    }
  }

  async function openPdf(row: WorkOrder) {
    setError("");

    try {
      const response = await fetch(`${API_URL}/work-orders/${row.id}/pdf`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));

        const responseMessage = Array.isArray(result.message)
          ? result.message[0]
          : result.message;

        throw new Error(responseMessage || "PDF Work Order gagal dibuat");
      }

      const blob = await response.blob();

      const pdfBlob = new Blob([blob], {
        type: "application/pdf",
      });

      const pdfUrl = URL.createObjectURL(pdfBlob);

      const link = document.createElement("a");
      link.href = pdfUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(pdfUrl);
      }, 120000);
    } catch (pdfError) {
      setError(
        pdfError instanceof Error
          ? pdfError.message
          : "PDF Work Order gagal dibuka",
      );
    }
  }
  async function remove(row: WorkOrder) {
    const confirmed = window.confirm(
      `Hapus Work Order ${row.workOrderNumber}?`,
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await request(`work-orders/${row.id}`, {
        method: "DELETE",
      });

      setMessage("Work Order berhasil dihapus");

      await loadRows();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Work Order gagal dihapus",
      );
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Work Order</h1>
          <p>
            Kelola permintaan pekerjaan, foto dokumentasi, status, prioritas,
            dan PIC.
          </p>
        </div>

        <button
          type="button"
          className={styles.primaryButton}
          onClick={openCreate}
        >
          + Tambah Work Order
        </button>
      </div>

      {error && !modalOpen && <div className={styles.errorAlert}>{error}</div>}

      {message && <div className={styles.successAlert}>{message}</div>}

      <div className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nomor WO, nama WO, departemen..."
          />

          <span>{filteredRows.length} data</span>
        </div>

        <div className={styles.tableScroll}>
          <table className={`${styles.table} ${styles.workOrderTable}`}>
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>No WO</th>
                <th>Nama WO</th>
                <th>Departemen</th>
                <th>Keterangan</th>
                <th>Gambar</th>
                <th>Durasi</th>
                <th>Status</th>
                <th>Prioritas</th>
                <th>PIC</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12}>
                    <div className={styles.emptyState}>Memuat data...</div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={12}>
                    <div className={styles.emptyState}>
                      Data Work Order belum ada.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => (
                  <tr key={row.id}>
                    <td>{index + 1}</td>

                    <td>{formatDate(row.requestedAt)}</td>

                    <td className={styles.codeCell}>{row.workOrderNumber}</td>

                    <td className={styles.centerTextCell}>
                      {row.workOrderName}
                    </td>

                    <td>{row.department}</td>

                    <td className={styles.centerTextCell}>{row.description}</td>

                    <td>
                      {row.imagePaths?.length ? (
                        <div className={styles.tablePhotos}>
                          {row.imagePaths.slice(0, 3).map((image) => (
                            <button
                              type="button"
                              key={image}
                              className={styles.thumbnailButton}
                              onClick={() => setZoomImage(photoUrl(image))}
                            >
                              <img src={photoUrl(image)} alt="Dokumentasi WO" />
                            </button>
                          ))}

                          {row.imagePaths.length > 3 && (
                            <span className={styles.morePhotos}>
                              +{row.imagePaths.length - 3}
                            </span>
                          )}
                        </div>
                      ) : (
                        "-"
                      )}
                    </td>

                    <td>{row.closedDurationDays ?? 0} hari</td>

                    <td className={styles.centerCell}>
                      <select
                        className={`${styles.tableSelect} ${
                          row.status === "CLOSE"
                            ? styles.selectClose
                            : row.status === "ON_PROGRESS"
                              ? styles.selectProgress
                              : styles.selectOpen
                        }`}
                        value={row.status}
                        onChange={(event) =>
                          void updateQuickField(
                            row,
                            "status",
                            event.target.value,
                          )
                        }
                        aria-label={`Ubah status ${row.workOrderNumber}`}
                      >
                        <option value="OPEN">Open</option>
                        <option value="ON_PROGRESS">On Progress</option>
                        <option value="CLOSE">Close</option>
                      </select>
                    </td>

                    <td className={styles.centerCell}>
                      <select
                        className={`${styles.tableSelect} ${
                          row.priority === "P1"
                            ? styles.selectPriorityUrgent
                            : styles.selectPriorityNormal
                        }`}
                        value={row.priority}
                        onChange={(event) =>
                          void updateQuickField(
                            row,
                            "priority",
                            event.target.value,
                          )
                        }
                        aria-label={`Ubah prioritas ${row.workOrderNumber}`}
                      >
                        <option value="P1">P1 - Urgent</option>
                        <option value="P2">P2 - Tidak Urgent</option>
                      </select>
                    </td>

                    <td className={styles.centerCell}>
                      <select
                        className={`${styles.tableSelect} ${styles.selectPic}`}
                        value={row.pic}
                        onChange={(event) =>
                          void updateQuickField(row, "pic", event.target.value)
                        }
                        aria-label={`Ubah PIC ${row.workOrderNumber}`}
                      >
                        <option value="GA_INFRAS">GA Infras</option>
                        <option value="GA_ELECTRIC">GA Electric</option>
                      </select>
                    </td>

                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          type="button"
                          className={styles.pdfButton}
                          onClick={() => void openPdf(row)}
                        >
                          PDF
                        </button>

                        <button
                          type="button"
                          className={styles.editButton}
                          onClick={() => openEdit(row)}
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          className={styles.deleteButton}
                          onClick={() => void remove(row)}
                        >
                          Hapus
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalOpen && (
        <div className={styles.modalBackdrop}>
          <form
            className={`${styles.modal} ${styles.workOrderModal}`}
            onSubmit={submit}
          >
            <div className={styles.modalHeader}>
              <div>
                <h2>
                  {editingId === null ? "Tambah Work Order" : "Edit Work Order"}
                </h2>

                <p>Nomor Work Order dibuat otomatis.</p>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={closeModal}
              >
                &times;
              </button>
            </div>

            <div className={styles.modalBody}>
              {error && <div className={styles.errorAlert}>{error}</div>}

              <div className={styles.formGrid}>
                <label>
                  <span>Tanggal</span>
                  <input
                    type="date"
                    value={form.requestedAt}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        requestedAt: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  <span>Departemen</span>
                  <input
                    value={form.department}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        department: event.target.value,
                      }))
                    }
                    placeholder="Contoh: PRODUKSI"
                    required
                  />
                </label>

                <label className={styles.fullField}>
                  <span>Nama WO</span>
                  <input
                    value={form.workOrderName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        workOrderName: event.target.value,
                      }))
                    }
                    placeholder="Tuliskan nama pekerjaan"
                    required
                  />
                </label>

                <label>
                  <span>Nama Pemohon</span>
                  <input
                    value={form.applicantName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        applicantName: event.target.value,
                      }))
                    }
                    placeholder="Nama user departemen"
                    required
                  />
                </label>

                <label>
                  <span>Jabatan Pemohon</span>
                  <input
                    value={form.position}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        position: event.target.value,
                      }))
                    }
                    placeholder="Jabatan pemohon"
                  />
                </label>

                <label className={styles.fullField}>
                  <span>Keterangan/Alasan Permintaan</span>

                  <textarea
                    rows={5}
                    value={form.description}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Jelaskan pekerjaan yang diminta dan alasan permintaannya"
                    required
                  />
                </label>

                <label>
                  <span>Status</span>
                  <select
                    value={form.status}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        status: event.target.value as WorkOrderStatus,
                      }))
                    }
                  >
                    <option value="OPEN">Open</option>

                    <option value="ON_PROGRESS">On Progress</option>

                    <option value="CLOSE">Close</option>
                  </select>
                </label>

                <label>
                  <span>Prioritas</span>
                  <select
                    value={form.priority}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        priority: event.target.value as WorkOrderPriority,
                      }))
                    }
                  >
                    <option value="P1">P1 - Urgent</option>

                    <option value="P2">P2 - Tidak Urgent</option>
                  </select>
                </label>

                <label>
                  <span>PIC</span>
                  <select
                    value={form.pic}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        pic: event.target.value as WorkOrderPic,
                      }))
                    }
                  >
                    <option value="GA_INFRAS">GA Infras</option>

                    <option value="GA_ELECTRIC">GA Electric</option>
                  </select>
                </label>

                <div className={`${styles.fullField} ${styles.photoField}`}>
                  <span className={styles.photoFieldLabel}>
                    Foto Dokumentasi
                  </span>

                  <label className={styles.filePicker}>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={selectFiles}
                    />

                    <span className={styles.filePickerButton}>Pilih Foto</span>

                    <span className={styles.filePickerText}>
                      {compressing
                        ? "Foto sedang dikompres..."
                        : newFiles.length === 0
                          ? "Belum ada foto baru dipilih"
                          : `${newFiles.length} foto siap diunggah`}
                    </span>
                  </label>

                  <small className={styles.fileHelp}>
                    JPG, PNG, atau WEBP. Foto otomatis dikompres 75% per foto
                    dan maksimal 10 foto.
                  </small>

                  {existingImages.length > 0 && (
                    <div className={styles.photoSection}>
                      <strong>Foto tersimpan</strong>

                      <div className={styles.photoGrid}>
                        {existingImages.map((image) => (
                          <div key={image} className={styles.photoCard}>
                            <button
                              type="button"
                              className={styles.photoPreviewButton}
                              onClick={() => setZoomImage(photoUrl(image))}
                            >
                              <img
                                src={photoUrl(image)}
                                alt="Foto Work Order"
                              />
                            </button>

                            <button
                              type="button"
                              className={styles.removePhotoButton}
                              onClick={() => void removeExistingImage(image)}
                            >
                              Hapus
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {previewUrls.length > 0 && (
                    <div className={styles.photoSection}>
                      <strong>Foto baru</strong>

                      <div className={styles.photoGrid}>
                        {previewUrls.map((preview, index) => (
                          <div key={preview} className={styles.photoCard}>
                            <button
                              type="button"
                              className={styles.photoPreviewButton}
                              onClick={() => setZoomImage(preview)}
                            >
                              <img src={preview} alt={`Preview ${index + 1}`} />
                            </button>

                            <button
                              type="button"
                              className={styles.removePhotoButton}
                              onClick={() => removeNewFile(index)}
                            >
                              Hapus
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={closeModal}
                disabled={saving || compressing}
              >
                Batal
              </button>

              <button
                type="submit"
                className={styles.primaryButton}
                disabled={saving || compressing}
              >
                {saving ? "Menyimpan..." : "Simpan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {zoomImage && (
        <div className={styles.imageViewer} onClick={() => setZoomImage(null)}>
          <button
            type="button"
            className={styles.imageViewerClose}
            onClick={() => setZoomImage(null)}
            aria-label="Tutup foto"
          >
            {"\u00D7"}
          </button>

          <img
            src={zoomImage}
            alt="Foto dokumentasi"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
}
