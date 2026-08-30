"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  Building,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CalendarRange,
  Camera,
  ChevronDown,
  ChevronLeft,
  ClipboardCheck,
  ClipboardList,
  Cog,
  Eye,
  FileCheck2,
  FileSignature,
  FileStack,
  FileText,
  FileWarning,
  FolderOpen,
  Gauge,
  Handshake,
  HardHat,
  ListChecks,
  ListTodo,
  Lock,
  MailWarning,
  Megaphone,
  Menu,
  MessageSquare,
  PackageCheck,
  PenTool,
  Percent,
  Ruler,
  Send,
  Settings2,
  ShieldAlert,
  ShieldCheck,
  StickyNote,
  TrendingUp,
  Users,
  UsersRound,
  Wrench,
  X,
} from "lucide-react";
import { Suspense, type ReactNode, useEffect, useState } from "react";
import {
  ACCESS_KEYS,
  clearSession,
  formatRole,
  getAccessToken,
  getStoredUser,
  hasAccess,
  saveStoredUser,
  type PortalUser,
} from "@/lib/access-control";
import {
  epromApi,
  isEpromOwner,
  isEpromVendor,
  type DashboardRingkasanEprom,
  type Project,
  type RingkasanPendingClosing,
  type RingkasanPendingEngineer,
  type RingkasanPendingKonstruksi,
  type TipeEngineer,
  type TipeSafetyMeeting,
} from "@/lib/eprom-api";
import styles from "./project-layout.module.css";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
};

type NavGroup = {
  id: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
  badge?: number;
};

const dashboardItem: NavItem = { label: "Dashboard", href: "/civil/project", icon: Gauge };
const dataVendorItem: NavItem = { label: "Data Vendor", href: "/civil/project/vendor", icon: Users };
const performanceVendorItem: NavItem = {
  label: "Performance Vendor",
  href: "/civil/project/performance-vendor",
  icon: TrendingUp,
};

const segeraHadirItems: NavItem[] = [];

const TAB_ENGINEER: { tab: TipeEngineer; label: string; icon: React.ElementType }[] = [
  { tab: "shop-drawing", label: "Shop Drawing", icon: Ruler },
  { tab: "material-approval", label: "Material Approval", icon: FileText },
  { tab: "metode-pekerjaan", label: "Metode Pekerjaan", icon: Wrench },
  { tab: "sertifikasi-pekerjaan", label: "Sertifikasi Pekerjaan", icon: ShieldCheck },
  { tab: "peralatan-list", label: "Daftar Peralatan", icon: ClipboardList },
  { tab: "komisioning-alat-berat", label: "Komisioning Alat Berat", icon: Cog },
];

const TAB_KONSTRUKSI: { tab: string; label: string; icon: React.ElementType }[] = [
  { tab: "checklist-tahapan", label: "Checklist Tahapan Pekerjaan", icon: ClipboardCheck },
  { tab: "inspeksi-area", label: "Inspeksi Area Pekerjaan", icon: Eye },
  { tab: "progress-harian", label: "Progress Harian", icon: CalendarDays },
  { tab: "progress-mingguan", label: "Progress Mingguan", icon: CalendarRange },
  { tab: "progress-bulanan", label: "Progress Bulanan", icon: CalendarCheck },
  { tab: "inspeksi-peralatan", label: "Inspeksi Peralatan", icon: Cog },
  { tab: "tta", label: "TTA", icon: AlertTriangle },
  { tab: "kta", label: "KTA", icon: ShieldAlert },
  { tab: "ibpr", label: "IBPR", icon: FileWarning },
  { tab: "jsa", label: "JSA", icon: FileText },
  { tab: "sosialisasi-jsa", label: "Sosialisasi JSA", icon: Megaphone },
];

const TIPE_KONSTRUKSI_BADGE = new Set(["checklist-tahapan", "ibpr", "jsa"]);

const TAB_MEETING: { tab: string; label: string; icon: React.ElementType }[] = [
  { tab: "meeting", label: "Meeting", icon: CalendarClock },
  { tab: "dokumentasi", label: "Dokumentasi Meeting", icon: Camera },
  { tab: "mom", label: "MOM", icon: ListTodo },
];

