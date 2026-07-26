"use client";

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Boxes,
  CalendarDays,
  PackageOpen,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AnimatedLineChart from "@/components/dashboard-charts/animated-line-chart";

type InventoryScope = "general" | "mess" | "electric";

type ChartRow = {
  date: string;
  stockIn: number;
  stockOut: number;
  stock: number;
};

type DashboardResponse = {
  scope: string;
  month: number;
  year: number;
  summary: {
    totalItems: number;
    totalStockIn: number;
    totalStockOut: number;
    currentStock: number;
  };
  chart: ChartRow[];
};

type InventoryDashboardPageProps = {
  scope?: InventoryScope;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

const MONTHS = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function getToken() {
  if (typeof window === "undefined") {
    return "";
  }

  return (
    window.localStorage.getItem("hcga_access_token") ||
    window.sessionStorage.getItem("hcga_access_token") ||
    ""
  );
}

function formatChartDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);

  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
  });
}

export default function InventoryDashboardPage({
  scope = "general",
}: InventoryDashboardPageProps) {
  const today = new Date();

  const [month, setMonth] = useState(today.getMonth() + 1);

  const [year, setYear] = useState(today.getFullYear());

  const [data, setData] = useState<DashboardResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const title =
    scope === "mess"
      ? "Dashboard Inventory Mess"
      : scope === "electric"
        ? "Dashboard Inventory Electric"
        : "Dashboard Inventory Infras";

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const token = getToken();

      const response = await fetch(
        `${API_URL}/inventory-dashboard/${scope}?month=${month}&year=${year}`,
        {
          credentials: "include",
          headers: token
            ? {
                Authorization: `Bearer ${token}`,
              }
            : undefined,
        },
      );

      const payload = await response.json();

      if (!response.ok) {
        throw new Error(
          payload?.message || payload?.error || "Data grafik gagal dimuat.",
        );
      }

      setData(payload as DashboardResponse);
    } catch (currentError) {
      setError(
        currentError instanceof Error
          ? currentError.message
          : "Data grafik gagal dimuat.",
      );
    } finally {
      setLoading(false);
    }
  }, [month, scope, year]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const chart = data?.chart ?? [];

  const stockInChart = useMemo(
    () =>
      chart.map((row) => ({
        label: formatChartDate(row.date),
        value: row.stockIn,
      })),
    [chart],
  );

  const stockOutChart = useMemo(
    () =>
      chart.map((row) => ({
        label: formatChartDate(row.date),
        value: row.stockOut,
      })),
    [chart],
  );

  const stockChart = useMemo(
    () =>
      chart.map((row) => ({
        label: formatChartDate(row.date),
        value: row.stock,
      })),
    [chart],
  );

  const cardStyle = {
    background: "#ffffff",
    border: "1px solid #d8e4f2",
    borderRadius: 15,
    padding: 18,
    display: "flex",
    alignItems: "center",
    gap: 13,
  } as const;

  return (
    <main
      style={{
        display: "grid",
        gap: 14,
      }}
    >
      <section
        style={{
          background: "linear-gradient(110deg, #ffffff, #effff6)",
          border: "1px solid #cfe8da",
          borderRadius: 16,
          padding: "17px 18px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
          }}
        >
          <span
            style={{
              width: 45,
              height: 45,
              display: "grid",
              placeItems: "center",
              borderRadius: 12,
              background: "#069c5d",
              color: "#ffffff",
            }}
          >
            <TrendingUp size={24} />
          </span>

          <div>
            <h1
              style={{
                margin: 0,
                color: "#0d315c",
                fontSize: 24,
              }}
            >
              {title}
            </h1>

            <p
              style={{
                margin: "3px 0 0",
                color: "#687f9c",
                fontSize: 13,
              }}
            >
              Grafik Barang Masuk, Barang Keluar, dan Stok ditampilkan secara
              terpisah.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void loadDashboard()}
          disabled={loading}
          style={{
            border: 0,
            borderRadius: 10,
            background: "#069c5d",
            color: "#ffffff",
            padding: "11px 17px",
            fontWeight: 700,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 7,
          }}
        >
          <RefreshCw size={17} className={loading ? "dashboard-spin" : ""} />
          Muat Ulang
        </button>
      </section>

      {error && (
        <div
          style={{
            background: "#fff1f1",
            border: "1px solid #f3b5b5",
            color: "#c72727",
            borderRadius: 10,
            padding: "10px 13px",
            fontWeight: 600,
          }}
        >
          {error}
        </div>
      )}

      <section
        style={{
          background: "#ffffff",
          border: "1px solid #d8e4f2",
          borderRadius: 14,
          padding: 12,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <CalendarDays size={19} color="#174a78" />

        <strong
          style={{
            color: "#173f69",
            marginRight: "auto",
          }}
        >
          Periode Grafik
        </strong>

        <select
          value={month}
          onChange={(event) => setMonth(Number(event.target.value))}
          style={{
            minWidth: 150,
            padding: "9px 11px",
            border: "1px solid #cddbeb",
            borderRadius: 9,
          }}
        >
          {MONTHS.map((monthName, index) => (
            <option key={monthName} value={index + 1}>
              {monthName}
            </option>
          ))}
        </select>

        <select
          value={year}
          onChange={(event) => setYear(Number(event.target.value))}
          style={{
            minWidth: 115,
            padding: "9px 11px",
            border: "1px solid #cddbeb",
            borderRadius: 9,
          }}
        >
          {Array.from(
            { length: 7 },
            (_, index) => today.getFullYear() - 3 + index,
          ).map((yearOption) => (
            <option key={yearOption} value={yearOption}>
              {yearOption}
            </option>
          ))}
        </select>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        <div style={cardStyle}>
          <Boxes size={26} color="#3973dd" />
          <div>
            <span style={{ color: "#7185a0" }}>Master Barang</span>
            <strong
              style={{
                display: "block",
                color: "#0d315c",
                fontSize: 24,
              }}
            >
              {data?.summary.totalItems ?? 0}
            </strong>
          </div>
        </div>

        <div style={cardStyle}>
          <ArrowDownToLine size={26} color="#079669" />
          <div>
            <span style={{ color: "#7185a0" }}>Barang Masuk</span>
            <strong
              style={{
                display: "block",
                color: "#0d315c",
                fontSize: 24,
              }}
            >
              {data?.summary.totalStockIn ?? 0}
            </strong>
          </div>
        </div>

        <div style={cardStyle}>
          <ArrowUpFromLine size={26} color="#f17c16" />
          <div>
            <span style={{ color: "#7185a0" }}>Barang Keluar</span>
            <strong
              style={{
                display: "block",
                color: "#0d315c",
                fontSize: 24,
              }}
            >
              {data?.summary.totalStockOut ?? 0}
            </strong>
          </div>
        </div>

        <div style={cardStyle}>
          <PackageOpen size={26} color="#6748df" />
          <div>
            <span style={{ color: "#7185a0" }}>Stok Saat Ini</span>
            <strong
              style={{
                display: "block",
                color: "#0d315c",
                fontSize: 24,
              }}
            >
              {data?.summary.currentStock ?? 0}
            </strong>
          </div>
        </div>
      </section>

      <section
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
          gap: 14,
        }}
      >
        <AnimatedLineChart
          title="Grafik Barang Masuk"
          subtitle={`${MONTHS[month - 1]} ${year}`}
          data={stockInChart}
          accent="green"
        />

        <AnimatedLineChart
          title="Grafik Barang Keluar"
          subtitle={`${MONTHS[month - 1]} ${year}`}
          data={stockOutChart}
          accent="orange"
        />
      </section>

      <AnimatedLineChart
        title="Grafik Stok Barang"
        subtitle={`${MONTHS[month - 1]} ${year}`}
        data={stockChart}
        accent="purple"
      />

      <style jsx>{`
        .dashboard-spin {
          animation: dashboard-spin 0.8s linear infinite;
        }

        @keyframes dashboard-spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 700px) {
          main :global(section) {
            min-width: 0;
          }
        }
      `}</style>
    </main>
  );
}
