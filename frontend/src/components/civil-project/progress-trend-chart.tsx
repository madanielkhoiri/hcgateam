"use client";

// ==================================================
// Tren progress e-ProM (Laporan Mingguan):
// - Semua project : progress Actual tiap project (satu garis per project)
// - Satu project  : Planned vs Actual, deviasi tampil di tooltip
// Tampilan memakai grafik garis dashboard bersama (kurva halus + tooltip).
// ==================================================

import type { ReactNode } from "react";
import LineChartCore, { type SeriGaris } from "@/components/dashboard-charts/line-chart-core";
import { formatBulanSingkat } from "@/lib/eprom-api";

type Titik = {
  bulan: string;
  week?: string;
  planned: number;
  actual: number;
  deviasi: number;
};
type Seri = { id: number; namaProject: string; data: Titik[] };

const ORANYE = "#ef7100";
const BIRU = "#0868f6";
const WARNA = ["#0868f6", "#07984c", "#ef7100", "#7a4ce0", "#d53535", "#0aa3a3"];

const persen = (n: number) => `${n.toLocaleString("id-ID", { maximumFractionDigits: 2 })}%`;

export function ProgressTrendChart({ seri, detail = false }: { seri: Seri[]; detail?: boolean }) {
  const kunciX = (titik: Titik) => (detail ? titik.bulan : (titik.week ?? titik.bulan));
  const tanggal = Array.from(new Set(seri.flatMap((s) => s.data.map(kunciX)))).sort((a, b) => {
    const wa = Number(a.match(/\d+/)?.[0] ?? 0);
    const wb = Number(b.match(/\d+/)?.[0] ?? 0);
    return wa - wb || a.localeCompare(b);
  });
  if (!tanggal.length) return null;

  const cari = (s: Seri, kunci: string) => s.data.find((d) => kunciX(d) === kunci) ?? null;

  const nilai = seri.flatMap((s) => s.data.flatMap((d) => (detail ? [d.planned, d.actual] : [d.actual])));
  const maxNilai = Math.max(...nilai, 1);
  const sumbuMaks = maxNilai <= 25 ? 25 : Math.min(100, Math.ceil((maxNilai * 1.2) / 5) * 5);

  const labels = tanggal.map((t) => (/^week\s+\d+$/i.test(t) ? t : formatBulanSingkat(t)));

  let series: SeriGaris[];
  let tooltipTambahan: ((i: number) => ReactNode) | undefined;

  if (detail) {
    const project = seri[0];
    series = [
      { label: "Planned", color: ORANYE, values: tanggal.map((t) => cari(project, t)?.planned ?? null) },
      { label: "Actual", color: BIRU, values: tanggal.map((t) => cari(project, t)?.actual ?? null) },
    ];
    tooltipTambahan = (i) => {
      const titik = cari(project, tanggal[i]);
      if (!titik) return null;
      const positif = titik.deviasi >= 0;
      return (
        <div
          style={{
            marginTop: 6,
            paddingTop: 6,
            borderTop: "1px solid #edf2f7",
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            color: "#5d7491",
          }}
        >
          <span>Deviasi</span>
          <b style={{ color: positif ? "#078b49" : "#d53535" }}>
            {positif ? "+" : ""}
            {persen(titik.deviasi)}
          </b>
        </div>
      );
    };
  } else {
    series = seri.map((s, i) => ({
      label: s.namaProject,
      color: WARNA[i % WARNA.length],
      values: tanggal.map((t) => cari(s, t)?.actual ?? null),
    }));
  }

  return (
    <div>
      {detail && seri[0] && (
        <div style={{ marginBottom: 4, color: "#34506f", fontSize: 12.5, fontWeight: 700 }}>{seri[0].namaProject}</div>
      )}
      <LineChartCore
        polos
        title={detail ? `Progress ${seri[0]?.namaProject ?? ""}` : "Tren progress project"}
        labels={labels}
        series={series}
        sumbuMaks={sumbuMaks}
        formatNilai={persen}
        tooltipTambahan={tooltipTambahan}
        area={series.length <= 2}
        legend
      />
    </div>
  );
}
