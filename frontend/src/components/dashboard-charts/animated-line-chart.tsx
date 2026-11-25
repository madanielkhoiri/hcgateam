"use client";

// Grafik garis satu seri (kurva halus + area gradasi + tooltip). Tampilan
// ada di line-chart-core.tsx; props dipertahankan supaya semua dashboard
// yang sudah memakai komponen ini otomatis ikut gaya baru.

import LineChartCore from "./line-chart-core";

type ChartPoint = {
  label: string;
  value: number;
};

type AnimatedLineChartProps = {
  title: string;
  subtitle?: string;
  data: ChartPoint[];
  accent: "green" | "orange" | "purple" | "blue";
  satuan?: string;
};

const colorMap = {
  green: "#0f9f6e",
  orange: "#f17c16",
  purple: "#6748df",
  blue: "#2b7fd8",
};

export default function AnimatedLineChart({ title, subtitle, data, accent, satuan }: AnimatedLineChartProps) {
  return (
    <LineChartCore
      title={title}
      subtitle={subtitle}
      labels={data.map((item) => item.label)}
      series={[{ label: title, color: colorMap[accent], values: data.map((item) => item.value) }]}
      satuan={satuan}
      area
      labelData
      teksKosong="Belum ada transaksi pada periode ini."
    />
  );
}
