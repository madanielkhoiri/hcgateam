"use client";

import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Boxes,
  Building2,
  Construction,
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
    .map((part) => {
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
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
              <p>
                Pilih kategori layanan dan pengelolaan data General
                Affair.
              </p>
            </div>
          </div>

          <div className={styles.categoryGrid}>
            <Link
              href="/ga/inventory"
              className={`${styles.categoryCard} ${styles.inventoryCard}`}
            >
              <span className={styles.categoryIcon}>
                <Boxes size={36} />
              </span>

              <div className={styles.categoryContent}>
                <h2>Inventory</h2>
                <p>
                  Pengelolaan inventory, pekerjaan, aktivitas harian,
                  project, inspeksi, dan safety meeting.
                </p>

                <span className={styles.inventoryStatus}>
                  18 menu tersedia
                </span>
              </div>

              <ArrowRight className={styles.cardArrow} size={24} />
            </Link>

            <article
              className={`${styles.categoryCard} ${styles.transportCard}`}
            >
              <span className={styles.categoryIcon}>
                <Truck size={36} />
              </span>

              <div className={styles.categoryContent}>
                <h2>Transport</h2>
                <p>
                  Pengelolaan data transportasi, bahan bakar,
                  kilometer, dan laporan kendaraan.
                </p>

                <span className={styles.transportStatus}>
                  Tahap berikutnya
                </span>
              </div>
            </article>

            <article
              className={`${styles.categoryCard} ${styles.generalCard}`}
            >
              <span className={styles.categoryIcon}>
                <Construction size={36} />
              </span>

              <div className={styles.categoryContent}>
                <h2>General Service</h2>
                <p>
                  Kategori layanan umum dan fasilitas akan
                  dikembangkan kemudian.
                </p>

                <span className={styles.generalStatus}>
                  Belum tersedia
                </span>
              </div>
            </article>
          </div>

          <section className={styles.modulePreview}>
            <div className={styles.sectionHeading}>
              <h2>Kategori GA</h2>
              <p>
                Setiap kategori memiliki data dan layanan yang
                terpisah.
              </p>
            </div>

            <div className={styles.previewGrid}>
              <article>
                <span className={styles.previewInventory}>
                  <Boxes size={25} />
                </span>

                <div>
                  <h3>Inventory</h3>
                  <p>
                    Fitur inventory dan operasional dari sistem HCGA
                    FlyHigh.
                  </p>
                </div>
              </article>

              <article>
                <span className={styles.previewTransport}>
                  <Truck size={25} />
                </span>

                <div>
                  <h3>Transport</h3>
                  <p>
                    Fitur Dashboard Transportasi dan data
                    Transportasi dipindahkan ke sini.
                  </p>
                </div>
              </article>

              <article>
                <span className={styles.previewGeneral}>
                  <Construction size={25} />
                </span>

                <div>
                  <h3>General Service</h3>
                  <p>
                    Masih kosong dan disiapkan untuk pengembangan
                    berikutnya.
                  </p>
                </div>
              </article>
            </div>
          </section>
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
