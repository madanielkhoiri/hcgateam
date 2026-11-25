// ==================================================
// Utilitas grafik dashboard (gaya garis halus + area gradasi):
// skala sumbu "rapi", path spline, dan format angka Indonesia.
// ==================================================

export type Titik = { x: number; y: number };

/** Skala sumbu Y rapi: kelipatan 1 / 2 / 2,5 / 5 × 10^n, 4–5 garis. */
export function skalaRapi(maks: number, jumlahGaris = 4): { maks: number; langkah: number; garis: number[] } {
  if (!Number.isFinite(maks) || maks <= 0) return { maks: 4, langkah: 1, garis: [0, 1, 2, 3, 4] };
  const kasar = maks / jumlahGaris;
  const pangkat = 10 ** Math.floor(Math.log10(kasar));
  const langkah = [1, 2, 2.5, 5, 10].map((k) => k * pangkat).find((k) => k >= kasar) ?? 10 * pangkat;
  const atas = Math.ceil(maks / langkah) * langkah;
  const garis: number[] = [];
  for (let n = 0; n <= atas + langkah / 2; n += langkah) garis.push(Math.round(n * 1000) / 1000);
  return { maks: atas, langkah, garis };
}

/**
 * Skala dengan titik bawah: mulai dari 0, kecuali semua data jauh di atas 0
 * (mis. stok 2.400 - 2.470) — maka sumbu dimulai dekat nilai terkecil supaya
 * naik-turunnya terlihat (seperti chart modern pada umumnya).
 */
export function skalaRentang(min: number, maks: number): { min: number; maks: number; garis: number[] } {
  if (!(maks > 0) || !(min > 0) || min / maks < 0.6) {
    const s = skalaRapi(maks);
    return { min: 0, maks: s.maks, garis: s.garis };
  }
  const selisih = Math.max(maks - min, maks * 0.02);
  const s = skalaRapi(selisih * 1.5);
  const bawah = Math.max(0, Math.floor((min - selisih * 0.25) / s.langkah) * s.langkah);
  const atas = Math.ceil(maks / s.langkah) * s.langkah;
  const garis: number[] = [];
  for (let n = bawah; n <= atas + s.langkah / 2; n += s.langkah) garis.push(Math.round(n * 1000) / 1000);
  return { min: bawah, maks: atas, garis };
}

/** 2500 -> "2,5 rb", 1250000 -> "1,25 jt" (untuk label sumbu). */
export function angkaRingkas(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1_000_000_000) return `${(n / 1_000_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} M`;
  if (abs >= 1_000_000) return `${(n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} jt`;
  if (abs >= 10_000) return `${(n / 1_000).toLocaleString("id-ID", { maximumFractionDigits: 1 })} rb`;
  return n.toLocaleString("id-ID", { maximumFractionDigits: 2 });
}

export const angkaLengkap = (n: number) => n.toLocaleString("id-ID", { maximumFractionDigits: 2 });

/**
 * Path kurva halus (Catmull-Rom -> Bezier). Titik kontrol dijepit di antara
 * dua titik yang disambung supaya kurva tidak "menembus" ke bawah nol.
 */
export function pathSpline(titik: Titik[], tegang = 0.18): string {
  if (titik.length === 0) return "";
  if (titik.length === 1) return `M ${titik[0].x} ${titik[0].y}`;
  let d = `M ${titik[0].x} ${titik[0].y}`;
  for (let i = 0; i < titik.length - 1; i += 1) {
    const p0 = titik[i - 1] ?? titik[i];
    const p1 = titik[i];
    const p2 = titik[i + 1];
    const p3 = titik[i + 2] ?? p2;
    const yMin = Math.min(p1.y, p2.y);
    const yMax = Math.max(p1.y, p2.y);
    const jepit = (y: number) => Math.min(yMax, Math.max(yMin, y));
    const c1 = { x: p1.x + (p2.x - p0.x) * tegang, y: jepit(p1.y + (p2.y - p0.y) * tegang) };
    const c2 = { x: p2.x - (p3.x - p1.x) * tegang, y: jepit(p2.y - (p3.y - p1.y) * tegang) };
    d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/** Tampilkan label sumbu X tiap n titik supaya tidak bertumpuk. */
export function langkahLabel(jumlah: number, maksLabel = 12): number {
  return Math.max(1, Math.ceil(jumlah / maksLabel));
}
