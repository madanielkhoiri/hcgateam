"use client";

import Link from "next/link";
import {
  Bell,
  Building,
  CalendarDays,
  CalendarRange,
  CheckCircle2,
  ClipboardCheck,
  Eye,
  FileSignature,
  FileStack,
  FileText,
  Gauge,
  HardHat,
  LineChart,
  PackageCheck,
  Percent,
  Ruler,
  ShieldAlert,
  TrendingUp,
  Trophy,
  UsersRound,
  Wallet,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  epromApi,
  formatWaktuRelatif,
  LABEL_STATUS_DEVIASI,
  type DashboardRingkasanEprom,
  type ProgressItem,
} from "@/lib/eprom-api";
import { ProgressTrendChart } from "@/components/civil-project/progress-trend-chart";
import styles from "./project-dashboard.module.css";

const quickActions = [
  { label: "Shop Drawing", href: "/civil/project/engineer", icon: Ruler, accent: "#0868f6", soft: "#eaf2ff" },
  { label: "Material Approval", href: "/civil/project/engineer", icon: FileText, accent: "#07984c", soft: "#e4f7ec" },
  { label: "Checklist Pekerjaan", href: "/civil/project/konstruksi", icon: ClipboardCheck, accent: "#7a4ce0", soft: "#f0ebff" },
  { label: "Inspeksi Area", href: "/civil/project/konstruksi", icon: Eye, accent: "#ef7100", soft: "#fff2df" },
  { label: "Progress Harian", href: "/civil/project/konstruksi", icon: CalendarDays, accent: "#0aa3a3", soft: "#e4f7f7" },
  { label: "Progress Mingguan", href: "/civil/project/konstruksi", icon: CalendarRange, accent: "#0868f6", soft: "#eaf2ff" },
  { label: "Opname Pekerjaan", href: "/civil/project/financial", icon: Percent, accent: "#d53535", soft: "#ffeded" },
  { label: "Dokumen", href: "/civil/project/dokumen", icon: FileStack, accent: "#7a4ce0", soft: "#f0ebff" },
];

const projectAreaModules = [
  { label: "Engineer", href: "/civil/project/engineer", icon: HardHat, accent: "#0868f6", soft: "#eaf2ff" },
  { label: "Konstruksi", href: "/civil/project/konstruksi", icon: Building, accent: "#07984c", soft: "#e4f7ec" },
  { label: "Meeting Progress", href: "/civil/project/meeting", icon: UsersRound, accent: "#7a4ce0", soft: "#f0ebff" },
  { label: "Dokumen", href: "/civil/project/dokumen", icon: FileStack, accent: "#ef7100", soft: "#fff2df" },
  { label: "Financial & Monitoring", href: "/civil/project/financial", icon: Percent, accent: "#0aa3a3", soft: "#e4f7f7" },
  { label: "Project Closing", href: "/civil/project/closing", icon: PackageCheck, accent: "#d53535", soft: "#ffeded" },
];

const ownerAreaGroups = [
  {
    label: "Tender",
    icon: CheckCircle2,
    accent: "#0868f6",
    soft: "#eaf2ff",
    href: "/civil/project/tender",
    items: ["Upload Dokumen Tender", "Undangan Peserta Tender", "Klasifikasi Tender"],
  },
  {
    label: "Penentuan Pemenang",
    icon: Trophy,
    accent: "#ef7100",
    soft: "#fff2df",
    href: "/civil/project/tender",
    items: ["Evaluasi Penawaran (SPH)", "Bandingkan Harga Final", "Penetapan Pemenang Otomatis"],
  },
  {
    label: "Kontrak",
    icon: FileSignature,
    accent: "#7a4ce0",
    soft: "#f0ebff",
    href: "/civil/project/kontrak",
    items: ["Pembuatan Kontrak", "Legalitas Vendor"],
  },
];

