"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { epromApi, formatTanggal, type Project } from "@/lib/eprom-api";
import styles from "../engineer/engineer.module.css";

export default function KonstruksiProjectListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    epromApi.project
      .daftar()
      .then(setProjects)
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat project"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>Konstruksi</h1>
          <p>
            Checklist Tahapan Pekerjaan, Inspeksi Area/Peralatan, Progress Harian/Mingguan/Bulanan,
            TTA, KTA, IBPR, JSA, dan Sosialisasi JSA. Pilih project untuk mulai mengelola.
          </p>
        </div>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}
      {loading && <p className={styles.emptyText}>Memuat...</p>}
      {!loading && projects.length === 0 && (
        <p className={styles.emptyText}>
          Belum ada Project. Buka Project dulu dari menu Kontrak setelah Kontrak dibuat.
        </p>
      )}

      <div className={styles.tableWrap}>
        {projects.length > 0 && (
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
              {projects.map((project) => {
                const pending = project.pendingKonstruksi ?? 0;

                return (
                  <tr key={project.id}>
                    <td>
                      <Link href={`/civil/project/konstruksi/${project.id}`} className={styles.rowLink}>
                        {project.namaProject}
                      </Link>
                      <small>Kontrak {project.kontrak.nomorKontrak}</small>
                    </td>
                    <td>
                      {formatTanggal(project.kontrak.tanggalMulai)} &ndash;{" "}
                      {formatTanggal(project.kontrak.tanggalSelesai)}
                    </td>
                    <td>{project.kontrak.vendor.namaVendor}</td>
                    <td>
                      {pending > 0 ? <span className={styles.badge}>{pending}</span> : "-"}
                    </td>
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
