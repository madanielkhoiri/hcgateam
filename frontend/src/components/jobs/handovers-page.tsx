"use client";

import {
  ChangeEvent,
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { compressImages } from "@/utils/compress-image";
import styles from "./jobs.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type WorkOrder = {
  id: number;
  workOrderNumber: string;
  workOrderName: string;
  department: string;
  position: string | null;
  userDepartmentName: string;
  location: string | null;
  status: string;
};

type Handover = {
  id: number;
  stpNumber: string;
  handoverDate: string;
  receiverName: string | null;
  receiverPosition: string | null;
  receiverDepartment: string | null;
  location: string | null;
  handoverNote: string | null;
  documentationPaths: string[];
  autoCreated: boolean;
  workOrder: WorkOrder;
};

type HandoverForm = {
  workOrderId: string;
  handoverDate: string;
  receiverName: string;
  receiverPosition: string;
  receiverDepartment: string;
  location: string;
  handoverNote: string;
};

function initialForm(): HandoverForm {
  return {
    workOrderId: "",
    handoverDate: new Date().toISOString().slice(0, 10),
    receiverName: "",
    receiverPosition: "",
    receiverDepartment: "",
    location: "",
    handoverNote: "",
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

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export default function HandoversPage() {
  const [rows, setRows] = useState<Handover[]>([]);
  const [available, setAvailable] = useState<WorkOrder[]>([]);
  const [form, setForm] = useState<HandoverForm>(initialForm());
  const [editingId, setEditingId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingRow, setEditingRow] = useState<Handover | null>(null);
  const [newImages, setNewImages] = useState<File[]>([]);
  const [removedImageNames, setRemovedImageNames] = useState<string[]>([]);
  const [compressingImages, setCompressingImages] = useState(false);

  const request = useCallback(
    async (endpoint: string, options: RequestInit = {}) => {
      const response = await fetch(`${API_URL}/${endpoint}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
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
        window.location.href = "/login";
        throw new Error("Sesi login berakhir");
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

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [handoverResult, availableResult] = await Promise.all([
        request("handovers"),
        request("work-orders/available-for-handover"),
      ]);

      setRows(Array.isArray(handoverResult) ? handoverResult : []);

      setAvailable(Array.isArray(availableResult) ? availableResult : []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Data gagal dimuat",
      );
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const availableYears = useMemo(() => {
    const current = new Date().getFullYear();

    return Array.from({ length: 7 }, (_, index) => current - 5 + index);
  }, []);

  const filteredRows = useMemo(() => {
    const keyword = search.trim().toLowerCase();

    return rows
      .filter((row) => {
        if (!keyword) {
          return true;
        }

        return [
          row.stpNumber,
          row.workOrder.workOrderNumber,
          row.workOrder.workOrderName,
          row.receiverName ?? "",
          row.receiverDepartment ?? "",
          row.location ?? "",
        ].some((value) => String(value).toLowerCase().includes(keyword));
      })
      .filter((row) => {
        if (!month && !year) {
          return true;
        }

        const rowDate = new Date(row.handoverDate);

        if (year && rowDate.getFullYear() !== Number(year)) {
          return false;
        }

        if (month && rowDate.getMonth() + 1 !== Number(month)) {
          return false;
        }

        return true;
      });
  }, [rows, search, month, year]);

  function resetFilters() {
    setSearch("");
    setMonth("");
    setYear("");
  }

  function openCreate() {
    setEditingId(null);
    setEditingRow(null);
    setNewImages([]);
    setRemovedImageNames([]);
    setForm(initialForm());
    setError("");
    setMessage("");
    setModalOpen(true);
  }
  async function openHandoverPdf(row: Handover) {
    setError("");

    const popup = window.open("", "_blank");

    try {
      const response = await fetch(`${API_URL}/handovers/${row.id}/pdf`, {
        headers: {
          Authorization: `Bearer ${getToken()}`,
        },
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));

        throw new Error(
          Array.isArray(result.message)
            ? result.message[0]
            : result.message || "PDF gagal dibuat",
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (popup) {
        popup.location.href = url;
      } else {
        window.location.href = url;
      }

      window.setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch (pdfError) {
      popup?.close();

      setError(
        pdfError instanceof Error ? pdfError.message : "PDF gagal dibuat",
      );
    }
  }

  function openEdit(row: Handover) {
    setEditingId(row.id);
    setEditingRow(row);
    setNewImages([]);
    setRemovedImageNames([]);
    setForm({
      workOrderId: String(row.workOrder.id),
      handoverDate: row.handoverDate.slice(0, 10),
      receiverName: row.receiverName ?? "",
      receiverPosition: row.receiverPosition ?? "",
      receiverDepartment: row.receiverDepartment ?? "",
      location: row.location ?? "",
      handoverNote: row.handoverNote ?? "",
    });
    setError("");
    setMessage("");
    setModalOpen(true);
  }

  function selectWorkOrder(workOrderId: string) {
    const workOrder = available.find((item) => String(item.id) === workOrderId);

    setForm((current) => ({
      ...current,
      workOrderId,
      receiverName: workOrder?.userDepartmentName ?? current.receiverName,
      receiverPosition: workOrder?.position ?? current.receiverPosition,
      receiverDepartment: workOrder?.department ?? current.receiverDepartment,
      location: workOrder?.location ?? current.location,
    }));
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setEditingRow(null);
    setNewImages([]);
    setRemovedImageNames([]);
    setCompressingImages(false);
  }

  async function handleImageSelection(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);

    event.target.value = "";

    if (selectedFiles.length === 0) {
      return;
    }

    setError("");
    setCompressingImages(true);

    try {
      const compressedFiles = await compressImages(selectedFiles);

      setNewImages((current) => [...current, ...compressedFiles]);
    } catch (imageError) {
      setError(
        imageError instanceof Error
          ? imageError.message
          : "Foto gagal diproses",
      );
    } finally {
      setCompressingImages(false);
    }
  }

  async function uploadHandoverImages(handoverId: number, files: File[]) {
    if (files.length === 0) {
      return;
    }

    const formData = new FormData();

    for (const file of files) {
      formData.append("images", file);
    }

    const response = await fetch(`${API_URL}/handovers/${handoverId}/images`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${getToken()}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));

      throw new Error(
        Array.isArray(result.message)
          ? result.message[0]
          : result.message || "Foto STP gagal diunggah",
      );
    }
  }

  async function removeStoredImages(handoverId: number, filenames: string[]) {
    for (const filename of filenames) {
      const response = await fetch(
        `${API_URL}/handovers/${handoverId}/images/${encodeURIComponent(
          filename,
        )}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));

        throw new Error(
          Array.isArray(result.message)
            ? result.message[0]
            : result.message || `Foto ${filename} gagal dihapus`,
        );
      }
    }
  }

  function removeNewImage(index: number) {
    setNewImages((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
  }

  function markStoredImageForRemoval(filename: string) {
    setRemovedImageNames((current) =>
      current.includes(filename) ? current : [...current, filename],
    );
  }

  function restoreStoredImage(filename: string) {
    setRemovedImageNames((current) =>
      current.filter((item) => item !== filename),
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    try {
      const payload = {
        ...(editingId === null
          ? {
              workOrderId: Number(form.workOrderId),
            }
          : {}),
        handoverDate: form.handoverDate,
        receiverName: form.receiverName.trim() || undefined,
        receiverPosition: form.receiverPosition.trim() || undefined,
        receiverDepartment: form.receiverDepartment.trim() || undefined,
        location: form.location.trim() || undefined,
        handoverNote: form.handoverNote.trim() || undefined,
      };

      const savedHandover = (await request(
        editingId === null ? "handovers" : `handovers/${editingId}`,
        {
          method: editingId === null ? "POST" : "PATCH",
          body: JSON.stringify(payload),
        },
      )) as Handover;

      const savedId = savedHandover.id ?? editingId;

      if (!savedId) {
        throw new Error("ID Serah Terima tidak ditemukan setelah disimpan");
      }

      await removeStoredImages(savedId, removedImageNames);
      await uploadHandoverImages(savedId, newImages);

      closeModal();
      setMessage(
        editingId === null
          ? "Serah Terima berhasil ditambahkan"
          : "Serah Terima berhasil diperbarui",
      );
      await loadData();
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

  async function remove(row: Handover) {
    const confirmed = window.confirm(`Hapus ${row.stpNumber}?`);

    if (!confirmed) {
      return;
    }

    setError("");
    setMessage("");

    try {
      await request(`handovers/${row.id}`, {
        method: "DELETE",
      });

      setMessage("Serah Terima berhasil dihapus");
      await loadData();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Data gagal dihapus",
      );
    }
  }

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1>Serah Terima Pekerjaan</h1>
          <p>
            Dibuat manual dari WO aktif atau otomatis saat Work Order menjadi
            Close.
          </p>
        </div>

        <button
          type="button"
          className={styles.primaryButton}
          onClick={openCreate}
        >
          + Tambah Serah Terima
        </button>
      </div>

      {error && <div className={styles.errorAlert}>{error}</div>}

      {message && <div className={styles.successAlert}>{message}</div>}

      <div className={styles.tableCard}>
        <div className={styles.tableToolbar}>
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nomor STP, WO, pekerjaan..."
          />

          <div className={styles.tableFilters}>
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

            <select
              value={year}
              onChange={(event) => setYear(event.target.value)}
            >
              <option value="">Semua Tahun</option>
              {availableYears.map((item) => (
                <option value={item} key={item}>
                  {item}
                </option>
              ))}
            </select>

            <button
              type="button"
              className={styles.resetFilterButton}
              onClick={resetFilters}
            >
              Reset
            </button>
          </div>

          <span>{filteredRows.length} data</span>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>No</th>
                <th>Nomor STP</th>
                <th>Nomor WO</th>
                <th>Tanggal</th>
                <th>Nama Pekerjaan</th>
                <th>Penerima</th>
                <th>Departemen</th>

                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8}>
                    <div className={styles.emptyState}>Memuat data...</div>
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={8}>
                    <div className={styles.emptyState}>
                      Data Serah Terima belum ada.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => (
                  <tr key={row.id}>
                    <td>{index + 1}</td>
                    <td className={styles.codeCell}>{row.stpNumber}</td>
                    <td>{row.workOrder.workOrderNumber}</td>
                    <td>{formatDate(row.handoverDate)}</td>
                    <td className={styles.nameCell}>
                      {row.workOrder.workOrderName}
                    </td>
                    <td>{row.receiverName ?? "-"}</td>
                    <td>{row.receiverDepartment ?? "-"}</td>

                    <td>
                      <div className={styles.actionButtons}>
                        <button
                          type="button"
                          className={styles.pdfButton}
                          onClick={() => void openHandoverPdf(row)}
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
          <form className={styles.modal} onSubmit={submit}>
            <div className={styles.modalHeader}>
              <div>
                <h2>
                  {editingId === null
                    ? "Tambah Serah Terima"
                    : "Edit Serah Terima"}
                </h2>
                <p>Nomor STP dibuat otomatis.</p>
              </div>

              <button
                type="button"
                className={styles.modalClose}
                onClick={closeModal}
                aria-label="Tutup"
                title="Tutup"
              />
            </div>

            <div className={styles.modalBody}>
              <div className={styles.formGrid}>
                {editingId === null && (
                  <label className={styles.fullField}>
                    <span>Work Order</span>
                    <select
                      value={form.workOrderId}
                      onChange={(event) => selectWorkOrder(event.target.value)}
                      required
                    >
                      <option value="">
                        Pilih Work Order Open atau On Progress
                      </option>

                      {available.map((workOrder) => (
                        <option key={workOrder.id} value={workOrder.id}>
                          {workOrder.workOrderNumber} -{" "}
                          {workOrder.workOrderName}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label>
                  <span>Tanggal Serah Terima</span>
                  <input
                    type="date"
                    value={form.handoverDate}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        handoverDate: event.target.value,
                      }))
                    }
                    required
                  />
                </label>

                <label>
                  <span>Nama Penerima</span>
                  <input
                    value={form.receiverName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        receiverName: event.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  <span>Jabatan Penerima</span>
                  <input
                    value={form.receiverPosition}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        receiverPosition: event.target.value,
                      }))
                    }
                  />
                </label>

                <label>
                  <span>Departemen Penerima</span>
                  <input
                    value={form.receiverDepartment}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        receiverDepartment: event.target.value,
                      }))
                    }
                  />
                </label>

                <label className={styles.fullField}>
                  <span>Lokasi</span>
                  <input
                    value={form.location}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        location: event.target.value,
                      }))
                    }
                  />
                </label>
              </div>
            </div>

            <div className={styles.handoverUploadSection}>
              <div className={styles.uploadSectionHeader}>
                <div>
                  <strong>Foto Lampiran</strong>
                  <small>
                    Foto otomatis dikompres 75%. Jumlah foto tidak dibatasi.
                  </small>
                </div>
              </div>

              {editingRow &&
                (editingRow.documentationPaths ?? []).length > 0 && (
                  <div className={styles.storedImageSection}>
                    <span className={styles.imageSectionLabel}>
                      Foto tersimpan
                    </span>

                    <div className={styles.handoverImageGrid}>
                      {(editingRow.documentationPaths ?? []).map((path) => {
                        const filename = path.split(/[\\/]/).pop() ?? path;

                        const removed = removedImageNames.includes(filename);

                        return (
                          <div
                            key={path}
                            className={`${styles.handoverImageCard} ${
                              removed ? styles.imageMarkedForRemoval : ""
                            }`}
                          >
                            <img
                              src={`${API_URL}/handovers/images/${encodeURIComponent(
                                filename,
                              )}`}
                              alt={filename}
                            />

                            {removed ? (
                              <button
                                type="button"
                                className={styles.restoreImageButton}
                                onClick={() => restoreStoredImage(filename)}
                              >
                                Batalkan Hapus
                              </button>
                            ) : (
                              <button
                                type="button"
                                className={styles.removeImageButton}
                                onClick={() =>
                                  markStoredImageForRemoval(filename)
                                }
                              >
                                Hapus
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              <label className={styles.handoverFilePicker}>
                <span className={styles.handoverFileButton}>Pilih Foto</span>

                <span className={styles.handoverFileStatus}>
                  {compressingImages
                    ? "Foto sedang dikompres..."
                    : newImages.length > 0
                      ? `${newImages.length} foto siap diunggah`
                      : "Belum ada foto baru"}
                </span>

                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={compressingImages || saving}
                  onChange={(event) => void handleImageSelection(event)}
                />
              </label>

              {newImages.length > 0 && (
                <div className={styles.storedImageSection}>
                  <span className={styles.imageSectionLabel}>Foto baru</span>

                  <div className={styles.handoverImageGrid}>
                    {newImages.map((file, index) => (
                      <div
                        key={`${file.name}-${file.lastModified}-${index}`}
                        className={styles.handoverImageCard}
                      >
                        <img
                          src={URL.createObjectURL(file)}
                          alt={`Foto baru ${index + 1}`}
                        />

                        <button
                          type="button"
                          className={styles.removeImageButton}
                          onClick={() => removeNewImage(index)}
                        >
                          Hapus
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={closeModal}
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
    </section>
  );
}
