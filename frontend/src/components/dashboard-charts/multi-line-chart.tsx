"use client";

// Grafik garis banyak seri (kurva halus, tooltip gabungan, legend yang bisa
// diklik untuk menyembunyikan seri). Tampilan ada di line-chart-core.tsx.

import LineChartCore from "./line-chart-core";

type Series = { label: string; color: string; values: number[] };

export default function MultiLineChart({
  title,
  subtitle,
  labels,
  series,
  satuan = "kg",
}: {
  title: string;
  subtitle?: string;
  labels: string[];
  series: Series[];
  satuan?: string;
}) {
  return (
    <LineChartCore
      title={title}
      subtitle={subtitle}
      labels={labels}
      series={series}
      satuan={satuan}
      legend
    />
  );
}
