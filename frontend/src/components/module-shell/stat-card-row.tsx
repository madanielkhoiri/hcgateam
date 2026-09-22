// ==================================================
// FILE: frontend/src/components/module-shell/stat-card-row.tsx
// FUNGSI: Baris kartu statistik generik untuk halaman dashboard tiap
// modul - dipakai bareng ModuleShell. Gaya visual & ukuran mengikuti
// pola card dashboard-charts (border #d8e4f2, radius 16).
// ==================================================

import styles from './stat-card-row.module.css';

export type StatCard = {
  label: string;
  value: string | number;
  trend?: string;
  trendColor?: string;
  initial: string;
  iconBg: string;
  iconColor: string;
};

export function StatCardRow({ cards }: { cards: StatCard[] }) {
  return (
    <div className={styles.row}>
      {cards.map((card) => (
        <div key={card.label} className={styles.card}>
          <div className={styles.top}>
            <span className={styles.label}>{card.label}</span>
            <div
              className={styles.icon}
              style={{ background: card.iconBg, color: card.iconColor }}
            >
              {card.initial}
            </div>
          </div>
          <strong className={styles.value}>{card.value}</strong>
          {card.trend && (
            <span className={styles.trend} style={{ color: card.trendColor ?? '#6f819d' }}>
              {card.trend}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
