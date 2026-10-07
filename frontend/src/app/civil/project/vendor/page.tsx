"use client";

import { useMemo, useEffect, useState } from "react";
import { Pencil, Plus, Settings2, Trash2, X } from "lucide-react";
import { getStoredUser } from "@/lib/access-control";
import { epromApi, isEpromOwner, type Vendor } from "@/lib/eprom-api";
import styles from "../kontrak/kontrak.module.css";

const SUBMENU_EPROM = [
  ['shop-drawing', 'Engineer - Shop Drawing'], ['material-approval', 'Engineer - Material Approval'],
  ['metode-pekerjaan', 'Engineer - Metode Pekerjaan'], ['sertifikasi-pekerjaan', 'Engineer - Sertifikasi Pekerjaan'],
  ['peralatan-list', 'Engineer - Daftar Peralatan'], ['komisioning-alat-berat', 'Engineer - Komisioning Alat Berat'],
  ['dokpro', 'Engineer - Dokpro'], ['checklist-tahapan', 'Konstruksi - Checklist Tahapan Pekerjaan'],
  ['inspeksi-area', 'Konstruksi - Inspeksi Area'], ['progress-harian', 'Konstruksi - Laporan Harian'],
  ['progress-mingguan', 'Konstruksi - Laporan Mingguan'], ['progress-bulanan', 'Konstruksi - Laporan Bulanan'],
  ['inspeksi-peralatan', 'Konstruksi - Inspeksi Peralatan'], ['tta', 'Konstruksi - TTA'],
  ['kta', 'Konstruksi - KTA'], ['ibpr', 'Konstruksi - IBPR'], ['jsa', 'Konstruksi - JSA'],
  ['sosialisasi-jsa', 'Konstruksi - Sosialisasi JSA'], ['izin-kerja-khusus', 'Konstruksi - Izin Kerja Khusus'],
  ['meeting', 'Meeting Progress'], ['mom', 'Meeting Progress - MOM'],
  ['dokumentasi', 'Meeting Progress - Dokumentasi'],
  ['p5m', 'Safety Meeting - P5M'], ['safety-talk', 'Safety Meeting - Safety Talk'],
  ['fatigue-test', 'Safety Meeting - Fatigue Test'],
  ['surat-teguran', 'Dokumen - Surat Teguran'], ['surat-peringatan', 'Dokumen - Surat Peringatan'],
  ['coaching-counseling', 'Dokumen - Coaching & Counseling'], ['memo', 'Dokumen - Memo'],
  ['opname-pekerjaan', 'Financial - Opname Pekerjaan'],
  ['as-build-drawing', 'Project Closing - As Build Drawing'], ['komisioning', 'Project Closing - Komisioning'],
  ['serah-terima', 'Project Closing - Serah Terima'], ['masa-pemeliharaan-checklist', 'Project Closing - Checklist Masa Pemeliharaan'],
  ['ba-serah-terima', 'Project Closing - BA Serah Terima'],
] as const;

