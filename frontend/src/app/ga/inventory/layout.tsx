"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
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
import styles from "./inventory-layout.module.css";

type MenuItem = {
  label: string;
  href: string;
  icon: React.ElementType;
};

type MenuGroup = {
  id: string;
  label: string;
  icon: React.ElementType;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: BarChart3,
    items: [
      {
        label: "Dashboard Inventory",
        href: "/ga/inventory/dashboard-inventory",
        icon: BarChart3,
      },
      {
        label: "Dashboard Work Order",
        href: "/ga/inventory/dashboard-work-order",
        icon: ClipboardList,
      },
    ],
  },
  {
    id: "inventory",
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
    label: "Pekerjaan",
    icon: ClipboardList,
    items: [
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

  const inventoryTitle = pathname.startsWith("/ga/inventory/mess")
    ? "Inventory Mess"
    : pathname.startsWith("/ga/inventory/electric")
      ? "Inventory Electric"
      : "Inventory Infras";

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const [openGroups, setOpenGroups] = useState<string[]>(["inventory"]);

  useEffect(() => {
    const activeGroup = menuGroups.find((group) =>
      group.items.some((item) => pathname === item.href),
    );

    if (!activeGroup) {
      return;
    }

    setOpenGroups((current) =>
      current.includes(activeGroup.id) ? current : [...current, activeGroup.id],
    );
  }, [pathname]);

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

          <Link href="/ga" className={styles.mainNavigationItem}>
            <ChevronLeft size={20} />

            {!sidebarCollapsed && <span>Pilihan GA</span>}
          </Link>

          {!sidebarCollapsed && (
            <div className={styles.navigationLabel}>MENU INVENTORY</div>
          )}

          {menuGroups.map((group) => {
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
              <strong>{inventoryTitle}</strong>
            </div>
          </div>

          <div className={styles.headerProfile}>
            <span className={styles.profileAvatar}>
              <UsersRound size={21} />
            </span>

            <div>
              <strong>Administrator</strong>
              <span>Admin</span>
            </div>
          </div>
        </header>

        <div className={styles.pageContent}>{children}</div>
      </section>
    </div>
  );
}
