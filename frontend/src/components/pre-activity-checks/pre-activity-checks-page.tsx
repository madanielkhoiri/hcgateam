"use client";

import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  Edit3,
  Eye,
  ImagePlus,
  Loader2,
  MapPin,
  Plus,
  Search,
  Trash2,
  UploadCloud,
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
import { compressImage } from "@/lib/compress-image";
import styles from "./pre-activity-checks.module.css";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

import InlineSignatureCanvas from "../signatures/inline-signature-canvas";

type Creator = {
  id: number;
  name: string;
  username: string;
  role: string;
};

type PreActivityCheck = {
  id: number;
  workName: string;
  activityDate: string;
  location: string;
  heavyEquipmentName: string | null;
  unitNumber: string | null;
  implementationTeam: string[];
  potentialHazard: string;
  controlMeasure: string;
  riskStatus: string;
  ppeComplete: boolean;
  equipmentCondition: boolean;
  workAreaSafe: boolean;
  workToolsComplete: boolean;
  permitComplete: boolean;
  barricadeInstalled: boolean;
  notes: string | null;
  jsaImage: string | null;
  checklistImage: string | null;
  briefingImage: string | null;
  specialPermitImage: string | null;
  healthLetterImage: string | null;
  documentationPaths: string[];
  coordinatorName: string | null;
  coordinatorSignPath: string | null;
  supervisorName: string | null;
  supervisorSignPath: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: Creator;
};

type DocumentPhotoField =
  | "jsaImage"
  | "checklistImage"
  | "briefingImage"
  | "specialPermitImage"
  | "healthLetterImage";

type DocumentPhotos = Record<DocumentPhotoField, string>;

const emptyDocumentPhotos = (): DocumentPhotos => ({
  jsaImage: "",
  checklistImage: "",
  briefingImage: "",
  specialPermitImage: "",
  healthLetterImage: "",
});

const documentPhotoItems: Array<{
  field: DocumentPhotoField;
  category: string;
  label: string;
}> = [
  { field: "jsaImage", category: "jsa", label: "Foto JSA" },
  {
    field: "checklistImage",
    category: "checklist",
    label: "Foto Ceklis",
  },
  {
    field: "briefingImage",
    category: "briefing",
    label: "Foto Briefing Pekerjaan",
  },
  {
    field: "specialPermitImage",
    category: "special-work-permit",
    label: "Foto Izin Kerja Khusus",
  },
  {
    field: "healthLetterImage",
    category: "health-letter",
    label: "Foto Surat Kesehatan",
  },
];
type SignatureItem = {
  name: string;
  filename: string;
  path: string;
};
type FormState = {
  workName: string;
  activityDate: string;
  location: string;
  heavyEquipmentName: string;
  unitNumber: string;
  implementationTeam: string;
  potentialHazard: string;
  controlMeasure: string;
  riskStatus: string;
  ppeComplete: boolean;
  equipmentCondition: boolean;
  workAreaSafe: boolean;
  workToolsComplete: boolean;
  permitComplete: boolean;
  barricadeInstalled: boolean;
  notes: string;
  coordinatorName: string;
  coordinatorSignPath: string;
  supervisorName: string;
  supervisorSignPath: string;
};

const emptyForm = (): FormState => ({
  workName: "",
  activityDate: new Date().toISOString().slice(0, 10),
  location: "",
  heavyEquipmentName: "",
  unitNumber: "",
  implementationTeam: "",
  potentialHazard: "",
  controlMeasure: "",
  riskStatus: "LOW",
  ppeComplete: false,
  equipmentCondition: false,
  workAreaSafe: false,
  workToolsComplete: false,
  permitComplete: false,
  barricadeInstalled: false,
  notes: "",
  coordinatorName: "",
  coordinatorSignPath: "",
  supervisorName: "",
  supervisorSignPath: "",
});

function getToken(): string {
  return (
    localStorage.getItem("hcga_access_token") ??
    sessionStorage.getItem("hcga_access_token") ??
    localStorage.getItem("access_token") ??
    sessionStorage.getItem("access_token") ??
    ""
  );
}

