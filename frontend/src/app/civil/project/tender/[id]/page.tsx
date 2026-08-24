"use client";

import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { ArrowLeft, Pencil, Plus, Printer, Trash2, Trophy } from "lucide-react";
import { Fragment, useEffect, useState } from "react";
import { getStoredUser } from "@/lib/access-control";
import {
  epromApi,
  formatRupiah,
  formatTanggal,
  isEpromOwner,
  isEpromVendor,
  KATEGORI_EVALUASI_TEKNIS,
  KATEGORI_EVALUASI_VENDOR,
  KODE_EVALUASI_VENDOR,
  LABEL_ITEM_TEKNIS,
  LABEL_KATEGORI_EVALUASI_VENDOR,
  LABEL_ROUND_TEKNIS,
  LABEL_STATUS_TENDER,
  type EvaluasiVendorItem,
  type KategoriEvaluasiTeknis,
  type KategoriEvaluasiVendor,
  type TenderDetail,
  type Vendor,
} from "@/lib/eprom-api";
import { FolderExplorer } from "@/components/civil-project/folder-explorer";
import { Modal } from "@/components/civil-project/modal";
import styles from "../tender.module.css";

type Tab = "dokumen" | "undangan" | "sph";

type KategoriGabungan = KategoriEvaluasiVendor | KategoriEvaluasiTeknis;

const KATEGORI_SEMUA: KategoriGabungan[] = [...KATEGORI_EVALUASI_VENDOR, ...KATEGORI_EVALUASI_TEKNIS];

function statusEvaluasi(nilaiAvg: number | null): { label: string; kelas: string } {
  if (nilaiAvg === null) return { label: "Belum Dinilai", kelas: "statusKosong" };
  if (nilaiAvg >= 75) return { label: "Baik", kelas: "statusBaik" };
  if (nilaiAvg >= 50) return { label: "Cukup", kelas: "statusCukup" };
  return { label: "Kurang", kelas: "statusKurang" };
}

function statusTeknis(roundTeknis: number | null): { label: string; kelas: string } {
  if (roundTeknis === null) return { label: "Belum Dinilai", kelas: "statusKosong" };
  if (roundTeknis >= 3) return { label: LABEL_ROUND_TEKNIS[3], kelas: "statusBaik" };
  if (roundTeknis === 2) return { label: LABEL_ROUND_TEKNIS[2], kelas: "statusCukup" };
  return { label: LABEL_ROUND_TEKNIS[1], kelas: "statusKurang" };
}

