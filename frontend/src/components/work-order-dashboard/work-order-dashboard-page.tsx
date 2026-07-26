"use client";

import {
  CalendarDays,
  CheckCircle2,
  CircleDot,
  ClipboardList,
  Gauge,
  LoaderCircle,
  RefreshCw,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";

type DashboardRow = {
  label: string;
  total: number;
  open: number;
  onProgress: number;
  close: number;
  closingRate: number;
};

type DashboardResponse = {
  filter: {
    month: number | null;
    year: number;
    mode: "ALL_MONTHS" | "MONTH";
  };
  summary: {
    total: number;
    open: number;
    onProgress: number;
    close: number;
    closingRate: number;
  };
  chart: DashboardRow[];
};

type Point = DashboardRow & {
  x: number;
  openY: number;
  progressY: number;
  closeY: number;
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

const CHART_WIDTH = 1200;
const CHART_HEIGHT = 390;
const LEFT = 70;
const RIGHT = 35;
const TOP = 38;
const BOTTOM = 68;

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

function createLinePath(
  points: Point[],
  field: "openY" | "progressY" | "closeY",
) {
  return points
    .map((point, index) => {
      const command = index === 0 ? "M" : "L";

      return `${command} ${point.x.toFixed(2)} ${point[field].toFixed(2)}`;
    })
    .join(" ");
}

function closingRateColor(value: number) {
  if (value >= 80) {
    return "#079669";
  }

  if (value >= 60) {
    return "#2563eb";
  }

  if (value >= 40) {
    return "#f59e0b";
  }

  return "#dc2626";
}

export default function WorkOrderDashboardPage() {
  const currentDate = new Date();

  const [month, setMonth] = useState<string>("all");
  const [year, setYear] = useState(currentDate.getFullYear());

  const [data, setData] = useState<DashboardResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [animationKey, setAnimationKey] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadDashboard = useCallback(
    async (silent = false) => {
      if (!silent) {
        setLoading(true);
      }

      setError("");

      try {
        const token = getToken();

        const response = await fetch(
          `${API_URL}/work-orders/dashboard?month=${month}&year=${year}`,
          {
            credentials: "include",
            headers: token
              ? {
                  Authorization: `Bearer ${token}`,
                }
              : undefined,
            cache: "no-store",
          },
        );

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            payload?.message ||
              payload?.error ||
              "Dashboard Work Order gagal dimuat.",
          );
        }

        setData(payload as DashboardResponse);
        setAnimationKey((current) => current + 1);
        setLastUpdated(new Date());
      } catch (currentError) {
        setError(
          currentError instanceof Error
            ? currentError.message
            : "Dashboard Work Order gagal dimuat.",
        );
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [month, year],
  );

  useEffect(() => {
    void loadDashboard();

    const interval = window.setInterval(() => {
      void loadDashboard(true);
    }, 10000);

    return () => {
      window.clearInterval(interval);
    };
  }, [loadDashboard]);

  const chart = data?.chart ?? [];

  const maximum = useMemo(
    () =>
      Math.max(
        1,
        ...chart.flatMap((row) => [row.open, row.onProgress, row.close]),
      ),
    [chart],
  );

  const points = useMemo<Point[]>(() => {
    const drawableWidth = CHART_WIDTH - LEFT - RIGHT;

    const drawableHeight = CHART_HEIGHT - TOP - BOTTOM;

    return chart.map((row, index) => {
      const x =
        chart.length <= 1
          ? LEFT + drawableWidth / 2
          : LEFT + (index / (chart.length - 1)) * drawableWidth;

      const toY = (value: number) =>
        TOP + drawableHeight - (value / maximum) * drawableHeight;

      return {
        ...row,
        x,
        openY: toY(row.open),
        progressY: toY(row.onProgress),
        closeY: toY(row.close),
      };
    });
  }, [chart, maximum]);

  const openPath = createLinePath(points, "openY");

  const progressPath = createLinePath(points, "progressY");

  const closePath = createLinePath(points, "closeY");

  const closingRate = data?.summary.closingRate ?? 0;

  const rateColor = closingRateColor(closingRate);

  const periodDescription =
    month === "all"
      ? `Semua bulan tahun ${year}`
      : `${MONTHS[Number(month) - 1]} ${year}`;

  const cards = [
    {
      label: "Total Work Order",
      value: data?.summary.total ?? 0,
      icon: ClipboardList,
      color: "#2563eb",
      background: "#eaf2ff",
    },
    {
      label: "Open",
      value: data?.summary.open ?? 0,
      icon: CircleDot,
      color: "#f97316",
      background: "#fff2e5",
    },
    {
      label: "On Progress",
      value: data?.summary.onProgress ?? 0,
      icon: LoaderCircle,
      color: "#7048e8",
      background: "#f1ebff",
    },
    {
      label: "Close",
      value: data?.summary.close ?? 0,
      icon: CheckCircle2,
      color: "#079669",
      background: "#e8faf2",
    },
  ];

  return (
    <main className="work-order-dashboard">
      <section className="hero">
        <div className="hero-content">
          <span className="hero-icon">
            <TrendingUp size={25} />
          </span>

          <div>
            <h1>Dashboard Work Order</h1>
            <p>Perbandingan Open, On Progress, Close, dan Closing Rate.</p>
          </div>
        </div>

        <button
          type="button"
          className="refresh-button"
          onClick={() => void loadDashboard()}
          disabled={loading}
        >
          <RefreshCw size={17} className={loading ? "spin" : ""} />
          Muat Ulang
        </button>
      </section>

      {error && <div className="error-box">{error}</div>}

      <section className="period-filter">
        <div className="period-title">
          <CalendarDays size={19} />
          <div>
            <strong>Periode Grafik</strong>
            <span>{periodDescription}</span>
          </div>
        </div>

        <select
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        >
          <option value="all">Semua Bulan</option>

          {MONTHS.map((name, index) => (
            <option key={name} value={String(index + 1)}>
              {name}
            </option>
          ))}
        </select>

        <select
          value={year}
          onChange={(event) => setYear(Number(event.target.value))}
        >
          {Array.from(
            { length: 8 },
            (_, index) => currentDate.getFullYear() - 5 + index,
          ).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
      </section>

      <section className="summary-grid">
        {cards.map((card) => {
          const Icon = card.icon;

          return (
            <article className="summary-card" key={card.label}>
              <span
                className="summary-icon"
                style={{
                  color: card.color,
                  background: card.background,
                }}
              >
                <Icon size={23} />
              </span>

              <div>
                <span>{card.label}</span>
                <strong>{card.value}</strong>
              </div>
            </article>
          );
        })}

        <article className="summary-card closing-card">
          <span
            className="summary-icon"
            style={{
              color: rateColor,
              background: `${rateColor}18`,
            }}
          >
            <Gauge size={24} />
          </span>

          <div className="closing-content">
            <span>Closing Rate</span>

            <strong style={{ color: rateColor }}>
              {closingRate.toLocaleString("id-ID", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1,
              })}
              %
            </strong>

            <small>
              {data?.summary.close ?? 0} dari {data?.summary.total ?? 0} WO
              selesai
            </small>
          </div>
        </article>
      </section>

      <section className="closing-progress-card">
        <div className="closing-progress-header">
          <div>
            <strong>Persentase Penyelesaian WO</strong>
            <span>{periodDescription}</span>
          </div>

          <strong style={{ color: rateColor }}>
            {closingRate.toLocaleString("id-ID", {
              minimumFractionDigits: 1,
              maximumFractionDigits: 1,
            })}
            %
          </strong>
        </div>

        <div className="progress-track">
          <div
            className="progress-value"
            style={{
              width: `${Math.min(100, Math.max(0, closingRate))}%`,
              background: rateColor,
            }}
          />
        </div>

        <div className="progress-labels">
          <span>0%</span>
          <span>50%</span>
          <span>100%</span>
        </div>
      </section>

      <section className="chart-card">
        <header className="chart-header">
          <div>
            <h2>Grafik Status Work Order</h2>
            <p>Grafik diperbarui otomatis setiap 10 detik.</p>
          </div>

          <div className="legend">
            <span>
              <i className="legend-open" />
              Open
            </span>

            <span>
              <i className="legend-progress" />
              On Progress
            </span>

            <span>
              <i className="legend-close" />
              Close
            </span>
          </div>
        </header>

        {loading ? (
          <div className="empty-chart">
            <RefreshCw className="spin" size={29} />
            <span>Memuat grafik...</span>
          </div>
        ) : points.length === 0 ? (
          <div className="empty-chart">
            <TrendingUp size={35} />
            <strong>Belum ada Work Order pada periode ini.</strong>
          </div>
        ) : (
          <div className="chart-scroll">
            <svg
              key={animationKey}
              viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
              role="img"
              aria-label="Grafik status Work Order"
              className="chart-svg"
            >
              {Array.from({ length: 6 }, (_, index) => {
                const value = Math.round(maximum - (maximum / 5) * index);

                const drawableHeight = CHART_HEIGHT - TOP - BOTTOM;

                const y = TOP + (index / 5) * drawableHeight;

                return (
                  <g key={`${value}-${index}`}>
                    <line
                      x1={LEFT}
                      y1={y}
                      x2={CHART_WIDTH - RIGHT}
                      y2={y}
                      className="grid-line"
                    />

                    <text
                      x={LEFT - 15}
                      y={y + 5}
                      textAnchor="end"
                      className="axis-text"
                    >
                      {value}
                    </text>
                  </g>
                );
              })}

              <line
                x1={LEFT}
                y1={CHART_HEIGHT - BOTTOM}
                x2={CHART_WIDTH - RIGHT}
                y2={CHART_HEIGHT - BOTTOM}
                className="axis-line"
              />

              <path d={openPath} className="animated-line line-open" />

              <path d={progressPath} className="animated-line line-progress" />

              <path d={closePath} className="animated-line line-close" />

              {points.map((point, index) => (
                <g key={`${point.label}-${index}`}>
                  <circle
                    cx={point.x}
                    cy={point.openY}
                    r="6"
                    className="chart-point point-open"
                  >
                    <title>
                      {point.label} — Open: {point.open}
                    </title>
                  </circle>

                  <circle
                    cx={point.x}
                    cy={point.progressY}
                    r="6"
                    className="chart-point point-progress"
                  >
                    <title>
                      {point.label} — On Progress: {point.onProgress}
                    </title>
                  </circle>

                  <circle
                    cx={point.x}
                    cy={point.closeY}
                    r="6"
                    className="chart-point point-close"
                  >
                    <title>
                      {point.label} — Close: {point.close}
                    </title>
                  </circle>

                  <text
                    x={point.x}
                    y={CHART_HEIGHT - BOTTOM + 29}
                    textAnchor="middle"
                    className="date-text"
                  >
                    {point.label}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        )}

        <footer className="chart-footer">
          <span>
            Pembaruan terakhir:{" "}
            {lastUpdated ? lastUpdated.toLocaleTimeString("id-ID") : "-"}
          </span>

          <span>Closing Rate = Close ÷ Total WO × 100%</span>
        </footer>
      </section>

      <style jsx>{`
        .work-order-dashboard {
          display: grid;
          gap: 14px;
          min-width: 0;
        }

        .hero,
        .period-filter,
        .summary-card,
        .closing-progress-card,
        .chart-card {
          border: 1px solid #d7e3f1;
          background: #ffffff;
          border-radius: 15px;
        }

        .hero {
          padding: 17px 18px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          background: linear-gradient(110deg, #ffffff, #effff6);
        }

        .hero-content {
          display: flex;
          align-items: center;
          gap: 13px;
        }

        .hero-icon {
          width: 45px;
          height: 45px;
          flex: 0 0 45px;
          display: grid;
          place-items: center;
          border-radius: 12px;
          color: #ffffff;
          background: #079669;
        }

        h1,
        h2,
        p {
          margin: 0;
        }

        h1 {
          color: #0d315c;
          font-size: 24px;
        }

        .hero p,
        .chart-header p {
          margin-top: 4px;
          color: #6e84a0;
          font-size: 12px;
        }

        .refresh-button {
          min-height: 40px;
          padding: 0 16px;
          border: 0;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #ffffff;
          background: #079669;
          font-weight: 750;
          cursor: pointer;
        }

        .period-filter {
          padding: 11px 13px;
          display: grid;
          grid-template-columns: 1fr 190px 125px;
          gap: 10px;
          align-items: center;
        }

        .period-title {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #17446f;
        }

        .period-title strong,
        .period-title span {
          display: block;
        }

        .period-title span {
          margin-top: 3px;
          color: #7186a0;
          font-size: 11px;
        }

        select {
          min-height: 40px;
          padding: 0 12px;
          border: 1px solid #cbd9e9;
          border-radius: 9px;
          color: #183e69;
          background: #ffffff;
        }

        .summary-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 11px;
        }

        .summary-card {
          min-height: 92px;
          padding: 15px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .summary-icon {
          width: 42px;
          height: 42px;
          flex: 0 0 42px;
          display: grid;
          place-items: center;
          border-radius: 11px;
        }

        .summary-card span {
          color: #7185a0;
          font-size: 12px;
        }

        .summary-card strong {
          display: block;
          margin-top: 4px;
          color: #0e315c;
          font-size: 23px;
        }

        .closing-content small {
          display: block;
          margin-top: 3px;
          color: #7a8da4;
          font-size: 10px;
        }

        .closing-progress-card {
          padding: 15px 17px;
        }

        .closing-progress-header,
        .progress-labels {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .closing-progress-header span {
          display: block;
          margin-top: 3px;
          color: #7185a0;
          font-size: 11px;
        }

        .closing-progress-header > strong {
          font-size: 22px;
        }

        .progress-track {
          height: 13px;
          margin-top: 13px;
          overflow: hidden;
          border-radius: 99px;
          background: #e8eef5;
        }

        .progress-value {
          height: 100%;
          border-radius: inherit;
          transition: width 0.8s ease;
        }

        .progress-labels {
          margin-top: 6px;
          color: #8393a8;
          font-size: 10px;
        }

        .chart-card {
          min-width: 0;
          overflow: hidden;
        }

        .chart-header {
          padding: 16px 18px;
          border-bottom: 1px solid #e0e9f3;
          display: flex;
          align-items: center;
          gap: 15px;
        }

        .chart-header h2 {
          color: #0d315c;
          font-size: 17px;
        }

        .legend {
          margin-left: auto;
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 15px;
        }

        .legend span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #48647f;
          font-size: 11px;
          font-weight: 700;
        }

        .legend i {
          width: 22px;
          height: 4px;
          border-radius: 99px;
        }

        .legend-open {
          background: #f97316;
        }

        .legend-progress {
          background: #7048e8;
        }

        .legend-close {
          background: #079669;
        }

        .chart-scroll {
          width: 100%;
          overflow-x: auto;
          padding: 8px 13px 0;
        }

        .chart-svg {
          display: block;
          width: 100%;
          min-width: 760px;
          height: auto;
        }

        .grid-line {
          stroke: #dce7f2;
          stroke-width: 1;
          stroke-dasharray: 5 7;
        }

        .axis-line {
          stroke: #aec0d3;
          stroke-width: 1.4;
        }

        .axis-text,
        .date-text {
          fill: #687f9b;
          font-size: 12px;
          font-weight: 650;
        }

        .animated-line {
          fill: none;
          stroke-width: 4;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          path-length: 1;
          animation: draw-line 1.7s linear forwards;
        }

        .line-open {
          stroke: #f97316;
        }

        .line-progress {
          stroke: #7048e8;
          animation-delay: 0.12s;
        }

        .line-close {
          stroke: #079669;
          animation-delay: 0.24s;
        }

        .chart-point {
          stroke: #ffffff;
          stroke-width: 3;
          opacity: 0;
          animation: show-point 0.4s ease 1.25s forwards;
        }

        .point-open {
          fill: #f97316;
        }

        .point-progress {
          fill: #7048e8;
        }

        .point-close {
          fill: #079669;
        }

        .chart-footer {
          padding: 10px 17px;
          border-top: 1px solid #e4ebf3;
          display: flex;
          justify-content: space-between;
          gap: 12px;
          color: #71849b;
          font-size: 10px;
        }

        .empty-chart {
          min-height: 340px;
          padding: 30px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: #7188a3;
          text-align: center;
        }

        .error-box {
          padding: 11px 13px;
          border: 1px solid #f1b2b2;
          border-radius: 10px;
          color: #bf2929;
          background: #fff0f0;
          font-weight: 700;
        }

        .spin {
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes draw-line {
          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes show-point {
          to {
            opacity: 1;
          }
        }

        @media (max-width: 1100px) {
          .summary-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }
        }

        @media (max-width: 750px) {
          .hero {
            align-items: flex-start;
            flex-wrap: wrap;
          }

          .refresh-button {
            width: 100%;
          }

          .period-filter {
            grid-template-columns: 1fr;
          }

          .summary-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .chart-header,
          .chart-footer {
            align-items: flex-start;
            flex-direction: column;
          }

          .legend {
            margin-left: 0;
          }
        }

        @media (max-width: 450px) {
          .summary-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  );
}
