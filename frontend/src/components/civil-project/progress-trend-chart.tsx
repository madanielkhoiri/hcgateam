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
  const urutKunci = (a: string, b: string) => {
    const wa = Number(a.match(/\d+/)?.[0] ?? 0);
    const wb = Number(b.match(/\d+/)?.[0] ?? 0);
    return wa - wb || a.localeCompare(b);
  };
  const tanggal = Array.from(new Set(seri.flatMap((s) => s.data.map(kunciX)))).sort(urutKunci);
  if (!tanggal.length) return null;

  const cari = (s: Seri, kunci: string) => s.data.find((d) => kunciX(d) === kunci) ?? null;

  const nilai = seri.flatMap((s) => s.data.flatMap((d) => (detail ? [d.planned, d.actual] : [d.actual])));
  const maxNilai = Math.max(...nilai, 1);
  const sumbuMaks = maxNilai <= 25 ? 25 : Math.min(100, Math.ceil((maxNilai * 1.2) / 5) * 5);

  let labels = tanggal.map((t) => (/^week\s+\d+$/i.test(t) ? t : formatBulanSingkat(t)));

  let series: SeriGaris[];
  let tooltipTambahan: ((i: number) => ReactNode) | undefined;
  let labelEkstra: ((i: number) => { teks: string; warna: string } | null) | undefined;

  if (detail) {
    const project = seri[0];
    series = [
      { label: "Planned", color: ORANYE, values: tanggal.map((t) => cari(project, t)?.planned ?? null) },
      { label: "Actual", color: BIRU, values: tanggal.map((t) => cari(project, t)?.actual ?? null) },
    ];
    // Deviasi (Actual - Planned) tampil langsung di atas tiap tanggal: hijau = lebih cepat, merah = terlambat.
    labelEkstra = (i) => {
      const titik = cari(project, tanggal[i]);
      if (!titik) return null;
      const positif = titik.deviasi >= 0;
      return { teks: `${positif ? "+" : ""}${persen(titik.deviasi)}`, warna: positif ? "#078b49" : "#d53535" };
    };
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
    // Semua project: tiap garis direntangkan dari "Mulai" sampai "Terakhir" (panjang sama
    // walau jumlah minggu laporannya berbeda), yang dibandingkan hanya persennya.
    const urut = seri.map((s) => [...s.data].sort((a, b) => urutKunci(kunciX(a), kunciX(b))));
    const kolom = Math.max(2, ...urut.map((d) => d.length));
    const posisi = (j: number, n: number) => (n <= 1 ? kolom - 1 : Math.round((j * (kolom - 1)) / (n - 1)));
    const mingguDi = urut.map((data) => {
      const peta = new Map<number, Titik>();
      data.forEach((d, j) => peta.set(posisi(j, data.length), d));
      return peta;
    });
    labels = Array.from({ length: kolom }, (_, i) => (i === 0 ? "Mulai" : i === kolom - 1 ? "Terakhir" : ""));
    series = seri.map((s, i) => ({
      label: s.namaProject,
      color: WARNA[i % WARNA.length],
      values: labels.map((_, k) => mingguDi[i].get(k)?.actual ?? null),
    }));
    tooltipTambahan = (k) => {
      const baris = seri
        .map((s, i) => ({ s, d: mingguDi[i].get(k), warna: WARNA[i % WARNA.length] }))
        .filter((b): b is { s: Seri; d: Titik; warna: string } => !!b.d);
      if (!baris.length) return null;
      return (
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px solid #edf2f7", color: "#5d7491", fontSize: 11 }}>
          {baris.map((b) => (
            <div key={b.s.id} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
              <span style={{ color: b.warna }}>{b.s.namaProject}</span>
              <span>{kunciX(b.d).replace(/^week/i, "Week")}</span>
            </div>
          ))}
        </div>
      );
    };
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
        labelEkstra={labelEkstra}
        angkaUjungSaja={!detail}
        legend
      />
    </div>
  );
}