export default function TenderDetailPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const tenderId = Number(params.id);
  const user = getStoredUser();
  const boleh = isEpromOwner(user);
  const vendorSaya = isEpromVendor(user);

  const tabFromUrl = searchParams.get("tab") as Tab | null;
  const tab: Tab = tabFromUrl ?? (boleh ? "undangan" : "sph");
  const [detail, setDetail] = useState<TenderDetail | null>(null);
  const [vendorList, setVendorList] = useState<Vendor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedVendorIds, setSelectedVendorIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [sphFormOpen, setSphFormOpen] = useState<Record<number, boolean>>({});
  const [sphFile, setSphFile] = useState<Record<number, File | null>>({});
  const [sphHarga, setSphHarga] = useState<Record<number, string>>({});
  const [editingRoundId, setEditingRoundId] = useState<number | null>(null);
  const [editRoundFile, setEditRoundFile] = useState<File | null>(null);
  const [editRoundHarga, setEditRoundHarga] = useState("");
  const [evaluasiVendorList, setEvaluasiVendorList] = useState<EvaluasiVendorItem[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [formVendorId, setFormVendorId] = useState<number | null>(null);
  const [formKode, setFormKode] = useState<Partial<Record<KategoriGabungan, string>>>({});

  function muatUlang() {
    epromApi.tender
      .detail(tenderId)
      .then(setDetail)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat tender"));
  }

  function muatEvaluasiVendor() {
    epromApi.tender.evaluasiVendor
      .daftar(tenderId)
      .then(setEvaluasiVendorList)
      .catch(() => setEvaluasiVendorList([]));
  }

  useEffect(() => {
    muatUlang();
    if (boleh) {
      epromApi.vendor.daftar(true).then(setVendorList).catch(() => setVendorList([]));
      muatEvaluasiVendor();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenderId]);

  function kodeKeString(item?: EvaluasiVendorItem): Partial<Record<KategoriGabungan, string>> {
    const hasil: Partial<Record<KategoriGabungan, string>> = {};
    for (const kategori of KATEGORI_SEMUA) {
      const nilai = item?.evaluasi?.[kategori];
      if (nilai !== null && nilai !== undefined) hasil[kategori] = String(nilai);
    }
    return hasil;
  }

  function bukaFormTambah() {
    setFormVendorId(null);
    setFormKode({});
    setFormOpen(true);
  }

  function bukaFormEdit(item: EvaluasiVendorItem) {
    setFormVendorId(item.vendorId);
    setFormKode(kodeKeString(item));
    setFormOpen(true);
  }

  function pilihVendorForm(vendorId: string) {
    const id = vendorId ? Number(vendorId) : null;
    setFormVendorId(id);
    setFormKode(kodeKeString(evaluasiVendorList.find((v) => v.vendorId === id)));
  }

  async function simpanForm() {
    if (!formVendorId) {
      setError("Pilih vendor terlebih dahulu");
      return;
    }

    const data: Partial<Record<KategoriGabungan, number | null>> = {};
    for (const kategori of KATEGORI_SEMUA) {
      const nilai = formKode[kategori];
      data[kategori] = nilai ? Number(nilai) : null;
    }

    setSubmitting(true);
    setError(null);
    try {
      await epromApi.tender.evaluasiVendor.ubah(tenderId, formVendorId, data);
      setFormOpen(false);
      muatEvaluasiVendor();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan evaluasi vendor");
    } finally {
      setSubmitting(false);
    }
  }

  async function tetapkanPemenang(vendorId: number, namaVendor: string) {
    if (!confirm(`Tetapkan "${namaVendor}" sebagai pemenang tender ini?`)) return;
    setSubmitting(true);
    setError(null);
    try {
      await epromApi.tender.tetapkanPemenang(tenderId, vendorId);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menetapkan pemenang");
    } finally {
      setSubmitting(false);
    }
  }

  async function kirimUndangan() {
    if (selectedVendorIds.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await epromApi.tender.kirimUndangan(tenderId, selectedVendorIds);
      setSelectedVendorIds([]);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim undangan");
    } finally {
      setSubmitting(false);
    }
  }

  async function tambahSph(vendorId: number) {
    const file = sphFile[vendorId] ?? undefined;
    const hargaRaw = sphHarga[vendorId]?.trim();
    const harga = hargaRaw ? Number(hargaRaw) : undefined;

    if (harga !== undefined && (!Number.isFinite(harga) || harga <= 0)) {
      setError("Harga penawaran tidak valid");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await epromApi.tender.buatRoundSph(tenderId, vendorId, file, harga);
      setSphFormOpen((cur) => ({ ...cur, [vendorId]: false }));
      setSphFile((cur) => ({ ...cur, [vendorId]: null }));
      setSphHarga((cur) => ({ ...cur, [vendorId]: "" }));
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menambah SPH");
    } finally {
      setSubmitting(false);
    }
  }

  function mulaiEditRound(roundId: number) {
    setEditingRoundId(roundId);
    setEditRoundFile(null);
    setEditRoundHarga("");
  }

  async function simpanEditRound(vendorId: number, roundId: number) {
    const hargaRaw = editRoundHarga.trim();
    const harga = hargaRaw ? Number(hargaRaw) : undefined;

    if (harga !== undefined && (!Number.isFinite(harga) || harga <= 0)) {
      setError("Harga penawaran tidak valid");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await epromApi.tender.ubahRoundSph(tenderId, vendorId, roundId, editRoundFile, harga);
      setEditingRoundId(null);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah SPH");
    } finally {
      setSubmitting(false);
    }
  }

  async function finalisasiTender() {
    if (
      !confirm(
        "Finalisasi SPH semua vendor sekarang? Setelah final, harga tidak bisa diubah lagi. Pemenang ditetapkan manual oleh Owner di langkah berikutnya.",
      )
    ) {
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await epromApi.tender.finalisasiTender(tenderId);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal finalisasi tender");
    } finally {
      setSubmitting(false);
    }
  }

  async function hapusRound(vendorId: number, roundId: number, roundKe: number) {
    if (!confirm(`Hapus SPH ${roundKe}?`)) return;
    setError(null);
    try {
      await epromApi.tender.hapusRoundSph(tenderId, vendorId, roundId);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus SPH");
    }
  }

  async function batalkanUndangan(vendorId: number, namaVendor: string) {
    if (!confirm(`Batalkan undangan untuk "${namaVendor}"?`)) return;
    setError(null);
    try {
      await epromApi.tender.hapusUndangan(tenderId, vendorId);
      muatUlang();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membatalkan undangan");
    }
  }

  if (!detail) {
    return (
      <div className={styles.page}>
        <Link href="/civil/project/tender" className={styles.backLink}>
          <ArrowLeft size={16} /> Kembali
        </Link>
        {error ? <p className={styles.errorText}>{error}</p> : <p className={styles.emptyText}>Memuat...</p>}
      </div>
    );
  }

  const undanganVendorIds = new Set(detail.undangan.map((u) => u.vendorId));
  const vendorBelumDiundang = vendorList.filter((v) => !undanganVendorIds.has(v.id));

  const sphPerVendor = new Map<number, typeof detail.sph>();
  for (const round of detail.sph) {
    const list = sphPerVendor.get(round.vendorId) ?? [];
    list.push(round);
    sphPerVendor.set(round.vendorId, list);
  }

  const vendorUntukSph = vendorSaya
    ? detail.undangan.filter((u) => u.vendorId === user?.vendorId)
    : detail.undangan;

  const vendorBelumSiapFinal = detail.undangan.filter((u) => {
    const rounds = sphPerVendor.get(u.vendorId) ?? [];
    const terakhir = rounds.at(-1);
    return !terakhir || !terakhir.hargaPenawaran;
  });

  const semuaVendorSudahFinal = detail.undangan.every((u) =>
    (sphPerVendor.get(u.vendorId) ?? []).some((r) => r.isFinal),
  );

  return (
    <div className={styles.page}>
      <Link href="/civil/project/tender" className={styles.backLink}>
        <ArrowLeft size={16} /> Kembali ke daftar Tender
      </Link>

      <div className={styles.detailHeader}>
        <div>
          <h1>{detail.namaTender}</h1>
          <span className={`${styles.statusPill} ${styles[`status_${detail.status}`]}`}>
            {LABEL_STATUS_TENDER[detail.status]}
          </span>
        </div>
      </div>

      <p className={styles.tabHint}>
        {tab === "dokumen" && "Upload Dokumen"}
        {tab === "undangan" && "Undangan Tender"}
        {tab === "sph" && "Klasifikasi & Evaluasi"}
        <span> — pilih tahapan lain lewat menu Tender di sidebar.</span>
      </p>

      {error && <p className={styles.errorText}>{error}</p>}

      {tab === "dokumen" && boleh && (
        <div className={styles.panel}>
          <FolderExplorer scope="TENDER_DOKUMEN" tenderId={tenderId} />
        </div>
      )}

      {tab === "undangan" && boleh && (
        <div className={styles.panel}>
          <h2 className={styles.sectionTitle}>Pilih Vendor yang Diundang</h2>

          {vendorBelumDiundang.length === 0 ? (
            <p className={styles.emptyText}>
              Semua vendor aktif sudah diundang pada tender ini.
            </p>
          ) : (
            <div className={styles.vendorPickerGrid}>
              {vendorBelumDiundang.map((v) => {
                const dipilih = selectedVendorIds.includes(v.id);

                return (
                  <label
                    key={v.id}
                    className={`${styles.vendorPickerCard} ${dipilih ? styles.vendorPickerCardActive : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={dipilih}
                      onChange={(e) =>
                        setSelectedVendorIds((cur) =>
                          e.target.checked ? [...cur, v.id] : cur.filter((id) => id !== v.id),
                        )
                      }
                    />
                    <div>
                      <strong>{v.namaVendor}</strong>
                      <small>{v.email ?? v.noTelepon ?? "Tanpa kontak"}</small>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          <button
            type="button"
            className={styles.primaryButton}
            onClick={kirimUndangan}
            disabled={submitting || selectedVendorIds.length === 0}
          >
            Kirim Undangan{selectedVendorIds.length > 0 ? ` (${selectedVendorIds.length})` : ""}
          </button>

          <h2 className={styles.sectionTitle} style={{ marginTop: 24 }}>
            Vendor Sudah Diundang
          </h2>
          <div className={styles.roundList}>
            {detail.undangan.length === 0 && <p className={styles.emptyText}>Belum ada vendor diundang.</p>}
            {detail.undangan.map((u) => {
              const sudahAdaSph = (sphPerVendor.get(u.vendorId) ?? []).length > 0;

              return (
                <div key={u.id} className={styles.roundRow}>
                  <strong>{u.vendor.namaVendor}</strong>
                  <span>Dikirim {formatTanggal(u.tanggalKirim)}</span>
                  <button
                    type="button"
                    className={styles.iconButtonDanger}
                    onClick={() => batalkanUndangan(u.vendorId, u.vendor.namaVendor)}
                    disabled={sudahAdaSph}
                    title={sudahAdaSph ? "Vendor sudah unggah SPH, tidak bisa dibatalkan" : "Batalkan undangan"}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {tab === "sph" && (
        <div className={styles.panel}>
          <p className={styles.emptyText} style={{ marginBottom: 14 }}>
            Harga penawaran opsional di setiap SPH dan bisa diganti-ganti (tambah SPH baru untuk
            negosiasi ulang). Kalau harga semua vendor sudah oke, klik tombol Final di bawah untuk
            mengunci harga. Pemenang TIDAK otomatis — Owner memilih sendiri di sini, sambil
            mempertimbangkan hasil tab Evaluasi Vendor.
          </p>
          {vendorUntukSph.length === 0 && <p className={styles.emptyText}>Belum ada vendor pada tender ini.</p>}

          {vendorUntukSph.map((undangan) => {
            const rounds = sphPerVendor.get(undangan.vendorId) ?? [];
            const bisaUnggahSaya = vendorSaya && undangan.vendorId === user?.vendorId;
            const roundFinal = rounds.find((r) => r.isFinal && r.hargaPenawaran);
            const sudahMenang = rounds.some((r) => r.statusPemenang);

            return (
              <div className={styles.vendorBlock} key={undangan.vendorId}>
                <div className={styles.vendorBlockHeader}>
                  <strong>{undangan.vendor.namaVendor}</strong>
                  {sudahMenang && (
                    <span className={styles.winnerBadge}>
                      <Trophy size={12} /> Pemenang Tender
                    </span>
                  )}
                  {boleh && roundFinal && !sudahMenang && (
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => tetapkanPemenang(undangan.vendorId, undangan.vendor.namaVendor)}
                      disabled={submitting}
                    >
                      <Trophy size={12} /> Tetapkan sebagai Pemenang
                    </button>
                  )}
                </div>

                <div className={styles.roundList}>
                  {rounds.map((round) => {
                    const bisaUbahRound = boleh || bisaUnggahSaya;

                    if (!round.isFinal && bisaUbahRound && editingRoundId === round.id) {
                      return (
                        <div className={styles.inlineForm} key={round.id}>
                          <strong>SPH {round.roundKe}</strong>
                          <input
                            type="file"
                            onChange={(e) => setEditRoundFile(e.target.files?.[0] ?? null)}
                          />
                          <input
                            type="number"
                            placeholder="Harga penawaran (opsional)"
                            value={editRoundHarga}
                            onChange={(e) => setEditRoundHarga(e.target.value)}
                          />
                          <button
                            type="button"
                            className={styles.primaryButton}
                            onClick={() => simpanEditRound(round.vendorId, round.id)}
                            disabled={submitting}
                          >
                            Simpan
                          </button>
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => setEditingRoundId(null)}
                            disabled={submitting}
                          >
                            Batal
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div className={styles.roundRow} key={round.id}>
                        <strong>SPH {round.roundKe}</strong>
                        <span>{round.hargaPenawaran ? formatRupiah(round.hargaPenawaran) : "Belum ada harga"}</span>
                        {round.isFinal && <span className={styles.roundFinalBadge}>FINAL</span>}

                        {!round.isFinal && bisaUbahRound && (
                          <button
                            type="button"
                            className={styles.iconButton}
                            onClick={() => mulaiEditRound(round.id)}
                            title="Edit SPH"
                          >
                            <Pencil size={13} />
                          </button>
                        )}

                        {!round.isFinal && boleh && (
                          <button
                            type="button"
                            className={styles.iconButtonDanger}
                            onClick={() => hapusRound(round.vendorId, round.id, round.roundKe)}
                            title="Hapus SPH"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {(boleh || bisaUnggahSaya) &&
                    !rounds.some((r) => r.isFinal) &&
                    (sphFormOpen[undangan.vendorId] ? (
                      <div className={styles.inlineForm}>
                        <input
                          type="file"
                          onChange={(e) =>
                            setSphFile((cur) => ({
                              ...cur,
                              [undangan.vendorId]: e.target.files?.[0] ?? null,
                            }))
                          }
                        />
                        <input
                          type="number"
                          placeholder="Harga penawaran (opsional)"
                          value={sphHarga[undangan.vendorId] ?? ""}
                          onChange={(e) =>
                            setSphHarga((cur) => ({ ...cur, [undangan.vendorId]: e.target.value }))
                          }
                        />
                        <button
                          type="button"
                          className={styles.primaryButton}
                          onClick={() => tambahSph(undangan.vendorId)}
                          disabled={submitting}
                        >
                          Simpan SPH {(rounds.at(-1)?.roundKe ?? 0) + 1}
                        </button>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() =>
                            setSphFormOpen((cur) => ({ ...cur, [undangan.vendorId]: false }))
                          }
                          disabled={submitting}
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() =>
                          setSphFormOpen((cur) => ({ ...cur, [undangan.vendorId]: true }))
                        }
                      >
                        Tambah SPH Baru
                      </button>
                    ))}
                </div>
              </div>
            );
          })}

          {boleh && detail.undangan.length > 0 && (
            <>
              <div className={styles.headerRow} style={{ marginTop: 28 }}>
                <div>
                  <h2 className={styles.sectionTitle} style={{ margin: 0 }}>
                    Evaluasi Vendor (Eksternal)
                  </h2>
                  <p className={styles.emptyText}>
                    Penilaian eksternal per vendor — jadi pertimbangan tambahan (bersama harga SPH
                    di atas) saat Owner menetapkan pemenang.
                  </p>
                </div>
                <div className={styles.inlineForm}>
                  {evaluasiVendorList.length > 0 && (
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => window.print()}
                    >
                      <Printer size={13} /> Cetak / Export PDF
                    </button>
                  )}
                  <button type="button" className={styles.primaryButton} onClick={bukaFormTambah}>
                    <Plus size={14} /> Tambah Penilaian
                  </button>
                </div>
              </div>

              {evaluasiVendorList.length === 0 ? (
                <p className={styles.emptyText}>Belum ada penilaian vendor.</p>
              ) : (
                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>No</th>
                        <th>Nama Vendor</th>
                        <th>Nilai Eksternal</th>
                        <th>Status Eksternal</th>
                        <th>Nilai Teknis</th>
                        <th>Status Teknis</th>
                        <th>Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {evaluasiVendorList.map((item, index) => {
                        const status = statusEvaluasi(item.nilaiAvg);
                        const statusT = statusTeknis(item.roundTeknis);

                        return (
                          <tr key={item.vendorId}>
                            <td>{index + 1}</td>
                            <td>{item.namaVendor}</td>
                            <td>
                              <strong>{item.nilaiAvg !== null ? `${item.nilaiAvg}%` : "-"}</strong>
                            </td>
                            <td>
                              <span className={`${styles.statusPill} ${styles[status.kelas]}`}>
                                {status.label}
                              </span>
                            </td>
                            <td>
                              <strong>{item.nilaiTeknis !== null ? item.nilaiTeknis : "-"}</strong>
                            </td>
                            <td>
                              <span className={`${styles.statusPill} ${styles[statusT.kelas]}`}>
                                {statusT.label}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                className={styles.iconButton}
                                onClick={() => bukaFormEdit(item)}
                                title="Edit Penilaian"
                              >
                                <Pencil size={13} />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {boleh && detail.undangan.length > 0 && (
            <div className={styles.finalisasiBar}>
              {vendorBelumSiapFinal.length > 0 ? (
                <p className={styles.emptyText}>
                  Menunggu harga penawaran dari: {vendorBelumSiapFinal.map((v) => v.vendor.namaVendor).join(", ")}
                </p>
              ) : semuaVendorSudahFinal ? (
                <p className={styles.emptyText}>
                  Semua vendor sudah final. Pilih pemenang lewat tombol "Tetapkan sebagai Pemenang"
                  di masing-masing vendor di atas.
                </p>
              ) : (
                <p className={styles.emptyText}>Semua vendor sudah isi harga, siap difinalisasi.</p>
              )}

              <button
                type="button"
                className={styles.primaryButton}
                onClick={finalisasiTender}
                disabled={submitting || vendorBelumSiapFinal.length > 0 || semuaVendorSudahFinal}
              >
                Final SPH
              </button>
            </div>
          )}
        </div>
      )}

      {formOpen && (
        <Modal
          title={formVendorId ? "Edit Penilaian Vendor" : "Tambah Penilaian Vendor"}
          onClose={() => setFormOpen(false)}
        >
          <label className={styles.detailPenilaianRow}>
            Nama Vendor
            <select
              className={styles.evaluasiSelect}
              style={{ width: "100%" }}
              value={formVendorId ?? ""}
              onChange={(e) => pilihVendorForm(e.target.value)}
            >
              <option value="">Pilih vendor...</option>
              {detail.undangan.map((u) => (
                <option key={u.vendorId} value={u.vendorId}>
                  {u.vendor.namaVendor}
                </option>
              ))}
            </select>
          </label>

          <h3 className={styles.sectionTitle} style={{ fontSize: 12.5, marginTop: 18, marginBottom: 10 }}>
            Evaluasi Eksternal
          </h3>
          <div className={styles.detailPenilaianGrid}>
            {KATEGORI_EVALUASI_VENDOR.map((kategori) => {
              const kodeTerpilih = formKode[kategori] ?? "";

              return (
                <label key={kategori} className={styles.detailPenilaianRow}>
                  {LABEL_KATEGORI_EVALUASI_VENDOR[kategori]}
                  <select
                    className={`${styles.evaluasiSelect} ${
                      kodeTerpilih ? styles[`evaluasiSelectKode${kodeTerpilih}`] : ""
                    }`}
                    value={kodeTerpilih}
                    onChange={(e) =>
                      setFormKode((cur) => ({ ...cur, [kategori]: e.target.value }))
                    }
                    disabled={!formVendorId}
                  >
                    <option value="">Belum dinilai</option>
                    {Object.entries(KODE_EVALUASI_VENDOR).map(([kode, info]) => (
                      <option key={kode} value={kode}>
                        {kode} - {info.keterangan}
                      </option>
                    ))}
                  </select>
                </label>
              );
            })}
          </div>

          <h3 className={styles.sectionTitle} style={{ fontSize: 12.5, marginTop: 20, marginBottom: 10 }}>
            Evaluasi Teknis
          </h3>
          <p className={styles.emptyText} style={{ marginBottom: 10 }}>
            Teknikal (25%): Metode Pelaksanaan, Alat Kerja, Spesifikasi Teknik, Pengalaman,
            Komunikatif · Schedule (20%) · Harga Penawaran (20%): Ketepatan Waktu, Negosiasi · SHE
            (20%) · Legalitas Perusahaan (15%). Skor bebas (boleh desimal).
          </p>
          <div className={styles.detailPenilaianGrid}>
            {KATEGORI_EVALUASI_TEKNIS.map((kategori) => (
              <label key={kategori} className={styles.detailPenilaianRow}>
                {LABEL_ITEM_TEKNIS[kategori]}
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  className={styles.evaluasiSelect}
                  style={{ width: "100%" }}
                  value={formKode[kategori] ?? ""}
                  onChange={(e) =>
                    setFormKode((cur) => ({ ...cur, [kategori]: e.target.value }))
                  }
                  disabled={!formVendorId}
                  placeholder="mis. 2.5"
                />
              </label>
            ))}
          </div>

          <button
            type="button"
            className={styles.primaryButton}
            style={{ marginTop: 16 }}
            onClick={simpanForm}
            disabled={submitting || !formVendorId}
          >
            Simpan Penilaian
          </button>
        </Modal>
      )}

      {evaluasiVendorList.length > 0 && (
        <div className={styles.cetakArea}>
          <h1 className={styles.cetakJudul}>
            REKAP PENILAIAN EVALUASI MATERI TENDER PROYEK {detail.namaTender.toUpperCase()}
          </h1>

          <table className={styles.cetakTable}>
            <thead>
              <tr>
                <th rowSpan={2}>No</th>
                <th rowSpan={2}>Nama Vendor</th>
                <th colSpan={KATEGORI_EVALUASI_VENDOR.length * 2}>Eksternal</th>
                <th rowSpan={2}>Nilai (%) Avg</th>
              </tr>
              <tr>
                {KATEGORI_EVALUASI_VENDOR.map((kategori) => (
                  <Fragment key={kategori}>
                    <th>{LABEL_KATEGORI_EVALUASI_VENDOR[kategori]}</th>
                    <th>%</th>
                  </Fragment>
                ))}
              </tr>
            </thead>
            <tbody>
              {evaluasiVendorList.map((item, index) => (
                <tr key={item.vendorId}>
                  <td>{index + 1}</td>
                  <td className={styles.cetakNamaVendor}>{item.namaVendor}</td>
                  {KATEGORI_EVALUASI_VENDOR.map((kategori) => {
                    const kode = item.evaluasi?.[kategori];
                    const persen = kode ? KODE_EVALUASI_VENDOR[kode].bobot : null;

                    return (
                      <Fragment key={kategori}>
                        <td>{kode ?? "-"}</td>
                        <td>{persen !== null ? `${persen}%` : "-"}</td>
                      </Fragment>
                    );
                  })}
                  <td className={styles.cetakNilaiAvg}>
                    {item.nilaiAvg !== null ? `${item.nilaiAvg}%` : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <table className={styles.cetakTable} style={{ marginTop: 18, maxWidth: 420 }}>
            <thead>
              <tr>
                <th>Kode</th>
                <th>Keterangan</th>
                <th>Bobot</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(KODE_EVALUASI_VENDOR).map(([kode, info]) => (
                <tr key={kode}>
                  <td>{kode}</td>
                  <td>{info.keterangan}</td>
                  <td>{info.bobot}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