export default function CivilProjectDashboardPage() {
  const [ringkasan, setRingkasan] = useState<DashboardRingkasanEprom | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterChartId, setFilterChartId] = useState<number | "semua">("semua");
  const [projectDeviasiId, setProjectDeviasiId] = useState<number | null>(null);
  const [deviasiItems, setDeviasiItems] = useState<ProgressItem[]>([]);
  const [deviasiLoading, setDeviasiLoading] = useState(false);
  const [deviasiError, setDeviasiError] = useState<string | null>(null);

  useEffect(() => {
    epromApi.dashboard
      .ringkasan()
      .then((data) => {
        setRingkasan(data);
        setProjectDeviasiId((cur) => cur ?? data.progressPerProject[0]?.id ?? null);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Gagal memuat ringkasan"));
  }, []);

  const muatDeviasi = useCallback(() => {
    if (!projectDeviasiId) {
      setDeviasiItems([]);
      return;
    }
    setDeviasiLoading(true);
    epromApi.progress
      .mingguanTerbaru(projectDeviasiId)
      .then(setDeviasiItems)
      .catch((err: unknown) => setDeviasiError(err instanceof Error ? err.message : "Gagal memuat data"))
      .finally(() => setDeviasiLoading(false));
  }, [projectDeviasiId]);

  useEffect(muatDeviasi, [muatDeviasi]);

  const trendTertampil = useMemo(() => {
    if (!ringkasan) return [];
    if (filterChartId === "semua") return ringkasan.progressTrend;
    return ringkasan.progressTrend.filter((s) => s.id === filterChartId);
  }, [ringkasan, filterChartId]);

  const cards = [
    {
      label: "Total Project",
      value: ringkasan?.totalProject ?? 0,
      sub: "Project berjalan",
      icon: Building,
      accent: "#0868f6",
      soft: "#eaf2ff",
    },
    {
      label: "Tender Aktif",
      value: ringkasan?.tenderAktif ?? 0,
      sub: "Dalam proses",
      icon: FileStack,
      accent: "#07984c",
      soft: "#e4f7ec",
    },
    {
      label: "Approval Pending",
      value: ringkasan?.approvalPending ?? 0,
      sub: "Menunggu review Owner",
      icon: ClipboardCheck,
      accent: "#ef7100",
      soft: "#fff2df",
    },
    {
      label: "Legalitas Belum Lengkap",
      value: ringkasan?.legalitasBelumLengkap ?? 0,
      sub: "Vendor perlu ditindaklanjuti",
      icon: ShieldAlert,
      accent: "#d53535",
      soft: "#ffeded",
    },
    {
      label: "Progress Fisik",
      value:
        ringkasan?.progressFisikRataRata !== null && ringkasan?.progressFisikRataRata !== undefined
          ? `${ringkasan.progressFisikRataRata}%`
          : "-",
      sub: "Rata-rata Actual Progress Mingguan",
      icon: TrendingUp,
      accent: "#7a4ce0",
      soft: "#f0ebff",
    },
    {
      label: "Progress Keuangan",
      value:
        ringkasan?.progressKeuanganRataRata !== null && ringkasan?.progressKeuanganRataRata !== undefined
          ? `${ringkasan.progressKeuanganRataRata}%`
          : "-",
      sub: "Rata-rata Opname Pekerjaan disetujui",
      icon: Wallet,
      accent: "#0aa3a3",
      soft: "#e4f7f7",
    },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.statRow}>
        {cards.map((card) => {
          const CardIcon = card.icon;

          return (
            <div className={styles.statCard} key={card.label}>
              <span
                className={styles.statIcon}
                style={{ color: card.accent, background: card.soft }}
              >
                <CardIcon size={22} />
              </span>
              <div>
                <strong>{card.value}</strong>
                <span>{card.label}</span>
                <small>{card.sub}</small>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.topGrid}>
        <div className={styles.chartCard}>
          <div className={`${styles.areaHeader} ${styles.chartHeaderRow}`}>
            <span style={{ display: "flex", alignItems: "center", gap: 9 }}>
              <LineChart size={18} />
              Progress Proyek
            </span>
            {ringkasan && ringkasan.progressPerProject.length > 0 && (
              <select
                className={styles.chartFilter}
                value={filterChartId}
                onChange={(e) =>
                  setFilterChartId(e.target.value === "semua" ? "semua" : Number(e.target.value))
                }
              >
                <option value="semua">Semua Proyek</option>
                {ringkasan.progressPerProject.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.namaProject}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className={styles.chartBody}>
            {trendTertampil.length > 0 ? (
              <ProgressTrendChart seri={trendTertampil} />
            ) : (
              <p className={styles.emptyText} style={{ margin: 0 }}>
                Belum ada data Progress Mingguan untuk ditampilkan.
              </p>
            )}
          </div>
        </div>

        <div className={styles.areaCard}>
          <div className={`${styles.areaHeader} ${styles.areaHeaderProgress}`}>
            <Gauge size={18} />
            <span>Progress per Project</span>
          </div>

          {error && <p className={styles.errorText}>{error}</p>}

          {!error && (ringkasan?.progressPerProject.length ?? 0) === 0 && (
            <p className={styles.emptyText}>Belum ada data Progress Mingguan.</p>
          )}

          <ul className={styles.progressList}>
            {ringkasan?.progressPerProject.map((item) => (
              <li key={item.id} className={styles.progressRow}>
                <div className={styles.progressRowTop}>
                  <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className={styles.progressIconBox}>
                      <Building size={14} />
                    </span>
                    <Link href={`/civil/project/konstruksi/${item.id}?tab=progress-mingguan`}>
                      {item.namaProject}
                    </Link>
                  </span>
                  <strong>{item.progressPersen}%</strong>
                </div>
                <div className={styles.progressBarTrack}>
                  <div
                    className={styles.progressBarFill}
                    style={{ width: `${Math.min(100, Math.max(0, item.progressPersen))}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className={styles.notifCard}>
          <div className={styles.areaHeaderNotif}>
            <Bell size={18} />
            <span>Notifikasi Terbaru</span>
          </div>

          {!error && (ringkasan?.aktivitasTerbaru.length ?? 0) === 0 && (
            <p className={styles.emptyText}>Belum ada aktivitas.</p>
          )}

          <ul className={styles.notifList}>
            {ringkasan?.aktivitasTerbaru.map((item, index) => (
              <li key={index}>
                <span className={styles.notifDot} />
                <div>
                  <p>{item.pesan}</p>
                  <small>{formatWaktuRelatif(item.waktu)}</small>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className={styles.quickActions}>
        {quickActions.map((item) => {
          const ItemIcon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={styles.quickActionBtn}
              style={{ color: item.accent }}
            >
              <span
                className={styles.quickActionIcon}
                style={{ color: item.accent, background: item.soft }}
              >
                <ItemIcon size={18} />
              </span>
              <span style={{ color: "#26405f" }}>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className={styles.bottomGrid}>
        <div className={styles.areaCard}>
          <div className={styles.plainHeader}>
            <span className={`${styles.headerBadge} ${styles.headerBadgeOwner}`}>
              <ClipboardCheck size={15} />
              Owner Area
            </span>
          </div>

          <div className={styles.ownerAreaGrid}>
            {ownerAreaGroups.map((group) => {
              const GroupIcon = group.icon;

              return (
                <div key={group.label} className={styles.ownerAreaColumn}>
                  <span className={styles.ownerAreaIcon} style={{ color: group.accent }}>
                    <GroupIcon size={20} />
                  </span>
                  <strong>{group.label}</strong>

                  <ul>
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>

                  <Link
                    href={group.href}
                    className={styles.ownerAreaButton}
                    style={{ background: group.accent }}
                  >
                    Lihat Semua
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        <div className={styles.areaCard}>
          <div className={styles.plainHeader}>
            <span className={`${styles.headerBadge} ${styles.headerBadgeProject}`}>
              <Building size={15} />
              Project Area
            </span>
          </div>

          <div className={styles.projectIconGrid}>
            {projectAreaModules.map((item) => {
              const ItemIcon = item.icon;

              return (
                <Link
                  key={item.label}
                  href={item.href}
                  className={styles.projectIconBtn}
                  style={{ background: item.soft }}
                >
                  <span
                    className={styles.quickActionIcon}
                    style={{ color: item.accent, background: "#ffffff" }}
                  >
                    <ItemIcon size={20} />
                  </span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>

        <div className={styles.areaCard}>
          <div className={styles.miniCardHeader}>
            <strong>Progress Mingguan</strong>
            {ringkasan && ringkasan.progressPerProject.length > 0 && (
              <select
                value={projectDeviasiId ?? ""}
                onChange={(e) => setProjectDeviasiId(Number(e.target.value))}
              >
                {ringkasan.progressPerProject.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.namaProject}
                  </option>
                ))}
              </select>
            )}
          </div>

          {deviasiError && <p className={styles.errorText}>{deviasiError}</p>}
          {deviasiLoading && <p className={styles.emptyText}>Memuat...</p>}
          {!deviasiLoading && deviasiItems.length === 0 && (
            <p className={styles.emptyText}>Belum ada data Progress Mingguan untuk project ini.</p>
          )}

          {deviasiItems.length > 0 && (
            <div className={styles.miniTableWrap}>
              <table className={styles.miniTable}>
                <thead>
                  <tr>
                    <th>No</th>
                    <th>Pekerjaan</th>
                    <th>Planned</th>
                    <th>Actual</th>
                    <th>Deviasi</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {deviasiItems.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td>{item.namaPekerjaan}</td>
                      <td>{item.planned}%</td>
                      <td>{item.actual}%</td>
                      <td>
                        {item.deviasi !== undefined
                          ? `${item.deviasi > 0 ? "+" : ""}${item.deviasi}%`
                          : "-"}
                      </td>
                      <td>
                        {item.status && (
                          <span
                            className={styles.statusDot}
                            style={{
                              background:
                                item.status === "ON_TRACK"
                                  ? "#07984c"
                                  : item.status === "WASPADA"
                                    ? "#d97706"
                                    : "#d53535",
                            }}
                            title={LABEL_STATUS_DEVIASI[item.status]}
                          />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
