import { getAccessToken } from './access-control';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type ScopeSafetyStock = 'GENERAL' | 'MESS' | 'ELECTRIC';
export type StatusSafetyStock = 'KRITIS' | 'PERLU_ORDER' | 'AMAN' | 'TIDAK_BERGERAK';
/** RUTIN <= 14 hari sekali; JARANG 15-90 hari sekali; SANGAT_JARANG > 90 hari sekali. */
export type PolaPemakaian = 'RUTIN' | 'JARANG' | 'SANGAT_JARANG' | 'TIDAK_ADA';

export type BarisSafetyStock = {
  itemId: number;
  code: string;
  name: string;
  unit: string;
  category: string;
  lokasiGudang: 'GUDANG_GA' | 'GUDANG_ELEKTRIK' | null;
  stok: number;
  pola: PolaPemakaian;
  totalKeluar: number;
  totalMasuk: number;
  hariAdaKeluar: number;
  intervalHari: number | null;
  /** true = baru 1x keluar, jarak sebenarnya minimal sepanjang periode. */
  intervalMinimal: boolean;
  rataPerKeluar: number;
  rataHarian: number;
  maksHarian: number;
  simpanganHarian: number;
  kebutuhanBulanan: number;
  safetyStock: number;
  titikOrder: number;
  rekomendasiOrder: number;
  hariTahan: number | null;
  cukupUntukKali: number | null;
  terakhirKeluar: string | null;
  hariSejakTerakhir: number | null;
  perkiraanBerikutnya: string | null;
  status: StatusSafetyStock;
  perBulan: { bulan: string; masuk: number; keluar: number }[];
};

export type HasilSafetyStock = {
  scope: ScopeSafetyStock;
  parameter: { periodeBulan: number; leadTime: number; serviceLevel: number; z: number };
  periode: { awal: string; akhir: string; jumlahHari: number; dibatasiTransaksiPertama: boolean };
  ringkasan: {
    totalBarang: number;
    kritis: number;
    perluOrder: number;
    aman: number;
    tidakBergerak: number;
    barangDiorder: number;
    polaRutin: number;
    polaJarang: number;
    polaSangatJarang: number;
  };
  items: BarisSafetyStock[];
};

export async function ambilSafetyStock(
  scope: ScopeSafetyStock,
  param: { bulan: number; leadTime: number; serviceLevel: number },
): Promise<HasilSafetyStock> {
  const query = new URLSearchParams({
    bulan: String(param.bulan),
    leadTime: String(param.leadTime),
    serviceLevel: String(param.serviceLevel),
  });
  const response = await fetch(`${API_URL}/inventory-area/${scope}/safety-stock?${query}`, {
    headers: { Authorization: `Bearer ${getAccessToken() ?? ''}` },
    cache: 'no-store',
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const pesan = Array.isArray(body?.message) ? body.message[0] : body?.message;
    throw new Error(pesan || `Gagal memuat analisa (${response.status})`);
  }
  return body as HasilSafetyStock;
}
