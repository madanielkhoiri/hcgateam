"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { epromApi, formatTanggal, type Project } from "@/lib/eprom-api";
import styles from "../engineer/engineer.module.css";

export default function SafetyMeetingTenderListPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    epromApi.project
      .daftar()
      .then(setProjects)
      .catch((err: unknown) =>
        setError(err instanceof Error ? err.message : "Gagal memuat tender"),
      )
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1>Safety Meeting</h1>
          <p>
            Pilih tender untuk mengelola file P5M, Safety Talk, dan Fatigue
            Test.
          </p>
        </div>
      </div>

      {error && <p className={styles.errorText}>{error}</p>}
      {loading && <p className={styles.emptyText}>Memuat tender...</p>}
      {!loading && projects.length === 0 && (
        <p className={styles.emptyText}>
          Belum ada tender yang memiliki kontrak dan project aktif.
        </p>
      )}

      {projects.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tender</th>
                <th>Project</th>
                <th>Kontrak</th>
                <th>Vendor</th>
                <th>Periode</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((project) => (
                <tr key={project.id}>
                  <td>
                    <Link
                      href={`/civil/project/safety-meeting/${project.id}`}
                      className={styles.rowLink}
                    >
                      {project.kontrak.tender.namaTender}
                    </Link>
                  </td>
                  <td>{project.namaProject}</td>
                  <td>{project.kontrak.nomorKontrak}</td>
                  <td>{project.kontrak.vendor.namaVendor}</td>
                  <td>
                    {formatTanggal(project.kontrak.tanggalMulai)} &ndash;{" "}
                    {formatTanggal(project.kontrak.tanggalSelesai)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
