'use client';

import {
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
import styles from './manajemen-akun.module.css';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

type ManagedUser = PortalUser & {
  isActive: boolean;
  accessKeys: string[];
  createdAt: string;
  updatedAt: string;
};

type AccessOption = {
  key: string;
  title: string;
  description: string;
  parentKey: string | null;
  level: 'department' | 'card';
};

type AccountForm = {
  name: string;
  username: string;
  password: string;
  role: string;
  isActive: boolean;
};

const emptyForm: AccountForm = {
  name: '',
  username: '',
  password: '',
  role: 'TAMU',
  isActive: true,
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

      setMessage(
        editingUser
          ? `Akun ${result.name} berhasil diperbarui`
          : `Akun ${result.name} berhasil ditambahkan`,
      );
      setFormModalOpen(false);
      setEditingUser(null);
      setForm(emptyForm);
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

  function toggleAccess(option: AccessOption) {
    setSelectedAccess((current) => {
      const next = new Set(current);
      const enabled = next.has(option.key);

      if (enabled) {
        next.delete(option.key);
        if (option.level === 'department') {
          for (const child of accessOptions) {
            if (child.parentKey === option.key) {
              next.delete(child.key);
            }
          }
        }
      } else {
        next.add(option.key);
        if (option.parentKey) {
          next.add(option.parentKey);
        }
      }

      return Array.from(next);
    });
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
            judul HC, GA, SIPIL dan setiap card di dalamnya.
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

            <form className={styles.form} onSubmit={submitAccount}>
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
                    required
                  />
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
                    <option value="TAMU">Tamu</option>
                    <option value="KARYAWAN">Karyawan</option>
                    <option value="SECTION_HEAD">Section Head</option>
                    <option value="GRUP_LEADER">Group Leader</option>
                    <option value="FA">FA</option>
                    <option value="ADMIN">Admin</option>
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <optgroup label="Peran MCU Periodik">
                      <option value="ADMIN_DEPT">Admin Dept (MCU)</option>
                      <option value="HC">HC (MCU)</option>
                      <option value="DOKTER">Dokter (MCU)</option>
                      <option value="SHE">SHE / K3 (MCU)</option>
                      <option value="KLINIK">Klinik Provider (MCU)</option>
                    </optgroup>
                  </select>
                  <small className={styles.roleHint}>
                    Satu akun = satu role. Karyawan dipakai untuk login
                    Deklarasi Dinas &amp; MCU Periodik. FA &amp; Super Admin
                    dipakai untuk approval Deklarasi Dinas. Role di grup
                    &quot;Peran MCU Periodik&quot; dipakai khusus alur MCU
                    (Bagian 2 dokumen alur) - cakupan Admin Dept diatur lebih
                    lanjut di Master Departemen, dan cakupan Klinik Provider
                    di Master Klinik pada modul MCU. Administrator
                    (Admin/Super Admin) otomatis mendapat akses penuh ke
                    seluruh menu.
                  </small>
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

              {departments.map((department) => {
                const children = accessOptions.filter(
                  (option) => option.parentKey === department.key,
                );
                const departmentOn = selectedAccess.includes(department.key);

                return (
                  <section className={styles.accessGroup} key={department.key}>
                    <button
                      type="button"
                      className={styles.departmentToggle}
                      onClick={() => toggleAccess(department)}
                    >
                      <div>
                        <strong>{department.title}</strong>
                        <small>{department.description}</small>
                      </div>
                      <span className={`${styles.switch} ${departmentOn ? styles.switchOn : ''}`} />
                    </button>

                    {children.length > 0 && departmentOn && (
                      <div className={styles.cardList}>
                        {children.map((child) => {
                          const childOn = selectedAccess.includes(child.key);
                          return (
                            <button
                              type="button"
                              className={styles.cardToggle}
                              key={child.key}
                              onClick={() => toggleAccess(child)}
                            >
                              <div>
                                <strong>{child.title}</strong>
                                <small>{child.description}</small>
                              </div>
                              <span className={`${styles.switch} ${childOn ? styles.switchOn : ''}`} />
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </section>
                );
              })}

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
