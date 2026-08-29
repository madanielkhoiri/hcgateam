"use client";

import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  FileSpreadsheet,
  Fuel,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import * as XLSX from "xlsx";

import styles from "./transport.module.css";

const API =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001/api";

const getToken = () =>
  localStorage.getItem(
    "hcga_access_token",
  ) ||
  sessionStorage.getItem(
    "hcga_access_token",
  ) ||
  localStorage.getItem(
    "access_token",
  ) ||
  sessionStorage.getItem(
    "access_token",
  ) ||
  "";

type Row = {
  id: number;
  unitNumber: string;
  department: string;
  vehicleType: string;
  fuelDate: string;
  hmStart: string;
  hmEnd: string;
  totalHm: string;
  hmPerShift: string;
  kmPerLiter: string;
  totalLiter: string;
  lostTimeBd: string;
  targetUa: string;
  actualUa: string;
  uaPercentage: string;
  unitStatus: string;
  achievement: string;

  creator?: {
    name: string;
  };
};

type ImportRow = {
  unitNumber: string;
  department: string;
  vehicleType: string;
  fuelDate: string;
  hmStart: number;
  hmEnd: number;
  totalLiter: number;
  lostTimeBd: number;
  unitStatus: string;
};

type ImportResult = {
  message: string;
  total: number;
  successCount: number;
  failedCount: number;

  failed?: Array<{
    row: number;
    message: string;
  }>;
};

const blank = {
  unitNumber: "",
  department: "",
  vehicleType: "LV",

  fuelDate: new Date()
    .toISOString()
    .slice(0, 10),

  hmStart: "",
  hmEnd: "",
  totalLiter: "",
  lostTimeBd: "0",

  unitStatus: "READY",
};

const months = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function normalizeHeader(
  value: unknown,
) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replace(/[\s_\-./()%]+/g, "");
}

function getValue(
  row: Record<string, unknown>,
  aliases: string[],
) {
  const normalizedAliases =
    aliases.map(normalizeHeader);

  for (const [key, value] of Object.entries(
    row,
  )) {
    if (
      normalizedAliases.includes(
        normalizeHeader(key),
      )
    ) {
      return value;
    }
  }

  return undefined;
}

function numberValue(
  value: unknown,
) {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    return value;
  }

  const text = String(value ?? "")
    .trim()
    .replace(/\s/g, "");

  if (!text) {
    return 0;
  }

  let normalized = text;

  if (
    normalized.includes(".") &&
    normalized.includes(",")
  ) {
    normalized = normalized
      .replace(/\./g, "")
      .replace(",", ".");
  } else if (
    normalized.includes(",")
  ) {
    normalized =
      normalized.replace(",", ".");
  }

  const parsed = Number(normalized);

  return Number.isFinite(parsed)
    ? parsed
    : Number.NaN;
}

function excelDateToISO(
  value: unknown,
  fallbackMonth: number,
  fallbackYear: number,
) {
  if (
    typeof value === "number" &&
    Number.isFinite(value)
  ) {
    const parsed =
      XLSX.SSF.parse_date_code(
        value,
      );

    if (parsed) {
      return [
        parsed.y,
        String(parsed.m).padStart(2, "0"),
        String(parsed.d).padStart(2, "0"),
      ].join("-");
    }
  }

  const text = String(value ?? "").trim();

  if (!text) {
    return (
      `${fallbackYear}-` +
      `${String(fallbackMonth).padStart(2, "0")}-01`
    );
  }

  const isoMatch = text.match(
    /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/,
  );

  if (isoMatch) {
    return (
      `${isoMatch[1]}-` +
      `${String(isoMatch[2]).padStart(2, "0")}-` +
      `${String(isoMatch[3]).padStart(2, "0")}`
    );
  }

  const localMatch = text.match(
    /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/,
  );

  if (localMatch) {
    return (
      `${localMatch[3]}-` +
      `${String(localMatch[2]).padStart(2, "0")}-` +
      `${String(localMatch[1]).padStart(2, "0")}`
    );
  }

  const parsed = new Date(text);

  if (
    !Number.isNaN(parsed.getTime())
  ) {
    return [
      parsed.getFullYear(),
      String(
        parsed.getMonth() + 1,
      ).padStart(2, "0"),
      String(
        parsed.getDate(),
      ).padStart(2, "0"),
    ].join("-");
  }

  return text;
}

