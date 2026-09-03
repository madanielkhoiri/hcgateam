"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  FileCheck2,
  FileText,
  Gauge,
  HardHat,
  Home,
  ListChecks,
  Menu,
  PackageCheck,
  PackageMinus,
  PackagePlus,
  PanelLeftClose,
  ShieldCheck,
  ToolCase,
  UsersRound,
  Warehouse,
  X,
} from "lucide-react";
import { type ReactNode, useEffect, useState } from "react";
import { ACCESS_KEYS, clearSession, formatRole, getAccessToken, getStoredUser, hasAccess, type PortalUser } from "@/lib/access-control";
import styles from "./inventory-layout.module.css";

type MenuItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

type SectionId = "inventory" | "pekerjaan" | "aktivitas" | "project" | "safety";

type MenuGroup = {
  id: string;
  section: SectionId;
  label: string;
  icon: React.ElementType;
  items: MenuItem[];
};

const ROLE_BOLEH_LIHAT_DEVIASI = ["ADMIN", "SUPER_ADMIN", "SECTION_HEAD"];

const menuGroups: MenuGroup[] = [
  {
    id: "dashboard",
    section: "inventory",
    label: "Dashboard",
    icon: BarChart3,
    items: [
      {
        label: "Dashboard Inventory",
        href: "/ga/inventory/dashboard-inventory",
        icon: BarChart3,
      },
      {
        label: "Deviasi Stok",
        href: "/ga/inventory/deviasi-stok",
        icon: AlertTriangle,
      },
    ],
  },
  {
    id: "inventory",
    section: "inventory",
    label: "Inventory Infras",
    icon: Boxes,
    items: [
      {
        label: "Master Barang",
        href: "/ga/inventory/master-barang",
        icon: Boxes,
      },
      {
        label: "Barang Masuk",
        href: "/ga/inventory/barang-masuk",
        icon: PackagePlus,
      },
      {
        label: "Barang Keluar",
        href: "/ga/inventory/barang-keluar",
        icon: PackageMinus,
      },
      {
        label: "Stok Barang",
        href: "/ga/inventory/stok-barang",
        icon: Warehouse,
      },
    ],
  },
  {
    id: "inventory-mess",
    section: "inventory",
    label: "Inventory Mess",
    icon: Warehouse,
    items: [
      {
        label: "Master Barang",
        href: "/ga/inventory/mess/master-barang",
        icon: Boxes,
      },
      {
        label: "Barang Masuk",
        href: "/ga/inventory/mess/barang-masuk",
        icon: PackagePlus,
      },
      {
        label: "Barang Keluar",
        href: "/ga/inventory/mess/barang-keluar",
        icon: PackageMinus,
      },
      {
        label: "Stok Barang",
        href: "/ga/inventory/mess/stok-barang",
        icon: Warehouse,
      },
    ],
  },
  {
    id: "inventory-electric",
    section: "inventory",
    label: "Inventory Electric",
    icon: ToolCase,
    items: [
      {
        label: "Master Barang",
        href: "/ga/inventory/electric/master-barang",
        icon: Boxes,
      },
      {
        label: "Barang Masuk",
        href: "/ga/inventory/electric/barang-masuk",
        icon: PackagePlus,
      },
      {
        label: "Barang Keluar",
        href: "/ga/inventory/electric/barang-keluar",
        icon: PackageMinus,
      },
      {
        label: "Stok Barang",
        href: "/ga/inventory/electric/stok-barang",
        icon: Warehouse,
      },
    ],
  },
  {
    id: "pekerjaan",
    section: "pekerjaan",
    label: "Pekerjaan",
    icon: ClipboardList,
    items: [
      {
        label: "Dashboard Work Order",
        href: "/ga/inventory/dashboard-work-order",
        icon: BarChart3,
      },
      {
        label: "Work Order",
        href: "/ga/inventory/work-order",
        icon: ClipboardList,
      },
      {
        label: "Serah Terima Pekerjaan",
        href: "/ga/inventory/serah-terima-pekerjaan",
        icon: PackageCheck,
      },
    ],
  },
  {
    id: "aktivitas",
    section: "aktivitas",
    label: "Aktivitas Harian",
    icon: FileText,
    items: [
      {
        label: "Daily Activity",
        href: "/ga/inventory/daily-report",
        icon: FileText,
      },
      {
        label: "Potong Rumput",
        href: "/ga/inventory/potong-rumput",
        icon: FileText,
      },
    ],
  },
  {
    id: "project",
    section: "project",
    label: "Project",
    icon: HardHat,
    items: [
      {
        label: "Pre-Activity Check",
        href: "/ga/inventory/pre-activity-check",
        icon: ClipboardCheck,
      },
      {
        label: "Post Activity",
        href: "/ga/inventory/post-activity",
        icon: FileCheck2,
      },
    ],
  },
  {
    id: "safety",
    section: "safety",
    label: "Safety Meeting",
    icon: ShieldCheck,
    items: [
      {
        label: "P5M",
        href: "/ga/inventory/p5m",
        icon: UsersRound,
      },
    ],
  },
];

