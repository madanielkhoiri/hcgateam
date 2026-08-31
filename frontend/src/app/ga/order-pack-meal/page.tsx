"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Eye,
  FileCheck2,
  LogOut,
  MinusCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  UsersRound,
  UtensilsCrossed,
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
import styles from "./order-pack-meal.module.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "http://localhost:3001/api";

const BACKEND_URL = API_URL;

const STAFF_ROLES = new Set([
  "ADMIN",
  "GRUP_LEADER",
  "SECTION_HEAD",
]);

type LoginUser = {
  id: number;
  name: string;
  username: string;
  role: string;
};

type OrderItem = {
  id?: number;
  orderType: string;
  quantity: number;
  notes?: string | null;
};

type PackMealOrder = {
  id: number;
  orderNumber: string;
  orderDate: string;
  sequenceNumber: number;
  neededDate: string;
  deliveryLocation: string;
  department?: string | null;
  contactNumber?: string | null;
  deliveryTime?: string | null;
  notes?: string | null;
  approvedFormPath: string;
  totalPacks: number;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
  creator: LoginUser;
  items: OrderItem[];
};

type FormRow = {
  key: string;
  orderType: string;
  quantity: string;
  notes: string;
};

function getToken() {
  return (
    localStorage.getItem("hcga_access_token") ||
    sessionStorage.getItem("hcga_access_token")
  );
}

function getSavedUser(): LoginUser | null {
  const raw =
    localStorage.getItem("hcga_user") ||
    sessionStorage.getItem("hcga_user");

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as LoginUser;
  } catch {
    return null;
  }
}

function today() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Pontianak",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );

  return `${values.year}-${values.month}-${values.day}`;
}

function createRow(item?: OrderItem): FormRow {
  return {
    key: `${Date.now()}-${Math.random()}`,
    orderType: item?.orderType ?? "",
    quantity: item ? String(item.quantity) : "",
    notes: item?.notes ?? "",
  };
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(value));
}

