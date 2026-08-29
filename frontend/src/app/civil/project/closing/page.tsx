"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { epromApi, formatTanggal, type Project } from "@/lib/eprom-api";
import styles from "../engineer/engineer.module.css";

export default function ClosingProjectListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulan, setBulan] = useState("");
  const [tahun, setTahun] = useState("");

  useEffect(() => {
    epromApi.project
      .daftar()
      .then(setProjects)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat project"))
      .finally(() => setLoading(false));
  }, []);

  const tahunTersedia = useMemo(() => {
    const sekarang = new Date().getFullYear();
    return Array.from({ length: 7 }, (_, index) => sekarang - 5 + index);
  }, []);

  const projectsTampil = useMemo(() => {
    if (!bulan && !tahun) return projects;

    return projects.filter((project) => {
      const tanggal = new Date(project.kontrak.tanggalMulai);
      if (bulan && tanggal.getMonth() + 1 !== Number(bulan)) return false;
      if (tahun && tanggal.getFullYear() !== Number(tahun)) return false;
      return true;
    });
  }, [projects, bulan, tahun]);

  function resetFilter() {
    setBulan("");
    setTahun("");
  }

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>Project Closing</h1>
          <p>
            As Build Drawing, Komisioning, Serah Terima, dan Masa Pemeliharaan. Pilih project untuk
            mulai mengelola.
          </p>
        </div>
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

      {error && <p className={styles.errorText}>{error}</p>}
      {loading && <p className={styles.emptyText}>Memuat...</p>}
      {!loading && projectsTampil.length === 0 && (
        <p className={styles.emptyText}>
          Belum ada Project. Buka Project dulu dari menu Kontrak setelah Kontrak dibuat.
        </p>
      )}

      <div className={styles.tableWrap}>
        {projectsTampil.length > 0 && (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Project</th>
                <th>Periode Kontrak</th>
                <th>Vendor</th>
                <th>Pending</th>
              </tr>
            </thead>
            <tbody>
              {projectsTampil.map((project) => {
                const pending = project.pendingClosing ?? 0;

                return (
                  <tr key={project.id}>
                    <td>
                      <Link href={`/civil/project/closing/${project.id}`} className={styles.rowLink}>
                        {project.namaProject}
                      </Link>
                      <small>Kontrak {project.kontrak.nomorKontrak}</small>
                    </td>
                    <td>
                      {formatTanggal(project.kontrak.tanggalMulai)} &ndash;{" "}
                      {formatTanggal(project.kontrak.tanggalSelesai)}
                    </td>
                    <td>{project.kontrak.vendor.namaVendor}</td>
                    <td>{pending > 0 ? <span className={styles.badge}>{pending}</span> : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
