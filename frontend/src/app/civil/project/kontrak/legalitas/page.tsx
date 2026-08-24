"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { FolderOpen, Pencil, Plus, Trash2, X } from "lucide-react";
import { getStoredUser, refreshStoredUser, type PortalUser } from "@/lib/access-control";
import {
  epromApi,
  isEpromOwner,
  isEpromVendor,
  LABEL_LEGALITAS_VENDOR,
  type Vendor,
} from "@/lib/eprom-api";
import { FolderExplorer } from "@/components/civil-project/folder-explorer";
import { Modal } from "@/components/civil-project/modal";
import styles from "../kontrak.module.css";

export default function LegalitasVendorPage() {
  const [user, setUser] = useState<PortalUser | null>(null);
  const [vendorList, setVendorList] = useState<Vendor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [vendorPilihan, setVendorPilihan] = useState("");
  const [mengklaim, setMengklaim] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTelepon, setEditTelepon] = useState("");

  const [folderModal, setFolderModal] = useState<Vendor | null>(null);

  useEffect(() => {
    setUser(getStoredUser());
  }, []);

  function muatUlang() {
    epromApi.vendor.daftar().then(setVendorList).catch(() => setVendorList([]));
  }

  useEffect(muatUlang, []);

  const boleh = isEpromOwner(user);
  const vendorSaya = isEpromVendor(user);
  const sudahTertaut = Boolean(user?.vendorId);

  const daftarTampil = boleh
    ? vendorList
    : vendorSaya && sudahTertaut
      ? vendorList.filter((v) => v.id === user?.vendorId)
      : [];

  function bolehUbah(vendor: Vendor) {
    return boleh || vendor.id === user?.vendorId;
  }

  async function klaimVendor(event: React.FormEvent) {
    event.preventDefault();
    if (!vendorPilihan) return;
    setMengklaim(true);
    setError(null);
    try {
      await epromApi.vendor.klaim(Number(vendorPilihan));
      const updated = await refreshStoredUser();
      setUser(updated);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menautkan akun ke vendor");
    } finally {
      setMengklaim(false);
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

  async function ubahLegalitas(vendor: Vendor) {
    const status = vendor.legalitasStatus === "LENGKAP" ? "BELUM_LENGKAP" : "LENGKAP";
    try {
      await epromApi.vendor.ubah(vendor.id, { legalitasStatus: status });
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status legalitas");
    }
  }

  return (
    <div className={styles.page}>
      {error && <p className={styles.errorText}>{error}</p>}

      <section className={styles.section}>
        <div className={styles.headerRow}>
          <div>
            <h1>Legalitas Vendor</h1>
            <p>
              {boleh
                ? "Kelola kelengkapan dokumen legalitas (SIUP, NPWP, Akta, dsb.) per vendor. Daftar vendor otomatis mengikuti Data Vendor."
                : "Upload dokumen legalitas perusahaan Anda di sini. Owner yang menentukan status Lengkap/Belum Lengkap."}
            </p>
          </div>
          {boleh && (
            <Link href="/civil/project/vendor" className={styles.primaryButton}>
              <Plus size={16} /> Vendor Baru
            </Link>
          )}
        </div>

        {vendorSaya && !sudahTertaut && (
          <form className={styles.formCard} onSubmit={klaimVendor}>
            <label>
              Pilih Vendor Anda
              <select value={vendorPilihan} onChange={(e) => setVendorPilihan(e.target.value)} required>
                <option value="">Pilih dari Data Vendor...</option>
                {vendorList.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.namaVendor}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className={styles.primaryButton} disabled={mengklaim}>
              {mengklaim ? "Menautkan..." : "Konfirmasi"}
            </button>
          </form>
        )}

        {vendorSaya && !sudahTertaut && (
          <p className={styles.emptyText}>
            Akun Anda belum tertaut ke vendor manapun. Pilih nama perusahaan Anda dari daftar Data
            Vendor di atas untuk mulai mengelola dokumen legalitas — akun lain (vendor berbeda)
            tidak akan bisa melihat folder Anda.
          </p>
        )}

        {(boleh || sudahTertaut) && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Vendor</th>
                  <th>Kontak</th>
                  <th>Legalitas</th>
                  <th>Dokumen</th>
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
                          <div className={styles.stackedInputs}>
                            <input
                              type="email"
                              placeholder="Email"
                              value={editEmail}
                              onChange={(e) => setEditEmail(e.target.value)}
                            />
                            <input
                              placeholder="No. Telepon"
                              value={editTelepon}
                              onChange={(e) => setEditTelepon(e.target.value)}
                            />
                          </div>
                        </td>
                        <td colSpan={2} />
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
                        <td>
                          <div className={styles.stackedText}>
                            <span>{vendor.email ?? "-"}</span>
                            <small>{vendor.noTelepon ?? "-"}</small>
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={`${styles.statusPill} ${
                              vendor.legalitasStatus === "LENGKAP" ? styles.status_LENGKAP : styles.status_BELUM_LENGKAP
                            }`}
                            onClick={() => boleh && ubahLegalitas(vendor)}
                            disabled={!boleh}
                          >
                            {LABEL_LEGALITAS_VENDOR[vendor.legalitasStatus]}
                          </button>
                        </td>
                        <td>
                          <button
                            type="button"
                            className={styles.linkButton}
                            onClick={() => setFolderModal(vendor)}
                          >
                            <FolderOpen size={14} /> Lihat Folder
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
                      Belum ada vendor.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {folderModal && (
        <Modal title={`Legalitas - ${folderModal.namaVendor}`} onClose={() => setFolderModal(null)}>
          <FolderExplorer scope="LEGALITAS_VENDOR" vendorId={folderModal.id} />
        </Modal>
      )}
    </div>
  );
}
