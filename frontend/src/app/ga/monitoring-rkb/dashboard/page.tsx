"use client";

import { useEffect, useMemo, useState } from "react";
import { monitoringRkbApi, type KategoriRkb, type ProjectRkb } from "@/lib/monitoring-rkb-api";
import styles from "../monitoring-rkb.module.css";

const kategori: Array<{ value: KategoriRkb; label: string }> = [
  { value: "PROJECT", label: "Project" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "ATK", label: "ATK" },
  { value: "FURNITURE", label: "Furniture" },
  { value: "BANGUNAN", label: "Bangunan" },
];

export default function DashboardRkb() {
  const [data, setData] = useState<ProjectRkb[]>([]);
  useEffect(() => { monitoringRkbApi.daftarProject().then(setData).catch(() => setData([])); }, []);
  const semuaRkb = useMemo(() => data.flatMap((project) => project.rkb), [data]);
  const grafikKategori = kategori.map((item) => ({ ...item, total: data.filter((project) => project.kategori === item.value).length }));
  const grafikStatus = [
    { label: "Menunggu Approval", total: semuaRkb.filter((rkb) => rkb.status === "WAITING_APPROVAL").length, className: "barApproval" },
    { label: "Menunggu Supply", total: semuaRkb.filter((rkb) => rkb.status === "WAITING_SUPPLY").length, className: "barSupply" },
    { label: "Close", total: semuaRkb.filter((rkb) => rkb.status === "CLOSE").length, className: "barClose" },
  ];
  const maksimumKategori = Math.max(1, ...grafikKategori.map((item) => item.total));
  const maksimumStatus = Math.max(1, ...grafikStatus.map((item) => item.total));

  return <main className={styles.page}>
    <header className={styles.header}><div><h1>Dashboard Monitoring RKB</h1><p>Grafik ringkasan berdasarkan kategori dan status pengadaan.</p></div></header>
    <section className={styles.chartGrid}>
      <article className={styles.chartCard}>
        <div className={styles.chartHead}><h2>RKB Berdasarkan Kategori</h2><span>{data.length} total data</span></div>
        <div className={styles.barChart}>{grafikKategori.map((item) => <div className={styles.barRow} key={item.value}><div className={styles.barLabel}><span>{item.label}</span><strong>{item.total}</strong></div><div className={styles.barTrack}><div className={`${styles.barFill} ${styles[`bar${item.value}`]}`} style={{ width: `${item.total ? Math.max(8, item.total / maksimumKategori * 100) : 0}%` }}/></div></div>)}</div>
      </article>
      <article className={styles.chartCard}>
        <div className={styles.chartHead}><h2>Status Pengadaan</h2><span>{semuaRkb.length} nomor RKB</span></div>
        <div className={styles.barChart}>{grafikStatus.map((item) => <div className={styles.barRow} key={item.label}><div className={styles.barLabel}><span>{item.label}</span><strong>{item.total}</strong></div><div className={styles.barTrack}><div className={`${styles.barFill} ${styles[item.className]}`} style={{ width: `${item.total ? Math.max(8, item.total / maksimumStatus * 100) : 0}%` }}/></div></div>)}</div>
      </article>
    </section>
  </main>;
}
