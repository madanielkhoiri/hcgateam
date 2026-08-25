'use client';

import {
  Database,
  Eye,
  KeyRound,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  UserCog,
  X,
} from 'lucide-react';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import {
  formatRole,
  getAccessToken,
  getStoredUser,
  type PortalUser,
} from '@/lib/access-control';
import { karyawanApi, type Karyawan } from '@/lib/karyawan-api';
import { epromApi, type Vendor } from '@/lib/eprom-api';
import styles from './manajemen-akun.module.css';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type ManagedUser = PortalUser & {
  isActive: boolean;
  accessKeys: string[];
  nrp?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  departemen?: string | null;
  jabatan?: string | null;
  createdAt: string;
  updatedAt: string;
};

type AccessOption = {
  key: string;
  title: string;
  description: string;
  parentKey: string | null;
  level: 'department' | 'section' | 'card';
};

type AccountForm = {
  name: string;
  username: string;
  password: string;
  role: string;
  isActive: boolean;
  nrp: string;
  email: string;
  phoneNumber: string;
  departemen: string;
  jabatan: string;
};

const emptyForm: AccountForm = {
  name: '',
  username: '',
  password: '',
  role: 'KARYAWAN',
  isActive: true,
  nrp: '',
  email: '',
  phoneNumber: '',
  departemen: '',
  jabatan: '',
};