export default function TransportData() {
  const currentDate = new Date();

  const [rows, setRows] =
    useState<Row[]>([]);

  const [search, setSearch] =
    useState("");

  const [month, setMonth] =
    useState("");

  const [year, setYear] =
    useState("");

  const [vehicleTypeFilter, setVehicleTypeFilter] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("");

  const [modal, setModal] =
    useState(false);

  const [edit, setEdit] =
    useState<Row | null>(null);

  const [form, setForm] =
    useState(blank);

  const [error, setError] =
    useState("");

  const [importModal, setImportModal] =
    useState(false);

  const [importFile, setImportFile] =
    useState<File | null>(null);

  const [importRows, setImportRows] =
    useState<ImportRow[]>([]);

  const [
    importMonth,
    setImportMonth,
  ] = useState(
    String(
      currentDate.getMonth() + 1,
    ),
  );

  const [
    importYear,
    setImportYear,
  ] = useState(
    String(
      currentDate.getFullYear(),
    ),
  );

  const [
    importError,
    setImportError,
  ] = useState("");

  const [
    importResult,
    setImportResult,
  ] = useState<ImportResult | null>(
    null,
  );

  const [
    importing,
    setImporting,
  ] = useState(false);

  const load = async () => {
    try {
      setError("");

      const token = getToken();

      if (!token) {
        setRows([]);

        setError(
          "Sesi login tidak ditemukan. Silakan login ulang.",
        );

        return;
      }

      const response = await fetch(
        `${API}/transport`,
        {
          headers: {
            Authorization:
              `Bearer ${token}`,
          },
        },
      );

      const body =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        setRows([]);

        setError(
          Array.isArray(body?.message)
            ? body.message.join(", ")
            : body?.message ||
                "Data transportasi gagal dimuat",
        );

        return;
      }

      setRows(
        Array.isArray(body)
          ? body
          : [],
      );
    } catch {
      setRows([]);

      setError(
        "Backend transportasi tidak dapat dihubungi.",
      );
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const date = new Date(
          row.fuelDate,
        );

        return (
          (!search ||
            `${row.unitNumber} ${row.department}`
              .toLowerCase()
              .includes(
                search.toLowerCase(),
              )) &&

          (!month ||
            date.getMonth() + 1 ===
              Number(month)) &&

          (!year ||
            date.getFullYear() ===
              Number(year)) &&

          (!vehicleTypeFilter ||
            row.vehicleType ===
              vehicleTypeFilter) &&

          (!statusFilter ||
            row.unitStatus ===
              statusFilter)
        );
      }),
    [
      rows,
      search,
      month,
      year,
      vehicleTypeFilter,
      statusFilter,
    ],
  );

  function open(row?: Row) {
    setError("");
    setEdit(row ?? null);

    setForm(
      row
        ? {
            unitNumber:
              row.unitNumber,

            department:
              row.department,

            vehicleType:
              row.vehicleType,

            fuelDate:
              row.fuelDate.slice(
                0,
                10,
              ),

            hmStart:
              String(row.hmStart),

            hmEnd:
              String(row.hmEnd),

            totalLiter:
              String(
                row.totalLiter,
              ),

            lostTimeBd:
              String(
                row.lostTimeBd,
              ),

            unitStatus:
              row.unitStatus,
          }
        : blank,
    );

    setModal(true);
  }

  async function submit(
    event: FormEvent,
  ) {
    event.preventDefault();
    setError("");

    const response = await fetch(
      `${API}/transport${
        edit ? `/${edit.id}` : ""
      }`,
      {
        method:
          edit
            ? "PATCH"
            : "POST",

        headers: {
          "Content-Type":
            "application/json",

          Authorization:
            `Bearer ${getToken()}`,
        },

        body: JSON.stringify({
          ...form,

          hmStart:
            Number(form.hmStart),

          hmEnd:
            Number(form.hmEnd),

          totalLiter:
            Number(
              form.totalLiter,
            ),

          lostTimeBd:
            Number(
              form.lostTimeBd,
            ),
        }),
      },
    );

    if (!response.ok) {
      const body =
        await response
          .json()
          .catch(() => null);

      setError(
        Array.isArray(body?.message)
          ? body.message.join(", ")
          : body?.message ||
              "Data gagal disimpan",
      );

      return;
    }

    setModal(false);
    await load();
  }

  async function remove(id: number) {
    if (
      !confirm(
        "Hapus data transportasi ini?",
      )
    ) {
      return;
    }

    await fetch(
      `${API}/transport/${id}`,
      {
        method: "DELETE",

        headers: {
          Authorization:
            `Bearer ${getToken()}`,
        },
      },
    );

    await load();
  }

  function openImport() {
    setImportModal(true);
    setImportFile(null);
    setImportRows([]);
    setImportError("");
    setImportResult(null);
  }

  async function chooseExcel(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];

    setImportError("");
    setImportResult(null);
    setImportRows([]);

    if (!file) {
      setImportFile(null);
      return;
    }

    const extension = file.name
      .split(".")
      .pop()
      ?.toLowerCase();

    if (!["xlsx", "xls"].includes(extension ?? "")) {
      setImportFile(null);
      setImportError(
        "File wajib berformat .xlsx atau .xls",
      );

      event.target.value = "";
      return;
    }

    try {
      const data = await file.arrayBuffer();

      const workbook = XLSX.read(data, {
        type: "array",
        cellDates: false,
      });

      if (!workbook.SheetNames.length) {
        throw new Error(
          "Sheet Excel tidak ditemukan",
        );
      }

      const headerAliases = {
        unitNumber: [
          "no lambung",
          "nomor lambung",
          "no unit",
          "nomor unit",
          "unit",
          "unit number",
          "no polisi",
          "nomor polisi",
          "nopol",
          "no sarana",
          "nomor sarana",
          "kode unit",
        ],

        department: [
          "departemen",
          "department",
          "dept",
          "pengguna",
          "user",
          "bagian",
          "section",
        ],

        vehicleType: [
          "jenis",
          "jenis sarana",
          "tipe",
          "tipe sarana",
          "vehicle type",
          "type",
          "kategori sarana",
        ],

        fuelDate: [
          "tanggal",
          "tgl",
          "tanggal fuel",
          "tanggal pengisian",
          "fuel date",
          "date",
        ],

        hmStart: [
          "hm awal",
          "hm start",
          "hour meter awal",
          "hourmeter awal",
          "km awal",
          "odometer awal",
          "odo awal",
        ],

        hmEnd: [
          "hm akhir",
          "hm end",
          "hour meter akhir",
          "hourmeter akhir",
          "km akhir",
          "odometer akhir",
          "odo akhir",
        ],

        totalLiter: [
          "total liter",
          "liter",
          "liter solar",
          "solar",
          "fuel",
          "jumlah liter",
          "pemakaian fuel",
          "pengisian bbm",
          "bbm",
        ],

        lostTimeBd: [
          "lost time bd",
          "lost time",
          "breakdown",
          "bd",
          "jam breakdown",
          "total bd",
        ],

        unitStatus: [
          "status",
          "status unit",
          "unit status",
          "kondisi",
          "kondisi unit",
        ],
      };

      const normalizeCell = (value: unknown) =>
        String(value ?? "")
          .toLowerCase()
          .trim()
          .replace(/\r?\n/g, " ")
          .replace(/[^a-z0-9]+/g, "");

      const normalizedAliases = Object.fromEntries(
        Object.entries(headerAliases).map(
          ([field, aliases]) => [
            field,
            aliases.map(normalizeCell),
          ],
        ),
      ) as Record<string, string[]>;

      let selectedRows: unknown[][] = [];
      let selectedHeaderIndex = -1;
      let selectedColumnMap: Record<string, number> = {};
      let selectedSheetName = "";
      let highestScore = 0;

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];

        if (!sheet) {
          continue;
        }

        const matrix = XLSX.utils.sheet_to_json<unknown[]>(
          sheet,
          {
            header: 1,
            defval: "",
            raw: true,
            blankrows: false,
          },
        );

        const scanLimit = Math.min(matrix.length, 100);

        for (
          let rowIndex = 0;
          rowIndex < scanLimit;
          rowIndex++
        ) {
          const row = Array.isArray(matrix[rowIndex])
            ? matrix[rowIndex]
            : [];

          const columnMap: Record<string, number> = {};

          row.forEach((cell, columnIndex) => {
            const normalized = normalizeCell(cell);

            if (!normalized) {
              return;
            }

            for (const [field, aliases] of Object.entries(
              normalizedAliases,
            )) {
              if (
                columnMap[field] === undefined &&
                aliases.includes(normalized)
              ) {
                columnMap[field] = columnIndex;
              }
            }
          });

          const score = Object.keys(columnMap).length;

          const hasUnit =
            columnMap.unitNumber !== undefined;

          const hasHm =
            columnMap.hmStart !== undefined ||
            columnMap.hmEnd !== undefined;

          if (
            score > highestScore &&
            hasUnit &&
            hasHm
          ) {
            highestScore = score;
            selectedRows = matrix;
            selectedHeaderIndex = rowIndex;
            selectedColumnMap = columnMap;
            selectedSheetName = sheetName;
          }
        }
      }

      if (selectedHeaderIndex < 0) {
        throw new Error(
          "Header tabel tidak ditemukan. Pastikan file memiliki kolom No Lambung serta HM Awal atau HM Akhir.",
        );
      }

      const readColumn = (
        row: unknown[],
        field: string,
      ) => {
        const index = selectedColumnMap[field];

        if (index === undefined) {
          return "";
        }

        return row[index] ?? "";
      };

      const mappedRows: ImportRow[] = [];

      for (
        let rowIndex = selectedHeaderIndex + 1;
        rowIndex < selectedRows.length;
        rowIndex++
      ) {
        const sourceRow = Array.isArray(
          selectedRows[rowIndex],
        )
          ? selectedRows[rowIndex]
          : [];

        const unitNumber = String(
          readColumn(sourceRow, "unitNumber"),
        ).trim();

        const department = String(
          readColumn(sourceRow, "department"),
        ).trim();

        const vehicleTypeText = String(
          readColumn(sourceRow, "vehicleType") || "LV",
        )
          .trim()
          .toUpperCase();

        const hmStart = numberValue(
          readColumn(sourceRow, "hmStart"),
        );

        const hmEnd = numberValue(
          readColumn(sourceRow, "hmEnd"),
        );

        const totalLiter = numberValue(
          readColumn(sourceRow, "totalLiter"),
        );

        const lostTimeBd = numberValue(
          readColumn(sourceRow, "lostTimeBd"),
        );

        const rawStatus = String(
          readColumn(sourceRow, "unitStatus") ||
            (lostTimeBd > 0 ? "BREAKDOWN" : "READY"),
        )
          .trim()
          .toUpperCase();

        const rawDate = readColumn(
          sourceRow,
          "fuelDate",
        );

        const meaningfulValues = sourceRow.filter(
          (value) => String(value ?? "").trim() !== "",
        );

        if (!meaningfulValues.length) {
          continue;
        }

        if (!unitNumber) {
          continue;
        }

        if (
          !Number.isFinite(hmStart) &&
          !Number.isFinite(hmEnd)
        ) {
          continue;
        }

        mappedRows.push({
          unitNumber,

          department:
            department || "BELUM DIISI",

          vehicleType:
            vehicleTypeText.includes("BUS")
              ? "BUS"
              : "LV",

          fuelDate: excelDateToISO(
            rawDate,
            Number(importMonth),
            Number(importYear),
          ),

          hmStart:
            Number.isFinite(hmStart)
              ? hmStart
              : 0,

          hmEnd:
            Number.isFinite(hmEnd)
              ? hmEnd
              : 0,

          totalLiter:
            Number.isFinite(totalLiter)
              ? totalLiter
              : 0,

          lostTimeBd:
            Number.isFinite(lostTimeBd)
              ? lostTimeBd
              : 0,

          unitStatus:
            rawStatus.includes("BREAK") ||
            rawStatus === "BD" ||
            rawStatus.includes("RUSAK")
              ? "BREAKDOWN"
              : "READY",
        });
      }

      if (!mappedRows.length) {
        throw new Error(
          `Header ditemukan pada sheet "${selectedSheetName}", tetapi baris data Transport belum dapat dibaca. Periksa kolom No Lambung, HM Awal, dan HM Akhir.`,
        );
      }

      setImportFile(file);
      setImportRows(mappedRows);

      setImportError(
        `${mappedRows.length} baris berhasil dibaca dari sheet "${selectedSheetName}".`,
      );
    } catch (readError) {
      setImportFile(null);
      setImportRows([]);

      setImportError(
        readError instanceof Error
          ? readError.message
          : "File Excel gagal dibaca",
      );
    }
  }
  async function submitImport() {
    setImportError("");
    setImportResult(null);

    if (!importFile) {
      setImportError(
        "Pilih file Excel terlebih dahulu",
      );

      return;
    }

    if (
      importRows.length === 0
    ) {
      setImportError(
        "Data Excel belum terbaca",
      );

      return;
    }

    setImporting(true);

    try {
      const response = await fetch(
        `${API}/transport/import`,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${getToken()}`,
          },

          body: JSON.stringify({
            month:
              Number(importMonth),

            year:
              Number(importYear),

            rows: importRows,
          }),
        },
      );

      const body =
        await response
          .json()
          .catch(() => null);

      if (!response.ok) {
        setImportError(
          Array.isArray(body?.message)
            ? body.message.join(", ")
            : body?.message ||
                "Import Excel gagal",
        );

        return;
      }

      setImportResult(body);
      await load();
    } catch {
      setImportError(
        "Backend tidak dapat dihubungi saat import",
      );
    } finally {
      setImporting(false);
    }
  }

  return (
    <section>
      <div className={styles.hero}>
        <div>
          <span
            className={
              styles.heroIcon
            }
          >
            <Fuel />
          </span>

          <div>
            <h1>
              Data Transportasi
            </h1>

            <p>
              Kelola HM, pemakaian
              fuel, availability,
              dan status setiap
              unit.
            </p>
          </div>
        </div>

        <div
          className={
            styles.heroActions
          }
        >
          <button
            className={
              styles.importButton
            }
            onClick={openImport}
          >
            <FileSpreadsheet />

            Import Excel
          </button>

          <button
            className={
              styles.primary
            }
            onClick={() => open()}
          >
            <Plus />

            Tambah Transportasi
          </button>
        </div>
      </div>

      <div
        className={
          styles.filterPanel
        }
      >
        <label>
          <Search />

          <input
            placeholder="Cari no lambung atau departemen..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
          />
        </label>

        <select
          value={month}
          onChange={(event) =>
            setMonth(
              event.target.value,
            )
          }
        >
          <option value="">
            Semua Bulan
          </option>

          {months.map(
            (monthName, index) => (
              <option
                value={index + 1}
                key={monthName}
              >
                {monthName}
              </option>
            ),
          )}
        </select>

        <select
          value={year}
          onChange={(event) =>
            setYear(
              event.target.value,
            )
          }
        >
          <option value="">
            Semua Tahun
          </option>

          {[
            2025,
            2026,
            2027,
            2028,
          ].map((yearValue) => (
            <option
              key={yearValue}
            >
              {yearValue}
            </option>
          ))}
        </select>

        <select
          value={vehicleTypeFilter}
          onChange={(event) =>
            setVehicleTypeFilter(
              event.target.value,
            )
          }
        >
          <option value="">
            Semua Jenis
          </option>

          <option value="LV">LV</option>

          <option value="BUS">
            BUS
          </option>
        </select>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target.value,
            )
          }
        >
          <option value="">
            Semua Status
          </option>

          <option value="READY">
            READY
          </option>

          <option value="BREAKDOWN">
            BREAKDOWN
          </option>
        </select>

        <button
          onClick={() => {
            setSearch("");
            setMonth("");
            setYear("");
            setVehicleTypeFilter("");
            setStatusFilter("");
          }}
        >
          Reset
        </button>
      </div>

      {error && !modal && (
        <p
          className={
            styles.pageError
          }
        >
          {error}
        </p>
      )}

      <div
        className={
          styles.tablePanel
        }
      >
        <div
          className={
            styles.tableTitle
          }
        >
          <h3>
            Daftar Transportasi
          </h3>

          <span>
            Total {filtered.length} data
          </span>
        </div>

        <div
          className={
            styles.tableScroll
          }
        >
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Tanggal</th>
                <th>No Lambung</th>
                <th>Jenis</th>
                <th>Departemen</th>
                <th>HM Awal</th>
                <th>HM Akhir</th>
                <th>Total HM</th>
                <th>Liter</th>
                <th>KM/L</th>
                <th>UA</th>
                <th>Status</th>
                <th>Dibuat Oleh</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map(
                (row, index) => (
                  <tr key={row.id}>
                    <td>
                      {index + 1}
                    </td>

                    <td>
                      {new Date(
                        row.fuelDate,
                      ).toLocaleDateString(
                        "id-ID",
                      )}
                    </td>

                    <td>
                      <b>
                        {
                          row.unitNumber
                        }
                      </b>
                    </td>

                    <td>
                      {
                        row.vehicleType
                      }
                    </td>

                    <td>
                      {
                        row.department
                      }
                    </td>

                    <td>
                      {Number(
                        row.hmStart,
                      ).toLocaleString(
                        "id-ID",
                      )}
                    </td>

                    <td>
                      {Number(
                        row.hmEnd,
                      ).toLocaleString(
                        "id-ID",
                      )}
                    </td>

                    <td>
                      {Number(
                        row.totalHm,
                      ).toLocaleString(
                        "id-ID",
                      )}
                    </td>

                    <td>
                      {Number(
                        row.totalLiter,
                      ).toLocaleString(
                        "id-ID",
                      )}
                    </td>

                    <td>
                      {Number(
                        row.kmPerLiter,
                      ).toFixed(2)}
                    </td>

                    <td>
                      {Number(
                        row.uaPercentage,
                      ).toFixed(2)}
                      %
                    </td>

                    <td>
                      <span
                        className={
                          row.unitStatus ===
                          "READY"
                            ? styles.ready
                            : styles.breakdown
                        }
                      >
                        {
                          row.unitStatus
                        }
                      </span>
                    </td>

                    <td>
                      {row.creator
                        ?.name ?? "-"}
                    </td>

                    <td>
                      <div
                        className={
                          styles.actions
                        }
                      >
                        <button
                          onClick={() =>
                            open(row)
                          }
                          title="Edit"
                        >
                          <Pencil />
                        </button>

                        <button
                          onClick={() =>
                            remove(
                              row.id,
                            )
                          }
                          title="Hapus"
                        >
                          <Trash2 />
                        </button>
                      </div>
                    </td>
                  </tr>
                ),
              )}

              {!filtered.length && (
                <tr>
                  <td
                    colSpan={14}
                    className={
                      styles.empty
                    }
                  >
                    Belum ada data
                    transportasi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal && (
        <div
          className={
            styles.modalBack
          }
        >
          <form
            className={
              styles.modal
            }
            onSubmit={submit}
          >
            <header>
              <div>
                <h2>
                  {edit
                    ? "Edit"
                    : "Tambah"}{" "}
                  Transportasi
                </h2>

                <p>
                  Perhitungan HM,
                  KM/Liter, dan UA
                  diproses otomatis.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setModal(false)
                }
              >
                <X />
              </button>
            </header>

            <div
              className={
                styles.formGrid
              }
            >
              {[
                [
                  "No Lambung",
                  "unitNumber",
                  "text",
                ],
                [
                  "Departemen",
                  "department",
                  "text",
                ],
                [
                  "Tanggal",
                  "fuelDate",
                  "date",
                ],
                [
                  "HM Awal",
                  "hmStart",
                  "number",
                ],
                [
                  "HM Akhir",
                  "hmEnd",
                  "number",
                ],
                [
                  "Total Liter",
                  "totalLiter",
                  "number",
                ],
                [
                  "Lost Time BD",
                  "lostTimeBd",
                  "number",
                ],
              ].map(
                ([
                  label,
                  key,
                  type,
                ]) => (
                  <label key={key}>
                    {label}

                    <input
                      required={
                        ![
                          "lostTimeBd",
                        ].includes(
                          key,
                        )
                      }
                      type={type}
                      step={
                        type ===
                        "number"
                          ? "0.01"
                          : undefined
                      }
                      min={
                        type ===
                        "number"
                          ? 0
                          : undefined
                      }
                      value={
                        (
                          form as Record<
                            string,
                            string
                          >
                        )[key]
                      }
                      onChange={(
                        event,
                      ) =>
                        setForm({
                          ...form,
                          [key]:
                            event
                              .target
                              .value,
                        })
                      }
                    />
                  </label>
                ),
              )}

              <label>
                Jenis Sarana

                <select
                  value={
                    form.vehicleType
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      vehicleType:
                        event.target
                          .value,
                    })
                  }
                >
                  <option>
                    LV
                  </option>

                  <option>
                    BUS
                  </option>
                </select>
              </label>

              <label>
                Status Unit

                <select
                  value={
                    form.unitStatus
                  }
                  onChange={(
                    event,
                  ) =>
                    setForm({
                      ...form,
                      unitStatus:
                        event.target
                          .value,
                    })
                  }
                >
                  <option>
                    READY
                  </option>

                  <option>
                    BREAKDOWN
                  </option>
                </select>
              </label>
            </div>

            {error && (
              <p
                className={
                  styles.error
                }
              >
                {error}
              </p>
            )}

            <footer>
              <button
                type="button"
                onClick={() =>
                  setModal(false)
                }
              >
                Batal
              </button>

              <button
                className={
                  styles.primary
                }
              >
                Simpan
              </button>
            </footer>
          </form>
        </div>
      )}

      {importModal && (
        <div
          className={
            styles.modalBack
          }
        >
          <div
            className={
              styles.importModal
            }
          >
            <header>
              <div>
                <h2>
                  Import Excel
                  Transportasi
                </h2>

                <p>
                  Pilih periode lalu
                  upload file Excel
                  transportasi.
                </p>
              </div>

              <button
                type="button"
                onClick={() =>
                  setImportModal(
                    false,
                  )
                }
              >
                <X />
              </button>
            </header>

            <div
              className={
                styles.importBody
              }
            >
              <div
                className={
                  styles.importPeriod
                }
              >
                <label>
                  Bulan Data

                  <select
                    value={
                      importMonth
                    }
                    onChange={(
                      event,
                    ) => {
                      setImportMonth(
                        event.target
                          .value,
                      );

                      setImportFile(
                        null,
                      );

                      setImportRows(
                        [],
                      );

                      setImportResult(
                        null,
                      );
                    }}
                  >
                    {months.map(
                      (
                        monthName,
                        index,
                      ) => (
                        <option
                          key={
                            monthName
                          }
                          value={
                            index + 1
                          }
                        >
                          {
                            monthName
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>

                <label>
                  Tahun Data

                  <select
                    value={
                      importYear
                    }
                    onChange={(
                      event,
                    ) => {
                      setImportYear(
                        event.target
                          .value,
                      );

                      setImportFile(
                        null,
                      );

                      setImportRows(
                        [],
                      );

                      setImportResult(
                        null,
                      );
                    }}
                  >
                    {[
                      2025,
                      2026,
                      2027,
                      2028,
                    ].map(
                      (
                        yearValue,
                      ) => (
                        <option
                          key={
                            yearValue
                          }
                          value={
                            yearValue
                          }
                        >
                          {
                            yearValue
                          }
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </div>

              <label
                className={
                  styles.fileDrop
                }
              >
                <Upload />

                <strong>
                  Pilih File Excel
                </strong>

                <span>
                  Format .xlsx atau
                  .xls
                </span>

                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={
                    chooseExcel
                  }
                />
              </label>

              {importFile && (
                <div
                  className={
                    styles.fileInfo
                  }
                >
                  <FileSpreadsheet />

                  <div>
                    <strong>
                      {
                        importFile.name
                      }
                    </strong>

                    <span>
                      {
                        importRows.length
                      }{" "}
                      baris terbaca
                    </span>
                  </div>
                </div>
              )}

              <div
                className={
                  styles.importHelp
                }
              >
                <strong>
                  Kolom Excel yang
                  dibaca:
                </strong>

                <span>
                  Tanggal, No
                  Lambung, Jenis
                  Sarana,
                  Departemen, HM
                  Awal, HM Akhir,
                  Total Liter, Lost
                  Time BD, dan
                  Status Unit.
                </span>
              </div>

              {importError && (
                <p
                  className={
                    styles.importError
                  }
                >
                  {importError}
                </p>
              )}

              {importResult && (
                <div
                  className={
                    styles.importResult
                  }
                >
                  <strong>
                    {
                      importResult.message
                    }
                  </strong>

                  <div>
                    <span>
                      Total:{" "}
                      {
                        importResult.total
                      }
                    </span>

                    <span>
                      Berhasil:{" "}
                      {
                        importResult.successCount
                      }
                    </span>

                    <span>
                      Gagal:{" "}
                      {
                        importResult.failedCount
                      }
                    </span>
                  </div>

                  {!!importResult
                    .failed?.length && (
                    <ul>
                      {importResult.failed
                        .slice(0, 20)
                        .map(
                          (
                            item,
                            index,
                          ) => (
                            <li
                              key={
                                `${item.row}-${index}`
                              }
                            >
                              Baris{" "}
                              {
                                item.row
                              }
                              :{" "}
                              {
                                item.message
                              }
                            </li>
                          ),
                        )}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <footer>
              <button
                type="button"
                onClick={() =>
                  setImportModal(
                    false,
                  )
                }
              >
                Tutup
              </button>

              <button
                type="button"
                className={
                  styles.primary
                }
                disabled={
                  importing ||
                  !importFile ||
                  importRows.length ===
                    0
                }
                onClick={
                  submitImport
                }
              >
                {importing
                  ? "Import..."
                  : "Import Data"}
              </button>
            </footer>
          </div>
        </div>
      )}
    </section>
  );
}