export default function MasterVendorPage() {
  const user = getStoredUser();
  const boleh = isEpromOwner(user);
  const bolehAturAkses = ['OWNER', 'ADMIN', 'SUPER_ADMIN'].includes(user?.role ?? '');

  const [vendorList, setVendorList] = useState<Vendor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const [namaVendorBaru, setNamaVendorBaru] = useState("");
  const [emailBaru, setEmailBaru] = useState("");
  const [teleponBaru, setTeleponBaru] = useState("");
  const [showVendorForm, setShowVendorForm] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTelepon, setEditTelepon] = useState("");
  const [aksesVendor, setAksesVendor] = useState<Vendor | null>(null);
  const [menuNonaktif, setMenuNonaktif] = useState<string[]>([]);

  function muatUlang() {
    epromApi.vendor.daftar().then(setVendorList).catch(() => setVendorList([]));
  }

  useEffect(muatUlang, []);

  function bolehUbah(vendor: Vendor) {
    return boleh || vendor.id === user?.vendorId;
  }

  // Akun Vendor cuma boleh lihat datanya sendiri; vendor lain tidak ditampilkan.
  const daftarTampil = useMemo(() => {
    const dasar = boleh ? vendorList : vendorList.filter((v) => v.id === user?.vendorId);

    if (!statusFilter) {
      return dasar;
    }

    return dasar.filter((v) =>
      statusFilter === "AKTIF" ? v.statusAktif : !v.statusAktif,
    );
  }, [vendorList, boleh, user?.vendorId, statusFilter]);

  async function buatVendor(event: React.FormEvent) {
    event.preventDefault();
    try {
      await epromApi.vendor.buat({
        namaVendor: namaVendorBaru,
        email: emailBaru || undefined,
        noTelepon: teleponBaru || undefined,
      });
      setNamaVendorBaru("");
      setEmailBaru("");
      setTeleponBaru("");
      setShowVendorForm(false);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat vendor");
    }
  }

  function mulaiEdit(vendor: Vendor) {
    setEditingId(vendor.id);
    setEditNama(vendor.namaVendor);
    setEditEmail(vendor.email ?? "");
    setEditTelepon(vendor.noTelepon ?? "");
  }

  async function simpanEdit(id: number) {
    try {
      await epromApi.vendor.ubah(id, {
        namaVendor: editNama,
        email: editEmail || undefined,
        noTelepon: editTelepon || undefined,
      });
      setEditingId(null);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah vendor");
    }
  }

  async function hapusVendor(vendor: Vendor) {
    if (!confirm(`Hapus vendor "${vendor.namaVendor}"?`)) return;
    try {
      await epromApi.vendor.hapus(vendor.id);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus vendor");
    }
  }

  async function ubahStatusAktif(vendor: Vendor) {
    try {
      await epromApi.vendor.ubah(vendor.id, { statusAktif: !vendor.statusAktif });
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status vendor");
    }
  }

  async function simpanAksesMenu() {
    if (!aksesVendor) return;
    try {
      await epromApi.vendor.ubah(aksesVendor.id, { menuNonaktif });
      setAksesVendor(null);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal menyimpan akses submenu');
    }
  }

  return (
    <div className={styles.page}>
      {error && <p className={styles.errorText}>{error}</p>}

      <section className={styles.section}>
        <div className={styles.headerRow}>
          <div>
            <h1>Data Vendor</h1>
            <p>
              Master data vendor: nama, email, no. telepon, dan status aktif. Vendor non-aktif
              tidak muncul di pilihan Undangan Tender.
            </p>
          </div>
          {boleh && (
            <button type="button" className={styles.primaryButton} onClick={() => setShowVendorForm((v) => !v)}>
              <Plus size={16} /> Vendor Baru
            </button>
          )}
        </div>

        <div className={styles.filterRow}>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Semua Status</option>
            <option value="AKTIF">Aktif</option>
            <option value="NONAKTIF">Non Aktif</option>
          </select>
        </div>

        {showVendorForm && (
          <form className={styles.formCard} onSubmit={buatVendor}>
            <label>
              Nama Vendor
              <input value={namaVendorBaru} onChange={(e) => setNamaVendorBaru(e.target.value)} required />
            </label>
            <label>
              Email
              <input type="email" value={emailBaru} onChange={(e) => setEmailBaru(e.target.value)} />
            </label>
            <label>
              No. Telepon
              <input value={teleponBaru} onChange={(e) => setTeleponBaru(e.target.value)} />
            </label>
            <button type="submit" className={styles.primaryButton}>
              Simpan
            </button>
          </form>
        )}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Vendor</th>
                <th>Email</th>
                <th>No. Telepon</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {daftarTampil.map((vendor) => (
                <tr key={vendor.id}>
                  {editingId === vendor.id ? (
                    <>
                      <td>
                        <input value={editNama} onChange={(e) => setEditNama(e.target.value)} />
                      </td>
                      <td>
                        <input
                          type="email"
                          placeholder="Email"
                          value={editEmail}
                          onChange={(e) => setEditEmail(e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          placeholder="No. Telepon"
                          value={editTelepon}
                          onChange={(e) => setEditTelepon(e.target.value)}
                        />
                      </td>
                      <td />
                      <td>
                        <div className={styles.inlineForm}>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => simpanEdit(vendor.id)}
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => setEditingId(null)}
                            title="Batal"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{vendor.namaVendor}</td>
                      <td>{vendor.email ?? "-"}</td>
                      <td>{vendor.noTelepon ?? "-"}</td>
                      <td>
                        <button
                          type="button"
                          className={`${styles.statusPill} ${
                            vendor.statusAktif ? styles.status_LENGKAP : styles.status_BELUM_LENGKAP
                          }`}
                          onClick={() => boleh && ubahStatusAktif(vendor)}
                          disabled={!boleh}
                        >
                          {vendor.statusAktif ? "Aktif" : "Non Aktif"}
                        </button>
                      </td>
                      <td>
                        <div className={styles.inlineForm}>
                          {bolehUbah(vendor) && (
                            <button
                              type="button"
                              className={styles.iconButton}
                              onClick={() => mulaiEdit(vendor)}
                              title="Edit vendor"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {bolehAturAkses && (
                            <button
                              type="button"
                              className={styles.iconButton}
                              onClick={() => { setAksesVendor(vendor); setMenuNonaktif(vendor.menuNonaktif ?? []); }}
                              title="Atur akses submenu"
                            >
                              <Settings2 size={14} />
                            </button>
                          )}
                          {boleh && (
                            <button
                              type="button"
                              className={styles.iconButtonDanger}
                              onClick={() => hapusVendor(vendor)}
                              title="Hapus vendor"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
              {daftarTampil.length === 0 && (
                <tr>
                  <td colSpan={5} className={styles.emptyText}>
                    {boleh
                      ? "Belum ada vendor."
                      : "Akun Anda belum tertaut ke vendor manapun. Buka menu Legalitas Vendor untuk memilih vendor Anda."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {aksesVendor && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: '#10244a88', display: 'grid', placeItems: 'center', padding: 16 }}>
          <section className={styles.formCard} style={{ width: 'min(720px, 100%)', maxHeight: '86vh', overflow: 'auto', display: 'block' }}>
            <div className={styles.headerRow}>
              <div><h2>Akses Submenu</h2><p>{aksesVendor.namaVendor}</p></div>
              <button type="button" className={styles.iconButton} onClick={() => setAksesVendor(null)}><X size={16} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 10, margin: '18px 0' }}>
              {SUBMENU_EPROM.map(([key, label]) => {
                const aktif = !menuNonaktif.includes(key);
                return <label key={key} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: 12, border: '1px solid #dce7f3', borderRadius: 10 }}>
                  <input type="checkbox" checked={aktif} onChange={() => setMenuNonaktif((current) => aktif ? [...current, key] : current.filter((item) => item !== key))} />
                  <span><strong>{label}</strong><small style={{ display: 'block', color: '#7185a0' }}>{aktif ? 'Aktif' : 'Nonaktif - tidak masuk penilaian'}</small></span>
                </label>;
              })}
            </div>
            <button type="button" className={styles.primaryButton} onClick={simpanAksesMenu}>Simpan Akses Menu</button>
          </section>
        </div>
      )}
    </div>
  );
}
