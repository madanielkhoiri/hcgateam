"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { getStoredUser } from "@/lib/access-control";
import {
  epromApi,
  formatTanggal,
  isEpromOwner,
  LABEL_STATUS_TENDER,
  type TenderProcess,
} from "@/lib/eprom-api";
import styles from "./tender.module.css";

export default function TenderListPage() {
  const [daftar, setDaftar] = useState<TenderProcess[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [namaTender, setNamaTender] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNama, setEditNama] = useState("");
  const [editMulai, setEditMulai] = useState("");
  const [editSelesai, setEditSelesai] = useState("");

  const boleh = isEpromOwner(getStoredUser());

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
        tanggalMulai: tanggalMulai || undefined,
        tanggalSelesai: tanggalSelesai || undefined,
      });
      setNamaTender("");
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

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>Tender</h1>
          <p>Upload Dokumen, Undangan Tender, dan Klasifikasi & Evaluasi (SPH).</p>
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

      {error && <p className={styles.errorText}>{error}</p>}
      {loading && <p className={styles.emptyText}>Memuat...</p>}
      {!loading && daftar.length === 0 && <p className={styles.emptyText}>Belum ada tender.</p>}

      <div className={styles.tableWrap}>
        {daftar.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nama Tender</th>
                <th>Status</th>
                <th>Undangan</th>
                <th>SPH</th>
                <th>Kontrak</th>
                {boleh && <th>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {daftar.map((tender) =>
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
                    <td colSpan={boleh ? 3 : 2}>
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
                    <td>
                      <span className={`${styles.statusPill} ${styles[`status_${tender.status}`]}`}>
                        {LABEL_STATUS_TENDER[tender.status]}
                      </span>
                    </td>
                    <td>{tender._count?.undangan ?? 0} vendor</td>
                    <td>{tender._count?.sph ?? 0} round</td>
                    <td>{tender.kontrak ? "Sudah dibuat" : "-"}</td>
                    {boleh && (
                      <td>
                        <div className={styles.inlineForm}>
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
                            disabled={!!tender.kontrak}
                            title={
                              tender.kontrak
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
    </div>
  );
}