function fileUrl(path: string): string {
  if (!path) {
    return "";
  }

  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const backendRoot = API_URL;
  return `${backendRoot}${path.startsWith("/") ? path : `/${path}`}`;
}

function normalizePreActivityCheck(
  raw: Record<string, unknown>,
): PreActivityCheck {
  const teamText =
    typeof raw.executor_team_text === "string" ? raw.executor_team_text : "";

  return {
    id: Number(raw.id ?? 0),

    workName: String(raw.job_name ?? raw.workName ?? ""),

    activityDate: String(raw.activityDate ?? raw.activity_date ?? ""),

    location: String(raw.work_location_text ?? raw.location ?? ""),

    heavyEquipmentName:
      raw.heavy_equipment_name_text == null
        ? null
        : String(raw.heavy_equipment_name_text),

    unitNumber:
      raw.unit_number_text == null ? null : String(raw.unit_number_text),

    implementationTeam: Array.isArray(raw.implementationTeam)
      ? raw.implementationTeam.map(String)
      : teamText
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),

    potentialHazard: String(
      raw.hazard_potential_text ?? raw.potentialHazard ?? "",
    ),

    controlMeasure: String(raw.control_step_text ?? raw.controlMeasure ?? ""),

    riskStatus: String(raw.health_check_status ?? raw.riskStatus ?? "Aman"),

    ppeComplete: Boolean(raw.apd_check ?? raw.ppeComplete),

    equipmentCondition: Boolean(
      raw.tool_condition_check ?? raw.equipmentCondition,
    ),

    workAreaSafe: Boolean(raw.work_area_check ?? raw.workAreaSafe),

    workToolsComplete: Boolean(
      raw.tool_complete_check ?? raw.workToolsComplete,
    ),

    permitComplete: Boolean(raw.work_permit_check ?? raw.permitComplete),

    barricadeInstalled: Boolean(raw.sop_check ?? raw.barricadeInstalled),

    notes: raw.health_check == null ? null : String(raw.health_check),

    jsaImage: raw.jsa_image == null ? null : String(raw.jsa_image),

    checklistImage:
      raw.checklist_image == null ? null : String(raw.checklist_image),

    briefingImage:
      raw.socialization_photo == null ? null : String(raw.socialization_photo),

    specialPermitImage:
      raw.height_permit_image == null ? null : String(raw.height_permit_image),

    healthLetterImage:
      raw.health_check == null ? null : String(raw.health_check),

    documentationPaths: [
      raw.jsa_image,
      raw.checklist_image,
      raw.socialization_photo,
      raw.height_permit_image,
      raw.health_check,
    ].filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0,
    ),

    coordinatorName: raw.pic == null ? null : String(raw.pic),

    coordinatorSignPath:
      raw.executor_signature == null ? null : String(raw.executor_signature),

    supervisorName:
      raw.supervisorName == null
        ? raw.supervisor_name == null
          ? null
          : String(raw.supervisor_name)
        : String(raw.supervisorName),

    supervisorSignPath:
      raw.supervisor_signature == null
        ? null
        : String(raw.supervisor_signature),

    createdAt: String(raw.createdAt ?? raw.created_at ?? ""),

    updatedAt: String(raw.updatedAt ?? raw.updated_at ?? ""),

    creator:
      raw.creator && typeof raw.creator === "object"
        ? (raw.creator as Creator)
        : undefined,
  };
}
function formatDate(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

function riskLabel(value: string): string {
  switch (value.toUpperCase()) {
    case "HIGH":
      return "Tinggi";
    case "MEDIUM":
      return "Sedang";
    default:
      return "Rendah";
  }
}

async function readError(response: Response): Promise<string> {
  const result = await response.json().catch(() => null);

  if (Array.isArray(result?.message)) {
    return result.message.join(", ");
  }

  return result?.message ?? `Permintaan gagal (${response.status})`;
}

export default function PreActivityChecksPage() {
  const [rows, setRows] = useState<PreActivityCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");

  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);

  const [formOpen, setFormOpen] = useState(false);

  const [signaturePickerMode, setSignaturePickerMode] = useState<
    "coordinator" | "supervisor" | null
  >(null);
  const [coordinatorSignatures, setCoordinatorSignatures] = useState<
    SignatureItem[]
  >([]);

  const [supervisorSignatures, setSupervisorSignatures] = useState<
    SignatureItem[]
  >([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<PreActivityCheck | null>(
    null,
  );
  const [selected, setSelected] = useState<PreActivityCheck | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [form, setForm] = useState<FormState>(emptyForm());
  const [documentPhotos, setDocumentPhotos] = useState<DocumentPhotos>(
    emptyDocumentPhotos(),
  );

  const [uploadingField, setUploadingField] =
    useState<DocumentPhotoField | null>(null);

  const [uploadingSignature, setUploadingSignature] = useState<
    "coordinatorSignPath" | "supervisorSignPath" | null
  >(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();

      if (search.trim()) {
        params.set("search", search.trim());
      }

      if (month) {
        params.set("month", month);
      }

      if (year) {
        params.set("year", year);
      }

      const response = await fetch(
        `${API_URL}/pre-activity-checks${
          params.toString() ? `?${params.toString()}` : ""
        }`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
          cache: "no-store",
        },
      );

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const result = (await response.json()) as Array<Record<string, unknown>>;

      setRows(
        Array.isArray(result) ? result.map(normalizePreActivityCheck) : [],
      );
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Data Pre-Activity Check gagal dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [month, search, year]);

  useEffect(() => {
    void loadSignatureLists();
  }, []);
  useEffect(() => {
    void loadData();
  }, [loadData]);

  useEffect(() => {
    setPage(1);
  }, [search, month, year]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));

  const paginatedRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return rows.slice(start, start + pageSize);
  }, [page, pageSize, rows]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setDocumentPhotos(emptyDocumentPhotos());
    setUploadingField(null);
    setError("");
    setMessage("");
    setFormOpen(true);
  }

  function openEdit(row: PreActivityCheck) {
    setEditingId(row.id);
    setForm({
      workName: row.workName,
      activityDate: row.activityDate.slice(0, 10),
      location: row.location,
      heavyEquipmentName: row.heavyEquipmentName ?? "",
      unitNumber: row.unitNumber ?? "",
      implementationTeam: row.implementationTeam.join(", "),
      potentialHazard: row.potentialHazard,
      controlMeasure: row.controlMeasure,
      riskStatus: row.riskStatus,
      ppeComplete: row.ppeComplete,
      equipmentCondition: row.equipmentCondition,
      workAreaSafe: row.workAreaSafe,
      workToolsComplete: row.workToolsComplete,
      permitComplete: row.permitComplete,
      barricadeInstalled: row.barricadeInstalled,
      notes: row.notes ?? "",
      coordinatorName: row.coordinatorName ?? "",
      coordinatorSignPath: row.coordinatorSignPath ?? "",
      supervisorName: row.supervisorName ?? "",
      supervisorSignPath: row.supervisorSignPath ?? "",
    });
    setDocumentPhotos({
      jsaImage: row.jsaImage ?? "",
      checklistImage: row.checklistImage ?? "",
      briefingImage: row.briefingImage ?? "",
      specialPermitImage: row.specialPermitImage ?? "",
      healthLetterImage: row.healthLetterImage ?? "",
    });

    setUploadingField(null);
    setError("");
    setMessage("");
    setFormOpen(true);
  }

  function openDetail(row: PreActivityCheck) {
    setSelected(row);
    setDetailOpen(true);
  }

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function uploadDocumentPhoto(
    event: ChangeEvent<HTMLInputElement>,
    field: DocumentPhotoField,
    category: string,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadingField(field);
    setError("");

    try {
      const fileTerkompres = await compressImage(file);
      const formData = new FormData();
      formData.append("file", fileTerkompres);

      const response = await fetch(
        `${API_URL}/pre-activity-checks/upload/${category}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const result = (await response.json()) as {
        path?: string;
        paths?: string[];
      };

      const uploadedPath = result.path ?? result.paths?.[0] ?? "";

      if (!uploadedPath) {
        throw new Error("Path foto hasil upload tidak ditemukan.");
      }

      setDocumentPhotos((current) => ({
        ...current,
        [field]: uploadedPath,
      }));
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Foto gagal diunggah.",
      );
    } finally {
      setUploadingField(null);
      event.target.value = "";
    }
  }

  function removeDocumentPhoto(field: DocumentPhotoField) {
    setDocumentPhotos((current) => ({
      ...current,
      [field]: "",
    }));
  }
  async function uploadSignature(
    event: ChangeEvent<HTMLInputElement>,
    field: "coordinatorSignPath" | "supervisorSignPath",
    category: string,
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadingSignature(field);
    setError("");

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(
        `${API_URL}/pre-activity-checks/upload/${category}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
          body: formData,
        },
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const result = (await response.json()) as {
        path?: string;
        paths?: string[];
      };

      const uploadedPath = result.path ?? result.paths?.[0] ?? "";

      if (!uploadedPath) {
        throw new Error("Path tanda tangan tidak diterima.");
      }

      updateField(field, uploadedPath);
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Tanda tangan gagal diunggah.",
      );
    } finally {
      setUploadingSignature(null);
      event.target.value = "";
    }
  }

  function removeSignature(
    field: "coordinatorSignPath" | "supervisorSignPath",
  ) {
    updateField(field, "");
  }
  async function loadSignatureLists() {
    try {
      const headers = {
        Authorization: `Bearer ${getToken()}`,
      };

      const [coordinatorResponse, supervisorResponse] = await Promise.all([
        fetch(`${API_URL}/signature-library/coordinators`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API_URL}/signature-library/supervisors`, {
          headers,
          cache: "no-store",
        }),
      ]);

      if (coordinatorResponse.ok) {
        const coordinators =
          (await coordinatorResponse.json()) as SignatureItem[];

        setCoordinatorSignatures(
          Array.isArray(coordinators) ? coordinators : [],
        );
      }

      if (supervisorResponse.ok) {
        const supervisors =
          (await supervisorResponse.json()) as SignatureItem[];

        setSupervisorSignatures(Array.isArray(supervisors) ? supervisors : []);
      }
    } catch {
      setCoordinatorSignatures([]);
      setSupervisorSignatures([]);
    }
  }
  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const implementationTeam = form.implementationTeam
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

      if (!implementationTeam.length) {
        throw new Error("Tim pelaksana wajib diisi.");
      }

      const payload = {
        workName: form.workName,
        activityDate: form.activityDate,
        location: form.location,
        heavyEquipmentName: form.heavyEquipmentName,
        unitNumber: form.unitNumber,
        implementationTeam,
        potentialHazard: form.potentialHazard,
        controlMeasure: form.controlMeasure,
        riskStatus: form.riskStatus,
        ppeComplete: form.ppeComplete,
        equipmentCondition: form.equipmentCondition,
        workAreaSafe: form.workAreaSafe,
        workToolsComplete: form.workToolsComplete,
        permitComplete: form.permitComplete,
        barricadeInstalled: form.barricadeInstalled,
        notes: form.notes,
        jsaImage: documentPhotos.jsaImage || undefined,

        checklistImage: documentPhotos.checklistImage || undefined,

        socializationPhoto: documentPhotos.briefingImage || undefined,

        heightPermitImage: documentPhotos.specialPermitImage || undefined,

        healthCheck: documentPhotos.healthLetterImage || undefined,
        coordinatorName: form.coordinatorName,
        executorSignaturePath: form.coordinatorSignPath,
        supervisorName: form.supervisorName,
        supervisorSignaturePath: form.supervisorSignPath,
      };

      const response = await fetch(
        editingId
          ? `${API_URL}/pre-activity-checks/${editingId}`
          : `${API_URL}/pre-activity-checks`,
        {
          method: editingId ? "PATCH" : "POST",
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
        editingId
          ? "Pre-Activity Check berhasil diperbarui."
          : "Pre-Activity Check berhasil ditambahkan.",
      );
      await loadData();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Data gagal disimpan.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteRow() {
    if (!deleteTarget) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/pre-activity-checks/${deleteTarget.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      setDeleteTarget(null);
      setMessage("Pre-Activity Check berhasil dihapus.");
      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Data gagal dihapus.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function openPdf(row: PreActivityCheck, download = false) {
    setError("");

    try {
      const response = await fetch(
        `${API_URL}/pre-activity-checks/${row.id}/pdf`,
        {
          headers: {
            Authorization: `Bearer ${getToken()}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error(await readError(response));
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);

      if (download) {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = `pre-activity-check-${row.id}.pdf`;
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
        return;
      }

      window.open(url, "_blank", "noopener,noreferrer");

      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (pdfError) {
      setError(
        pdfError instanceof Error ? pdfError.message : "PDF gagal dibuka.",
      );
    }
  }

  const monthOptions = [
    ["1", "Januari"],
    ["2", "Februari"],
    ["3", "Maret"],
    ["4", "April"],
    ["5", "Mei"],
    ["6", "Juni"],
    ["7", "Juli"],
    ["8", "Agustus"],
    ["9", "September"],
    ["10", "Oktober"],
    ["11", "November"],
    ["12", "Desember"],
  ];

  const currentYear = new Date().getFullYear();

  return (
    <main className={styles.page}>
      <section className={styles.pageHeader}>
        <div>
          <div className={styles.titleRow}>
            <span className={styles.titleIcon}>
              <ClipboardCheck size={25} />
            </span>

            <div>
              <h1>Pre-Activity Check</h1>
              <p>
                Pemeriksaan awal sebelum pekerjaan dimulai dan dokumentasi
                pelaksanaan.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          className={styles.primaryButton}
          onClick={openCreate}
        >
          <Plus size={18} />
          Tambah Pre-Activity Check
        </button>
      </section>

      {message && <div className={styles.successAlert}>{message}</div>}
      {error && <div className={styles.errorAlert}>{error}</div>}

      <section className={styles.filterCard}>
        <div className={styles.searchBox}>
          <Search size={18} />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari nama pekerjaan, lokasi, atau koordinator..."
          />
        </div>

        <select
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        >
          <option value="">Semua Bulan</option>
          {monthOptions.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>

        <select value={year} onChange={(event) => setYear(event.target.value)}>
          <option value="">Semua Tahun</option>
          {Array.from({ length: 6 }, (_, index) => currentYear - index).map(
            (item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ),
          )}
        </select>

        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => {
            setSearch("");
            setMonth("");
            setYear("");
          }}
        >
          Reset
        </button>
      </section>

      <section className={styles.tableCard}>
        <div className={styles.tableHeader}>
          <div>
            <h2>Daftar Pre-Activity Check</h2>
            <p>Total {rows.length} data</p>
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>Nama Pekerjaan</th>
                <th>Lokasi</th>
                <th>Tim Pelaksana</th>
                <th>Risiko</th>
                <th>Dokumentasi</th>
                <th>Dibuat Oleh</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9}>
                    <div className={styles.emptyState}>
                      <Loader2 className={styles.spinner} size={25} />
                      Memuat data...
                    </div>
                  </td>
                </tr>
              ) : paginatedRows.length ? (
                paginatedRows.map((row, index) => (
                  <tr key={row.id}>
                    <td>{(page - 1) * pageSize + index + 1}</td>
                    <td>{formatDate(row.activityDate)}</td>
                    <td>
                      <strong>{row.workName}</strong>
                    </td>
                    <td>
                      <span className={styles.inlineInfo}>
                        <MapPin size={14} />
                        {row.location}
                      </span>
                    </td>
                    <td>{row.implementationTeam?.join(", ") || "-"}</td>
                    <td>
                      <span
                        className={`${styles.riskBadge} ${
                          row.riskStatus === "HIGH"
                            ? styles.riskHigh
                            : row.riskStatus === "MEDIUM"
                              ? styles.riskMedium
                              : styles.riskLow
                        }`}
                      >
                        {riskLabel(row.riskStatus)}
                      </span>
                    </td>
                    <td>{row.documentationPaths.length} foto</td>
                    <td>{row.creator?.name ?? row.creator?.username ?? "-"}</td>
                    <td>
                      <div className={styles.actionGroup}>
                        <button
                          type="button"
                          title="Lihat detail"
                          className={styles.viewButton}
                          onClick={() => openDetail(row)}
                        >
                          <Eye size={16} />
                        </button>

                        <button
                          type="button"
                          title="Buka PDF"
                          className={styles.pdfButton}
                          onClick={() => void openPdf(row)}
                        >
                          <Download size={16} />
                        </button>

                        <button
                          type="button"
                          title="Edit"
                          className={styles.editButton}
                          onClick={() => openEdit(row)}
                        >
                          <Edit3 size={16} />
                        </button>

                        <button
                          type="button"
                          title="Hapus"
                          className={styles.deleteButton}
                          onClick={() => setDeleteTarget(row)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9}>
                    <div className={styles.emptyState}>
                      <ClipboardCheck size={32} />
                      Belum ada data Pre-Activity Check.
                    </div>
                  </td>
                </tr>
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
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(1, current - 1))}
            >
              <ChevronLeft size={17} />
              Sebelumnya
            </button>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() =>
                setPage((current) => Math.min(totalPages, current + 1))
              }
            >
              Berikutnya
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </section>

      {formOpen && (
        <div className={styles.modalBackdrop}>
          <div className={styles.formModal}>
            <div className={styles.modalHeader}>
              <div>
                <h2>
                  {editingId
                    ? "Edit Pre-Activity Check"
                    : "Tambah Pre-Activity Check"}
                </h2>
                <p>Lengkapi data pemeriksaan sebelum pekerjaan dimulai.</p>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setFormOpen(false)}
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={submitForm}>
              <div className={styles.modalBody}>
                <div className={styles.formGrid}>
                  <label className={styles.fullField}>
                    <span>Nama Pekerjaan</span>
                    <input
                      required
                      value={form.workName}
                      onChange={(event) =>
                        updateField("workName", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    <span>Tanggal</span>
                    <input
                      required
                      type="date"
                      value={form.activityDate}
                      onChange={(event) =>
                        updateField("activityDate", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    <span>Lokasi</span>
                    <input
                      required
                      value={form.location}
                      onChange={(event) =>
                        updateField("location", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    <span>Nama Alat Berat</span>
                    <input
                      value={form.heavyEquipmentName}
                      onChange={(event) =>
                        updateField("heavyEquipmentName", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    <span>Nomor Unit</span>
                    <input
                      value={form.unitNumber}
                      onChange={(event) =>
                        updateField("unitNumber", event.target.value)
                      }
                    />
                  </label>

                  <label className={styles.fullField}>
                    <span>Tim Pelaksana</span>
                    <input
                      required
                      value={form.implementationTeam}
                      onChange={(event) =>
                        updateField("implementationTeam", event.target.value)
                      }
                      placeholder="Pisahkan nama dengan koma"
                    />
                  </label>

                  <label className={styles.fullField}>
                    <span>Potensi Bahaya</span>
                    <textarea
                      required
                      rows={4}
                      value={form.potentialHazard}
                      onChange={(event) =>
                        updateField("potentialHazard", event.target.value)
                      }
                    />
                  </label>

                  <label className={styles.fullField}>
                    <span>Tindakan Pengendalian</span>
                    <textarea
                      required
                      rows={4}
                      value={form.controlMeasure}
                      onChange={(event) =>
                        updateField("controlMeasure", event.target.value)
                      }
                    />
                  </label>

                  <label>
                    <span>Status Risiko</span>
                    <select
                      value={form.riskStatus}
                      onChange={(event) =>
                        updateField("riskStatus", event.target.value)
                      }
                    >
                      <option value="LOW">Rendah</option>
                      <option value="MEDIUM">Sedang</option>
                      <option value="HIGH">Tinggi</option>
                    </select>
                  </label>

                  <label>
                    <span>Nama Koordinator</span>
                    <input
                      value={form.coordinatorName}
                      onChange={(event) =>
                        updateField("coordinatorName", event.target.value)
                      }
                    />
                  </label>

                  <div className={styles.signatureDropdownField}>
                    <span>Tanda Tangan Koordinator</span>

                    {coordinatorSignatures.length === 0 && (
                      <p className={styles.signatureGalleryEmpty}>
                        Belum ada tanda tangan tersimpan.
                      </p>
                    )}

                    <div className={styles.signatureGallery}>
                      {coordinatorSignatures.map((item) => {
                        const aktif = form.coordinatorSignPath === item.path;

                        return (
                          <button
                            type="button"
                            key={item.path}
                            className={`${styles.signatureThumb} ${
                              aktif ? styles.signatureThumbActive : ""
                            }`}
                            onClick={() => {
                              if (aktif) {
                                updateField("coordinatorSignPath", "");
                                return;
                              }

                              updateField("coordinatorSignPath", item.path);
                              updateField("coordinatorName", item.name);
                            }}
                          >
                            <img src={fileUrl(item.path)} alt={item.name} />
                            <span>{item.name}</span>
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        className={styles.createSignatureButton}
                        onClick={() => setSignaturePickerMode("coordinator")}
                      >
                        + Buat Baru
                      </button>
                    </div>
                  </div>
                  <InlineSignatureCanvas
                    open={signaturePickerMode === "coordinator"}
                    defaultName={form.coordinatorName}
                    apiUrl={API_URL}
                    token={getToken()}
                    onClose={() => setSignaturePickerMode(null)}
                    onSaved={(item) => {
                      updateField("coordinatorName", item.name);

                      updateField("coordinatorSignPath", item.path);

                      setSignaturePickerMode(null);
                      void loadSignatureLists();
                    }}
                  />
                  <label>
                    <span>Nama Pengawas</span>
                    <input
                      value={form.supervisorName}
                      onChange={(event) =>
                        updateField("supervisorName", event.target.value)
                      }
                    />
                  </label>

                  <div className={styles.signatureDropdownField}>
                    <span>Tanda Tangan Pengawas</span>

                    {supervisorSignatures.length === 0 && (
                      <p className={styles.signatureGalleryEmpty}>
                        Belum ada tanda tangan tersimpan.
                      </p>
                    )}

                    <div className={styles.signatureGallery}>
                      {supervisorSignatures.map((item) => {
                        const aktif = form.supervisorSignPath === item.path;

                        return (
                          <button
                            type="button"
                            key={item.path}
                            className={`${styles.signatureThumb} ${
                              aktif ? styles.signatureThumbActive : ""
                            }`}
                            onClick={() => {
                              if (aktif) {
                                updateField("supervisorSignPath", "");
                                return;
                              }

                              updateField("supervisorSignPath", item.path);
                              updateField("supervisorName", item.name);
                            }}
                          >
                            <img src={fileUrl(item.path)} alt={item.name} />
                            <span>{item.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className={styles.checkSection}>
                  <h3>Pemeriksaan Awal</h3>

                  <div className={styles.checkGrid}>
                    {[
                      ["ppeComplete", "Perlengkapan kerja lengkap"],
                      ["equipmentCondition", "Kondisi peralatan layak"],
                      ["workAreaSafe", "Area kerja aman"],
                      ["workToolsComplete", "Peralatan kerja lengkap"],
                      ["permitComplete", "Dokumen/izin kerja lengkap"],
                      ["barricadeInstalled", "Barikade area terpasang"],
                    ].map(([key, label]) => (
                      <label className={styles.checkboxCard} key={key}>
                        <input
                          type="checkbox"
                          checked={Boolean(form[key as keyof FormState])}
                          onChange={(event) =>
                            updateField(
                              key as keyof FormState,
                              event.target.checked as never,
                            )
                          }
                        />

                        <span className={styles.checkboxVisual}>
                          <Check size={15} />
                        </span>

                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <label className={styles.notesField}>
                  <span>Catatan</span>
                  <textarea
                    rows={3}
                    value={form.notes}
                    onChange={(event) =>
                      updateField("notes", event.target.value)
                    }
                  />
                </label>

                <div className={styles.documentSection}>
                  <div className={styles.documentHeader}>
                    <div>
                      <h3>Dokumentasi Pendukung</h3>
                      <p>
                        Seluruh foto bersifat opsional. Pilih foto sesuai
                        dokumen yang tersedia.
                      </p>
                    </div>
                  </div>

                  <div className={styles.documentPhotoGrid}>
                    {documentPhotoItems.map(({ field, category, label }) => {
                      const storedPath = documentPhotos[field];

                      const isUploading = uploadingField === field;

                      return (
                        <div className={styles.documentPhotoCard} key={field}>
                          <div className={styles.documentPhotoCardHeader}>
                            <strong>{label}</strong>

                            <span className={styles.optionalBadge}>
                              Opsional
                            </span>
                          </div>

                          {storedPath ? (
                            <div className={styles.documentPreview}>
                              <img src={fileUrl(storedPath)} alt={label} />

                              <button
                                type="button"
                                title={`Hapus ${label}`}
                                onClick={() => removeDocumentPhoto(field)}
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          ) : (
                            <div className={styles.documentEmpty}>
                              <ImagePlus size={27} />
                              <span>Belum ada foto</span>
                            </div>
                          )}

                          <label className={styles.documentUploadButton}>
                            {isUploading ? (
                              <Loader2 className={styles.spinner} size={17} />
                            ) : (
                              <UploadCloud size={17} />
                            )}

                            {isUploading
                              ? "Mengunggah..."
                              : storedPath
                                ? "Ganti Foto"
                                : "Pilih Foto"}

                            <input
                              type="file"
                              accept="image/*"
                              disabled={uploadingField !== null}
                              onChange={(event) =>
                                void uploadDocumentPhoto(event, field, category)
                              }
                            />
                          </label>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => setFormOpen(false)}
                >
                  Batal
                </button>

                <button
                  type="submit"
                  className={styles.primaryButton}
                  disabled={
                    saving ||
                    uploadingField !== null ||
                    uploadingSignature !== null
                  }
                >
                  {saving && <Loader2 className={styles.spinner} size={17} />}
                  {editingId ? "Simpan Perubahan" : "Simpan Data"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {detailOpen && selected && (
        <div className={styles.modalBackdrop}>
          <div className={styles.detailModal}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Detail Pre-Activity Check</h2>
                <p>{selected.workName}</p>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setDetailOpen(false)}
              >
                <X size={21} />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.detailGrid}>
                <div>
                  <span>Tanggal</span>
                  <strong>{formatDate(selected.activityDate)}</strong>
                </div>

                <div>
                  <span>Lokasi</span>
                  <strong>{selected.location}</strong>
                </div>

                <div>
                  <span>Alat Berat</span>
                  <strong>{selected.heavyEquipmentName || "-"}</strong>
                </div>

                <div>
                  <span>Nomor Unit</span>
                  <strong>{selected.unitNumber || "-"}</strong>
                </div>

                <div className={styles.detailWide}>
                  <span>Tim Pelaksana</span>
                  <strong>{selected.implementationTeam.join(", ")}</strong>
                </div>

                <div className={styles.detailWide}>
                  <span>Potensi Bahaya</span>
                  <p>{selected.potentialHazard}</p>
                </div>

                <div className={styles.detailWide}>
                  <span>Tindakan Pengendalian</span>
                  <p>{selected.controlMeasure}</p>
                </div>
              </div>

              <div className={styles.detailPhotos}>
                {selected.documentationPaths.map((path, index) => (
                  <button
                    type="button"
                    key={`${path}-${index}`}
                    onClick={() => window.open(fileUrl(path), "_blank")}
                  >
                    <img src={fileUrl(path)} alt={`Dokumentasi ${index + 1}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => void openPdf(selected, true)}
              >
                <Download size={17} />
                Download PDF
              </button>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => void openPdf(selected)}
              >
                <Eye size={17} />
                Buka PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className={styles.modalBackdrop}>
          <div className={styles.confirmModal}>
            <span className={styles.deleteIcon}>
              <Trash2 size={27} />
            </span>

            <h2>Hapus Pre-Activity Check?</h2>
            <p>
              Data <strong>{deleteTarget.workName}</strong> dan dokumentasinya
              akan dihapus.
            </p>

            <div className={styles.confirmActions}>
              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => setDeleteTarget(null)}
              >
                Batal
              </button>

              <button
                type="button"
                className={styles.dangerButton}
                disabled={saving}
                onClick={() => void deleteRow()}
              >
                {saving && <Loader2 className={styles.spinner} size={17} />}
                Hapus
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