type InventoryLayoutProps = {
  children: ReactNode;
};

export default function InventoryLayout({ children }: InventoryLayoutProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<PortalUser | null>(null);

  const activeSection: SectionId = pathname.includes("/pre-activity-check") ||
    pathname.includes("/post-activity")
    ? "project"
    : pathname.includes("/p5m")
      ? "safety"
      : pathname.includes("/daily-report") ||
          pathname.includes("/potong-rumput")
        ? "aktivitas"
        : pathname.includes("/work-order") ||
            pathname.includes("/work-orders") ||
            pathname.includes("/dashboard-work-order") ||
            pathname.includes("/serah-terima-pekerjaan") ||
            pathname.includes("/handovers")
          ? "pekerjaan"
          : "inventory";

  const dalamCivilElectric = pathname.startsWith("/ga/inventory/civil-electric");

  const sectionTitle = {
    inventory: dalamCivilElectric ? "Inventory Electric" : "Inventory",
    pekerjaan: "Pekerjaan",
    aktivitas: "Aktivitas Harian",
    project: "Project",
    safety: "Safety Meeting",
  }[activeSection];

  const requiredAccessKey = {
    inventory: ACCESS_KEYS.GA_INVENTORY,
    pekerjaan: ACCESS_KEYS.GA_PEKERJAAN,
    aktivitas: ACCESS_KEYS.GA_AKTIVITAS_HARIAN,
    project: ACCESS_KEYS.GA_PROJECT,
    safety: ACCESS_KEYS.GA_SAFETY_MEETING,
  }[activeSection];

  // Tombol "kembali" harus menuju menu tempat section ini SUNGGUHAN terdaftar,
  // bukan selalu ke "Pilihan GA" (/ga) — beberapa section di layout Inventory
  // GA ini "dipinjam" oleh modul lain: Safety Meeting (P5M) terdaftar di menu
  // Administrasi, dan Pekerjaan (Work Order/Serah Terima) terdaftar di menu
  // Civil (WO Infras), tidak ada entrinya sama sekali di "Pilihan GA".
  const backTarget =
    activeSection === "safety"
      ? { href: "/administrasi", label: "Kembali ke Administrasi" }
      : activeSection === "pekerjaan"
        ? { href: "/civil", label: "Kembali ke Civil" }
        : dalamCivilElectric
          ? { href: "/civil", label: "Kembali ke Civil" }
          : { href: "/ga", label: "Pilihan GA" };

  const visibleMenuGroups = menuGroups
    .filter((group) => {
      if (group.section !== activeSection) {
        return false;
      }

      if (activeSection === "inventory" && dalamCivilElectric) {
        return group.id === "inventory-electric";
      }

      return true;
    })
    .map((group) => {
      if (
        activeSection === "inventory" &&
        dalamCivilElectric &&
        group.id === "inventory-electric"
      ) {
        return {
          ...group,
          items: [
            {
              label: "Dashboard Inventory Electric",
              href: "/ga/inventory/civil-electric/dashboard",
              icon: BarChart3,
            },
            ...group.items.map((item) => ({
              ...item,
              href: item.href.replace(
                "/ga/inventory/electric",
                "/ga/inventory/civil-electric",
              ),
            })),
          ],
        };
      }

      if (group.id === "dashboard" && !ROLE_BOLEH_LIHAT_DEVIASI.includes(user?.role ?? "")) {
        return { ...group, items: group.items.filter((item) => item.href !== "/ga/inventory/deviasi-stok") };
      }

      return group;
    });

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [openGroups, setOpenGroups] = useState<string[]>([]);

  useEffect(() => {
    const token = getAccessToken();
    const storedUser = getStoredUser();

    if (!token || !storedUser) {
      clearSession();
      router.replace("/login");
      return;
    }

    const bolehMasuk =
      activeSection === "inventory"
        ? hasAccess(storedUser, ACCESS_KEYS.GA_INVENTORY) ||
          hasAccess(storedUser, ACCESS_KEYS.CIVIL_INVENTORY_ELECTRIC)
        : hasAccess(storedUser, requiredAccessKey);

    if (!bolehMasuk) {
      router.replace(backTarget.href);
      return;
    }

    const hanyaElectric =
      activeSection === "inventory" &&
      !hasAccess(storedUser, ACCESS_KEYS.GA_INVENTORY) &&
      hasAccess(storedUser, ACCESS_KEYS.CIVIL_INVENTORY_ELECTRIC);

    if (hanyaElectric && !dalamCivilElectric) {
      router.replace("/ga/inventory/civil-electric/dashboard");
      return;
    }

    setUser(storedUser);
  }, [activeSection, requiredAccessKey, pathname, router]);

  useEffect(() => {
    const activeGroup = visibleMenuGroups.find((group) =>
      group.items.some((item) => pathname === item.href),
    );

    if (!activeGroup) {
      return;
    }

    setOpenGroups((current) =>
      current.includes(activeGroup.id) ? current : [...current, activeGroup.id],
    );
  }, [pathname, activeSection]);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  function toggleGroup(groupId: string) {
    setOpenGroups((current) =>
      current.includes(groupId)
        ? current.filter((id) => id !== groupId)
        : [...current, groupId],
    );
  }

  return (
    <div
      className={`${styles.shell} ${
        sidebarCollapsed ? styles.shellCollapsed : ""
      }`}
    >
      <aside
        className={`${styles.sidebar} ${
          sidebarCollapsed ? styles.sidebarCollapsed : ""
        } ${mobileSidebarOpen ? styles.sidebarMobileOpen : ""}`}
      >
        <div className={styles.sidebarHeader}>
          <Link
            href="/dashboard"
            className={styles.brand}
            aria-label="Kembali ke Dashboard"
          >
            <span className={styles.brandLogo}>
              <UsersRound size={23} />
            </span>

            {!sidebarCollapsed && (
              <span className={styles.brandText}>HCGA TEAM</span>
            )}
          </Link>

          <button
            type="button"
            className={styles.mobileCloseButton}
            onClick={() => setMobileSidebarOpen(false)}
            aria-label="Tutup sidebar"
          >
            <X size={21} />
          </button>
        </div>

        <nav className={styles.navigation}>
          <Link href="/dashboard" className={styles.mainNavigationItem}>
            <Home size={20} />

            {!sidebarCollapsed && <span>Dashboard</span>}
          </Link>

          <Link href={backTarget.href} className={styles.mainNavigationItem}>
            <ChevronLeft size={20} />

            {!sidebarCollapsed && <span>{backTarget.label}</span>}
          </Link>

          {!sidebarCollapsed && (
            <div className={styles.navigationLabel}>MENU {sectionTitle.toUpperCase()}</div>
          )}

          {visibleMenuGroups.map((group) => {
            const GroupIcon = group.icon;
            const isOpen = openGroups.includes(group.id);

            const isGroupActive = group.items.some(
              (item) => pathname === item.href,
            );

            return (
              <div className={styles.menuGroup} key={group.id}>
                <button
                  type="button"
                  className={`${styles.groupButton} ${
                    isGroupActive ? styles.groupButtonActive : ""
                  }`}
                  onClick={() => {
                    if (sidebarCollapsed) {
                      setSidebarCollapsed(false);
                      setOpenGroups((current) =>
                        current.includes(group.id)
                          ? current
                          : [...current, group.id],
                      );
                      return;
                    }

                    toggleGroup(group.id);
                  }}
                  title={sidebarCollapsed ? group.label : undefined}
                >
                  <GroupIcon size={20} />

                  {!sidebarCollapsed && (
                    <>
                      <span>{group.label}</span>

                      <ChevronDown
                        size={17}
                        className={
                          isOpen ? styles.groupChevronOpen : styles.groupChevron
                        }
                      />
                    </>
                  )}
                </button>

                {!sidebarCollapsed && isOpen && (
                  <div className={styles.submenu}>
                    {group.items.map((item) => {
                      const ItemIcon = item.icon;
                      const isActive = pathname === item.href;

                      return (
                        <Link
                          href={item.href}
                          className={`${styles.submenuItem} ${
                            isActive ? styles.submenuItemActive : ""
                          }`}
                          key={item.href}
                        >
                          <ItemIcon size={17} />
                          <span>{item.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <button
            type="button"
            className={styles.collapseButton}
            onClick={() => setSidebarCollapsed((current) => !current)}
          >
            {sidebarCollapsed ? (
              <ChevronRight size={20} />
            ) : (
              <>
                <PanelLeftClose size={20} />
                <span>Perkecil Sidebar</span>
              </>
            )}
          </button>
        </div>
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
              <Menu size={23} />
            </button>

            <div>
              <span>GA</span>
              <strong>{sectionTitle}</strong>
            </div>
          </div>

          <div className={styles.headerProfile}>
            <span className={styles.profileAvatar}>
              <UsersRound size={21} />
            </span>

            <div>
              <strong>{user?.name ?? "Pengguna"}</strong>
              <span>{formatRole(user?.role)}</span>
            </div>
          </div>
        </header>

        <div className={styles.pageContent}>{children}</div>
      </section>
    </div>
  );
}