function formatRole(role: string) {
  if (role === "GRUP_LEADER") {
    return "Group Leader";
  }

  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function OrderPackMealPage() {
  const router = useRouter();

  const [user, setUser] = useState<LoginUser | null>(null);
  const [orders, setOrders] = useState<PackMealOrder[]>([]);
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("");
  const [year, setYear] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [detailOrder, setDetailOrder] =
    useState<PackMealOrder | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [neededDate, setNeededDate] = useState(today());
  const [deliveryLocation, setDeliveryLocation] = useState("");
  const [department, setDepartment] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<FormRow[]>([createRow()]);
  const [approvedForm, setApprovedForm] = useState<File | null>(null);
  const [existingApprovedFormPath, setExistingApprovedFormPath] =
    useState("");
  const [fileInputKey, setFileInputKey] = useState(0);

  const isStaff = Boolean(user && STAFF_ROLES.has(user.role));

  const availableYears = useMemo(() => {
    const current = new Date().getFullYear();

    return Array.from({ length: 7 }, (_, index) => current - 5 + index);
  }, []);

  const filteredOrders = useMemo(() => {
    if (!month && !year) {
      return orders;
    }

    return orders.filter((order) => {
      const orderDate = new Date(order.neededDate);

      if (year && orderDate.getUTCFullYear() !== Number(year)) {
        return false;
      }

      if (month && orderDate.getUTCMonth() + 1 !== Number(month)) {
        return false;
      }

      return true;
    });
  }, [orders, month, year]);

  function resetFilters() {
    setSearch("");
    setMonth("");
    setYear("");
  }

  const totalPacks = useMemo(
    () =>
      rows.reduce((total, row) => {
        const quantity = Number(row.quantity);
        return total + (Number.isFinite(quantity) ? quantity : 0);
      }, 0),
    [rows],
  );

  const logout = useCallback(() => {
    localStorage.removeItem("hcga_access_token");
    localStorage.removeItem("hcga_user");
    sessionStorage.removeItem("hcga_access_token");
    sessionStorage.removeItem("hcga_user");
    router.replace("/login");
  }, [router]);

  const request = useCallback(
    async (endpoint: string, options?: RequestInit) => {
      const token = getToken();

      if (!token) {
        logout();
        throw new Error("Sesi login berakhir");
      }

      const response = await fetch(`${API_URL}/${endpoint}`, {
        ...options,
        headers: {
          Authorization: `Bearer ${token}`,
          ...options?.headers,
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
        logout();
        throw new Error("Sesi login berakhir");
      }

      if (!response.ok) {
        const apiMessage = Array.isArray(result.message)
          ? result.message[0]
          : result.message;

        throw new Error(apiMessage || "Permintaan gagal diproses");
      }

      return result;
    },
    [logout],
  );

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const query = search.trim()
        ? `?search=${encodeURIComponent(search.trim())}`
        : "";
      const result = await request(`order-pack-meal${query}`);
      setOrders(result);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Data order gagal dimuat",
      );
    } finally {
      setLoading(false);
    }
  }, [request, search]);

  useEffect(() => {
    const token = getToken();
    const savedUser = getSavedUser();

    if (!token || !savedUser) {
      router.replace("/login");
      return;
    }

    setUser(savedUser);

    if (STAFF_ROLES.has(savedUser.role)) {
      void loadOrders();
    } else {
      setLoading(false);
    }
  }, [loadOrders, router]);

  function resetForm() {
    setEditingId(null);
    setNeededDate(today());
    setDeliveryLocation("");
    setDepartment("");
    setContactNumber("");
    setDeliveryTime("");
    setNotes("");
    setRows([createRow()]);
    setApprovedForm(null);
    setExistingApprovedFormPath("");
    setFileInputKey((current) => current + 1);
    setError("");
  }

  function openCreate() {
    resetForm();
    setModalOpen(true);
  }

  function openEdit(order: PackMealOrder) {
    resetForm();
    setEditingId(order.id);
    setNeededDate(order.neededDate.slice(0, 10));
    setDeliveryLocation(order.deliveryLocation);
    setDepartment(order.department ?? "");
    setContactNumber(order.contactNumber ?? "");
    setDeliveryTime(order.deliveryTime ?? "");
    setNotes(order.notes ?? "");
    setRows(order.items.map((item) => createRow(item)));
    setExistingApprovedFormPath(order.approvedFormPath);
    setModalOpen(true);
  }

  function updateRow(key: string, patch: Partial<FormRow>) {
    setRows((current) =>
      current.map((row) =>
        row.key === key ? { ...row, ...patch } : row,
      ),
    );
  }

  function addRow() {
    setRows((current) => [...current, createRow()]);
  }

  function removeRow(key: string) {
    setRows((current) =>
      current.length === 1
        ? current
        : current.filter((row) => row.key !== key),
    );
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setMessage("");
      setError("");

      const invalidRow = rows.find(
        (row) =>
          !row.orderType.trim() ||
          !row.quantity ||
          Number(row.quantity) <= 0,
      );

      if (invalidRow) {
        throw new Error(
          "Jenis order dan jumlah pack wajib diisi pada seluruh baris",
        );
      }

      if (!approvedForm && editingId === null) {
        throw new Error("Form approved wajib diunggah");
      }

      const formData = new FormData();
      formData.append("neededDate", neededDate);
      formData.append("deliveryLocation", deliveryLocation.trim());
      formData.append("department", department.trim());
      formData.append("contactNumber", contactNumber.trim());
      formData.append("deliveryTime", deliveryTime);
      formData.append("notes", notes.trim());
      formData.append(
        "items",
        JSON.stringify(
          rows.map((row) => ({
            orderType: row.orderType.trim(),
            quantity: Number(row.quantity),
            notes: row.notes.trim() || null,
          })),
        ),
      );

      if (approvedForm) {
        formData.append("approvedForm", approvedForm);
      }

      const endpoint =
        editingId === null
          ? "order-pack-meal"
          : `order-pack-meal/${editingId}`;
      const result = await request(endpoint, {
        method: editingId === null ? "POST" : "PATCH",
        body: formData,
      });

      const successMessage =
        editingId === null
          ? `Order berhasil disimpan dengan nomor ${result.orderNumber}`
          : `Order ${result.orderNumber} berhasil diperbarui`;

      resetForm();
      setMessage(successMessage);

      if (isStaff) {
        setModalOpen(false);
        await loadOrders();
      }
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Order gagal disimpan",
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteOrder(order: PackMealOrder) {
    const approved = window.confirm(
      `Hapus order ${order.orderNumber}? Data dan form approved akan dihapus.`,
    );

    if (!approved) {
      return;
    }

    try {
      setError("");
      setMessage("");
      await request(`order-pack-meal/${order.id}`, {
        method: "DELETE",
      });
      setMessage(`Order ${order.orderNumber} berhasil dihapus`);
      await loadOrders();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Order gagal dihapus",
      );
    }
  }

  function orderForm(inModal: boolean) {
    return (
      <form className={styles.form} onSubmit={submitOrder}>
        <div className={styles.formGrid}>
          <label>
            <span>Tanggal Kebutuhan</span>
            <input
              type="date"
              value={neededDate}
              min={today()}
              onChange={(event) => setNeededDate(event.target.value)}
              required
            />
          </label>

          <label>
            <span>Departemen</span>
            <input
              type="text"
              value={department}
              placeholder="Contoh: HCGA"
              onChange={(event) => setDepartment(event.target.value)}
            />
          </label>

          <label className={styles.fullField}>
            <span>Lokasi Pengantaran</span>
            <input
              type="text"
              value={deliveryLocation}
              placeholder="Masukkan lokasi pengantaran pack meal"
              onChange={(event) =>
                setDeliveryLocation(event.target.value)
              }
              required
            />
          </label>

          <label>
            <span>Nomor Kontak</span>
            <input
              type="text"
              value={contactNumber}
              placeholder="Nomor yang dapat dihubungi"
              onChange={(event) => setContactNumber(event.target.value)}
            />
          </label>

          <label>
            <span>Jam Antar</span>
            <input
              type="time"
              value={deliveryTime}
              onChange={(event) => setDeliveryTime(event.target.value)}
            />
          </label>

          <label className={styles.fullField}>
            <span>Keterangan Umum</span>
            <textarea
              value={notes}
              placeholder="Tambahkan keterangan bila diperlukan"
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
            />
          </label>
        </div>

        <section className={styles.dynamicSection}>
          <div className={styles.dynamicHeader}>
            <div>
              <h3>Jenis Order</h3>
              <p>Tambah baris sesuai kebutuhan konsumsi.</p>
            </div>

            <button
              type="button"
              className={styles.addRowButton}
              onClick={addRow}
            >
              <Plus size={16} />
              Tambah Baris
            </button>
          </div>

          <div className={styles.orderRows}>
            {rows.map((row, index) => (
              <div className={styles.orderRow} key={row.key}>
                <span className={styles.rowNumber}>{index + 1}</span>

                <label>
                  <span>Jenis Order</span>
                  <input
                    type="text"
                    value={row.orderType}
                    placeholder="Breakfast / Lunch / Snack"
                    onChange={(event) =>
                      updateRow(row.key, {
                        orderType: event.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  <span>Jumlah Pack</span>
                  <input
                    type="number"
                    min="1"
                    value={row.quantity}
                    placeholder="0"
                    onChange={(event) =>
                      updateRow(row.key, {
                        quantity: event.target.value,
                      })
                    }
                    required
                  />
                </label>

                <label>
                  <span>Keterangan</span>
                  <input
                    type="text"
                    value={row.notes}
                    placeholder="Opsional"
                    onChange={(event) =>
                      updateRow(row.key, {
                        notes: event.target.value,
                      })
                    }
                  />
                </label>

                <button
                  type="button"
                  className={styles.removeRowButton}
                  onClick={() => removeRow(row.key)}
                  disabled={rows.length === 1}
                  title="Hapus baris"
                >
                  <MinusCircle size={19} />
                </button>
              </div>
            ))}
          </div>

          <div className={styles.totalBox}>
            <span>Total Pesanan</span>
            <strong>{totalPacks.toLocaleString("id-ID")} Pack</strong>
          </div>
        </section>

        <label className={styles.uploadField}>
          <span>Form Approved</span>
          <div className={styles.uploadBox}>
            <UploadCloud size={28} />
            <div>
              <strong>
                {approvedForm
                  ? approvedForm.name
                  : editingId !== null
                    ? "Pilih file baru bila form berubah"
                    : "Unggah form yang sudah approved"}
              </strong>
              <small>PDF, JPG, PNG, atau WEBP · Maksimal 10 MB</small>
            </div>
            <input
              key={fileInputKey}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
              onChange={async (event) => {
                const file = event.target.files?.[0] ?? null;
                if (file && file.type.startsWith("image/")) {
                  setApprovedForm(await compressImage(file).catch(() => file));
                  return;
                }
                setApprovedForm(file);
              }}
              required={editingId === null}
            />
          </div>

          {existingApprovedFormPath && (
            <a
              className={styles.currentFile}
              href={`${BACKEND_URL}${existingApprovedFormPath}`}
              target="_blank"
              rel="noreferrer"
            >
              <FileCheck2 size={15} />
              Lihat form approved saat ini
            </a>
          )}
        </label>

        {error && (
          <div className={styles.errorMessage}>{error}</div>
        )}

        {!inModal && message && (
          <div className={styles.successMessage}>{message}</div>
        )}

        <div className={styles.formActions}>
          {inModal && (
            <button
              type="button"
              className={styles.cancelButton}
              onClick={() => {
                setModalOpen(false);
                resetForm();
              }}
            >
              Batal
            </button>
          )}

          <button
            type="submit"
            className={styles.saveButton}
            disabled={saving}
          >
            <FileCheck2 size={17} />
            {saving
              ? "Menyimpan..."
              : editingId === null
                ? "Simpan Order"
                : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    );
  }

  if (!user) {
    return <main className={styles.loadingPage}>Memuat modul...</main>;
  }

  if (!isStaff) {
    return (
      <main className={styles.guestPage}>
        <header className={styles.guestHeader}>
          <div className={styles.brand}>
            <span className={styles.brandLogo}>
              <UsersRound size={23} />
            </span>
            <strong>HCGA TEAM</strong>
          </div>

          <div className={styles.guestProfile}>
            <div>
              <strong>{user.name}</strong>
              <span>Tamu</span>
            </div>
            <button type="button" onClick={logout}>
              <LogOut size={18} />
              Keluar
            </button>
          </div>
        </header>

        <section className={styles.guestContent}>
          <div className={styles.guestIntro}>
            <span>
              <UtensilsCrossed size={31} />
            </span>
            <div>
              <h1>Form Order Pack Meal</h1>
              <p>
                Isi kebutuhan konsumsi dan unggah form yang sudah approved.
                Nomor order dibuat otomatis setelah data disimpan.
              </p>
            </div>
          </div>

          {message && (
            <div className={styles.successMessage}>{message}</div>
          )}

          <section className={styles.guestFormCard}>
            {orderForm(false)}
          </section>
        </section>

        <footer className={styles.footer}>
          © 2026 HCGA TEAM · Portal Internal
        </footer>
      </main>
    );
  }

  return (
    <main className={styles.staffPage}>
      <header className={styles.staffHeader}>
        <Link href="/dashboard" className={styles.brand}>
          <span className={styles.brandLogo}>
            <UsersRound size={23} />
          </span>
          <strong>HCGA TEAM</strong>
        </Link>

        <div className={styles.staffProfile}>
          <span>
            <UsersRound size={20} />
          </span>
          <div>
            <strong>{user.name}</strong>
            <small>{formatRole(user.role)}</small>
          </div>
        </div>
      </header>

      <section className={styles.staffContent}>
        <Link href="/ga" className={styles.backButton}>
          <ArrowLeft size={18} />
          Kembali ke Pilihan GA
        </Link>

        <div className={styles.heading}>
          <div>
            <h1>Order Pack Meal</h1>
            <p>
              Kelola seluruh order konsumsi Tamu beserta form approved.
            </p>
          </div>

          <button
            type="button"
            className={styles.addButton}
            onClick={openCreate}
          >
            <Plus size={17} />
            Tambah Order
          </button>
        </div>

        {message && (
          <div className={styles.successMessage}>{message}</div>
        )}
        {error && !modalOpen && (
          <div className={styles.errorMessage}>{error}</div>
        )}

        <section className={styles.panel}>
          <div className={styles.toolbar}>
            <form
              className={styles.search}
              onSubmit={(event) => {
                event.preventDefault();
                void loadOrders();
              }}
            >
              <Search size={17} />
              <input
                value={search}
                placeholder="Cari nomor order, tamu, lokasi, atau jenis order..."
                onChange={(event) => setSearch(event.target.value)}
              />
            </form>

            <div className={styles.filters}>
              <select
                className={styles.filterSelect}
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
                className={styles.filterSelect}
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

            <span className={styles.total}>
              Total {filteredOrders.length} order
            </span>
          </div>

          {loading ? (
            <div className={styles.loading}>Memuat data order...</div>
          ) : filteredOrders.length === 0 ? (
            <div className={styles.emptyState}>
              Belum ada data Order Pack Meal.
            </div>
          ) : (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Nomor Order</th>
                    <th>Nama Tamu</th>
                    <th>Tanggal Order</th>
                    <th>Tanggal Kebutuhan</th>
                    <th>Lokasi</th>
                    <th>Jam Antar</th>
                    <th>Jenis Order</th>
                    <th>Total Pack</th>
                    <th>Form Approved</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order, index) => (
                    <tr key={order.id}>
                      <td>{index + 1}</td>
                      <td>
                        <strong className={styles.orderNumber}>
                          {order.orderNumber}
                        </strong>
                      </td>
                      <td>
                        <div className={styles.guestNameCell}>
                          <strong>{order.creator.name}</strong>
                          <span>{formatRole(order.creator.role)}</span>
                        </div>
                      </td>
                      <td>{formatDate(order.orderDate)}</td>
                      <td>{formatDate(order.neededDate)}</td>
                      <td>{order.deliveryLocation}</td>
                      <td>{order.deliveryTime || "-"}</td>
                      <td>
                        <div className={styles.orderTypes}>
                          {order.items.slice(0, 2).map((item) => (
                            <span key={item.id ?? item.orderType}>
                              {item.orderType}
                            </span>
                          ))}
                          {order.items.length > 2 && (
                            <small>+{order.items.length - 2} lainnya</small>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={styles.packBadge}>
                          {order.totalPacks.toLocaleString("id-ID")} Pack
                        </span>
                      </td>
                      <td>
                        <a
                          className={styles.fileButton}
                          href={`${BACKEND_URL}${order.approvedFormPath}`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <FileCheck2 size={15} />
                          Lihat File
                        </a>
                      </td>
                      <td>
                        <div className={styles.actions}>
                          <button
                            type="button"
                            className={styles.detailButton}
                            title="Detail"
                            onClick={() => setDetailOrder(order)}
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            className={styles.editButton}
                            title="Edit"
                            onClick={() => openEdit(order)}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            type="button"
                            className={styles.deleteButton}
                            title="Hapus"
                            onClick={() => void deleteOrder(order)}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>

      <footer className={styles.footer}>
        © 2026 HCGA TEAM · Portal Internal
      </footer>

      {modalOpen && (
        <div className={styles.modalOverlay}>
          <section className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2>
                  {editingId === null
                    ? "Tambah Order Pack Meal"
                    : "Edit Order Pack Meal"}
                </h2>
                <p>
                  Nomor order dibuat otomatis saat order baru disimpan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setModalOpen(false);
                  resetForm();
                }}
              >
                <X size={20} />
              </button>
            </div>
            {orderForm(true)}
          </section>
        </div>
      )}

      {detailOrder && (
        <div className={styles.modalOverlay}>
          <section className={`${styles.modal} ${styles.detailModal}`}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Detail Order Pack Meal</h2>
                <p>{detailOrder.orderNumber}</p>
              </div>
              <button type="button" onClick={() => setDetailOrder(null)}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.detailContent}>
              <div className={styles.detailGrid}>
                <div>
                  <span>Nomor Order</span>
                  <strong>{detailOrder.orderNumber}</strong>
                </div>
                <div>
                  <span>Nama Tamu</span>
                  <strong>{detailOrder.creator.name}</strong>
                </div>
                <div>
                  <span>Tanggal Order</span>
                  <strong>{formatDate(detailOrder.orderDate)}</strong>
                </div>
                <div>
                  <span>Tanggal Kebutuhan</span>
                  <strong>{formatDate(detailOrder.neededDate)}</strong>
                </div>
                <div>
                  <span>Departemen</span>
                  <strong>{detailOrder.department || "-"}</strong>
                </div>
                <div>
                  <span>Nomor Kontak</span>
                  <strong>{detailOrder.contactNumber || "-"}</strong>
                </div>
                <div>
                  <span>Jam Antar</span>
                  <strong>{detailOrder.deliveryTime || "-"}</strong>
                </div>
                <div className={styles.detailFull}>
                  <span>Lokasi Pengantaran</span>
                  <strong>{detailOrder.deliveryLocation}</strong>
                </div>
                <div className={styles.detailFull}>
                  <span>Keterangan</span>
                  <strong>{detailOrder.notes || "-"}</strong>
                </div>
              </div>

              <div className={styles.detailItems}>
                <h3>Rincian Jenis Order</h3>
                <div className={styles.detailTableWrapper}>
                  <table>
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Jenis Order</th>
                        <th>Jumlah</th>
                        <th>Keterangan</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detailOrder.items.map((item, index) => (
                        <tr key={item.id ?? index}>
                          <td>{index + 1}</td>
                          <td>{item.orderType}</td>
                          <td>{item.quantity} Pack</td>
                          <td>{item.notes || "-"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={styles.detailFooter}>
                <span>
                  Total <strong>{detailOrder.totalPacks} Pack</strong>
                </span>
                <a
                  href={`${BACKEND_URL}${detailOrder.approvedFormPath}`}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.fileButton}
                >
                  <FileCheck2 size={16} />
                  Buka Form Approved
                </a>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
