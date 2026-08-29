"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, FolderOpen, Pencil, Plus, Trash2, X } from "lucide-react";
import { getStoredUser } from "@/lib/access-control";
import {
  epromApi,
  formatTanggal,
  isEpromOwner,
  urlFileEprom,
  type Kontrak,
  type TenderProcess,
} from "@/lib/eprom-api";
import { FolderExplorer } from "@/components/civil-project/folder-explorer";
import { Modal } from "@/components/civil-project/modal";
import styles from "./kontrak.module.css";

export default function KontrakPage() {
  const boleh = isEpromOwner(getStoredUser());

  const [kontrakList, setKontrakList] = useState<Kontrak[]>([]);
  const [tenderSiap, setTenderSiap] = useState<TenderProcess[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [bulan, setBulan] = useState("");
  const [tahun, setTahun] = useState("");

  const [tenderId, setTenderId] = useState("");
  const [nomorKontrak, setNomorKontrak] = useState("");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [fileKontrakBaru, setFileKontrakBaru] = useState<File | null>(null);
  const [showKontrakForm, setShowKontrakForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [projectNames, setProjectNames] = useState<Record<number, string>>({});

  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNomor, setEditNomor] = useState("");
  const [editTanggalMulai, setEditTanggalMulai] = useState("");
  const [editTanggalSelesai, setEditTanggalSelesai] = useState("");
  const [editFile, setEditFile] = useState<File | null>(null);

  const [dokumenModal, setDokumenModal] = useState<Kontrak | null>(null);

  function muatUlang() {
    epromApi.kontrak.daftar().then(setKontrakList).catch(() => setKontrakList([]));
    epromApi.tender
      .daftar()
      .then((list) => setTenderSiap(list.filter((t) => t.status === "SELESAI" && !t.kontrak)))
      .catch(() => setTenderSiap([]));
  }

  useEffect(muatUlang, []);

  const tenderTerpilih = tenderSiap.find((t) => String(t.id) === tenderId);

  const tahunTersedia = useMemo(() => {
    const sekarang = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => sekarang - 5 + index);
  }, []);

  const kontrakTampil = useMemo(() => {
    if (!bulan && !tahun) {
      return kontrakList;
    }

    return kontrakList.filter((kontrak) => {
      const tanggal = new Date(kontrak.tanggalMulai);
      if (bulan && tanggal.getMonth() + 1 !== Number(bulan)) return false;
      if (tahun && tanggal.getFullYear() !== Number(tahun)) return false;
      return true;
    });
  }, [kontrakList, bulan, tahun]);

  function resetFilter() {
    setBulan("");
    setTahun("");
  }

  async function buatKontrak(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await epromApi.kontrak.buat(
        { tenderId: Number(tenderId), nomorKontrak, tanggalMulai, tanggalSelesai },
        fileKontrakBaru,
      );
      setNomorKontrak("");
      setTanggalMulai("");
      setTanggalSelesai("");
      setTenderId("");
      setFileKontrakBaru(null);
      setShowKontrakForm(false);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat kontrak");
    } finally {
      setSubmitting(false);
    }
  }

  function mulaiEdit(kontrak: Kontrak) {
    setEditingId(kontrak.id);
    setEditNomor(kontrak.nomorKontrak);
    setEditTanggalMulai(kontrak.tanggalMulai.slice(0, 10));
    setEditTanggalSelesai(kontrak.tanggalSelesai.slice(0, 10));
    setEditFile(null);
  }

  async function simpanEdit(id: number) {
    try {
      await epromApi.kontrak.ubah(
        id,
        { nomorKontrak: editNomor, tanggalMulai: editTanggalMulai, tanggalSelesai: editTanggalSelesai },
        editFile,
      );
      setEditingId(null);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah kontrak");
    }
  }

  async function hapusKontrak(kontrak: Kontrak) {
    if (!confirm(`Hapus kontrak "${kontrak.nomorKontrak}"?`)) return;
    try {
      await epromApi.kontrak.hapus(kontrak.id);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus kontrak");
    }
  }

  async function bukaProject(kontrakId: number, namaTenderFallback: string) {
    const nama = (projectNames[kontrakId] ?? namaTenderFallback).trim();
    if (!nama) {
      setError("Isi nama project terlebih dahulu");
      return;
    }
    try {
      await epromApi.kontrak.bukaProject(kontrakId, nama);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuka project");
    }
  }

  return (
    <div className={styles.page}>
      {error && <p className={styles.errorText}>{error}</p>}

      <section className={styles.section}>
        <div className={styles.headerRow}>
          <div>
            <h1>Kontrak</h1>
            <p>Pembuatan Kontrak dari Pemenang Tender.</p>
          </div>
          {boleh && tenderSiap.length > 0 && (
            <button type="button" className={styles.primaryButton} onClick={() => setShowKontrakForm((v) => !v)}>
              <Plus size={16} /> Kontrak Baru
            </button>
          )}
        </div>

        <div className={styles.filterRow}>
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

        {showKontrakForm && (
          <form className={styles.formCard} onSubmit={buatKontrak}>
            <label>
              Tender Pemenang
              <select value={tenderId} onChange={(e) => setTenderId(e.target.value)} required>
                <option value="">Pilih tender...</option>
                {tenderSiap.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.namaTender}
                  </option>
                ))}
              </select>
            </label>

            {tenderTerpilih && (
              <div className={styles.pemenangInfo}>
                <span>Vendor Pemenang</span>
                <strong>{tenderTerpilih.pemenang?.vendor.namaVendor ?? "-"}</strong>
              </div>
            )}

            <label>
              Nomor Kontrak
              <input value={nomorKontrak} onChange={(e) => setNomorKontrak(e.target.value)} required />
            </label>
            <label>
              Tanggal Mulai
              <input
                type="date"
                value={tanggalMulai}
                onChange={(e) => setTanggalMulai(e.target.value)}
                required
              />
            </label>
            <label>
              Tanggal Selesai
              <input
                type="date"
                value={tanggalSelesai}
                onChange={(e) => setTanggalSelesai(e.target.value)}
                min={tanggalMulai || undefined}
                required
              />
            </label>
            <label>
              File Kontrak
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp,.dwg,.dxf,.zip,.rar"
                onChange={(e) => setFileKontrakBaru(e.target.files?.[0] ?? null)}
              />
            </label>
            <button type="submit" className={styles.primaryButton} disabled={submitting}>
              {submitting ? "Menyimpan..." : "Simpan"}
            </button>
          </form>
        )}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nomor Kontrak</th>
                <th>Tender</th>
                <th>Vendor</th>
                <th>Tanggal Mulai</th>
                <th>Tanggal Selesai</th>
                <th>Dokumen</th>
                <th>Project</th>
                {boleh && <th>Aksi</th>}
              </tr>
            </thead>
            <tbody>
              {kontrakTampil.map((kontrak) => (
                <tr key={kontrak.id}>
                  {editingId === kontrak.id ? (
                    <>
                      <td>
                        <input value={editNomor} onChange={(e) => setEditNomor(e.target.value)} />
                      </td>
                      <td>{kontrak.tender.namaTender}</td>
                      <td>{kontrak.vendor.namaVendor}</td>
                      <td>
                        <input
                          type="date"
                          value={editTanggalMulai}
                          onChange={(e) => setEditTanggalMulai(e.target.value)}
                        />
                      </td>
                      <td>
                        <input
                          type="date"
                          value={editTanggalSelesai}
                          onChange={(e) => setEditTanggalSelesai(e.target.value)}
                          min={editTanggalMulai || undefined}
                        />
                      </td>
                      <td>
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.jpg,.jpeg,.png,.webp,.dwg,.dxf,.zip,.rar"
                          onChange={(e) => setEditFile(e.target.files?.[0] ?? null)}
                        />
                      </td>
                      <td colSpan={boleh ? 2 : 1}>
                        <div className={styles.inlineForm}>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => simpanEdit(kontrak.id)}
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
                      <td>{kontrak.nomorKontrak}</td>
                      <td>{kontrak.tender.namaTender}</td>
                      <td>{kontrak.vendor.namaVendor}</td>
                      <td>{formatTanggal(kontrak.tanggalMulai)}</td>
                      <td>{formatTanggal(kontrak.tanggalSelesai)}</td>
                      <td>
                        <div className={styles.stackedText}>
                          {kontrak.fileKontrak ? (
                            <a
                              href={urlFileEprom(kontrak.fileKontrak)}
                              target="_blank"
                              rel="noreferrer"
                              className={styles.linkButton}
                            >
                              <FileText size={14} /> File Kontrak
                            </a>
                          ) : (
                            <small>Belum ada file kontrak</small>
                          )}
                          <button
                            type="button"
                            className={styles.linkButton}
                            onClick={() => setDokumenModal(kontrak)}
                          >
                            <FolderOpen size={14} /> Lihat Dokumen Tender
                          </button>
                        </div>
                      </td>
                      <td>
                        {kontrak.project.length > 0 ? (
                          kontrak.project.map((p) => p.namaProject).join(", ")
                        ) : boleh ? (
                          <div className={styles.inlineForm}>
                            <input
                              placeholder="Nama project"
                              value={projectNames[kontrak.id] ?? kontrak.tender.namaTender}
                              onChange={(e) =>
                                setProjectNames((cur) => ({ ...cur, [kontrak.id]: e.target.value }))
                              }
                            />
                            <button
                              type="button"
                              className={styles.secondaryButton}
                              onClick={() => bukaProject(kontrak.id, kontrak.tender.namaTender)}
                            >
                              Buka Project
                            </button>
                          </div>
                        ) : (
                          "-"
                        )}
                      </td>
                      {boleh && (
                        <td>
                          <div className={styles.inlineForm}>
                            <button
                              type="button"
                              className={styles.iconButton}
                              onClick={() => mulaiEdit(kontrak)}
                              title="Edit kontrak"
                            >
                              <Pencil size={14} />
                            </button>
                            <button
                              type="button"
                              className={styles.iconButtonDanger}
                              onClick={() => hapusKontrak(kontrak)}
                              disabled={kontrak.project.length > 0}
                              title={
                                kontrak.project.length > 0
                                  ? "Sudah membuka Project, tidak dapat dihapus"
                                  : "Hapus kontrak"
                              }
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </>
                  )}
                </tr>
              ))}
              {kontrakTampil.length === 0 && (
                <tr>
                  <td colSpan={boleh ? 8 : 7} className={styles.emptyText}>
                    Belum ada kontrak.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {dokumenModal && (
        <Modal title={`Dokumen Tender - ${dokumenModal.tender.namaTender}`} onClose={() => setDokumenModal(null)}>
          <FolderExplorer scope="TENDER_DOKUMEN" tenderId={dokumenModal.tenderId} />
        </Modal>
      )}
    </div>
  );
}
