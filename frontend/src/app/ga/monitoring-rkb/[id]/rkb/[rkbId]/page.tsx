"use client";
import { useParams } from "next/navigation";
import { Edit3, Package, Plus, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  monitoringRkbApi,
  SATUAN_INVENTORY,
  type BarangRkb,
  type KeteranganRkb,
  type MonitoringRkb,
  type StatusRkb,
} from "@/lib/monitoring-rkb-api";
import styles from "../../../monitoring-rkb.module.css";
import { urlUploads } from "@/lib/uploads-url";

type BarangForm = BarangRkb & { fotoFile?: File | null };
const kosong = (): BarangForm => ({ namaBarang: "", qty: 1, satuan: "UNIT", keterangan: "SESUAI", fotoFile: null });
const label: Record<StatusRkb, string> = {
  WAITING_APPROVAL: "Waiting Approval",
  WAITING_SUPPLY: "Waiting Supply",
  CLOSE: "Close",
};
const statusClass: Record<StatusRkb, string> = {
  WAITING_APPROVAL: "waitingApproval",
  WAITING_SUPPLY: "waitingSupply",
  CLOSE: "close",
};

export default function DetailRkb() {
  const p = useParams<{ id: string; rkbId: string }>(),
    rkbId = Number(p.rkbId);
  const [rkb, setRkb] = useState<MonitoringRkb | null>(null),
    [rows, setRows] = useState<BarangForm[]>([kosong()]),
    [modal, setModal] = useState(false),
    [editId, setEditId] = useState<number | null>(null),
    [error, setError] = useState(""),
    [statusDiproses, setStatusDiproses] = useState<number | null>(null);
  const load = useCallback(async () => {
    try {
      setRkb(await monitoringRkbApi.detail(rkbId));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "RKB gagal dimuat");
    }
  }, [rkbId]);
  useEffect(() => {
    void load();
  }, [load]);
  function tambah() {
    setEditId(null);
    setRows([kosong()]);
    setModal(true);
  }
  function edit(b: BarangRkb) {
    setEditId(b.id!);
    setRows([{ ...b, qty: Number(b.qty) }]);
    setModal(true);
  }
  function ubah(i: number, k: keyof BarangForm, v: string | File | null) {
    setRows((x) =>
      x.map((b, n) =>
        n === i ? { ...b, [k]: k === "qty" ? Number(v) : v } : b,
      ),
    );
  }
  async function simpan(e: React.FormEvent) {
    e.preventDefault();
    const payload = rows.map(({ fotoFile: _fotoFile, fotoUrl: _fotoUrl, id: _id, ...item }) => item);
    if (editId) {
      await monitoringRkbApi.ubahBarang(rkbId, editId, payload[0]);
      if (rows[0].fotoFile) await monitoringRkbApi.unggahFotoBarang(rkbId, editId, rows[0].fotoFile);
    } else {
      const hasil = await monitoringRkbApi.tambahBarang(rkbId, payload);
      const itemBaru = hasil.barang.slice(-rows.length);
      await Promise.all(rows.map((item, index) => item.fotoFile && itemBaru[index]?.id
        ? monitoringRkbApi.unggahFotoBarang(rkbId, itemBaru[index].id!, item.fotoFile)
        : Promise.resolve()));
    }
    setModal(false);
    await load();
  }
  async function hapus(b: BarangRkb) {
    if (!b.id || !confirm(`Hapus ${b.namaBarang}?`)) return;
    await monitoringRkbApi.hapusBarang(rkbId, b.id);
    await load();
  }
  async function setStatusBarang(barangId: number, status: StatusRkb) {
    setStatusDiproses(barangId);
    setError("");
    try {
      setRkb(await monitoringRkbApi.ubahStatusBarang(rkbId, barangId, status));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Status barang gagal diubah");
    } finally {
      setStatusDiproses(null);
    }
  }
  return (
    <main className={styles.page}>
      {error && <div className={styles.error}>{error}</div>}
      {rkb && (
        <>
          <header className={styles.detailHeader}>
            <div>
              <span className={styles.eyebrow}>{rkb.project?.namaProject}</span>
              <h1>{rkb.nomorRkb}</h1>
              <p>
                {new Date(rkb.tanggal).toLocaleDateString("id-ID", {
                  day: "2-digit",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            </div>
            <button className={styles.primary} onClick={tambah}>
              <Plus size={16} /> Tambah Barang
            </button>
          </header>
          <section className={styles.summary}>
            <article>
              <span>Total Barang</span>
              <strong>{rkb.barang.length}</strong>
            </article>
            <article>
              <span>Project</span>
              <strong className={styles.summaryText}>
                {rkb.project?.namaProject}
              </strong>
            </article>
          </section>
          <section className={styles.tableWrap}>
            <div className={styles.sectionHead}>
              <Package size={20} />
              <div>
                <h2>Daftar Barang</h2>
                <p>Barang untuk nomor {rkb.nomorRkb}</p>
              </div>
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Barang</th>
                  <th>QTY</th>
                  <th>Satuan</th>
                  <th>Keterangan</th>
                  <th>Foto</th>
                  <th>Status</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {rkb.barang.map((b, i) => (
                  <tr key={b.id}>
                    <td>{i + 1}</td>
                    <td>
                      <strong>{b.namaBarang}</strong>
                    </td>
                    <td>{Number(b.qty).toLocaleString("id-ID")}</td>
                    <td>{b.satuan}</td>
                    <td><span className={`${styles.conformityPill} ${b.keterangan === "TIDAK_SESUAI" ? styles.notConform : styles.conform}`}>{b.keterangan === "TIDAK_SESUAI" ? "Tidak Sesuai" : "Sesuai"}</span></td>
                    <td>{b.fotoUrl ? <a href={urlUploads(b.fotoUrl)} target="_blank" rel="noreferrer"><img className={styles.itemPhoto} src={urlUploads(b.fotoUrl)} alt={`Foto ${b.namaBarang}`}/></a> : <span className={styles.noPhoto}>Belum ada</span>}</td>
                    <td>
                      <select
                        className={`${styles.statusSelect} ${styles[statusClass[b.status ?? "WAITING_APPROVAL"]]}`}
                        value={b.status ?? "WAITING_APPROVAL"}
                        disabled={statusDiproses === b.id}
                        onChange={(e) => void setStatusBarang(b.id!, e.target.value as StatusRkb)}
                      >
                        {Object.entries(label).map(([value, text]) => <option key={value} value={value}>{text}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <button
                          className={styles.iconButton}
                          onClick={() => edit(b)}
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          className={styles.danger}
                          onClick={() => void hapus(b)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rkb.barang.length === 0 && (
              <div className={styles.empty}>Belum ada barang.</div>
            )}
          </section>
        </>
      )}
      {modal && (
        <div className={styles.overlay}>
          <section className={styles.modal}>
            <header className={styles.modalHeader}>
              <h2>{editId ? "Edit Barang" : "Tambah Barang"}</h2>
              <button
                className={styles.closeButton}
                onClick={() => setModal(false)}
              >
                <X size={18} />
              </button>
            </header>
            <form className={styles.form} onSubmit={simpan}>
              <div className={styles.itemsHeader}>
                <h3>Barang ({rows.length})</h3>
                {!editId && (
                  <button
                    type="button"
                    className={styles.secondary}
                    onClick={() => setRows((v) => [...v, kosong()])}
                  >
                    <Plus size={14} /> Tambah Baris
                  </button>
                )}
              </div>
              {rows.map((b, i) => (
                <div className={styles.itemEditGrid} key={i}>
                  <input
                    required
                    placeholder="Nama barang"
                    value={b.namaBarang}
                    onChange={(e) => ubah(i, "namaBarang", e.target.value)}
                  />
                  <input
                    required
                    type="number"
                    min="0.01"
                    step="any"
                    value={b.qty}
                    onChange={(e) => ubah(i, "qty", e.target.value)}
                  />
                  <select required value={b.satuan} onChange={(e) => ubah(i, "satuan", e.target.value)}>{SATUAN_INVENTORY.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select>
                  <select value={b.keterangan ?? "SESUAI"} onChange={(e) => ubah(i, "keterangan", e.target.value as KeteranganRkb)}><option value="SESUAI">Sesuai</option><option value="TIDAK_SESUAI">Tidak Sesuai</option></select>
                  <label className={styles.photoInput}><span>{b.fotoUrl ? "Ganti foto" : "Foto barang"}</span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => ubah(i, "fotoFile", e.target.files?.[0] ?? null)}/></label>
                  {!editId && (
                    <button
                      type="button"
                      className={styles.remove}
                      disabled={rows.length === 1}
                      onClick={() =>
                        setRows((v) => v.filter((_, n) => n !== i))
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              ))}
              <footer className={styles.footer}>
                <button
                  type="button"
                  className={styles.secondary}
                  onClick={() => setModal(false)}
                >
                  Batal
                </button>
                <button className={styles.primary}>Simpan Barang</button>
              </footer>
            </form>
          </section>
        </div>
      )}
    </main>
  );
}
