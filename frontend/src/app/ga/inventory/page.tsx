import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  ClipboardList,
  FileText,
  PackageMinus,
  PackagePlus,
  ShieldCheck,
  Warehouse,
} from "lucide-react";
import styles from "./page.module.css";

const quickMenus = [
  {
    title: "Master Barang",
    description: "Kelola data barang dan kategori.",
    href: "/ga/inventory/master-barang",
    icon: Boxes,
  },
  {
    title: "Barang Masuk",
    description: "Catat penerimaan barang baru.",
    href: "/ga/inventory/barang-masuk",
    icon: PackagePlus,
  },
  {
    title: "Barang Keluar",
    description: "Catat penggunaan dan pengeluaran barang.",
    href: "/ga/inventory/barang-keluar",
    icon: PackageMinus,
  },
  {
    title: "Daily Report",
    description: "Buat laporan pekerjaan harian.",
    href: "/ga/inventory/daily-report",
    icon: FileText,
  },
];

export default function InventoryPage() {
  return (
    <main className={styles.page}>
      <div className={styles.breadcrumb}>
        <span>GA</span>
        <span>/</span>
        <strong>Inventory</strong>
      </div>

      <section className={styles.hero}>
        <div>
          <span className={styles.heroIcon}>
            <Boxes size={30} />
          </span>

          <div>
            <h1>Inventory</h1>
            <p>
              Kelola barang, pekerjaan, aktivitas harian,
              project, dan safety meeting dalam satu halaman.
            </p>
          </div>
        </div>
      </section>

      <section className={styles.statGrid}>
        <article>
          <span className={styles.statIcon}>
            <Boxes size={22} />
          </span>

          <div>
            <strong>18</strong>
            <p>Total Menu</p>
          </div>
        </article>

        <article>
          <span className={styles.statIcon}>
            <Warehouse size={22} />
          </span>

          <div>
            <strong>0</strong>
            <p>Total Barang</p>
          </div>
        </article>

        <article>
          <span className={styles.statIcon}>
            <ClipboardList size={22} />
          </span>

          <div>
            <strong>0</strong>
            <p>Work Order Aktif</p>
          </div>
        </article>

        <article>
          <span className={styles.statIcon}>
            <ShieldCheck size={22} />
          </span>

          <div>
            <strong>0</strong>
            <p>Aktivitas Hari Ini</p>
          </div>
        </article>
      </section>

      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <div>
            <h2>Akses Cepat</h2>
            <p>Menu yang paling sering digunakan.</p>
          </div>
        </div>

        <div className={styles.quickGrid}>
          {quickMenus.map((menu) => {
            const Icon = menu.icon;

            return (
              <Link
                href={menu.href}
                className={styles.quickCard}
                key={menu.href}
              >
                <span>
                  <Icon size={23} />
                </span>

                <div>
                  <h3>{menu.title}</h3>
                  <p>{menu.description}</p>
                </div>

                <ArrowRight size={18} />
              </Link>
            );
          })}
        </div>
      </section>

      <section className={styles.bottomGrid}>
        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Aktivitas Terbaru</h2>
              <p>Perubahan terbaru pada modul Inventory.</p>
            </div>
          </div>

          <div className={styles.emptyState}>
            <FileText size={30} />
            <strong>Belum ada aktivitas</strong>
            <p>
              Aktivitas pengguna akan ditampilkan di sini.
            </p>
          </div>
        </article>

        <article className={styles.panel}>
          <div className={styles.panelHeader}>
            <div>
              <h2>Informasi Stok</h2>
              <p>Ringkasan kondisi persediaan barang.</p>
            </div>
          </div>

          <div className={styles.emptyState}>
            <Warehouse size={30} />
            <strong>Data stok masih kosong</strong>
            <p>
              Tambahkan Master Barang dan Barang Masuk terlebih
              dahulu.
            </p>
          </div>
        </article>
      </section>
    </main>
  );
}
