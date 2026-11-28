"use client";

// ==================================================
// Grafik garis dashboard — gaya halus ala chart modern:
// kurva spline + area gradasi, grid tipis, sumbu rapi, garis bantu &
// tooltip saat hover, legend yang bisa diklik (multi seri).
// Dipakai AnimatedLineChart (satu seri) dan MultiLineChart (banyak seri).
// ==================================================

import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { angkaLengkap, angkaRingkas, langkahLabel, pathSpline, skalaRapi, skalaRentang } from "./chart-utils";

/** values: null = tidak ada data di titik itu (garis menyambung titik yang ada). */
export type SeriGaris = { label: string; color: string; values: (number | null)[] };

const H = 300;
const KIRI = 58;
/** Ruang kanan supaya angka di titik terakhir tidak terpotong. */
const KANAN_DASAR = 30;
/** Jarak minimum (px) antar kolom angka; lebih rapat dari ini angka dijarangkan. */
const JARAK_MIN_ANGKA = 46;
const ATAS = 26;
const BAWAH = 42;
const TINGGI = H - ATAS - BAWAH;

export default function LineChartCore({
  title,
  subtitle,
  labels,
  series,
  satuan,
  area = true,
  labelData,
  legend = false,
  teksKosong = "Belum ada data pada periode ini.",
  polos = false,
  sumbuMaks,
  formatNilai,
  tooltipTambahan,
  labelEkstra,
  angkaUjungSaja = false,
}: {
  title: string;
  subtitle?: string;
  labels: string[];
  series: SeriGaris[];
  satuan?: string;
  /** Area gradasi di bawah garis (default aktif; makin banyak seri makin tipis). */
  area?: boolean;
  /**
   * Angka selalu tampil tanpa hover (default: ya), di atas titik per tanggal.
   * Tanggal terlalu rapat: angka dijarangkan dihitung dari ujung, sehingga
   * nilai terakhir tiap garis selalu tampil.
   */
  labelData?: boolean;
  legend?: boolean;
  teksKosong?: string;
  /** Tanpa kartu & judul (dipakai di dalam kartu milik halaman sendiri). */
  polos?: boolean;
  /** Batas atas sumbu Y tetap (mis. 100 untuk persen). */
  sumbuMaks?: number;
  /** Format angka sumbu & tooltip (mis. v => `${v}%`). */
  formatNilai?: (nilai: number) => string;
  /** Baris tambahan di tooltip untuk titik ke-i. */
  tooltipTambahan?: (indeks: number) => ReactNode;
  /** Angka tambahan di atas kolom ke-i (mis. deviasi e-ProM), ikut aturan penjarangan. */
  labelEkstra?: (indeks: number) => { teks: string; warna: string } | null;
  /** Angka hanya di titik terakhir tiap garis (mis. perbandingan semua project). */
  angkaUjungSaja?: boolean;
}) {
  const id = useId().replace(/:/g, "");
  const [aktif, setAktif] = useState<number | null>(null);
  const [tersembunyi, setTersembunyi] = useState<string[]>([]);
  // Lebar grafik = lebar kartu sebenarnya (teks tetap tajam, tidak ikut membesar/mengecil).
  const wadah = useRef<HTMLDivElement>(null);
  const [lebarWadah, setLebarWadah] = useState(0);
  const kosong = labels.length === 0 || series.length === 0;

  useEffect(() => {
    const el = wadah.current;
    if (!el) return;
    const ukur = () => setLebarWadah(el.clientWidth - 24);
    ukur();
    const pengamat = new ResizeObserver(ukur);
    pengamat.observe(el);
    return () => pengamat.disconnect();
  }, [kosong]);

  const tampil = series.filter((s) => !tersembunyi.includes(s.label));
  const jumlah = labels.length;
  const banyakTitik = jumlah > 12;
  const lebarMin = Math.max(320, jumlah * (banyakTitik ? 22 : 44));
  const W = Math.max(lebarMin, lebarWadah || 900);
  const tampilAngka = labelData !== false;
  const KANAN = KANAN_DASAR;
  const LEBAR = W - KIRI - KANAN;

  const semuaNilai = tampil.flatMap((s) => s.values).filter((v): v is number => typeof v === "number");
  const nilaiMin = semuaNilai.length ? Math.min(...semuaNilai) : 0;
  const nilaiMaks = semuaNilai.length ? Math.max(...semuaNilai) : 0;
  const skala = useMemo(() => {
    if (sumbuMaks) {
      const tetap = skalaRapi(sumbuMaks);
      return { min: 0, maks: tetap.maks, garis: tetap.garis };
    }
    return skalaRentang(nilaiMin, nilaiMaks);
  }, [nilaiMin, nilaiMaks, sumbuMaks]);
  const teksSumbu = (n: number) => (formatNilai ? formatNilai(n) : angkaRingkas(n));
  const teksNilai = (n: number) => (formatNilai ? formatNilai(n) : `${angkaLengkap(n)}${satuan ? ` ${satuan}` : ""}`);

  const xKe = (i: number) => (jumlah <= 1 ? KIRI + LEBAR / 2 : KIRI + (i / (jumlah - 1)) * LEBAR);
  const yKe = (v: number) =>
    ATAS + TINGGI - ((Math.max(skala.min, v) - skala.min) / Math.max(1e-9, skala.maks - skala.min)) * TINGGI;
  const bawahGrafik = ATAS + TINGGI;
  const loncat = langkahLabel(jumlah, Math.max(4, Math.floor(LEBAR / 58)));
  const teksLabel = (n: number) => (formatNilai ? formatNilai(n) : angkaRingkas(n));

  // Kolom yang diberi angka: semua tanggal bila muat; bila terlalu rapat, tiap
  // `langkahAngka` kolom dihitung mundur dari ujung (kolom terakhir selalu ikut).
  const jarakKolom = jumlah <= 1 ? LEBAR : LEBAR / (jumlah - 1);
  const langkahAngka = Math.max(1, Math.ceil(JARAK_MIN_ANGKA / jarakKolom));
  const kolomBerangka = (i: number) => (jumlah - 1 - i) % langkahAngka === 0;
  // Nilai terakhir tiap garis selalu tampil walau bukan kolom terakhir grafik (mis. data project berhenti lebih awal).
  const indeksAkhir = new Map(
    tampil.map((s) => {
      let i = s.values.length - 1;
      while (i >= 0 && typeof s.values[i] !== "number") i -= 1;
      return [s.label, i] as const;
    }),
  );
  const tampilkanAngkaDi = (s: SeriGaris, i: number) => {
    const akhirSeri = indeksAkhir.get(s.label) ?? -1;
    if (i === akhirSeri) return true;
    if (angkaUjungSaja || i > akhirSeri || !kolomBerangka(i)) return false;
    // Jangan bertumpuk dengan angka terakhir seri yang posisinya di luar pola penjarangan.
    return kolomBerangka(akhirSeri) || akhirSeri - i >= langkahAngka;
  };

  // Angka di atas titik: per kolom, label antar seri didorong supaya tidak bertumpuk.
  const labelTitik: { kunci: string; x: number; y: number; teks: string; warna: string; tebal?: boolean }[] = [];
  if (tampilAngka) {
    for (let i = 0; i < jumlah; i += 1) {
      const kolom = tampil
        .filter((s) => tampilkanAngkaDi(s, i))
        .map((s) => ({ s, v: s.values[i] }))
        .filter((k): k is { s: SeriGaris; v: number } => typeof k.v === "number")
        // Banyak garis: angka 0 tidak ditulis (menumpuk di dasar grafik); tetap ada di tooltip.
        .filter((k) => tampil.length === 1 || k.v !== 0)
        .map((k) => ({ ...k, y: yKe(k.v) - 11 }))
        .sort((a, b) => b.y - a.y);
      // Posisi titik semua seri di kolom ini: angka tidak boleh jatuh di atas titik garis lain.
      const titikKolom = tampil
        .map((s) => s.values[i])
        .filter((v): v is number => typeof v === "number")
        .map((v) => yKe(v));
      // Dari bawah ke atas: label yang berdekatan / menimpa titik didorong naik.
      for (let k = 0; k < kolom.length; k += 1) {
        if (k > 0 && kolom[k - 1].y - kolom[k].y < 13) kolom[k].y = kolom[k - 1].y - 13;
        let aman = false;
        for (let coba = 0; coba < 6 && !aman; coba += 1) {
          const tabrak = titikKolom.find((py) => Math.abs(kolom[k].y - 4 - py) < 9);
          if (tabrak === undefined) aman = true;
          else kolom[k].y = tabrak - 11;
        }
      }
      for (const k of kolom) {
        labelTitik.push({
          kunci: `${k.s.label}-${i}`,
          x: xKe(i),
          y: k.y,
          teks: teksLabel(k.v),
          warna: tampil.length > 1 ? k.s.color : "#28476b",
        });
      }
      // Angka tambahan (mis. deviasi) di atas angka teratas kolom ini.
      const ekstra = kolom.length && kolomBerangka(i) ? labelEkstra?.(i) : null;
      if (ekstra) {
        const teratas = Math.min(...kolom.map((k) => k.y));
        labelTitik.push({ kunci: `ekstra-${i}`, x: xKe(i), y: Math.max(ATAS - 6, teratas - 14), teks: ekstra.teks, warna: ekstra.warna, tebal: true });
      }
    }
  }

  // Titik tidak ditampilkan (seragam di semua grafik); hanya muncul di posisi yang disorot kursor.
  const tampilkanTitik = false;

  const kepala = (
    <header style={{ padding: "16px 18px", borderBottom: "1px solid #e3ebf5" }}>
      <strong style={{ display: "block", color: "#0d315c", fontSize: 16 }}>{title}</strong>
      {subtitle && <span style={{ display: "block", marginTop: 3, color: "#6d83a0", fontSize: 12 }}>{subtitle}</span>}
    </header>
  );

  const kartu: CSSProperties = {
    background: "#ffffff",
    border: "1px solid #d8e4f2",
    borderRadius: 16,
    overflow: "hidden",
    minWidth: 0,
  };

  if (kosong) {
    if (polos) {
      return (
        <div style={{ minHeight: 240, display: "grid", placeItems: "center", color: "#6d83a0", padding: 24, textAlign: "center" }}>
          {teksKosong}
        </div>
      );
    }
    return (
      <section style={kartu}>
        {kepala}
        <div style={{ minHeight: 280, display: "grid", placeItems: "center", color: "#6d83a0", padding: 24, textAlign: "center" }}>
          {teksKosong}
        </div>
      </section>
    );
  }

  const xAktif = aktif === null ? 0 : xKe(aktif);
  const nilaiDi = (s: SeriGaris, i: number) => {
    const v = s.values[i];
    return typeof v === "number" ? v : null;
  };
  const yTooltip =
    aktif === null
      ? 0
      : Math.min(
          ...tampil.map((s) => {
            const v = nilaiDi(s, aktif);
            return v === null ? bawahGrafik : yKe(v);
          }),
          bawahGrafik,
        );
  const persenX = (xAktif / W) * 100;
  const geserTooltip = persenX > 78 ? "-100%" : persenX < 22 ? "0%" : "-50%";
  // Ruang di atas titik sempit (nilai tinggi) -> tooltip pindah ke bawah titik supaya tidak terpotong.
  const jumlahBaris = tampil.length + (tooltipTambahan ? 1 : 0);
  const tooltipDiBawah = yTooltip < 40 + jumlahBaris * 20;

  const Bungkus = polos ? "div" : "section";

  return (
    <Bungkus style={polos ? { minWidth: 0 } : kartu}>
      {!polos && kepala}

      <div ref={wadah} style={{ overflowX: "auto", padding: "10px 12px 6px" }}>
        <div style={{ position: "relative", width: W }} onMouseLeave={() => setAktif(null)}>
          <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={title} style={{ display: "block" }}>
            <defs>
              {tampil.map((s, i) => (
                <linearGradient key={s.label} id={`gr-${id}-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={s.color} stopOpacity={tampil.length === 1 ? 0.28 : tampil.length === 2 ? 0.2 : 0.12} />
                  <stop offset="100%" stopColor={s.color} stopOpacity="0.02" />
                </linearGradient>
              ))}
            </defs>

            {/* grid + sumbu Y */}
            {skala.garis.map((nilai) => {
              const y = yKe(nilai);
              return (
                <g key={nilai}>
                  <line x1={KIRI} x2={W - KANAN} y1={y} y2={y} stroke={nilai === skala.min ? "#c9d6e4" : "#e8eef5"} strokeWidth="1" />
                  <text x={KIRI - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#7b8fa8">
                    {teksSumbu(nilai)}
                  </text>
                </g>
              );
            })}

            {/* label sumbu X */}
            {labels.map((label, i) =>
              // Dihitung mundur dari ujung: label terakhir selalu tampil; label pertama ikut bila tidak terlalu dekat.
              (jumlah - 1 - i) % loncat === 0 || (i === 0 && ((jumlah - 1) % loncat >= loncat * 0.6 || !labels[(jumlah - 1) % loncat])) ? (
                <text key={`${label}-${i}`} x={xKe(i)} y={H - 14} textAnchor="middle" fontSize="11.5" fill={aktif === i ? "#0d315c" : "#7b8fa8"} fontWeight={aktif === i ? 700 : 400}>
                  {label}
                </text>
              ) : null,
            )}

            {/* garis bantu hover */}
            {aktif !== null && (
              <line x1={xAktif} x2={xAktif} y1={ATAS} y2={bawahGrafik} stroke="#9fb3c8" strokeWidth="1" strokeDasharray="4 4" />
            )}

            {/* seri */}
            {tampil.map((s, si) => {
              const titik = s.values.flatMap((v, i) =>
                typeof v === "number" ? [{ x: xKe(i), y: yKe(v), i, v }] : [],
              );
              const garis = pathSpline(titik);
              const isiArea =
                titik.length > 1 ? `${garis} L ${titik[titik.length - 1].x} ${bawahGrafik} L ${titik[0].x} ${bawahGrafik} Z` : "";
              return (
                <g key={s.label}>
                  {area && isiArea && <path d={isiArea} fill={`url(#gr-${id}-${si})`} className="lc-area" />}
                  <path
                    d={garis}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={tampil.length > 1 ? 2.5 : 3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    pathLength={1}
                    className="lc-garis"
                  />
                  {titik.map((t) => {
                    const disorot = aktif === t.i;
                    if (!tampilkanTitik && !disorot) return null;
                    return (
                      <circle
                        key={t.i}
                        cx={t.x}
                        cy={t.y}
                        r={disorot ? 6 : 4}
                        fill={disorot ? s.color : "#ffffff"}
                        stroke={s.color}
                        strokeWidth={disorot ? 3 : 2}
                        style={{ transition: "r 0.12s" }}
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* angka di atas titik */}
            {labelTitik.map((l) => (
              <text
                key={l.kunci}
                x={l.x}
                y={l.y}
                textAnchor="middle"
                fontSize={tampil.length > 1 ? 10.5 : 11.5}
                fontWeight={l.tebal ? 800 : 700}
                fill={l.warna}
                stroke="#ffffff"
                strokeWidth={3}
                paintOrder="stroke"
                className="lc-label"
              >
                {l.teks}
              </text>
            ))}


            {/* area hover per kolom */}
            {labels.map((_, i) => {
              const kiri = i === 0 ? KIRI : (xKe(i - 1) + xKe(i)) / 2;
              const kanan = i === jumlah - 1 ? W - KANAN : (xKe(i) + xKe(i + 1)) / 2;
              return (
                <rect
                  key={`h${i}`}
                  x={kiri}
                  y={ATAS}
                  width={Math.max(1, kanan - kiri)}
                  height={TINGGI}
                  fill="transparent"
                  onMouseEnter={() => setAktif(i)}
                  onClick={() => setAktif(i)}
                />
              );
            })}
          </svg>

          {aktif !== null && tampil.length > 0 && (
            <div
              style={{
                position: "absolute",
                left: `${persenX}%`,
                top: `${(yTooltip / H) * 100}%`,
                transform: `translate(${geserTooltip}, ${tooltipDiBawah ? "14px" : "calc(-100% - 14px)"})`,
                pointerEvents: "none",
                minWidth: 130,
                padding: "8px 11px",
                borderRadius: 10,
                background: "rgba(255,255,255,0.97)",
                border: "1px solid #d8e4f2",
                boxShadow: "0 10px 28px rgba(15,40,70,0.16)",
                fontSize: 12,
                color: "#28476b",
                whiteSpace: "nowrap",
                zIndex: 2,
              }}
            >
              {labels[aktif] && <div style={{ marginBottom: 4, color: "#7b8fa8", fontSize: 11, fontWeight: 700 }}>{labels[aktif]}</div>}
              {tampil.map((s) => {
                const v = nilaiDi(s, aktif);
                if (v === null) return null;
                return (
                  <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 7, marginTop: 2 }}>
                    <i style={{ width: 8, height: 8, borderRadius: "50%", background: s.color, flexShrink: 0 }} />
                    {tampil.length > 1 && <span style={{ color: "#5d7491" }}>{s.label}</span>}
                    <b style={{ marginLeft: "auto", paddingLeft: 10, color: "#0d315c" }}>{teksNilai(v)}</b>
                  </div>
                );
              })}
              {tooltipTambahan?.(aktif)}
            </div>
          )}
        </div>
      </div>

      {legend && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, flexWrap: "wrap", padding: "0 18px 14px" }}>
          {series.map((s) => {
            const mati = tersembunyi.includes(s.label);
            return (
              <button
                key={s.label}
                type="button"
                onClick={() =>
                  setTersembunyi((saat) => (mati ? saat.filter((x) => x !== s.label) : [...saat, s.label]))
                }
                title={mati ? "Tampilkan" : "Sembunyikan"}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "4px 10px",
                  border: "1px solid #e3ebf5",
                  borderRadius: 999,
                  background: mati ? "#f6f8fb" : "#ffffff",
                  color: mati ? "#a8b6c7" : "#3c5674",
                  fontSize: 12,
                  fontWeight: 600,
                  textDecoration: mati ? "line-through" : "none",
                  cursor: "pointer",
                }}
              >
                <i style={{ width: 14, height: 3, borderRadius: 2, background: mati ? "#c9d3df" : s.color }} />
                {s.label}
              </button>
            );
          })}
        </div>
      )}

      <style jsx>{`
        :global(.lc-garis) {
          stroke-dasharray: 1;
          stroke-dashoffset: 1;
          animation: lcGaris 1.3s ease-out forwards;
        }
        :global(.lc-area),
        :global(.lc-label) {
          opacity: 0;
          animation: lcMuncul 0.6s ease-out 0.7s forwards;
        }
        @keyframes lcGaris {
          to {
            stroke-dashoffset: 0;
          }
        }
        @keyframes lcMuncul {
          to {
            opacity: 1;
          }
        }
      `}</style>
    </Bungkus>
  );
}
