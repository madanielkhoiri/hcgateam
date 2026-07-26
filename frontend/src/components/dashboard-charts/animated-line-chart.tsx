"use client";

type ChartPoint = {
  label: string;
  value: number;
};

type AnimatedLineChartProps = {
  title: string;
  subtitle?: string;
  data: ChartPoint[];
  accent: "green" | "orange" | "purple" | "blue";
};

const colorMap = {
  green: "#079669",
  orange: "#f17c16",
  purple: "#6748df",
  blue: "#1677d2",
};

function createPoints(data: ChartPoint[]) {
  const width = 900;
  const height = 250;
  const paddingX = 58;
  const paddingTop = 25;
  const paddingBottom = 48;

  const graphWidth = width - paddingX * 2;
  const graphHeight = height - paddingTop - paddingBottom;

  const maxValue = Math.max(1, ...data.map((item) => item.value));

  return data.map((item, index) => {
    const x =
      data.length <= 1
        ? width / 2
        : paddingX + (index / (data.length - 1)) * graphWidth;

    const y = paddingTop + graphHeight - (item.value / maxValue) * graphHeight;

    return {
      ...item,
      x,
      y,
    };
  });
}

export default function AnimatedLineChart({
  title,
  subtitle,
  data,
  accent,
}: AnimatedLineChartProps) {
  const color = colorMap[accent];
  const points = createPoints(data);

  const path =
    points.length > 0
      ? points
          .map((point, index) =>
            index === 0 ? `M ${point.x} ${point.y}` : `L ${point.x} ${point.y}`,
          )
          .join(" ")
      : "";

  return (
    <section
      style={{
        background: "#ffffff",
        border: "1px solid #d8e4f2",
        borderRadius: 16,
        overflow: "hidden",
        minWidth: 0,
      }}
    >
      <header
        style={{
          padding: "16px 18px",
          borderBottom: "1px solid #e3ebf5",
        }}
      >
        <strong
          style={{
            display: "block",
            color: "#0d315c",
            fontSize: 16,
          }}
        >
          {title}
        </strong>

        {subtitle && (
          <span
            style={{
              display: "block",
              marginTop: 3,
              color: "#6d83a0",
              fontSize: 12,
            }}
          >
            {subtitle}
          </span>
        )}
      </header>

      {points.length === 0 ? (
        <div
          style={{
            minHeight: 280,
            display: "grid",
            placeItems: "center",
            textAlign: "center",
            color: "#6d83a0",
            padding: 24,
          }}
        >
          Belum ada transaksi pada periode ini.
        </div>
      ) : (
        <div
          style={{
            overflowX: "auto",
            padding: "10px 12px 4px",
          }}
        >
          <svg
            viewBox="0 0 900 250"
            role="img"
            aria-label={title}
            style={{
              width: "100%",
              minWidth: 650,
              height: 300,
              display: "block",
            }}
          >
            {[0, 1, 2, 3, 4].map((row) => {
              const y = 25 + row * 44;

              return (
                <line
                  key={row}
                  x1="58"
                  y1={y}
                  x2="842"
                  y2={y}
                  stroke="#dbe6f2"
                  strokeDasharray="5 7"
                />
              );
            })}

            <line x1="58" y1="202" x2="842" y2="202" stroke="#aac0d8" />

            <path
              d={path}
              fill="none"
              stroke={color}
              strokeWidth="5"
              strokeLinecap="round"
              strokeLinejoin="round"
              pathLength="1"
              style={{
                strokeDasharray: 1,
                strokeDashoffset: 1,
                animation: "dashboardLineDraw 1.8s ease forwards",
              }}
            />

            {points.map((point, index) => (
              <g
                key={`${point.label}-${index}`}
                style={{
                  opacity: 0,
                  animation: `dashboardPointShow 0.35s ease ${
                    0.35 + index * 0.16
                  }s forwards`,
                }}
              >
                <circle
                  cx={point.x}
                  cy={point.y}
                  r="7"
                  fill={color}
                  stroke="#ffffff"
                  strokeWidth="3"
                >
                  <title>
                    {point.label}: {point.value}
                  </title>
                </circle>

                <text
                  x={point.x}
                  y={point.y - 14}
                  textAnchor="middle"
                  fontSize="13"
                  fontWeight="700"
                  fill="#183d67"
                >
                  {point.value}
                </text>

                <text
                  x={point.x}
                  y="229"
                  textAnchor="middle"
                  fontSize="12"
                  fill="#607a99"
                >
                  {point.label}
                </text>
              </g>
            ))}
          </svg>

          <style jsx>{`
            @keyframes dashboardLineDraw {
              from {
                stroke-dashoffset: 1;
              }

              to {
                stroke-dashoffset: 0;
              }
            }

            @keyframes dashboardPointShow {
              from {
                opacity: 0;
                transform: translateY(8px);
              }

              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      )}
    </section>
  );
}
