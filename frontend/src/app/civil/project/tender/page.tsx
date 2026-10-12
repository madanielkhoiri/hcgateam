"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Power, Settings2, Trash2, X } from "lucide-react";
import { AksesSubmenuDialog } from "@/components/eprom/akses-submenu-dialog";
import { getStoredUser } from "@/lib/access-control";
import {
  epromApi,
  formatTanggal,
  isEpromOwner,
  LABEL_STATUS_TENDER,
  type StatusTender,
  type TenderProcess,
} from "@/lib/eprom-api";
import styles from "./tender.module.css";

export default function TenderListPage() {
  const [daftar, setDaftar] = useState<TenderProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [bulan, setBulan] = useState("");
  const [tahun, setTahun] = useState("");
  const [namaTender, setNamaTender] = useState("");
  const [jenisTender, setJenisTender] = useState<"VENDOR" | "INTERNAL">("VENDOR");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [aksesTender, setAksesTender] = useState<TenderProcess | null>(null);
  const bolehAturAkses = ['OWNER', 'ADMIN', 'SUPER_ADMIN'].includes(getStoredUser()?.role ?? '');

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editMulai, setEditMulai] = useState("");
  const [editSelesai, setEditSelesai] = useState("");

  const boleh = isEpromOwner(getStoredUser());

  const tahunTersedia = useMemo(() => {
    const sekarang = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => sekarang - 5 + index);
  }, []);

  const daftarTampil = useMemo(() => {
    return daftar.filter((tender) => {
      if (statusFilter && tender.status !== statusFilter) return false;

      if (bulan || tahun) {
        if (!tender.tanggalMulai) return false;
        const tanggal = new Date(tender.tanggalMulai);
        if (bulan && tanggal.getMonth() + 1 !== Number(bulan)) return false;
        if (tahun && tanggal.getFullYear() !== Number(tahun)) return false;
      }

      return true;
    });
  }, [daftar, statusFilter, bulan, tahun]);

  function resetFilter() {
    setStatusFilter("");
    setBulan("");
    setTahun("");
  }

  function muatUlang() {
    setLoading(true);
    epromApi.tender
      .daftar()
      .then(setDaftar)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat tender"))
      .finally(() => setLoading(false));
  }

  useEffect(muatUlang, []);

  async function buatTender(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      await epromApi.tender.buat({
        namaTender,
        jenisTender,
        tanggalMulai: tanggalMulai || undefined,
        tanggalSelesai: tanggalSelesai || undefined,
      });
      setNamaTender("");
      setJenisTender("VENDOR");
      setTanggalMulai("");
      setTanggalSelesai("");
      setShowForm(false);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat tender");
    } finally {
      setSubmitting(false);
    }
  }

  function mulaiEdit(tender: TenderProcess) {
    setEditingId(tender.id);
    setEditNama(tender.namaTender);
    setEditMulai(tender.tanggalMulai?.slice(0, 10) ?? "");
    setEditSelesai(tender.tanggalSelesai?.slice(0, 10) ?? "");
  }

  async function simpanEdit(id: number) {
    try {
      await epromApi.tender.ubah(id, {
        namaTender: editNama,
        tanggalMulai: editMulai || undefined,
        tanggalSelesai: editSelesai || undefined,
      });
      setEditingId(null);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah tender");
    }
  }

  async function hapusTender(tender: TenderProcess) {
    if (!confirm(`Hapus tender "${tender.namaTender}"?`)) return;
    try {
      await epromApi.tender.hapus(tender.id);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus tender");
    }
  }

  async function toggleInternal(tender: TenderProcess) {
    try {
      await epromApi.tender.ubahStatusInternal(tender.id, !tender.internalAktif);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah status tender Internal");
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>Tender</h1>
          <p>Vendor memakai alur lengkap; Internal hanya memakai Upload Dokumen.</p>
        </div>

        {boleh && (
          <button type="button" className={styles.primaryButton} onClick={() => setShowForm((v) => !v)}>
            <Plus size={16} />
            Tender Baru
          </button>
        )}
      </div>

      {showForm && (
        <form className={styles.formCard} onSubmit={buatTender}>
          <label>
            Nama Tender
            <input value={namaTender} onChange={(e) => setNamaTender(e.target.value)} required />
          </label>
          <label>
            Jenis Tender
            <select value={jenisTender} onChange={(e) => setJenisTender(e.target.value as "VENDOR" | "INTERNAL")}>
              <option value="VENDOR">Vendor</option>
              <option value="INTERNAL">Internal</option>
            </select>
          </label>
          <label>
            Tanggal Mulai
            <input type="date" value={tanggalMulai} onChange={(e) => setTanggalMulai(e.target.value)} />
          </label>
          <label>
            Tanggal Selesai
            <input type="date" value={tanggalSelesai} onChange={(e) => setTanggalSelesai(e.target.value)} />
          </label>
          <button type="submit" className={styles.primaryButton} disabled={submitting}>
            {submitting ? "Menyimpan..." : "Simpan"}
          </button>
        </form>
      )}

      <div className={styles.filterRow}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Semua Status</option>
          {(Object.keys(LABEL_STATUS_TENDER) as StatusTender[]).map((status) => (
            <option key={status} value={status}>
              {LABEL_STATUS_TENDER[status]}
            </option>
          ))}
        </select>

        <select value={bulan} onChange={(e) => setBulan(e.target.value)}>
          <option value="">Semua Bulan</option>
          {Array.from({ length: 12 }, (_, index) => (
            <option key={index + 1} value={index + 1}>
              {new Intl.DateTimeFormat("id-ID", { month: "long" }).format(new Date(2026, index, 1))}
            </option>
          ))}
        </select>

        <select value={tahun} onChange={(e) => setTahun(e.target.value)}>
          <option value="">Semua Tahun</option>
          {tahunTersedia.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <button type="button" className={styles.secondaryButton} onClick={resetFilter}>
          Reset
        </button>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}
      {loading && <p className={styles.emptyText}>Memuat...</p>}
      {!loading && daftarTampil.length === 0 && <p className={styles.emptyText}>Belum ada tender.</p>}

      <div className={styles.tableWrap}>
        {daftarTampil.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nama Tender</th>
                <th>Jenis</th>
                <th>Status</th>
                <th>Undangan</th>
                <th>SPH</th>
                <th>Kontrak</th>
                {boleh && <th>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {daftarTampil.map((tender) =>
                editingId === tender.id ? (
                  <tr key={tender.id}>
                    <td>
                      <input
                        value={editNama}
                        onChange={(e) => setEditNama(e.target.value)}
                      />
                    </td>
                    <td colSpan={2}>
                      <div className={styles.inlineForm}>
                        <input type="date" value={editMulai} onChange={(e) => setEditMulai(e.target.value)} />
                        <input type="date" value={editSelesai} onChange={(e) => setEditSelesai(e.target.value)} />
                      </div>
                    </td>
                    <td colSpan={boleh ? 4 : 3}>
                      <div className={styles.inlineForm}>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => simpanEdit(tender.id)}
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
                  </tr>
                ) : (
                  <tr key={tender.id}>
                    <td>
                      <Link href={`/civil/project/tender/${tender.id}`} className={styles.rowLink}>
                        {tender.namaTender}
                      </Link>
                      <small>{formatTanggal(tender.tanggalMulai)} - {formatTanggal(tender.tanggalSelesai)}</small>
                    </td>
                    <td>{tender.jenisTender === "INTERNAL" ? "Internal" : "Vendor"}</td>
                    <td>
                      <span className={`${styles.statusPill} ${styles[`status_${tender.status}`]}`}>
                        {tender.jenisTender === "INTERNAL"
                          ? tender.internalAktif ? "Aktif" : "Nonaktif"
                          : LABEL_STATUS_TENDER[tender.status]}
                      </span>
                    </td>
                    <td>{tender.jenisTender === "INTERNAL" ? "Tidak berlaku" : `${tender._count?.undangan ?? 0} vendor`}</td>
                    <td>{tender.jenisTender === "INTERNAL" ? "Tidak berlaku" : `${tender._count?.sph ?? 0} round`}</td>
                    <td>{tender.jenisTender === "INTERNAL" ? "Tidak berlaku" : tender.kontrak ? "Sudah dibuat" : "-"}</td>
                    {boleh && (
                      <td>
                        <div className={styles.inlineForm}>
                          {tender.jenisTender === "INTERNAL" && bolehAturAkses && tender.kontrak?.vendor && (
                            <button
                              type="button"
                              className={styles.iconButton}
                              onClick={() => setAksesTender(tender)}
                              title="Atur akses submenu"
                            >
                              <Settings2 size={14} />
                            </button>
                          )}
                          {tender.jenisTender === "INTERNAL" && (
                            <button
                              type="button"
                              className={styles.iconButton}
                              onClick={() => toggleInternal(tender)}
                              title={tender.internalAktif ? "Nonaktifkan Upload Dokumen" : "Aktifkan Upload Dokumen"}
                            >
                              <Power size={14} />
                            </button>
                          )}
                          <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => mulaiEdit(tender)}
                            title="Edit tender"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            className={styles.iconButtonDanger}
                            onClick={() => hapusTender(tender)}
                            disabled={tender.jenisTender === "VENDOR" && !!tender.kontrak}
                            title={
                              tender.jenisTender === "VENDOR" && tender.kontrak
                                ? "Sudah punya Kontrak, tidak dapat dihapus"
                                : "Hapus tender"
                            }
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </div>

      {aksesTender?.kontrak?.vendor && (
        <AksesSubmenuDialog
          judul={aksesTender.namaTender}
          menuNonaktifAwal={aksesTender.kontrak.vendor.menuNonaktif ?? []}
          onTutup={() => setAksesTender(null)}
          onSimpan={async (menuNonaktif) => {
            try {
              await epromApi.vendor.ubah(aksesTender.kontrak!.vendor!.id, { menuNonaktif });
              setAksesTender(null);
              muatUlang();
            } catch (err) {
              setError(err instanceof Error ? err.message : "Gagal menyimpan akses submenu");
            }
          }}
        />
      )}
    </div>
  );
}