const TAB_SAFETY_MEETING: {
  tab: TipeSafetyMeeting;
  label: string;
  icon: React.ElementType;
}[] = [
  { tab: "p5m", label: "P5M", icon: ClipboardCheck },
  { tab: "safety-talk", label: "Safety Talk", icon: MessageSquare },
  { tab: "fatigue-test", label: "Fatigue Test", icon: Gauge },
];

const TAB_DOKUMEN: { tab: string; label: string; icon: React.ElementType }[] = [
  { tab: "surat-teguran", label: "Surat Teguran", icon: MailWarning },
  { tab: "surat-peringatan", label: "Surat Peringatan", icon: ShieldAlert },
  { tab: "coaching-counseling", label: "Coaching & Counseling", icon: MessageSquare },
  { tab: "memo", label: "Memo", icon: StickyNote },
];

const TAB_CLOSING: { tab: string; label: string; icon: React.ElementType }[] = [
  { tab: "as-build-drawing", label: "As Build Drawing", icon: PenTool },
  { tab: "komisioning", label: "Komisioning", icon: Settings2 },
  { tab: "serah-terima", label: "Serah Terima", icon: Handshake },
  { tab: "masa-pemeliharaan-checklist", label: "Checklist Masa Pemeliharaan", icon: ClipboardCheck },
  { tab: "ba-serah-terima", label: "BA Serah Terima", icon: FileCheck2 },
];

type ProjectLayoutProps = {
  children: ReactNode;
};

export default function CivilProjectLayout({ children }: ProjectLayoutProps) {
  return (
    <Suspense fallback={<main className={styles.loading}>Memuat modul Project...</main>}>
      <CivilProjectLayoutInner>{children}</CivilProjectLayoutInner>
    </Suspense>
  );
}

