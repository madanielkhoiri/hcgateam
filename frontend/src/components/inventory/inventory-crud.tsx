"use client";

import {
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { compressImage } from "@/lib/compress-image";
import { useStoredUser } from "@/lib/use-stored-user";
import styles from "./inventory-crud.module.css";

const ROLE_BOLEH_EDIT_STOK = ["ADMIN", "SUPER_ADMIN", "SECTION_HEAD"];

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001/api";

const units = [
  "BATANG",
  "BOTOL",
  "BUAH",
  "CM",
  "DERIJEN",
  "DUS",
  "KARUNG",
  "KG",
  "KOLI",
  "KOTAK",
  "LEMBAR",
  "LITER",
  "LUSI",
  "M2",
  "M3",
  "METER",
  "MM",
  "PAC",
  "PC",
  "RET",
  "RIM",
  "ROLL",
  "SAK",
  "SET",
  "TABUNG",
  "TUBE",
  "UNIT",
];

type Mode =
  | "items"
  | "stocks"
  | "stock-ins"
  | "stock-outs";

const categories = [
  "ATK",
  "HOUSEKEEPING",
  "BAJU",
  "ELEKTRONIK",
  "FURNITURE",
];

type Item = {
  id: number;
  code: string;
  name: string;
  category: "ATK" | "HOUSEKEEPING" | "BAJU" | "ELEKTRONIK" | "FURNITURE";
  unit: string;
  isActive: boolean;
  stock?: {
    id: number;
    quantity: number;
  } | null;
};

type Stock = {
  id: number;
  itemId: number;
  quantity: number;
  updatedAt: string;
  item: Item;
};

type Transaction = {
  id: number;
  date: string;
  itemId: number;
  category: string;
  quantity: number;
  unit: string;
  taker?: string;
  department?: string | null;
  description?: string | null;
  photoPath?: string | null;
  item: Item;
};

type BatchRow = {
  key: string;
  itemId: string;
  itemSearch: string;
  quantity: string;
  dropdownOpen: boolean;
};

type InventoryScope = "GENERAL" | "MESS" | "ELECTRIC";

type InventoryCrudProps = {
  mode: Mode;
  scope?: InventoryScope;
};

function getToken() {
  return (
    localStorage.getItem("hcga_access_token") ||
    sessionStorage.getItem("hcga_access_token")
  );
}

function categoryLabel(category: string) {
  if (category === "HOUSEKEEPING") {
    return "HOUSEKEEPING";
  }

  if (category === "BAJU") {
    return "BAJU";
  }

  if (category === "ELEKTRONIK") {
    return "ELEKTRONIK";
  }

  if (category === "FURNITURE") {
    return "FURNITURE";
  }

  return "ATK";
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function createBatchRow(): BatchRow {
  return {
    key: `${Date.now()}-${Math.random()}`,
    itemId: "",
    itemSearch: "",
    quantity: "",
    dropdownOpen: false,
  };
}

type ElectricPhotoThumbnailProps = {
  filename: string;
  onZoom: (url: string) => void;
};

function ElectricPhotoThumbnail({
  filename,
  onZoom,
}: ElectricPhotoThumbnailProps) {
  const [imageUrl, setImageUrl] = useState("");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl = "";

    async function loadPhoto() {
      try {
        const response = await fetch(
          `${API_URL}/inventory-area/ELECTRIC/stock-outs/photo/${encodeURIComponent(filename)}`,
          {
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
          },
        );

        if (!response.ok) {
          throw new Error("Foto gagal dimuat");
        }

        const blob = await response.blob();
        objectUrl = URL.createObjectURL(blob);

        if (active) {
          setImageUrl(objectUrl);
        }
      } catch {
        if (active) {
          setFailed(true);
        }
      }
    }

    void loadPhoto();

    return () => {
      active = false;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [filename]);

  if (failed) {
    return (
      <span className={styles.photoUnavailable}>
        Gagal dimuat
      </span>
    );
  }

  if (!imageUrl) {
    return (
      <span className={styles.photoLoading}>
        Memuat...
      </span>
    );
  }

  return (
    <button
      type="button"
      className={styles.photoThumbnailButton}
      onClick={() => onZoom(imageUrl)}
      title="Klik untuk memperbesar foto"
    >
      <img
        src={imageUrl}
        alt="Dokumentasi barang keluar Electric"
        className={styles.photoThumbnail}
      />
    </button>
  );
}

export default function InventoryCrud({
  mode,
  scope = "GENERAL",
}: InventoryCrudProps) {
  const user = useStoredUser();
  const bolehEditStok =
    !!user &&
    (ROLE_BOLEH_EDIT_STOK.includes(user.role) || (scope === "ELECTRIC" && user.role === "ELEKTRIK"));

  const [items, setItems] = useState<Item[]>([]);
  const [stocks, setStocks] = useState<Stock[]>([]);
  const [transactions, setTransactions] = useState<
    Transaction[]
  >([]);

  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<
    number | null
  >(null);

  const [name, setName] = useState("");
  const [category, setCategory] = useState("ATK");
  const [unit, setUnit] = useState("PC");
  const [isActive, setIsActive] = useState(true);

  const [date, setDate] = useState(today());
  const [itemId, setItemId] = useState("");
  const [itemSearch, setItemSearch] = useState("");
  const [itemDropdownOpen, setItemDropdownOpen] =
    useState(false);
  const [quantity, setQuantity] = useState("");
  const [taker, setTaker] = useState("");
  const [department, setDepartment] = useState("");
  const [description, setDescription] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(
    null,
  );
  const [existingPhotoPath, setExistingPhotoPath] =
    useState("");
  const [photoInputKey, setPhotoInputKey] = useState(0);
  const [zoomImageUrl, setZoomImageUrl] = useState("");

  const [batchRows, setBatchRows] = useState<BatchRow[]>([
    createBatchRow(),
  ]);

  const availableYears = useMemo(() => {
    const current = new Date().getFullYear();

    return Array.from({ length: 7 }, (_, index) => current - 5 + index);
  }, []);

  const inventoryApiPath = `inventory-area/${scope}`;

  const isElectricStockOut =
    scope === "ELECTRIC" && mode === "stock-outs";

  const config = useMemo(() => {
    if (mode === "items") {
      return {
        title: "Master Barang",
        description:
          "Kelola kode, nama, jenis, satuan, dan status barang.",
        endpoint: "items",
        addLabel: "Tambah Barang",
      };
    }

    if (mode === "stocks") {
      return {
        title: "Stok Barang",
        description:
          "Lihat dan ubah jumlah stok seluruh barang.",
        endpoint: "stocks",
        addLabel: "",
      };
    }

    if (mode === "stock-ins") {
      return {
        title: "Barang Masuk",
        description:
          "Input beberapa barang sekaligus dan stok otomatis bertambah.",
        endpoint: "stock-ins",
        addLabel: "Tambah Barang Masuk",
      };
    }

    return {
      title: "Barang Keluar",
      description:
        "Input beberapa barang sekaligus dan stok otomatis berkurang.",
      endpoint: "stock-outs",
      addLabel: "Tambah Barang Keluar",
    };
  }, [mode]);

  const request = useCallback(
    async (
      endpoint: string,
      options?: RequestInit,
    ) => {
      const response = await fetch(
        `${API_URL}/${inventoryApiPath}/${endpoint}`,
        {
          ...options,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getToken()}`,
            ...options?.headers,
          },
        },
      );

      const text = await response.text();

      let result: any = {};

      try {
        result = text ? JSON.parse(text) : {};
      } catch {
        result = {
          message: text || "Respons server tidak valid",
        };
      }

      if (!response.ok) {
        const apiMessage = Array.isArray(result.message)
          ? result.message[0]
          : result.message;

        throw new Error(
          apiMessage || "Permintaan gagal diproses",
        );
      }

      return result;
    },
    [inventoryApiPath],
  );

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const itemResult = await request("items");
      setItems(itemResult);

      if (mode === "stocks") {
        setStocks(await request("stocks"));
      }

      if (
        mode === "stock-ins" ||
        mode === "stock-outs"
      ) {
        setTransactions(
          await request(config.endpoint),
        );
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Data gagal dimuat",
      );
    } finally {
      setLoading(false);
    }
  }, [config.endpoint, mode, request]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function resetForm() {
    setEditingId(null);
    setName("");
    setCategory("ATK");
    setUnit("PC");
    setIsActive(true);
    setDate(today());
    setItemId("");
    setItemSearch("");
    setItemDropdownOpen(false);
    setQuantity("");
    setTaker("");
    setDepartment("");
    setDescription("");
    setPhotoFile(null);
    setExistingPhotoPath("");
    setPhotoInputKey((current) => current + 1);
    setBatchRows([createBatchRow()]);
    setError("");
  }

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  function openEditItem(item: Item) {
    resetForm();
    setEditingId(item.id);
    setName(item.name);
    setCategory(item.category);
    setUnit(item.unit);
    setIsActive(item.isActive);
    setModalOpen(true);
  }

  function openEditStock(stock: Stock) {
    resetForm();
    setEditingId(stock.id);
    setItemId(String(stock.itemId));
    setQuantity(String(stock.quantity));
    setModalOpen(true);
  }

  function openEditTransaction(row: Transaction) {
    resetForm();
    setEditingId(row.id);
    setDate(row.date.slice(0, 10));
    setItemId(String(row.itemId));
    setItemSearch(`${row.item.code} - ${row.item.name}`);
    setQuantity(String(row.quantity));
    setTaker(row.taker ?? "");
    setDepartment(row.department ?? "");
    setDescription(row.description ?? "");
    setPhotoFile(null);
    setExistingPhotoPath(row.photoPath ?? "");
    setPhotoInputKey((current) => current + 1);
    setModalOpen(true);
  }

  function addBatchRow() {
    setBatchRows((current) => [
      ...current,
      createBatchRow(),
    ]);
  }

  function removeBatchRow(key: string) {
    setBatchRows((current) => {
      if (current.length === 1) {
        return current;
      }

      return current.filter((row) => row.key !== key);
    });
  }

  function updateBatchRow(
    key: string,
    patch: Partial<BatchRow>,
  ) {
    setBatchRows((current) =>
      current.map((row) =>
        row.key === key ? { ...row, ...patch } : row,
      ),
    );
  }

  function getSelectableItems(row: BatchRow) {
    const keyword = row.itemSearch
      .trim()
      .toLowerCase();

    return items
      .filter((item) => item.isActive)
      .filter((item) => {
        const alreadySelected = batchRows.some(
          (otherRow) =>
            otherRow.key !== row.key &&
            Number(otherRow.itemId) === item.id,
        );

        if (alreadySelected) {
          return false;
        }

        if (!keyword) {
          return true;
        }

        return `${item.code} ${item.name} ${item.category} ${item.unit}`
          .toLowerCase()
          .includes(keyword);
      })
      .slice(0, 20);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setMessage("");

      if (
        (mode === "stock-ins" ||
          mode === "stock-outs") &&
        editingId === null
      ) {
        const invalidRow = batchRows.find(
          (row) =>
            !row.itemId ||
            !row.quantity ||
            Number(row.quantity) <= 0,
        );

        if (invalidRow) {
          throw new Error(
            "Pilih barang dan isi jumlah pada seluruh baris",
          );
        }

        const duplicateIds = batchRows
          .map((row) => row.itemId)
          .filter(
            (value, index, array) =>
              array.indexOf(value) !== index,
          );

        if (duplicateIds.length > 0) {
          throw new Error(
            "Barang yang sama tidak boleh dipilih dua kali",
          );
        }

        const batchItems = batchRows.map((row) => ({
          itemId: Number(row.itemId),
          quantity: Number(row.quantity),
        }));

        if (isElectricStockOut) {
          if (!taker.trim()) {
            throw new Error("Pengambil wajib diisi");
          }

          if (!description.trim()) {
            throw new Error("Keterangan wajib diisi");
          }

          if (descriptionWordCount > 500) {
            throw new Error(
              "Keterangan maksimal 500 kata",
            );
          }

          if (!photoFile) {
            throw new Error(
              "Foto dokumentasi wajib diunggah",
            );
          }

          const formData = new FormData();

          formData.append("date", date);
          formData.append("taker", taker.trim());
          formData.append(
            "description",
            description.trim(),
          );
          formData.append(
            "items",
            JSON.stringify(batchItems),
          );
          formData.append("photo", photoFile);

          const response = await fetch(
            `${API_URL}/inventory-area/ELECTRIC/stock-outs/batch-upload`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${getToken()}`,
              },
              body: formData,
            },
          );

          const responseText = await response.text();

          let responseResult: any = {};

          try {
            responseResult = responseText
              ? JSON.parse(responseText)
              : {};
          } catch {
            responseResult = {
              message:
                responseText ||
                "Respons server tidak valid",
            };
          }

          if (response.status === 401) {
            localStorage.removeItem(
              "hcga_access_token",
            );
            sessionStorage.removeItem(
              "hcga_access_token",
            );
            localStorage.removeItem("access_token");
            sessionStorage.removeItem("access_token");

            window.location.href = "/login";

            throw new Error(
              "Sesi login berakhir. Silakan login kembali.",
            );
          }

          if (!response.ok) {
            const responseMessage = Array.isArray(
              responseResult.message,
            )
              ? responseResult.message[0]
              : responseResult.message;

            throw new Error(
              responseMessage ||
                "Barang keluar Electric gagal disimpan",
            );
          }
        } else {
          const payload = {
            date,
            items: batchItems,
            ...(mode === "stock-outs"
              ? {
                  taker,
                  department,
                }
              : {}),
          };

          await request(`${config.endpoint}/batch`, {
            method: "POST",
            body: JSON.stringify(payload),
          });
        }

        setModalOpen(false);
        setMessage(
          `${batchRows.length} barang berhasil disimpan`,
        );

        resetForm();
        await loadData();
        return;
      }

      if (
        isElectricStockOut &&
        editingId !== null
      ) {
        if (!itemId) {
          throw new Error("Barang wajib dipilih");
        }

        if (
          !quantity ||
          Number(quantity) <= 0
        ) {
          throw new Error(
            "Jumlah barang wajib lebih dari 0",
          );
        }

        if (!taker.trim()) {
          throw new Error("Pengambil wajib diisi");
        }

        if (!description.trim()) {
          throw new Error("Keterangan wajib diisi");
        }

        if (descriptionWordCount > 500) {
          throw new Error(
            "Keterangan maksimal 500 kata",
          );
        }

        const formData = new FormData();

        formData.append("date", date);
        formData.append("itemId", itemId);
        formData.append("quantity", quantity);
        formData.append("taker", taker.trim());
        formData.append(
          "description",
          description.trim(),
        );

        if (photoFile) {
          formData.append("photo", photoFile);
        }

        const response = await fetch(
          `${API_URL}/inventory-area/ELECTRIC/stock-outs/${editingId}/edit-upload`,
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${getToken()}`,
            },
            body: formData,
          },
        );

        const responseText = await response.text();

        let responseResult: {
          message?: string | string[];
        } = {};

        try {
          responseResult = responseText
            ? JSON.parse(responseText)
            : {};
        } catch {
          responseResult = {
            message:
              responseText ||
              "Respons server tidak valid",
          };
        }

        if (response.status === 401) {
          localStorage.removeItem(
            "hcga_access_token",
          );
          sessionStorage.removeItem(
            "hcga_access_token",
          );
          localStorage.removeItem("access_token");
          sessionStorage.removeItem("access_token");

          window.location.href = "/login";

          throw new Error(
            "Sesi login berakhir. Silakan login kembali.",
          );
        }

        if (!response.ok) {
          const responseMessage = Array.isArray(
            responseResult.message,
          )
            ? responseResult.message[0]
            : responseResult.message;

          throw new Error(
            responseMessage ||
              "Data Barang Keluar Electric gagal diperbarui",
          );
        }
      } else {
        let endpoint = config.endpoint;
        let payload: Record<string, unknown>;

        if (mode === "items") {
          payload = {
            name,
            category,
            unit,
            ...(editingId !== null
              ? { isActive }
              : {}),
          };
        } else if (mode === "stocks") {
          payload = {
            quantity: Number(quantity),
          };
        } else {
          payload = {
            date,
            itemId: Number(itemId),
            quantity: Number(quantity),
            ...(mode === "stock-outs"
              ? {
                  taker,
                  department,
                }
              : {}),
          };
        }

        if (editingId !== null) {
          endpoint = `${endpoint}/${editingId}`;
        }

        await request(endpoint, {
          method:
            editingId === null
              ? "POST"
              : "PATCH",
          body: JSON.stringify(payload),
        });
      }

      setModalOpen(false);
      setMessage(
        editingId === null
          ? "Data berhasil ditambahkan"
          : "Data berhasil diperbarui",
      );

      resetForm();
      await loadData();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Data gagal disimpan",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteData(id: number) {
    const approved = window.confirm(
      "Yakin ingin menghapus data ini?",
    );

    if (!approved) {
      return;
    }

    try {
      setError("");
      setMessage("");

      await request(`${config.endpoint}/${id}`, {
        method: "DELETE",
      });

      setMessage("Data berhasil dihapus");
      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Data gagal dihapus",
      );
    }
  }

  const selectedItem = items.find(
    (item) => item.id === Number(itemId),
  );

  const descriptionWordCount = description
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  const filteredSingleItems = items
    .filter((item) => item.isActive)
    .filter((item) => {
      const keyword = itemSearch
        .trim()
        .toLowerCase();

      if (!keyword) {
        return true;
      }

      return `${item.code} ${item.name} ${item.category} ${item.unit}`
        .toLowerCase()
        .includes(keyword);
    })
    .slice(0, 20);

  const keyword = search.trim().toLowerCase();

  const filteredItems = items
    .filter((item) =>
      `${item.code} ${item.name} ${item.category} ${item.unit}`
        .toLowerCase()
        .includes(keyword),
    )
    .filter((item) => !categoryFilter || item.category === categoryFilter)
    .filter((item) => {
      if (!statusFilter) {
        return true;
      }

      return statusFilter === "active"
        ? item.isActive
        : !item.isActive;
    });

  const filteredStocks = stocks
    .filter((stock) =>
      `${stock.item.code} ${stock.item.name} ${stock.item.category} ${stock.item.unit}`
        .toLowerCase()
        .includes(keyword),
    )
    .filter(
      (stock) =>
        !categoryFilter || stock.item.category === categoryFilter,
    );

  const filteredTransactions = transactions
    .filter(
      (row) =>
        `${row.item.code} ${row.item.name} ${row.category} ${row.unit} ${row.taker ?? ""} ${row.department ?? ""} ${row.description ?? ""}`
          .toLowerCase()
          .includes(keyword),
    )
    .filter((row) => {
      if (!month && !year) {
        return true;
      }

      const rowDate = new Date(row.date);

      if (year && rowDate.getUTCFullYear() !== Number(year)) {
        return false;
      }

      if (month && rowDate.getUTCMonth() + 1 !== Number(month)) {
        return false;
      }

      return true;
    });

  function resetFilters() {
    setSearch("");
    setMonth("");
    setYear("");
    setCategoryFilter("");
    setStatusFilter("");
  }

  return (
    <main className={styles.page}>
      <div className={styles.heading}>
        <div>
          <h1>{config.title}</h1>
          <p>{config.description}</p>
        </div>

        {mode !== "stocks" && (
          <button
            type="button"
            className={styles.addButton}
            onClick={openCreate}
          >
            <Plus size={18} />
            {config.addLabel}
          </button>
        )}
      </div>

      {message && (
        <div className={styles.successMessage}>
          {message}
        </div>
      )}

      {error && !modalOpen && (
        <div className={styles.errorMessage}>
          {error}
        </div>
      )}

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <div className={styles.search}>
            <Search size={18} />

            <input
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Cari data..."
            />
          </div>

          <div className={styles.filters}>
            {(mode === "stock-ins" ||
              mode === "stock-outs") && (
              <>
                <select
                  className={styles.filterSelect}
                  value={month}
                  onChange={(event) =>
                    setMonth(event.target.value)
                  }
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
                  className={styles.filterSelect}
                  value={year}
                  onChange={(event) =>
                    setYear(event.target.value)
                  }
                >
                  <option value="">Semua Tahun</option>
                  {availableYears.map((item) => (
                    <option value={item} key={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </>
            )}

            {(mode === "items" || mode === "stocks") && (
              <select
                className={styles.filterSelect}
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(event.target.value)
                }
              >
                <option value="">Semua Jenis</option>
                {categories.map((item) => (
                  <option value={item} key={item}>
                    {categoryLabel(item)}
                  </option>
                ))}
              </select>
            )}

            {mode === "items" && (
              <select
                className={styles.filterSelect}
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
              >
                <option value="">Semua Status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            )}

            <button
              type="button"
              className={styles.resetButton}
              onClick={resetFilters}
            >
              Reset
            </button>
          </div>

          <span className={styles.total}>
            {mode === "items" &&
              `${filteredItems.length} data`}
            {mode === "stocks" &&
              `${filteredStocks.length} data`}
            {(mode === "stock-ins" ||
              mode === "stock-outs") &&
              `${filteredTransactions.length} data`}
          </span>
        </div>

        <div className={styles.tableWrapper}>
          {loading ? (
            <div className={styles.loading}>
              Memuat data...
            </div>
          ) : (
            <table className={styles.table} data-mode={mode}>
              {mode === "items" && (
                <>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Kode Barang</th>
                      <th>Nama Barang</th>
                      <th>Jenis</th>
                      <th>Satuan</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredItems.map(
                      (item, index) => (
                        <tr key={item.id}>
                          <td>{index + 1}</td>
                          <td>
                            <strong>{item.code}</strong>
                          </td>
                          <td>{item.name}</td>
                          <td>
                            {categoryLabel(
                              item.category,
                            )}
                          </td>
                          <td>{item.unit}</td>
                          <td>
                            <span
                              className={
                                item.isActive
                                  ? styles.active
                                  : styles.inactive
                              }
                            >
                              {item.isActive
                                ? "Aktif"
                                : "Nonaktif"}
                            </span>
                          </td>
                          <td>
                            <div className={styles.actions}>
                              <button
                                type="button"
                                onClick={() =>
                                  openEditItem(item)
                                }
                              >
                                <Pencil size={16} />
                              </button>

                              <button
                                type="button"
                                className={
                                  styles.deleteButton
                                }
                                onClick={() =>
                                  deleteData(item.id)
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </>
              )}

              {mode === "stocks" && (
                <>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Kode Barang</th>
                      <th>Nama Barang</th>
                      <th>Jenis</th>
                      <th>Jumlah Stok</th>
                      <th>Satuan</th>
                      <th>Diperbarui</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredStocks.map(
                      (stock, index) => (
                        <tr key={stock.id}>
                          <td>{index + 1}</td>
                          <td>
                            <strong>
                              {stock.item.code}
                            </strong>
                          </td>
                          <td>{stock.item.name}</td>
                          <td>
                            {categoryLabel(
                              stock.item.category,
                            )}
                          </td>
                          <td>{stock.quantity}</td>
                          <td>{stock.item.unit}</td>
                          <td>
                            {formatDate(
                              stock.updatedAt,
                            )}
                          </td>
                          <td>
                            <div className={styles.actions}>
                              {bolehEditStok ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    openEditStock(stock)
                                  }
                                >
                                  <Pencil size={16} />
                                </button>
                              ) : (
                                <span
                                  style={{ color: "#b7c2cf", fontSize: 12 }}
                                  title="Hanya Admin/Section Head yang boleh mengubah stok"
                                >
                                  —
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </>
              )}

              {(mode === "stock-ins" ||
                mode === "stock-outs") && (
                <>
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Tanggal</th>
                      <th>Kode Barang</th>
                      <th>Nama Barang</th>
                      <th>Jumlah</th>
                      <th>Satuan</th>

                      {mode === "stock-outs" && (
                        <>
                          <th>Pengambil</th>

                          {isElectricStockOut ? (
                            <>
                              <th>Keterangan</th>
                              <th>Foto</th>
                            </>
                          ) : (
                            <th>Departemen</th>
                          )}
                        </>
                      )}

                      <th>Aksi</th>
                    </tr>
                  </thead>

                  <tbody>
                    {filteredTransactions.map(
                      (row, index) => (
                        <tr key={row.id}>
                          <td>{index + 1}</td>
                          <td>
                            {formatDate(row.date)}
                          </td>
                          <td>
                            <strong>
                              {row.item.code}
                            </strong>
                          </td>
                          <td>{row.item.name}</td>
                          <td>{row.quantity}</td>
                          <td>{row.unit}</td>

                          {mode === "stock-outs" && (
                            <>
                              <td>{row.taker}</td>

                              {isElectricStockOut ? (
                                <>
                                  <td
                                    className={
                                      styles.descriptionCell
                                    }
                                    title={
                                      row.description ?? ""
                                    }
                                  >
                                    {row.description || "-"}
                                  </td>

                                  <td>
                                    {row.photoPath ? (
                                      <ElectricPhotoThumbnail
                                        filename={
                                          row.photoPath
                                        }
                                        onZoom={
                                          setZoomImageUrl
                                        }
                                      />
                                    ) : (
                                      <span
                                        className={
                                          styles.noPhoto
                                        }
                                      >
                                        Tidak ada
                                      </span>
                                    )}
                                  </td>
                                </>
                              ) : (
                                <td>
                                  {row.department}
                                </td>
                              )}
                            </>
                          )}

                          <td>
                            <div className={styles.actions}>
                              <button
  type="button"
  onClick={() => openEditTransaction(row)}
  aria-label="Edit data"
  title="Edit data"
>
  <Pencil size={16} />
</button>

                              <button
                                type="button"
                                className={
                                  styles.deleteButton
                                }
                                onClick={() =>
                                  deleteData(row.id)
                                }
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </>
              )}
            </table>
          )}
        </div>
      </section>

      {modalOpen && (
        <div className={styles.modalOverlay}>
          <section
            className={`${styles.modal} ${
              editingId === null &&
              (mode === "stock-ins" ||
                mode === "stock-outs")
                ? styles.batchModal
                : ""
            }`}
          >
            <div className={styles.modalHeader}>
              <div>
                <h2>
                  {mode === "stocks"
                    ? "Edit Stok Barang"
                    : editingId === null
                      ? config.addLabel
                      : `Edit ${config.title}`}
                </h2>

                <p>
                  Lengkapi data pada formulir berikut.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form
              className={styles.form}
              onSubmit={submit}
            >
              {error && (
                <div className={styles.errorMessage}>
                  {error}
                </div>
              )}

              {mode === "items" && (
                <>
                  <label className={styles.fullField}>
                    <span>Nama Barang</span>
                    <input
                      value={name}
                      onChange={(event) =>
                        setName(event.target.value)
                      }
                      required
                    />
                  </label>

                  <label>
                    <span>Jenis Barang</span>
                    <select
                      value={category}
                      onChange={(event) =>
                        setCategory(
                          event.target.value,
                        )
                      }
                    >
                      <option value="ATK">ATK</option>
                      <option value="HOUSEKEEPING">
                        HOUSEKEEPING
                      </option>
                      <option value="BAJU">
                        BAJU
                      </option>
                      <option value="ELEKTRONIK">
                        ELEKTRONIK
                      </option>
                      <option value="FURNITURE">
                        FURNITURE
                      </option>
                    </select>
                  </label>

                  <label>
                    <span>Satuan</span>
                    <select
                      value={unit}
                      onChange={(event) =>
                        setUnit(event.target.value)
                      }
                    >
                      {units.map((itemUnit) => (
                        <option
                          key={itemUnit}
                          value={itemUnit}
                        >
                          {itemUnit}
                        </option>
                      ))}
                    </select>
                  </label>

                  {editingId !== null && (
                    <label
                      className={
                        styles.checkboxField
                      }
                    >
                      <input
                        type="checkbox"
                        checked={isActive}
                        onChange={(event) =>
                          setIsActive(
                            event.target.checked,
                          )
                        }
                      />
                      <span>Barang aktif</span>
                    </label>
                  )}
                </>
              )}

              {mode === "stocks" && (
                <label className={styles.fullField}>
                  <span>Jumlah Stok</span>
                  <input
                    type="number"
                    min="0"
                    value={quantity}
                    onChange={(event) =>
                      setQuantity(event.target.value)
                    }
                    required
                  />
                </label>
              )}

              {(mode === "stock-ins" ||
                mode === "stock-outs") &&
                editingId === null && (
                  <>
                    <label className={styles.fullField}>
                      <span>Tanggal</span>
                      <input
                        type="date"
                        value={date}
                        onChange={(event) =>
                          setDate(event.target.value)
                        }
                        required
                      />
                    </label>

                    <div className={styles.fullField}>
                      <div className={styles.batchHeading}>
                        <div>
                          <strong>Daftar Barang</strong>
                          <span>
                            Satuan otomatis mengikuti
                            Master Barang
                          </span>
                        </div>

                        <button
                          type="button"
                          className={
                            styles.addBatchButton
                          }
                          onClick={addBatchRow}
                        >
                          <Plus size={16} />
                          Tambah Barang
                        </button>
                      </div>

                      <div className={styles.batchRows}>
                        {batchRows.map(
                          (row, rowIndex) => {
                            const selected =
                              items.find(
                                (item) =>
                                  item.id ===
                                  Number(row.itemId),
                              );

                            const selectableItems =
                              getSelectableItems(row);

                            return (
                              <div
                                className={
                                  styles.batchRow
                                }
                                key={row.key}
                              >
                                <div
                                  className={
                                    styles.batchNumber
                                  }
                                >
                                  {rowIndex + 1}
                                </div>

                                <div
                                  className={
                                    styles.batchItemField
                                  }
                                >
                                  <span>Barang</span>

                                  <div
                                    className={
                                      styles.searchableSelect
                                    }
                                    onBlur={() => {
                                      window.setTimeout(
                                        () => {
                                          updateBatchRow(
                                            row.key,
                                            {
                                              dropdownOpen:
                                                false,
                                            },
                                          );
                                        },
                                        150,
                                      );
                                    }}
                                  >
                                    <div
                                      className={
                                        styles.itemSearchInput
                                      }
                                    >
                                      <Search size={16} />

                                      <input
                                        value={
                                          row.itemSearch
                                        }
                                        placeholder="Ketik kode atau nama..."
                                        onFocus={() =>
                                          updateBatchRow(
                                            row.key,
                                            {
                                              dropdownOpen:
                                                true,
                                            },
                                          )
                                        }
                                        onChange={(
                                          event,
                                        ) =>
                                          updateBatchRow(
                                            row.key,
                                            {
                                              itemSearch:
                                                event.target
                                                  .value,
                                              itemId: "",
                                              dropdownOpen:
                                                true,
                                            },
                                          )
                                        }
                                      />

                                      {row.itemSearch && (
                                        <button
                                          type="button"
                                          className={
                                            styles.clearItemButton
                                          }
                                          onMouseDown={(
                                            event,
                                          ) =>
                                            event.preventDefault()
                                          }
                                          onClick={() =>
                                            updateBatchRow(
                                              row.key,
                                              {
                                                itemId: "",
                                                itemSearch:
                                                  "",
                                                dropdownOpen:
                                                  true,
                                              },
                                            )
                                          }
                                        >
                                          <X size={15} />
                                        </button>
                                      )}
                                    </div>

                                    {row.dropdownOpen && (
                                      <div
                                        className={
                                          styles.itemDropdown
                                        }
                                      >
                                        {selectableItems.length >
                                        0 ? (
                                          selectableItems.map(
                                            (item) => (
                                              <button
                                                type="button"
                                                className={
                                                  styles.itemOption
                                                }
                                                key={
                                                  item.id
                                                }
                                                onMouseDown={(
                                                  event,
                                                ) =>
                                                  event.preventDefault()
                                                }
                                                onClick={() =>
                                                  updateBatchRow(
                                                    row.key,
                                                    {
                                                      itemId:
                                                        String(
                                                          item.id,
                                                        ),
                                                      itemSearch: `${item.code} - ${item.name}`,
                                                      dropdownOpen:
                                                        false,
                                                    },
                                                  )
                                                }
                                              >
                                                <div>
                                                  <strong>
                                                    {
                                                      item.code
                                                    }
                                                  </strong>
                                                  <span>
                                                    {
                                                      item.name
                                                    }
                                                  </span>
                                                </div>

                                                <div
                                                  className={
                                                    styles.itemOptionInformation
                                                  }
                                                >
                                                  <span>
                                                    {
                                                      item.unit
                                                    }
                                                  </span>
                                                  <span>
                                                    Stok:{" "}
                                                    {item
                                                      .stock
                                                      ?.quantity ??
                                                      0}
                                                  </span>
                                                </div>
                                              </button>
                                            ),
                                          )
                                        ) : (
                                          <div
                                            className={
                                              styles.itemNotFound
                                            }
                                          >
                                            Barang tidak
                                            ditemukan
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <label
                                  className={
                                    styles.batchQuantity
                                  }
                                >
                                  <span>QTY</span>
                                  <input
                                    type="number"
                                    min="1"
                                    value={row.quantity}
                                    onChange={(event) =>
                                      updateBatchRow(
                                        row.key,
                                        {
                                          quantity:
                                            event.target
                                              .value,
                                        },
                                      )
                                    }
                                    required
                                  />
                                </label>

                                <div
                                  className={
                                    styles.batchUnit
                                  }
                                >
                                  <span>Satuan</span>
                                  <strong>
                                    {selected?.unit ?? "-"}
                                  </strong>
                                </div>

                                <div
                                  className={
                                    styles.batchStock
                                  }
                                >
                                  <span>Stok</span>
                                  <strong>
                                    {selected?.stock
                                      ?.quantity ?? 0}
                                  </strong>
                                </div>

                                <button
                                  type="button"
                                  className={
                                    styles.removeBatchButton
                                  }
                                  onClick={() =>
                                    removeBatchRow(
                                      row.key,
                                    )
                                  }
                                  disabled={
                                    batchRows.length === 1
                                  }
                                >
                                  <Trash2 size={17} />
                                </button>
                              </div>
                            );
                          },
                        )}
                      </div>
                    </div>

                    {mode === "stock-outs" && (
                      <>
                        <label
                          className={
                            isElectricStockOut
                              ? styles.fullField
                              : undefined
                          }
                        >
                          <span>Pengambil</span>
                          <input
                            value={taker}
                            onChange={(event) =>
                              setTaker(
                                event.target.value,
                              )
                            }
                            required
                          />
                        </label>

                        {isElectricStockOut ? (
                          <>
                            <label
                              className={
                                styles.fullField
                              }
                            >
                              <span>Keterangan</span>

                              <textarea
                                value={description}
                                rows={5}
                                placeholder="Tuliskan keterangan penggunaan atau pekerjaan maksimal 500 kata..."
                                onChange={(event) => {
                                  const nextValue =
                                    event.target.value;

                                  const nextWordCount =
                                    nextValue
                                      .trim()
                                      .split(/\s+/)
                                      .filter(Boolean)
                                      .length;

                                  if (
                                    nextWordCount <= 500
                                  ) {
                                    setDescription(
                                      nextValue,
                                    );
                                  }
                                }}
                                required
                              />

                              <small
                                className={
                                  descriptionWordCount >=
                                  480
                                    ? styles.wordCountWarning
                                    : styles.wordCount
                                }
                              >
                                {descriptionWordCount} /
                                500 kata
                              </small>
                            </label>

                            <label
                              className={
                                styles.fullField
                              }
                            >
                              <span>
                                Foto Dokumentasi
                              </span>

                              <input
                                key={photoInputKey}
                                id="electric-create-photo"
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                className={
                                  styles.hiddenFileInput
                                }
                                onChange={async (event) => {
                                  const selectedFile =
                                    event.target
                                      .files?.[0] ??
                                    null;

                                  if (!selectedFile) {
                                    setPhotoFile(null);
                                    return;
                                  }

                                  const compressedFile =
                                    await compressImage(
                                      selectedFile,
                                    ).catch(
                                      () => selectedFile,
                                    );

                                  if (
                                    compressedFile.size >
                                    5 * 1024 * 1024
                                  ) {
                                    setError(
                                      "Ukuran foto maksimal 5 MB",
                                    );
                                    event.target.value =
                                      "";
                                    setPhotoFile(null);
                                    return;
                                  }

                                  setError("");
                                  setPhotoFile(
                                    compressedFile,
                                  );
                                }}
                                required
                              />

                              <div
                                className={
                                  styles.customFileField
                                }
                              >
                                <label
                                  htmlFor="electric-create-photo"
                                  className={
                                    styles.chooseFileButton
                                  }
                                >
                                  Pilih Foto
                                </label>

                                <span
                                  className={
                                    styles.selectedFileName
                                  }
                                  title={
                                    photoFile?.name ??
                                    "Belum ada foto dipilih"
                                  }
                                >
                                  {photoFile
                                    ? photoFile.name
                                    : "Belum ada foto dipilih"}
                                </span>

                                {photoFile && (
                                  <button
                                    type="button"
                                    className={
                                      styles.clearFileButton
                                    }
                                    onClick={() => {
                                      setPhotoFile(null);
                                      setPhotoInputKey(
                                        (current) =>
                                          current + 1,
                                      );
                                    }}
                                    aria-label="Hapus foto terpilih"
                                  >
                                    <X size={16} />
                                  </button>
                                )}
                              </div>

                              <small
                                className={
                                  styles.fileInformation
                                }
                              >
                                Format JPG, PNG, atau WEBP.
                                Foto otomatis dikompres 75%.
                              </small>
                            </label>
                          </>
                        ) : (
                          <label>
                            <span>Departemen</span>
                            <input
                              value={department}
                              onChange={(event) =>
                                setDepartment(
                                  event.target.value,
                                )
                              }
                              required
                            />
                          </label>
                        )}
                      </>
                    )}
                  </>
                )}

              {(mode === "stock-ins" ||
                mode === "stock-outs") &&
                editingId !== null && (
                  <>
                    <label>
                      <span>Tanggal</span>
                      <input
                        type="date"
                        value={date}
                        onChange={(event) =>
                          setDate(event.target.value)
                        }
                        required
                      />
                    </label>

                    <div className={styles.fullField}>
                      <label>
                        <span>Barang</span>

                        <div
                          className={
                            styles.searchableSelect
                          }
                        >
                          <div
                            className={
                              styles.itemSearchInput
                            }
                          >
                            <Search size={16} />
                            <input
                              value={itemSearch}
                              onFocus={() =>
                                setItemDropdownOpen(true)
                              }
                              onChange={(event) => {
                                setItemSearch(
                                  event.target.value,
                                );
                                setItemId("");
                                setItemDropdownOpen(
                                  true,
                                );
                              }}
                            />
                          </div>

                          {itemDropdownOpen && (
                            <div
                              className={
                                styles.itemDropdown
                              }
                            >
                              {filteredSingleItems.map(
                                (item) => (
                                  <button
                                    type="button"
                                    className={
                                      styles.itemOption
                                    }
                                    key={item.id}
                                    onMouseDown={(
                                      event,
                                    ) =>
                                      event.preventDefault()
                                    }
                                    onClick={() => {
                                      setItemId(
                                        String(item.id),
                                      );
                                      setItemSearch(
                                        `${item.code} - ${item.name}`,
                                      );
                                      setItemDropdownOpen(
                                        false,
                                      );
                                    }}
                                  >
                                    <div>
                                      <strong>
                                        {item.code}
                                      </strong>
                                      <span>
                                        {item.name}
                                      </span>
                                    </div>
                                  </button>
                                ),
                              )}
                            </div>
                          )}
                        </div>
                      </label>
                    </div>

                    <label>
                      <span>Jumlah</span>
                      <input
                        type="number"
                        min="1"
                        value={quantity}
                        onChange={(event) =>
                          setQuantity(
                            event.target.value,
                          )
                        }
                        required
                      />
                    </label>

                    {mode === "stock-outs" && (
  <>
    <label>
      <span>Pengambil</span>
      <input
        value={taker}
        onChange={(event) =>
          setTaker(event.target.value)
        }
        required
      />
    </label>

    {isElectricStockOut ? (
      <>
        <label className={styles.fullField}>
          <span>Keterangan</span>

          <textarea
            value={description}
            rows={5}
            placeholder="Tuliskan keterangan maksimal 500 kata..."
            onChange={(event) => {
              const nextValue = event.target.value;

              const nextWordCount = nextValue
                .trim()
                .split(/\s+/)
                .filter(Boolean).length;

              if (nextWordCount <= 500) {
                setDescription(nextValue);
              }
            }}
            required
          />

          <small
            className={
              descriptionWordCount >= 480
                ? styles.wordCountWarning
                : styles.wordCount
            }
          >
            {descriptionWordCount} / 500 kata
          </small>
        </label>

        <div className={styles.fullField}>
          <span className={styles.fileFieldTitle}>
            Foto Dokumentasi
          </span>

          {existingPhotoPath && !photoFile && (
            <div className={styles.currentPhotoSection}>
              <span className={styles.currentPhotoLabel}>
                Foto saat ini
              </span>

              <ElectricPhotoThumbnail
                filename={existingPhotoPath}
                onZoom={setZoomImageUrl}
              />
            </div>
          )}

          {photoFile && (
            <div className={styles.newPhotoInformation}>
              Foto pengganti:
              <strong>{photoFile.name}</strong>
            </div>
          )}

          <input
            key={photoInputKey}
            id="electric-edit-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={styles.hiddenFileInput}
            onChange={async (event) => {
              const selectedFile =
                event.target.files?.[0] ?? null;

              if (!selectedFile) {
                setPhotoFile(null);
                return;
              }

              const compressedFile = await compressImage(
                selectedFile,
              ).catch(() => selectedFile);

              if (
                compressedFile.size > 5 * 1024 * 1024
              ) {
                setError(
                  "Ukuran foto maksimal 5 MB",
                );
                event.target.value = "";
                setPhotoFile(null);
                return;
              }

              setError("");
              setPhotoFile(compressedFile);
            }}
          />

          <div className={styles.customFileField}>
            <label
              htmlFor="electric-edit-photo"
              className={styles.chooseFileButton}
            >
              {existingPhotoPath
                ? "Ganti Foto"
                : "Pilih Foto"}
            </label>

            <span
              className={styles.selectedFileName}
              title={
                photoFile?.name ??
                (existingPhotoPath
                  ? "Foto lama tetap digunakan"
                  : "Belum ada foto dipilih")
              }
            >
              {photoFile
                ? photoFile.name
                : existingPhotoPath
                  ? "Foto lama tetap digunakan"
                  : "Belum ada foto dipilih"}
            </span>

            {photoFile && (
              <button
                type="button"
                className={styles.clearFileButton}
                onClick={() => {
                  setPhotoFile(null);
                  setPhotoInputKey(
                    (current) => current + 1,
                  );
                }}
                aria-label="Batalkan foto pengganti"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <small className={styles.fileInformation}>
            JPG, PNG, atau WEBP. Foto otomatis dikompres 75%.
            Tanpa memilih foto baru, foto lama tetap
            digunakan.
          </small>
        </div>
      </>
    ) : (
      <label>
        <span>Departemen</span>
        <input
          value={department}
          onChange={(event) =>
            setDepartment(event.target.value)
          }
          required
        />
      </label>
    )}
  </>
)}
                  </>
                )}

              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() =>
                    setModalOpen(false)
                  }
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
                    : editingId === null &&
                        (mode === "stock-ins" ||
                          mode === "stock-outs")
                      ? "Simpan Semua"
                      : "Simpan"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {zoomImageUrl && (
        <div
          className={styles.imageZoomOverlay}
          role="dialog"
          aria-modal="true"
          aria-label="Pratinjau foto dokumentasi"
          onClick={() => setZoomImageUrl("")}
        >
          <div
            className={styles.imageZoomContent}
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            <button
              type="button"
              className={styles.imageZoomClose}
              onClick={() => setZoomImageUrl("")}
              aria-label="Tutup foto"
            >
              <X size={22} />
            </button>

            <img
              src={zoomImageUrl}
              alt="Foto dokumentasi barang keluar Electric"
              className={styles.imageZoomPhoto}
            />
          </div>
        </div>
      )}
    </main>
  );
}
