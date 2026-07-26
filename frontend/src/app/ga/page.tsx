"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Building2,
  ClipboardList,
  Construction,
  FileText,
  HardHat,
  ShieldCheck,
  Truck,
  UsersRound,
} from "lucide-react";
import styles from "./ga.module.css";

type LoginUser = {
  id: number;
  name: string;
  username: string;
  role: string;
};

type GaMenu = {
  title: string;
  description: string;
  status: string;
  href?: string;
  icon: React.ElementType;
  variant: string;
};

const gaMenus: GaMenu[] = [
  {
    title: "Inventory",
    description:
      "Pengelolaan master barang, barang masuk, barang keluar, dan stok Inventory Infras, Mess, serta Electric.",
    status: "12 menu tersedia",
    href: "/ga/inventory/dashboard-inventory",
    icon: Boxes,
    variant: "inventoryCard",
  },
  {
    title: "Pekerjaan",
    description:
      "Pengelolaan Work Order dan dokumen Serah Terima Pekerjaan.",
    status: "2 menu tersedia",
    href: "/ga/inventory/work-order",
    icon: ClipboardList,
    variant: "workCard",
  },
  {
    title: "Aktivitas Harian",
    description:
      "Pencatatan Daily Activity serta kegiatan pemotongan rumput.",
    status: "2 menu tersedia",
    href: "/ga/inventory/daily-report",
    icon: FileText,
    variant: "dailyCard",
  },
  {
    title: "Project",
    description:
      "Dokumentasi Pre-Activity Check dan laporan Post Activity pekerjaan project.",
    status: "2 menu tersedia",
    href: "/ga/inventory/pre-activity-check",
    icon: HardHat,
    variant: "projectCard",
  },
  {
    title: "Safety Meeting",
    description:
      "Pencatatan kegiatan P5M beserta materi, peserta, dan dokumentasi.",
    status: "1 menu tersedia",
    href: "/ga/inventory/p5m",
    icon: ShieldCheck,
    variant: "safetyCard",
  },
  {
    title: "Transport",
    description:
      "Pengelolaan data transportasi, bahan bakar, kilometer, dan laporan kendaraan.",
    status: "2 menu tersedia",
    href: "/ga/transport/dashboard",
    icon: Truck,
    variant: "transportCard",
  },
  {
    title: "General Service",
    description:
      "Layanan umum dan pengelolaan fasilitas untuk pengembangan berikutnya.",
    status: "Belum tersedia",
    icon: Construction,
    variant: "generalCard",
  },
];

function getSavedUser(): LoginUser {
  const defaultUser: LoginUser = {
    id: 0,
    name: "Administrator",
    username: "admin",
    role: "ADMIN",
  };

  if (typeof window === "undefined") {
    return defaultUser;
  }

  const savedUser =
    localStorage.getItem("hcga_user") ||
    sessionStorage.getItem("hcga_user");

  if (!savedUser) {
    return defaultUser;
  }

  try {
    return JSON.parse(savedUser) as LoginUser;
  } catch {
    return defaultUser;
  }
}

function formatRole(role: string) {
  return role
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default function GaPage() {
  const user = getSavedUser();

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/dashboard" className={styles.brand}>
          <span className={styles.brandLogo}>
            <UsersRound size={24} />
          </span>
          <strong>HCGA TEAM</strong>
        </Link>

        <div className={styles.profile}>
          <span className={styles.profileIcon}>
            <UsersRound size={22} />
          </span>
          <div>
            <strong>{user.name}</strong>
            <span>{formatRole(user.role)}</span>
          </div>
        </div>
      </header>

      <section className={styles.main}>
        <div className={styles.container}>
          <Link href="/dashboard" className={styles.backButton}>
            <ArrowLeft size={18} />
            Kembali ke Dashboard
          </Link>

          <div className={styles.titleSection}>
            <span className={styles.gaIcon}>
              <Building2 size={31} />
            </span>
            <div>
              <h1>GA (General Affair)</h1>
              <p>Pilih layanan dan pengelolaan data General Affair.</p>
            </div>
          </div>

          <div className={styles.categoryGrid}>
            {gaMenus.map((menu) => {
              const Icon = menu.icon;
              const cardClass = `${styles.categoryCard} ${styles[menu.variant]}`;
              const content = (
                <>
                  <span className={styles.categoryIcon}>
                    <Icon size={34} />
                  </span>

                  <div className={styles.categoryContent}>
                    <h2>{menu.title}</h2>
                    <p>{menu.description}</p>
                    <span className={styles.cardStatus}>{menu.status}</span>
                  </div>

                  {menu.href ? (
                    <ArrowRight className={styles.cardArrow} size={23} />
                  ) : null}
                </>
              );

              return menu.href ? (
                <Link key={menu.title} href={menu.href} className={cardClass}>
                  {content}
                </Link>
              ) : (
                <article key={menu.title} className={cardClass}>
                  {content}
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <span>© 2026 HCGA TEAM. Semua hak dilindungi.</span>
        <span>|</span>
        <span>Portal Internal</span>
        <span>|</span>
        <span>v1.0.0</span>
      </footer>
    </main>
  );
}
