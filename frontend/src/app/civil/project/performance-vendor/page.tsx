"use client";

import { useEffect, useMemo, useState } from "react";
import {
  epromApi,
  formatTanggal,
  formatWaktuWITA,
  type KewajibanUploadVendor,
  type PerformanceVendorItem,
  type StatusKewajibanUpload,
} from "@/lib/eprom-api";
import styles from "./performance-vendor.module.css";

function bulanSekarang(): string {
  const wita = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return `${wita.getUTCFullYear()}-${String(wita.getUTCMonth() + 1).padStart(2, "0")}`;
}

const TAMPILAN_STATUS: Record<
  StatusKewajibanUpload,
  { label: string; className: string }
> = {
  HIJAU: { label: "Tepat waktu", className: styles.green },
  MERAH: { label: "Tidak upload", className: styles.red },
  ABU_ABU: { label: "Menunggu", className: styles.gray },
  ORANYE: { label: "Terlambat", className: styles.orange },
};

function StatusUpload({ item }: { item: KewajibanUploadVendor }) {
  const status = TAMPILAN_STATUS[item.status];
  return (
    <span className={`${styles.status} ${status.className}`}>
      <i className={styles.dot} />
      {status.label}
    </span>
  );
}

export default function PerformanceVendorPage() {
  const [bulan, setBulan] = useState(bulanSekarang);
  const [items, setItems] = useState<PerformanceVendorItem[]>([]);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [detail, setDetail] = useState<PerformanceVendorItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusKewajibanUpload | "">("");

  useEffect(() => {
    let active = true;
    epromApi.performanceVendor
      .daftar(bulan)
      .then((response) => {
        if (!active) return;
        setItems(response.items);
        const berikutnya = response.items[0]?.project.id ?? null;
        setProjectId(berikutnya);
        setLoadingDetail(berikutnya !== null);
        if (berikutnya === null) setDetail(null);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Gagal memuat performance vendor");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [bulan]);

  useEffect(() => {
    if (!projectId) return;
    let active = true;
    epromApi.performanceVendor
      .detail(projectId, bulan)
      .then((response) => active && setDetail(response))
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Gagal memuat rincian performance");
      })
      .finally(() => active && setLoadingDetail(false));
    return () => {
      active = false;
    };
  }, [projectId, bulan]);

  const pilihan = useMemo(
    () => items.map((item) => ({
      id: item.project.id,
      label: `${item.project.tender.namaTender} — ${item.project.vendor.namaVendor}`,
    })),
    [items],
  );

  const kewajibanTampil = useMemo(() => {
    const daftar = detail?.upload.kewajiban ?? [];
    return statusFilter ? daftar.filter((item) => item.status === statusFilter) : daftar;
  }, [detail, statusFilter]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Performance Vendor</h1>
          <p>Penilaian objektif per tender berdasarkan bukti aktivitas pada sistem.</p>
        </div>
      </div>

      <div className={styles.selectorCard}>
        <label className={styles.field}>
          Periode penilaian
          <input
            type="month"
            className={styles.monthInput}
            value={bulan}
            onChange={(event) => {
              setLoading(true);
              setLoadingDetail(false);
              setDetail(null);
              setError(null);
              setBulan(event.target.value);
            }}
          />
        </label>
        <label className={styles.field}>
          Tender / vendor
          <select
            className={styles.select}
            value={projectId ?? ""}
            onChange={(event) => {
              setLoadingDetail(true);
              setError(null);
              setProjectId(Number(event.target.value));
            }}
            disabled={loading || pilihan.length === 0}
          >
            {pilihan.length === 0 && <option value="">Tidak ada kontrak aktif</option>}
            {pilihan.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
          </select>
        </label>
      </div>

      {error && <div className={styles.error}>{error}</div>}
      {(loading || loadingDetail) && <p className={styles.muted}>Menghitung performance vendor...</p>}

      {!loading && !loadingDetail && detail && (
        <>
          <section className={styles.summary}>
            <div className={styles.scoreArea}>
              <span className={styles.grade}>{detail.grade}</span>
              <strong>{detail.nilaiAkhir}</strong>
              <span>Nilai akhir / 100</span>
            </div>
            <div className={styles.summaryInfo}>
              <div><span>Tender</span><strong>{detail.project.tender.namaTender}</strong></div>
              <div><span>Vendor</span><strong>{detail.project.vendor.namaVendor}</strong></div>
              <div><span>Project</span><strong>{detail.project.namaProject}</strong></div>
              <div><span>Kontrak</span><strong>{detail.project.kontrak.nomorKontrak}</strong></div>
              <div>
                <span>Periode kontrak</span>
                <strong>{formatTanggal(detail.project.kontrak.tanggalMulai)} – {formatTanggal(detail.project.kontrak.tanggalSelesai)}</strong>
              </div>
              <div><span>Periode nilai</span><strong>{detail.bulan}</strong></div>
            </div>
          </section>

          <section className={styles.components}>
            {detail.komponen.map((item) => (
              <article className={styles.componentCard} key={item.key}>
                <div className={styles.componentTop}>
                  <span>{item.label}</span>
                  <small>Bobot {item.bobot}%</small>
                </div>
                <strong>{item.nilai === null ? "N/A" : item.nilai}</strong>
                <p>{item.keterangan}</p>
              </article>
            ))}
          </section>

          <section className={styles.uploadCard}>
            <div className={styles.uploadHeader}>
              <div>
                <h2>Status Kewajiban Upload</h2>
                <p className={styles.muted}>Minggu tidak dihitung sebagai hari kerja.</p>
              </div>
              <div className={styles.legend}>
                {Object.entries(TAMPILAN_STATUS).map(([key, value]) => (
                  <span key={key} className={value.className}><i className={styles.dot} />{value.label}</span>
                ))}
              </div>
            </div>
            <div className={styles.uploadHeader}>
              <label className={styles.field}>
                Filter status
                <select
                  className={styles.select}
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as StatusKewajibanUpload | "")}
                >
                  <option value="">Semua Status</option>
                  {(Object.keys(TAMPILAN_STATUS) as StatusKewajibanUpload[]).map((status) => (
                    <option key={status} value={status}>
                      {TAMPILAN_STATUS[status].label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Tanggal deadline</th>
                    <th>Jenis laporan</th>
                    <th>Batas waktu</th>
                    <th>Status</th>
                    <th>Keterangan</th>
                    <th>Waktu upload</th>
                  </tr>
                </thead>
                <tbody>
                  {kewajibanTampil.map((item, index) => (
                    <tr key={`${item.tipe}-${item.tanggal}-${index}`}>
                      <td>{formatTanggal(item.tanggal)}</td>
                      <td>{item.label}</td>
                      <td>{item.jamBuka}–{item.jamTutup} WITA</td>
                      <td><StatusUpload item={item} /></td>
                      <td>{item.keterangan}</td>
                      <td>{item.uploadedAt ? formatWaktuWITA(item.uploadedAt) : "—"}</td>
                    </tr>
                  ))}
                  {kewajibanTampil.length === 0 && (
                    <tr><td colSpan={6} className={styles.empty}>Tidak ada kewajiban upload pada periode ini.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