function CivilProjectLayoutInner({ children }: ProjectLayoutProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);
  const [ringkasan, setRingkasan] = useState<DashboardRingkasanEprom | null>(null);
  const [engineerPending, setEngineerPending] = useState(0);
  const [engineerRingkasan, setEngineerRingkasan] = useState<RingkasanPendingEngineer | null>(null);
  const [konstruksiPending, setKonstruksiPending] = useState(0);
  const [konstruksiRingkasan, setKonstruksiRingkasan] = useState<RingkasanPendingKonstruksi | null>(
    null,
  );
  const [financialPending, setFinancialPending] = useState(0);
  const [financialRingkasanAktif, setFinancialRingkasanAktif] = useState<number | null>(null);
  const [closingPending, setClosingPending] = useState(0);
  const [closingRingkasan, setClosingRingkasan] = useState<RingkasanPendingClosing | null>(null);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  const boleh = isEpromOwner(user);
  const vendorSaya = isEpromVendor(user);
  const tenderDetailMatch = /^\/civil\/project\/tender\/(\d+)/.exec(pathname);
  const activeTenderId = tenderDetailMatch ? tenderDetailMatch[1] : null;
  const engineerDetailMatch = /^\/civil\/project\/engineer\/(\d+)/.exec(pathname);
  const activeEngineerProjectId = engineerDetailMatch ? engineerDetailMatch[1] : null;
  const konstruksiDetailMatch = /^\/civil\/project\/konstruksi\/(\d+)/.exec(pathname);
  const activeKonstruksiProjectId = konstruksiDetailMatch ? konstruksiDetailMatch[1] : null;
  const meetingDetailMatch = /^\/civil\/project\/meeting\/(\d+)/.exec(pathname);
  const activeMeetingProjectId = meetingDetailMatch ? meetingDetailMatch[1] : null;
  const safetyMeetingDetailMatch =
    /^\/civil\/project\/safety-meeting\/(\d+)/.exec(pathname);
  const activeSafetyMeetingProjectId = safetyMeetingDetailMatch
    ? safetyMeetingDetailMatch[1]
    : null;
  const dokumenDetailMatch = /^\/civil\/project\/dokumen\/(\d+)/.exec(pathname);
  const activeDokumenProjectId = dokumenDetailMatch ? dokumenDetailMatch[1] : null;
  const financialDetailMatch = /^\/civil\/project\/financial\/(\d+)/.exec(pathname);
  const activeFinancialProjectId = financialDetailMatch ? financialDetailMatch[1] : null;
  const closingDetailMatch = /^\/civil\/project\/closing\/(\d+)/.exec(pathname);
  const activeClosingProjectId = closingDetailMatch ? closingDetailMatch[1] : null;
  const activeTab = searchParams.get("tab");

  const navGroups: NavGroup[] = [
    {
      id: "tender",
      label: "Tender",
      icon: FileStack,
      items: [
        { label: "Daftar Tender", href: "/civil/project/tender", icon: ListChecks },
        ...(activeTenderId
          ? [
              ...(boleh
                ? [
                    {
                      label: "Upload Dokumen",
                      href: `/civil/project/tender/${activeTenderId}?tab=dokumen`,
                      icon: FolderOpen,
                    },
                    {
                      label: "Undangan Tender",
                      href: `/civil/project/tender/${activeTenderId}?tab=undangan`,
                      icon: Send,
                    },
                  ]
                : []),
              {
                label: "Klasifikasi & Evaluasi",
                href: `/civil/project/tender/${activeTenderId}?tab=sph`,
                icon: ClipboardList,
              },
            ]
          : []),
      ],
    },
  ];

  const kontrakGroup: NavGroup = {
    id: "kontrak",
    label: "Kontrak",
    icon: Handshake,
    items: [
      ...(boleh
        ? [{ label: "Pembuatan Kontrak", href: "/civil/project/kontrak", icon: FileSignature }]
        : []),
      { label: "Legalitas Vendor", href: "/civil/project/kontrak/legalitas", icon: ShieldCheck },
    ],
  };

  const totalPendingProjekAktif = engineerRingkasan
    ? Object.values(engineerRingkasan).reduce((a, b) => a + b, 0)
    : null;

  const totalPendingKonstruksiAktif = konstruksiRingkasan
    ? Object.values(konstruksiRingkasan).reduce((a, b) => a + b, 0)
    : null;

  const totalPendingClosingAktif = closingRingkasan
    ? Object.values(closingRingkasan).reduce((a, b) => a + b, 0)
    : null;

  const projectAreaGroups: NavGroup[] = [
    {
      id: "engineer",
      label: "Engineer",
      icon: HardHat,
      badge: totalPendingProjekAktif ?? engineerPending,
      items: [
        { label: "Daftar Project", href: "/civil/project/engineer", icon: ListChecks },
        ...(activeEngineerProjectId
          ? TAB_ENGINEER.map((t) => ({
              label: t.label,
              href: `/civil/project/engineer/${activeEngineerProjectId}?tab=${t.tab}`,
              icon: t.icon,
              badge: engineerRingkasan?.[t.tab] ?? 0,
            }))
          : []),
      ],
    },
    {
      id: "konstruksi",
      label: "Konstruksi",
      icon: Building,
      badge: totalPendingKonstruksiAktif ?? konstruksiPending,
      items: [
        { label: "Daftar Project", href: "/civil/project/konstruksi", icon: ListChecks },
        ...(activeKonstruksiProjectId
          ? TAB_KONSTRUKSI.map((t) => ({
              label: t.label,
              href: `/civil/project/konstruksi/${activeKonstruksiProjectId}?tab=${t.tab}`,
              icon: t.icon,
              badge: TIPE_KONSTRUKSI_BADGE.has(t.tab)
                ? (konstruksiRingkasan?.[t.tab as keyof RingkasanPendingKonstruksi] ?? 0)
                : 0,
            }))
          : []),
      ],
    },
    {
      id: "meeting",
      label: "Meeting Progress",
      icon: UsersRound,
      items: [
        { label: "Daftar Project", href: "/civil/project/meeting", icon: ListChecks },
        ...(activeMeetingProjectId
          ? TAB_MEETING.map((t) => ({
              label: t.label,
              href: `/civil/project/meeting/${activeMeetingProjectId}?tab=${t.tab}`,
              icon: t.icon,
            }))
          : []),
      ],
    },
    {
      id: "safety-meeting",
      label: "Safety Meeting",
      icon: ShieldCheck,
      items: [
        {
          label: "Daftar Tender",
          href: "/civil/project/safety-meeting",
          icon: ListChecks,
        },
        ...(activeSafetyMeetingProjectId
          ? TAB_SAFETY_MEETING.map((item) => ({
              label: item.label,
              href: `/civil/project/safety-meeting/${activeSafetyMeetingProjectId}?tab=${item.tab}`,
              icon: item.icon,
            }))
          : []),
      ],
    },
    {
      id: "dokumen",
      label: "Dokumen",
      icon: FileStack,
      items: [
        { label: "Daftar Project", href: "/civil/project/dokumen", icon: ListChecks },
        ...(activeDokumenProjectId
          ? TAB_DOKUMEN.map((t) => ({
              label: t.label,
              href: `/civil/project/dokumen/${activeDokumenProjectId}?tab=${t.tab}`,
              icon: t.icon,
            }))
          : []),
      ],
    },
    {
      id: "financial",
      label: "Financial & Monitoring",
      icon: Percent,
      badge: financialRingkasanAktif ?? financialPending,
      items: [
        {
          label: "Daftar Project",
          href: "/civil/project/financial",
          icon: ListChecks,
        },
        ...(activeFinancialProjectId
          ? [
              {
                label: "Opname Pekerjaan",
                href: `/civil/project/financial/${activeFinancialProjectId}`,
                icon: Percent,
                badge: financialRingkasanAktif ?? 0,
              },
            ]
          : []),
      ],
    },
    {
      id: "closing",
      label: "Project Closing",
      icon: PackageCheck,
      badge: totalPendingClosingAktif ?? closingPending,
      items: [
        { label: "Daftar Project", href: "/civil/project/closing", icon: ListChecks },
        ...(activeClosingProjectId
          ? TAB_CLOSING.map((t) => ({
              label: t.label,
              href: `/civil/project/closing/${activeClosingProjectId}?tab=${t.tab}`,
              icon: t.icon,
              badge: closingRingkasan?.[t.tab as keyof RingkasanPendingClosing] ?? 0,
            }))
          : []),
      ],
    },
  ];

  useEffect(() => {
    let active = true;

    async function muat() {
      const token = getAccessToken();
      const stored = getStoredUser();

      if (!token || !stored) {
        clearSession();
        router.replace("/login");
        return;
      }

      let current = stored;

      try {
        const response = await fetch(`${API_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });

        if (response.status === 401) {
          clearSession();
          router.replace("/login");
          return;
        }

        if (response.ok) {
          current = (await response.json()) as PortalUser;
          saveStoredUser(current);
        }
      } catch {
        // Gunakan data login terakhir saat backend sementara tidak terjangkau.
      }

      if (!hasAccess(current, ACCESS_KEYS.CIVIL_PROJECT)) {
        router.replace("/civil");
        return;
      }

      if (active) {
        setUser(current);
      }
    }

    void muat();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    if (!user) {
      return;
    }

    epromApi.dashboard
      .ringkasan()
      .then((data) => setRingkasan(data))
      .catch(() => setRingkasan(null));

    function muatEngineerPending() {
      epromApi.project
        .daftar()
        .then((projects: Project[]) => {
          const total = projects.reduce((sum, p) => sum + (p.pendingEngineer ?? 0), 0);
          setEngineerPending(total);
        })
        .catch(() => setEngineerPending(0));
    }

    function muatKonstruksiPending() {
      epromApi.project
        .daftar()
        .then((projects: Project[]) => {
          const total = projects.reduce((sum, p) => sum + (p.pendingKonstruksi ?? 0), 0);
          setKonstruksiPending(total);
        })
        .catch(() => setKonstruksiPending(0));
    }

    function muatFinancialPending() {
      epromApi.project
        .daftar()
        .then((projects: Project[]) => {
          const total = projects.reduce((sum, p) => sum + (p.pendingFinancial ?? 0), 0);
          setFinancialPending(total);
        })
        .catch(() => setFinancialPending(0));
    }

    function muatClosingPending() {
      epromApi.project
        .daftar()
        .then((projects: Project[]) => {
          const total = projects.reduce((sum, p) => sum + (p.pendingClosing ?? 0), 0);
          setClosingPending(total);
        })
        .catch(() => setClosingPending(0));
    }

    muatEngineerPending();
    muatKonstruksiPending();
    muatFinancialPending();
    muatClosingPending();
    window.addEventListener("eprom-engineer-updated", muatEngineerPending);
    window.addEventListener("eprom-konstruksi-updated", muatKonstruksiPending);
    window.addEventListener("eprom-financial-updated", muatFinancialPending);
    window.addEventListener("eprom-closing-updated", muatClosingPending);
    return () => {
      window.removeEventListener("eprom-engineer-updated", muatEngineerPending);
      window.removeEventListener("eprom-konstruksi-updated", muatKonstruksiPending);
      window.removeEventListener("eprom-financial-updated", muatFinancialPending);
      window.removeEventListener("eprom-closing-updated", muatClosingPending);
    };
  }, [user]);

  useEffect(() => {
    if (!user || !activeEngineerProjectId) {
      setEngineerRingkasan(null);
      return;
    }

    function muatRingkasanTab() {
      epromApi.engineer
        .ringkasan(Number(activeEngineerProjectId))
        .then(setEngineerRingkasan)
        .catch(() => setEngineerRingkasan(null));
    }

    muatRingkasanTab();
    window.addEventListener("eprom-engineer-updated", muatRingkasanTab);
    return () => window.removeEventListener("eprom-engineer-updated", muatRingkasanTab);
  }, [user, activeEngineerProjectId]);

  useEffect(() => {
    if (!user || !activeKonstruksiProjectId) {
      setKonstruksiRingkasan(null);
      return;
    }

    function muatRingkasanKonstruksi() {
      epromApi.konstruksi
        .ringkasan(Number(activeKonstruksiProjectId))
        .then(setKonstruksiRingkasan)
        .catch(() => setKonstruksiRingkasan(null));
    }

    muatRingkasanKonstruksi();
    window.addEventListener("eprom-konstruksi-updated", muatRingkasanKonstruksi);
    return () => window.removeEventListener("eprom-konstruksi-updated", muatRingkasanKonstruksi);
  }, [user, activeKonstruksiProjectId]);

  useEffect(() => {
    if (!user || !activeFinancialProjectId) {
      setFinancialRingkasanAktif(null);
      return;
    }

    function muatRingkasanFinancial() {
      epromApi.financial
        .ringkasan(Number(activeFinancialProjectId))
        .then((data) => setFinancialRingkasanAktif(data['opname-pekerjaan']))
        .catch(() => setFinancialRingkasanAktif(null));
    }

    muatRingkasanFinancial();
    window.addEventListener("eprom-financial-updated", muatRingkasanFinancial);
    return () => window.removeEventListener("eprom-financial-updated", muatRingkasanFinancial);
  }, [user, activeFinancialProjectId]);

  useEffect(() => {
    if (!user || !activeClosingProjectId) {
      setClosingRingkasan(null);
      return;
    }

    function muatRingkasanClosing() {
      epromApi.closing
        .ringkasan(Number(activeClosingProjectId))
        .then(setClosingRingkasan)
        .catch(() => setClosingRingkasan(null));
    }

    muatRingkasanClosing();
    window.addEventListener("eprom-closing-updated", muatRingkasanClosing);
    return () => window.removeEventListener("eprom-closing-updated", muatRingkasanClosing);
  }, [user, activeClosingProjectId]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const activeGroup = [...navGroups, ...projectAreaGroups].find((group) =>
      group.items.some((item) => pathname === item.href.split("?")[0]),
    );

    if (!activeGroup) {
      return;
    }

    setOpenGroups((current) =>
      current.includes(activeGroup.id) ? current : [...current, activeGroup.id],
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  function toggleGroup(groupId: string) {
    setOpenGroups((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId],
    );
  }

  const badgeCount =
    (ringkasan?.sphMenungguFinal ?? 0) + (ringkasan?.legalitasBelumLengkap ?? 0);

  if (!user) {
    return <main className={styles.loading}>Memuat modul Project...</main>;
  }

  function renderGroup(group: NavGroup) {
    const GroupIcon = group.icon;
    const isOpen = openGroups.includes(group.id);
    const isGroupActive = group.items.some((item) => pathname === item.href.split("?")[0]);

    return (
      <div className={styles.menuGroup} key={group.id}>
        <button
          type="button"
          className={`${styles.groupButton} ${isGroupActive ? styles.groupButtonActive : ""}`}
          onClick={() => toggleGroup(group.id)}
        >
          <GroupIcon size={18} />
          <span>{group.label}</span>
          {!!group.badge && <span className={styles.navBadge}>{group.badge}</span>}
          <ChevronDown size={16} className={isOpen ? styles.groupChevronOpen : styles.groupChevron} />
        </button>

        {isOpen && (
          <div className={styles.submenu}>
            {group.items.map((item) => {
              const ItemIcon = item.icon;
              const [itemPath, itemQuery] = item.href.split("?");
              const isItemActive =
                pathname === itemPath &&
                (!itemQuery || activeTab === new URLSearchParams(itemQuery).get("tab"));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`${styles.submenuItem} ${isItemActive ? styles.submenuItemActive : ""}`}
                >
                  <ItemIcon size={15} />
                  <span>{item.label}</span>
                  {!!item.badge && <span className={styles.navBadge}>{item.badge}</span>}
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <aside
        className={`${styles.sidebar} ${mobileSidebarOpen ? styles.sidebarOpen : ""}`}
      >
        <div className={styles.sidebarHeader}>
          <Link href="/civil/project" className={styles.brand}>
            <span className={styles.brandLogo}>
              <Building size={22} />
            </span>
            <span className={styles.brandText}>e-ProM</span>
          </Link>

          <button
            type="button"
            className={styles.mobileClose}
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Tutup sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className={styles.navigation}>
          <Link href="/civil" className={styles.backLink}>
            <ChevronLeft size={18} />
            <span>Pilihan Civil</span>
          </Link>

          {boleh && (
            <>
              <div className={styles.navLabel}>OWNER AREA</div>

              <Link
                href={dashboardItem.href}
                className={`${styles.navItem} ${pathname === dashboardItem.href ? styles.navItemActive : ""}`}
              >
                <Gauge size={18} />
                <span>{dashboardItem.label}</span>
              </Link>
            </>
          )}

          {boleh && (
            <Link
              href={dataVendorItem.href}
              className={`${styles.navItem} ${pathname === dataVendorItem.href ? styles.navItemActive : ""}`}
            >
              <Users size={18} />
              <span>{dataVendorItem.label}</span>
            </Link>
          )}

          {boleh && (
            <Link
              href={performanceVendorItem.href}
              className={`${styles.navItem} ${pathname === performanceVendorItem.href ? styles.navItemActive : ""}`}
            >
              <TrendingUp size={18} />
              <span>{performanceVendorItem.label}</span>
            </Link>
          )}

          {boleh && navGroups.map(renderGroup)}

          {(boleh || vendorSaya) && renderGroup(kontrakGroup)}

          <div className={styles.navLabel}>PROJECT AREA</div>

          {projectAreaGroups.map(renderGroup)}

          {segeraHadirItems.map((item) => {
            const ItemIcon = item.icon;

            return (
              <span key={item.label} className={styles.navItemDisabled}>
                <ItemIcon size={18} />
                <span>{item.label}</span>
                <Lock size={13} className={styles.lockIcon} />
              </span>
            );
          })}
        </nav>
      </aside>

      {mobileSidebarOpen && (
        <button
          type="button"
          className={styles.mobileOverlay}
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Tutup sidebar"
        />
      )}

      <section className={styles.contentArea}>
        <header className={styles.topHeader}>
          <div className={styles.topHeaderLeft}>
            <button
              type="button"
              className={styles.mobileMenuButton}
              onClick={() => setMobileSidebarOpen(true)}
              aria-label="Buka menu"
            >
              <Menu size={22} />
            </button>

            <div>
              <span>Selamat datang, {user.name}</span>
              <strong>e-ProM Civil Project</strong>
            </div>
          </div>

          <div className={styles.topHeaderRight}>
            <button type="button" className={styles.notificationButton} aria-label="Notifikasi">
              <Bell size={22} />
              {badgeCount > 0 && <span>{badgeCount}</span>}
            </button>

            <div className={styles.profile}>
              <span className={styles.profileAvatar}>
                <UsersRound size={20} />
              </span>
              <div>
                <strong>{user.name}</strong>
                <span>{formatRole(user.role)}</span>
              </div>
            </div>
          </div>
        </header>

        <div className={styles.pageContent}>{children}</div>
      </section>
    </div>
  );
}