export default function AccountManagementPage() {
  const currentUser = getStoredUser();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [accessOptions, setAccessOptions] = useState<AccessOption[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [formModalOpen, setFormModalOpen] = useState(false);
  const [detailUser, setDetailUser] = useState<ManagedUser | null>(null);
  const [editingUser, setEditingUser] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<AccountForm>(emptyForm);

  const [accessUser, setAccessUser] = useState<ManagedUser | null>(null);
  const [selectedAccess, setSelectedAccess] = useState<string[]>([]);

  const [karyawanCari, setKaryawanCari] = useState('');
  const [karyawanHasil, setKaryawanHasil] = useState<Karyawan[]>([]);
  const [karyawanDropdownTerbuka, setKaryawanDropdownTerbuka] = useState(false);
  const [karyawanMencari, setKaryawanMencari] = useState(false);

  const [vendorMasterList, setVendorMasterList] = useState<Vendor[]>([]);
  const [vendorCari, setVendorCari] = useState('');
  const [vendorDropdownTerbuka, setVendorDropdownTerbuka] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);

  useEffect(() => {
    if (!karyawanCari.trim() || karyawanCari.trim().length < 2) {
      setKaryawanHasil([]);
      return;
    }

    let aktif = true;
    setKaryawanMencari(true);

    const timer = setTimeout(() => {
      karyawanApi
        .ambil<Karyawan[]>(`?cari=${encodeURIComponent(karyawanCari.trim())}`)
        .then((hasil) => {
          if (aktif) {
            setKaryawanHasil(hasil.slice(0, 8));
          }
        })
        .catch(() => {
          if (aktif) {
            setKaryawanHasil([]);
          }
        })
        .finally(() => {
          if (aktif) {
            setKaryawanMencari(false);
          }
        });
    }, 300);

    return () => {
      aktif = false;
      clearTimeout(timer);
    };
  }, [karyawanCari]);

  useEffect(() => {
    if (!formModalOpen || form.role !== 'VENDOR' || vendorMasterList.length > 0) {
      return;
    }

    epromApi.vendor
      .daftar(true)
      .then(setVendorMasterList)
      .catch(() => setVendorMasterList([]));
  }, [formModalOpen, form.role, vendorMasterList.length]);

  const vendorHasil = useMemo(() => {
    const keyword = vendorCari.trim().toLowerCase();
    const daftar = keyword
      ? vendorMasterList.filter((item) =>
          item.namaVendor.toLowerCase().includes(keyword),
        )
      : vendorMasterList;

    return daftar.slice(0, 8);
  }, [vendorCari, vendorMasterList]);

  function pilihVendor(item: Vendor) {
    setForm((current) => ({
      ...current,
      name: item.namaVendor,
      email: item.email ?? current.email,
      phoneNumber: item.noTelepon ?? current.phoneNumber,
    }));
    setSelectedVendorId(item.id);
    setVendorCari(item.namaVendor);
    setVendorDropdownTerbuka(false);
  }

  function pilihKaryawan(item: Karyawan) {
    setForm((current) => ({
      ...current,
      name: item.nama,
      nrp: item.nik ?? current.nrp,
      email: item.email ?? current.email,
      phoneNumber: item.noTelepon ?? current.phoneNumber,
      departemen: item.departemen.namaDepartemen,
      jabatan: item.jabatan ?? current.jabatan,
    }));
    setKaryawanCari('');
    setKaryawanHasil([]);
    setKaryawanDropdownTerbuka(false);
  }

  const request = useCallback(async (endpoint: string, options?: RequestInit) => {
    const token = getAccessToken();
    if (!token) {
      throw new Error('Sesi login berakhir');
    }

    const response = await fetch(`${API_URL}/${endpoint}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(options?.body instanceof FormData
          ? {}
          : { 'Content-Type': 'application/json' }),
        ...options?.headers,
      },
      cache: 'no-store',
    });

    const text = await response.text();
    let result: any = {};

    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      result = { message: text };
    }

    if (!response.ok) {
      const apiMessage = Array.isArray(result.message)
        ? result.message[0]
        : result.message;
      throw new Error(apiMessage || 'Permintaan gagal diproses');
    }

    return result;
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const query = search.trim()
        ? `?search=${encodeURIComponent(search.trim())}`
        : '';
      const [userResult, optionResult] = await Promise.all([
        request(`users${query}`),
        accessOptions.length === 0
          ? request('users/access-options')
          : Promise.resolve(accessOptions),
      ]);
      setUsers(userResult);
      if (accessOptions.length === 0) {
        setAccessOptions(optionResult);
      }
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Data akun gagal dimuat',
      );
    } finally {
      setLoading(false);
    }
  }, [accessOptions, request, search]);

  useEffect(() => {
    void loadData();
  }, []);

  const departments = useMemo(
    () => accessOptions.filter((option) => option.level === 'department'),
    [accessOptions],
  );

  function openCreate() {
    setEditingUser(null);
    setForm(emptyForm);
    setError('');
    setKaryawanCari('');
    setKaryawanHasil([]);
    setVendorCari('');
    setSelectedVendorId(null);
    setFormModalOpen(true);
  }

  function openEdit(user: ManagedUser) {
    setEditingUser(user);
    setForm({
      name: user.name,
      username: user.username,
      password: '',
      role: user.role,
      isActive: user.isActive,
      nrp: user.nrp ?? '',
      email: user.email ?? '',
      phoneNumber: user.phoneNumber ?? '',
      departemen: user.departemen ?? '',
      jabatan: user.jabatan ?? '',
    });
    setError('');
    setFormModalOpen(true);
  }

  async function submitAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      setSaving(true);
      setMessage('');
      setError('');

      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        username: form.username.trim(),
        role: form.role,
        isActive: form.isActive,
        nrp: form.nrp.trim() || undefined,
        email: form.email.trim() || undefined,
        phoneNumber: form.phoneNumber.trim() || undefined,
        departemen: form.departemen.trim() || undefined,
        jabatan: form.jabatan.trim() || undefined,
      };

      if (!editingUser || form.password.trim()) {
        payload.password = form.password;
      }

      const result = await request(
        editingUser ? `users/${editingUser.id}` : 'users',
        {
          method: editingUser ? 'PATCH' : 'POST',
          body: JSON.stringify(payload),
        },
      );

      let successMessage = editingUser
        ? `Akun ${result.name} berhasil diperbarui`
        : `Akun ${result.name} berhasil ditambahkan`;

      if (!editingUser && form.role === 'VENDOR' && selectedVendorId) {
        try {
          await epromApi.vendor.tautkanUser(selectedVendorId, result.id);
          successMessage += ` dan ditautkan ke vendor ${result.name}`;
        } catch (linkError) {
          successMessage += ` (gagal menautkan ke vendor: ${
            linkError instanceof Error ? linkError.message : 'error tidak diketahui'
          })`;
        }
      }

      setMessage(successMessage);
      setFormModalOpen(false);
      setEditingUser(null);
      setForm(emptyForm);
      setSelectedVendorId(null);
      setVendorCari('');
      await loadData();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : 'Akun gagal disimpan',
      );
    } finally {
      setSaving(false);
    }
  }

  function openAccess(user: ManagedUser) {
    setAccessUser(user);
    setSelectedAccess(user.accessKeys ?? []);
    setError('');
  }

  /** Seluruh keturunan (anak, cucu, dst.) satu key, rekursif. */
  function descendantsOf(key: string): string[] {
    const anak = accessOptions.filter((option) => option.parentKey === key);
    return anak.flatMap((child) => [child.key, ...descendantsOf(child.key)]);
  }

  /** Seluruh leluhur (parent, grandparent, dst.) satu key, rekursif. */
  function ancestorsOf(key: string): string[] {
    const hasil: string[] = [];
    let current = accessOptions.find((option) => option.key === key);

    while (current?.parentKey) {
      hasil.push(current.parentKey);
      current = accessOptions.find((option) => option.key === current!.parentKey);
    }

    return hasil;
  }

  function toggleAccess(option: AccessOption) {
    setSelectedAccess((current) => {
      const next = new Set(current);
      const enabled = next.has(option.key);

      if (enabled) {
        next.delete(option.key);
        for (const descendant of descendantsOf(option.key)) {
          next.delete(descendant);
        }
      } else {
        next.add(option.key);
        for (const ancestor of ancestorsOf(option.key)) {
          next.add(ancestor);
        }
      }

      return Array.from(next);
    });
  }

  /** Render satu node akses (department/section/card) beserta anaknya secara rekursif. */
  function renderAccessNode(option: AccessOption, depth: number) {
    const children = accessOptions.filter((item) => item.parentKey === option.key);
    const isOn = selectedAccess.includes(option.key);
    const isDepartment = option.level === 'department';

    return (
      <div key={option.key}>
        <button
          type="button"
          className={isDepartment ? styles.departmentToggle : styles.cardToggle}
          style={depth > 0 ? { paddingLeft: 16 + depth * 18 } : undefined}
          onClick={() => toggleAccess(option)}
        >
          <div>
            <strong>{option.title}</strong>
            <small>{option.description}</small>
          </div>
          <span className={`${styles.switch} ${isOn ? styles.switchOn : ''}`} />
        </button>

        {children.length > 0 && isOn && (
          <div className={styles.cardList}>
            {children.map((child) => renderAccessNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  }

  async function saveAccess() {
    if (!accessUser) return;

    try {
      setSaving(true);
      setMessage('');
      setError('');
      const result = await request(`users/${accessUser.id}/access`, {
        method: 'PATCH',
        body: JSON.stringify({ accessKeys: selectedAccess }),
      });
      setMessage(`Akses akun ${result.name} berhasil diperbarui`);
      setAccessUser(null);
      await loadData();
    } catch (accessError) {
      setError(
        accessError instanceof Error
          ? accessError.message
          : 'Akses akun gagal diperbarui',
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteUser(user: ManagedUser) {
    if (!window.confirm(`Hapus akun ${user.name}?`)) return;

    try {
      setMessage('');
      setError('');
      await request(`users/${user.id}`, { method: 'DELETE' });
      setMessage(`Akun ${user.name} berhasil dihapus`);
      await loadData();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : 'Akun gagal dihapus',
      );
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.heading}>
        <div>
          <h1>Manajemen Akun</h1>
          <p>
            Tambah akun, atur role, aktif/nonaktif akun, serta tentukan akses
            judul HC, GA, CIVIL, ADMINISTRASI dan setiap section/card di
            dalamnya.
          </p>
        </div>
        <button type="button" className={styles.addButton} onClick={openCreate}>
          <Plus size={17} />
          Tambah Akun
        </button>
      </div>

      {message && <div className={styles.success}>{message}</div>}
      {error && !formModalOpen && !accessUser && (
        <div className={styles.error}>{error}</div>
      )}

      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <form
            className={styles.search}
            onSubmit={(event) => {
              event.preventDefault();
              void loadData();
            }}
          >
            <Search size={17} />
            <input
              value={search}
              placeholder="Cari nama atau username..."
              onChange={(event) => setSearch(event.target.value)}
            />
          </form>
          <span className={styles.total}>Total {users.length} akun</span>
        </div>

        {loading ? (
          <div className={styles.loading}>Memuat data akun...</div>
        ) : users.length === 0 ? (
          <div className={styles.empty}>Belum ada data akun.</div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama</th>
                  <th>Username</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Akses</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => (
                  <tr key={user.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className={styles.identity}>
                        <strong>{user.name}</strong>
                        <span>ID akun #{user.id}</span>
                      </div>
                    </td>
                    <td>{user.username}</td>
                    <td>
                      <span className={styles.roleBadge}>
                        {formatRole(user.role)}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.statusBadge} ${
                          user.isActive
                            ? styles.statusActive
                            : styles.statusInactive
                        }`}
                      >
                        {user.isActive ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td>
                      <span className={styles.accessBadge}>
                        <ShieldCheck size={13} />
                        {user.role === 'ADMIN'
                          ? 'Akses penuh'
                          : `${user.accessKeys?.length ?? 0} akses aktif`}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          type="button"
                          className={styles.detailButton}
                          title="Detail"
                          onClick={() => setDetailUser(user)}
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          className={styles.editButton}
                          title="Edit"
                          onClick={() => openEdit(user)}
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          type="button"
                          className={styles.accessButton}
                          title="Atur akses"
                          disabled={user.role === 'ADMIN'}
                          onClick={() => openAccess(user)}
                        >
                          <KeyRound size={16} />
                        </button>
                        <button
                          type="button"
                          className={styles.deleteButton}
                          title="Hapus"
                          disabled={user.id === currentUser?.id}
                          onClick={() => void deleteUser(user)}
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

      {formModalOpen && (
        <div className={styles.modalOverlay}>
          <section className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2>{editingUser ? 'Edit Akun' : 'Tambah Akun'}</h2>
                <p>
                  {editingUser
                    ? 'Kosongkan password bila password lama tetap digunakan.'
                    : 'Akses awal dapat diatur setelah akun tersimpan.'}
                </p>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setFormModalOpen(false)}
              >
                <X size={20} />
              </button>
            </div>

            <form className={styles.form} onSubmit={submitAccount} autoComplete="off">
              {!editingUser ? (
                <div className={styles.karyawanPicker}>
                  <div className={styles.karyawanPickerLabel}>
                    <Database size={13} />
                    Pilih dari Database Karyawan (opsional)
                  </div>
                  <input
                    className={styles.karyawanPickerInput}
                    value={karyawanCari}
                    onChange={(event) => {
                      setKaryawanCari(event.target.value);
                      setKaryawanDropdownTerbuka(true);
                    }}
                    onFocus={() => setKaryawanDropdownTerbuka(true)}
                    onBlur={() =>
                      setTimeout(() => setKaryawanDropdownTerbuka(false), 150)
                    }
                    autoComplete="off"
                    placeholder="Cari nama atau NIK karyawan..."
                  />

                  {karyawanDropdownTerbuka && karyawanCari.trim().length >= 2 ? (
                    <div className={styles.karyawanDropdown}>
                      {karyawanMencari ? (
                        <div className={styles.karyawanDropdownItem}>
                          <span>Mencari...</span>
                        </div>
                      ) : karyawanHasil.length === 0 ? (
                        <div className={styles.karyawanDropdownItem}>
                          <span>Tidak ditemukan</span>
                        </div>
                      ) : (
                        karyawanHasil.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className={styles.karyawanDropdownItem}
                            onClick={() => pilihKaryawan(item)}
                          >
                            <strong>{item.nama}</strong>
                            <span>
                              {item.nik} - {item.departemen.namaDepartemen}
                              {item.jabatan ? ` - ${item.jabatan}` : ''}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {!editingUser && form.role === 'VENDOR' ? (
                <div className={styles.karyawanPicker}>
                  <div className={styles.karyawanPickerLabel}>
                    <Database size={13} />
                    Pilih dari Database Vendor (opsional)
                  </div>
                  <input
                    className={styles.karyawanPickerInput}
                    value={vendorCari}
                    onChange={(event) => {
                      setVendorCari(event.target.value);
                      setVendorDropdownTerbuka(true);
                      setSelectedVendorId(null);
                    }}
                    onFocus={() => setVendorDropdownTerbuka(true)}
                    onBlur={() =>
                      setTimeout(() => setVendorDropdownTerbuka(false), 150)
                    }
                    autoComplete="off"
                    placeholder="Cari nama vendor..."
                  />
                  <small className={styles.roleHint}>
                    Memilih vendor akan menautkan akun ini ke data vendor
                    tersebut, sehingga akses akun otomatis dibatasi hanya ke
                    project milik vendor itu (mis. project dari Kontrak yang
                    dimenangkannya).
                  </small>

                  {vendorDropdownTerbuka ? (
                    <div className={styles.karyawanDropdown}>
                      {vendorHasil.length === 0 ? (
                        <div className={styles.karyawanDropdownItem}>
                          <span>Tidak ditemukan</span>
                        </div>
                      ) : (
                        vendorHasil.map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            className={styles.karyawanDropdownItem}
                            onClick={() => pilihVendor(item)}
                          >
                            <strong>{item.namaVendor}</strong>
                            <span>{item.email ?? item.noTelepon ?? 'Tanpa kontak'}</span>
                          </button>
                        ))
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className={styles.formGrid}>
                <label>
                  <span>Nama</span>
                  <input
                    value={form.name}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    autoComplete="off"
                    required
                  />
                </label>
                <label>
                  <span>Username</span>
                  <input
                    value={form.username}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        username: event.target.value,
                      }))
                    }
                    autoComplete="off"
                    required
                  />
                </label>
                <label>
                  <span>NRP</span>
                  <input
                    value={form.nrp}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        nrp: event.target.value,
                      }))
                    }
                    autoComplete="off"
                    placeholder="Contoh: 260207"
                  />
                  <small className={styles.roleHint}>
                    Dipakai untuk mencatat identitas akun di card lain (mis.
                    jawaban Aspirasi Karyawan di PORTAL IR).
                  </small>
                </label>
                <label>
                  <span>Password</span>
                  <input
                    type="password"
                    value={form.password}
                    placeholder={editingUser ? 'Biarkan kosong' : 'Minimal 6 karakter'}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        password: event.target.value,
                      }))
                    }
                    autoComplete="new-password"
                    required={!editingUser}
                  />
                </label>
                <label>
                  <span>Role</span>
                  <select
                    value={form.role}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        role: event.target.value,
                      }))
                    }
                  >
                    <option value="KARYAWAN">Karyawan</option>
                    <option value="SECTION_HEAD">Section Head</option>
                    <option value="GRUP_LEADER">Group Leader</option>
                    <option value="FA">FA</option>
                    <option value="ADMIN_DEPT">Admin Departemen</option>
                    <option value="HC">HC</option>
                    <option value="ADMIN_COMBEN">Admin Comben</option>
                    <option value="DOKTER">Dokter</option>
                    <option value="SHE">SHE / K3</option>
                    <option value="KLINIK">Klinik Provider</option>
                    <option value="PJO">PJO</option>
                    <option value="DRIVER">Driver</option>
                    <option value="VENDOR">Vendor</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Admin HC</option>
                  </select>
                  <small className={styles.roleHint}>
                    Satu akun = satu role, sesuai jabatan/fungsi orang
                    tersebut. Menu dan card yang bisa diakses diatur terpisah
                    lewat pengaturan akses di bawah. Cakupan Admin Departemen
                    diatur lebih lanjut di Master Departemen, dan cakupan
                    Klinik Provider di Master Klinik pada modul MCU. Admin HC
                    juga merangkap admin IR. Administrator (Admin/Admin HC)
                    otomatis mendapat akses penuh ke seluruh menu.
                  </small>
                </label>
                <label>
                  <span>Email</span>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    autoComplete="off"
                    placeholder="nama@perusahaan.com"
                  />
                </label>
                <label>
                  <span>No. Telepon</span>
                  <input
                    type="tel"
                    value={form.phoneNumber}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        phoneNumber: event.target.value,
                      }))
                    }
                    autoComplete="off"
                    placeholder="08xxxxxxxxxx"
                  />
                  <small className={styles.roleHint}>
                    Nomor ini dipakai sebagai nomor terdaftar akun di Helpdesk
                    Center saat membuat laporan.
                  </small>
                </label>
                <label>
                  <span>Departemen</span>
                  <input
                    value={form.departemen}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        departemen: event.target.value,
                      }))
                    }
                    autoComplete="off"
                    placeholder="Contoh: HCG"
                  />
                </label>
                <label>
                  <span>Jabatan</span>
                  <input
                    value={form.jabatan}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        jabatan: event.target.value,
                      }))
                    }
                    autoComplete="off"
                    placeholder="Contoh: Comben Admin"
                  />
                </label>
                <label className={styles.checkLine}>
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        isActive: event.target.checked,
                      }))
                    }
                  />
                  <span>Akun aktif dan dapat login</span>
                </label>
              </div>

              {error && <div className={styles.error}>{error}</div>}
              <div className={styles.formActions}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setFormModalOpen(false)}
                >
                  Batal
                </button>
                <button type="submit" className={styles.saveButton} disabled={saving}>
                  <UserCog size={17} />
                  {saving ? 'Menyimpan...' : 'Simpan Akun'}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {detailUser && (
        <div className={styles.modalOverlay}>
          <section className={styles.modal}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Detail Akun</h2>
                <p>{detailUser.name}</p>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setDetailUser(null)}
              >
                <X size={20} />
              </button>
            </div>
            <div className={styles.detailGrid}>
              <div><span>Nama</span><strong>{detailUser.name}</strong></div>
              <div><span>Username</span><strong>{detailUser.username}</strong></div>
              <div><span>Role</span><strong>{formatRole(detailUser.role)}</strong></div>
              <div><span>NRP</span><strong>{detailUser.nrp || '-'}</strong></div>
              <div><span>Email</span><strong>{detailUser.email || '-'}</strong></div>
              <div><span>No. Telepon</span><strong>{detailUser.phoneNumber || '-'}</strong></div>
              <div><span>Departemen</span><strong>{detailUser.departemen || '-'}</strong></div>
              <div><span>Jabatan</span><strong>{detailUser.jabatan || '-'}</strong></div>
              <div><span>Status</span><strong>{detailUser.isActive ? 'Aktif' : 'Nonaktif'}</strong></div>
              <div><span>Jumlah Akses</span><strong>{detailUser.role === 'ADMIN' ? 'Akses penuh' : `${detailUser.accessKeys.length} akses aktif`}</strong></div>
              <div><span>Dibuat</span><strong>{new Date(detailUser.createdAt).toLocaleString('id-ID')}</strong></div>
            </div>
          </section>
        </div>
      )}

      {accessUser && (
        <div className={styles.modalOverlay}>
          <section className={`${styles.modal} ${styles.accessModal}`}>
            <div className={styles.modalHeader}>
              <div>
                <h2>Atur Akses Akun</h2>
                <p>{accessUser.name} · {formatRole(accessUser.role)}</p>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setAccessUser(null)}
              >
                <X size={20} />
              </button>
            </div>

            <div className={styles.accessContent}>
              <p className={styles.accessIntro}>
                Matikan judul utama untuk menyembunyikan seluruh card di bawahnya.
                Card yang aktif otomatis mengaktifkan judul departemennya.
              </p>

              {departments.map((department) => (
                <section className={styles.accessGroup} key={department.key}>
                  {renderAccessNode(department, 0)}
                </section>
              ))}

              {error && <div className={styles.error}>{error}</div>}
              <div className={styles.accessFooter}>
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={() => setAccessUser(null)}
                >
                  Batal
                </button>
                <button
                  type="button"
                  className={styles.saveButton}
                  disabled={saving}
                  onClick={() => void saveAccess()}
                >
                  <ShieldCheck size={17} />
                  {saving ? 'Menyimpan...' : 'Simpan Akses'}
                </button>
              </div>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
