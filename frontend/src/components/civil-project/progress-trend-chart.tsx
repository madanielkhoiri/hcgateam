"use client";
import { formatBulanSingkat } from "@/lib/eprom-api";
type Titik = {
  bulan: string;
  week?: string;
  planned: number;
  actual: number;
  deviasi: number;
};
type Seri = { id: number; namaProject: string; data: Titik[] };
const W = 720,
  H = 320,
  L = 42,
  R = 64,
  T = 24,
  B = 48,
  ORANYE = "#ef7100",
  BIRU = "#0868f6",
  WARNA = ["#0868f6", "#07984c", "#ef7100", "#7a4ce0", "#d53535", "#0aa3a3"];
export function ProgressTrendChart({
  seri,
  detail = false,
}: {
  seri: Seri[];
  detail?: boolean;
}) {
  const kunciX = (titik: Titik) => detail ? titik.bulan : (titik.week ?? titik.bulan);
  const tanggal = Array.from(
    new Set(seri.flatMap((s) => s.data.map(kunciX))),
  ).sort((a, b) => {
    const wa = Number(a.match(/\d+/)?.[0] ?? 0);
    const wb = Number(b.match(/\d+/)?.[0] ?? 0);
    return wa - wb || a.localeCompare(b);
  });
  if (!tanggal.length) return null;
  const nilai = seri.flatMap((s) =>
    s.data.flatMap((d) => (detail ? [d.planned, d.actual] : [d.actual])),
  );
  const maxNilai = Math.max(...nilai, 1),
    maxY =
      maxNilai <= 25 ? 25 : Math.min(100, Math.ceil((maxNilai * 1.2) / 5) * 5),
    width = Math.max(W, tanggal.length * 110),
    aw = width - L - R,
    ah = H - T - B,
    x = (v: string) =>
      tanggal.length === 1
        ? L + aw / 2
        : L + (tanggal.indexOf(v) / (tanggal.length - 1)) * aw,
    y = (v: number) => T + ah - (Math.min(maxY, Math.max(0, v)) / maxY) * ah,
    ticks = Array.from({ length: 5 }, (_, i) => Math.round((maxY * i) / 4)),
    path = (d: Titik[], k: "planned" | "actual") =>
      d.map((a) => `${x(kunciX(a))},${y(a[k])}`).join(" ");
  const posisiLabelTerakhir = new Map<number, number>();
  if (!detail) {
    const label = seri
      .map((s) => ({ id: s.id, raw: y(s.data.at(-1)?.actual ?? 0) }))
      .sort((a, b) => a.raw - b.raw);
    const jarakMinimum = 20;
    const batasAtas = T + 8;
    const batasBawah = H - B - 8;
    const posisi = label.map((item, index) =>
      index === 0 ? Math.max(batasAtas, item.raw) : Math.max(item.raw, 0),
    );
    for (let index = 1; index < posisi.length; index += 1) {
      posisi[index] = Math.max(posisi[index], posisi[index - 1] + jarakMinimum);
    }
    const kelebihan = Math.max(0, (posisi.at(-1) ?? batasBawah) - batasBawah);
    for (let index = 0; index < posisi.length; index += 1) posisi[index] -= kelebihan;
    label.forEach((item, index) => posisiLabelTerakhir.set(item.id, posisi[index]));
  }
  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <svg
        viewBox={`0 0 ${width} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        style={{
          width,
          height: H,
          minWidth: 420,
          display: "block",
        }}
      >
        {ticks.map((p) => (
          <g key={p}>
            <line
              x1={L}
              x2={width - R}
              y1={y(p)}
              y2={y(p)}
              stroke="#dbe6f2"
              strokeDasharray={p ? "5 7" : undefined}
            />
            <text
              x={L - 9}
              y={y(p) + 4}
              textAnchor="end"
              fontSize={10}
              fill="#71839a"
            >
              {p}%
            </text>
          </g>
        ))}
        {tanggal.map((t) => (
          <text
            key={t}
            x={x(t)}
            y={H - 14}
            textAnchor="middle"
            fontSize={10}
            fill="#71839a"
          >
            {/^week\s+\d+$/i.test(t) ? t : formatBulanSingkat(t)}
          </text>
        ))}
        {seri.map((s, si) => (
          <g key={s.id}>
            {detail ? (
              <>
                <polyline
                  points={path(s.data, "planned")}
                  fill="none"
                  stroke={ORANYE}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                <polyline
                  points={path(s.data, "actual")}
                  fill="none"
                  stroke={BIRU}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                {s.data.map((d) => {
                  const xp = x(kunciX(d)),
                    yp = y(d.planned),
                    ya = y(d.actual),
                    positive = d.deviasi >= 0,
                    dev = `${positive ? "+" : ""}${d.deviasi}%`;
                  return (
                    <g key={kunciX(d)}>
                      <circle
                        cx={xp}
                        cy={yp}
                        r={4}
                        fill={ORANYE}
                        stroke="white"
                        strokeWidth={2}
                      />
                      <circle
                        cx={xp}
                        cy={ya}
                        r={4}
                        fill={BIRU}
                        stroke="white"
                        strokeWidth={2}
                      />
                      <text
                        x={xp - 8}
                        y={yp - 9}
                        textAnchor="end"
                        fontSize={10}
                        fontWeight={800}
                        fill={ORANYE}
                      >
                        P {d.planned}%
                      </text>
                      <text
                        x={xp + 8}
                        y={ya + 15}
                        textAnchor="start"
                        fontSize={10}
                        fontWeight={800}
                        fill={BIRU}
                      >
                        A {d.actual}%
                      </text>
                      <text
                        x={xp}
                        y={
                          positive
                            ? Math.min(yp, ya) - 25
                            : Math.max(yp, ya) + 29
                        }
                        textAnchor="middle"
                        fontSize={10}
                        fontWeight={800}
                        fill={positive ? "#078b49" : "#d53535"}
                      >
                        {dev}
                      </text>
                    </g>
                  );
                })}
              </>
            ) : (
              <>
                <polyline
                  points={path(s.data, "actual")}
                  fill="none"
                  stroke={WARNA[si % WARNA.length]}
                  strokeWidth={3}
                  strokeLinecap="round"
                />
                {s.data.map((d) => (
                  <circle
                    key={kunciX(d)}
                    cx={x(kunciX(d))}
                    cy={y(d.actual)}
                    r={4}
                    fill={WARNA[si % WARNA.length]}
                    stroke="white"
                    strokeWidth={2}
                  />
                ))}
                {s.data.at(-1) && (() => {
                  const terakhir = s.data.at(-1)!;
                  const titikX = x(kunciX(terakhir));
                  const titikY = y(terakhir.actual);
                  const labelY = posisiLabelTerakhir.get(s.id) ?? titikY;
                  const teks = `${terakhir.actual}%`;
                  const lebar = Math.max(38, teks.length * 7 + 12);
                  return <g>
                    <line x1={titikX + 4} y1={titikY} x2={titikX + 10} y2={labelY} stroke={WARNA[si % WARNA.length]} strokeWidth={1.5} />
                    <rect x={titikX + 8} y={labelY - 11} width={lebar} height={20} rx={7} fill="white" stroke={WARNA[si % WARNA.length]} strokeWidth={1.5} />
                    <text x={titikX + 8 + lebar / 2} y={labelY + 4} textAnchor="middle" fontSize={11} fontWeight={800} fill={WARNA[si % WARNA.length]}>{teks}</text>
                  </g>;
                })()}
              </>
            )}
          </g>
        ))}
      </svg>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          marginTop: 8,
          fontSize: 12,
          color: "#34506f",
        }}
      >
        {detail && (
          <>
            <span>
              <i
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: 99,
                  background: ORANYE,
                  marginRight: 6,
                }}
              />
              Planned
            </span>
            <span>
              <i
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: 99,
                  background: BIRU,
                  marginRight: 6,
                }}
              />
              Actual
            </span>
          </>
        )}
        {seri.map((s, i) => (
          <span key={s.id}>
            <i
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: 99,
                background: detail ? "#7a4ce0" : WARNA[i % WARNA.length],
                marginRight: 6,
              }}
            />
            {s.namaProject}
          </span>
        ))}
      </div>
    </div>
  );
}
