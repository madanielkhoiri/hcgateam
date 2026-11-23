// ==================================================
// FILE: backend/src/civil-tps3r/tps3r-rincian.ts
// FUNGSI: Rincian TPS 3R (format Excel) -> total per kategori.
// Total kategori = jumlah rinciannya bila rincian dikirim; bila tidak,
// total lama dipertahankan (data lama yang belum dirinci).
// ==================================================

type Grup = {
  total: string;
  rincian: readonly string[];
  /** Field total lain yang di-nol-kan saat rincian grup ini dipakai. */
  nolkan?: string;
};

/** Timbulan sampah (Tabel Laporan). */
export const GRUP_LAPORAN: readonly Grup[] = [
  { total: 'beratOrganik', rincian: ['organikMakanan', 'organikTaman'] },
  { total: 'beratReuse', rincian: ['reuseKertas', 'reusePlastik', 'reuseLainnya'] },
  {
    total: 'beratRecycle',
    rincian: ['recycleKertas', 'recyclePlastikKeras', 'recyclePallet', 'recycleKaca', 'recycleLogam'],
  },
];

/** Penanganan sampah (Sampah Terkelola). Anorganik disimpan di beratRecycle, beratReuse = 0. */
export const GRUP_TERKELOLA: readonly Grup[] = [
  { total: 'beratOrganik', rincian: ['tanganiBiopori', 'tanganiKompos', 'tanganiMaggot'] },
  {
    total: 'beratRecycle',
    rincian: ['tanganiTpsNavaraha', 'tanganiTpsMenanti', 'tanganiTpsMajuBersama', 'tanganiBankSampah'],
    nolkan: 'beratReuse',
  },
];

type Nilai = number | null | undefined;
type Rekaman = Record<string, unknown>;

const bulat = (n: number) => Math.round(n * 1000) / 1000;

/**
 * Susun data Prisma dari DTO.
 * @param lepas field total tanpa rincian (mis. beratResidu) yang disalin langsung.
 * @param lama rekaman lama (saat ubah) untuk melengkapi rincian yang tidak dikirim.
 */
export function susunDataTps3r(
  dto: Rekaman,
  grup: readonly Grup[],
  lepas: readonly string[],
  lama?: Rekaman | null,
): Record<string, number | null> {
  const data: Record<string, number | null> = {};
  const ambil = (key: string) => dto[key] as Nilai;

  for (const g of grup) {
    const adaRincian = g.rincian.some((key) => ambil(key) !== undefined);
    if (adaRincian) {
      let total = 0;
      for (const key of g.rincian) {
        const dikirim = ambil(key);
        const nilai = dikirim !== undefined ? dikirim : ((lama?.[key] as Nilai) ?? null);
        if (dikirim !== undefined) data[key] = dikirim ?? null;
        total += nilai ?? 0;
      }
      data[g.total] = bulat(total);
      if (g.nolkan) data[g.nolkan] = 0;
    } else if (ambil(g.total) !== undefined) {
      data[g.total] = ambil(g.total) ?? 0;
    } else if (!lama) {
      data[g.total] = 0;
    }
  }

  for (const key of lepas) {
    if (key in data) continue; // sudah diatur oleh grup (nolkan)
    if (ambil(key) !== undefined) data[key] = ambil(key) ?? 0;
    else if (!lama) data[key] = 0;
  }
  return data;
}
