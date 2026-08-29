"use client";

import { formatBulanSingkat } from "@/lib/eprom-api";

const WARNA_GARIS = ["#0868f6", "#07984c", "#ef7100", "#7a4ce0", "#d53535", "#0aa3a3"];

type Seri = {
  id: number;
  namaProject: string;
  data: { bulan: string; actual: number }[];
};

type Props = {
  seri: Seri[];
};

const LEBAR = 720;
const TINGGI = 220;
const PAD_KIRI = 34;
const PAD_KANAN = 46;
const PAD_ATAS = 16;
const PAD_BAWAH = 28;

export function ProgressTrendChart({ seri }: Props) {
  const semuaBulan = Array.from(new Set(seri.flatMap((s) => s.data.map((d) => d.bulan)))).sort();

  if (semuaBulan.length === 0) {
    return null;
  }

  const areaLebar = LEBAR - PAD_KIRI - PAD_KANAN;
  const areaTinggi = TINGGI - PAD_ATAS - PAD_BAWAH;

  const x = (bulan: string) => {
    if (semuaBulan.length === 1) return PAD_KIRI + areaLebar / 2;
    const idx = semuaBulan.indexOf(bulan);
    return PAD_KIRI + (idx / (semuaBulan.length - 1)) * areaLebar;
  };

  const y = (persen: number) => PAD_ATAS + areaTinggi - (Math.min(100, persen) / 100) * areaTinggi;

  const gridPersen = [0, 25, 50, 75, 100];

  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${LEBAR} ${TINGGI}`}
        preserveAspectRatio="none"
        style={{ width: "100%", height: TINGGI, minWidth: 420, display: "block" }}
      >
        {gridPersen.map((p) => (
          <g key={p}>
            <line
              x1={PAD_KIRI}
              x2={LEBAR - PAD_KANAN}
              y1={y(p)}
              y2={y(p)}
              stroke="#dbe6f2"
              strokeWidth={1}
              strokeDasharray={p === 0 ? undefined : "5 7"}
            />
            <text x={PAD_KIRI - 8} y={y(p) + 3} textAnchor="end" fontSize={9} fill="#93a2b8">
              {p}%
            </text>
          </g>
        ))}

        {semuaBulan.map((b) => (
          <text
            key={b}
            x={x(b)}
            y={TINGGI - 8}
            textAnchor="middle"
            fontSize={9}
            fill="#93a2b8"
          >
            {formatBulanSingkat(b)}
          </text>
        ))}

        {seri.map((s, i) => {
          const warna = WARNA_GARIS[i % WARNA_GARIS.length];
          const urut = s.data.slice().sort((a, b) => a.bulan.localeCompare(b.bulan));
          const titik = urut.map((d) => `${x(d.bulan)},${y(d.actual)}`);
          const akhir = urut[urut.length - 1];
          const delaySeri = i * 0.25;

          return (
            <g key={s.id}>
              {titik.length > 1 && (
                <polyline
                  points={titik.join(" ")}
                  fill="none"
                  stroke={warna}
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  pathLength="1"
                  style={{
                    strokeDasharray: 1,
                    strokeDashoffset: 1,
                    animation: `trendLineDraw 1.4s ease ${delaySeri}s forwards`,
                  }}
                />
              )}
              {urut.map((d, idx) => (
                <circle
                  key={d.bulan}
                  cx={x(d.bulan)}
                  cy={y(d.actual)}
                  r={3.5}
                  fill={warna}
                  stroke="#ffffff"
                  strokeWidth={1.5}
                  style={{
                    opacity: 0,
                    animation: `trendPointShow 0.3s ease ${delaySeri + 0.3 + idx * 0.12}s forwards`,
                  }}
                />
              ))}
              {akhir && (
                <text
                  x={x(akhir.bulan) + 8}
                  y={y(akhir.actual) + 3}
                  fontSize={11}
                  fontWeight={800}
                  fill={warna}
                  style={{
                    opacity: 0,
                    animation: `trendPointShow 0.3s ease ${delaySeri + 0.3 + (urut.length - 1) * 0.12 + 0.1}s forwards`,
                  }}
                >
                  {akhir.actual}%
                </text>
              )}
            </g>
          );
        })}
      </svg>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 6 }}>
        {seri.map((s, i) => (
          <span
            key={s.id}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "#34506f" }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: WARNA_GARIS[i % WARNA_GARIS.length],
                display: "inline-block",
              }}
            />
            {s.namaProject}
          </span>
        ))}
      </div>

      <style jsx>{`
        @keyframes trendLineDraw {
          from {
            stroke-dashoffset: 1;
          }

          to {
            stroke-dashoffset: 0;
          }
        }

        @keyframes trendPointShow {
          from {
            opacity: 0;
            transform: translateY(6px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
