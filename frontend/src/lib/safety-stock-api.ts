import { getAccessToken } from './access-control';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type ScopeSafetyStock = 'GENERAL' | 'MESS' | 'ELECTRIC';
export type StatusSafetyStock = 'KRITIS' | 'PERLU_ORDER' | 'AMAN' | 'TIDAK_BERGERAK';
/** RUTIN = keluar ±2x sebulan atau lebih; JARANG = tidak menentu (mis. 1-2 bulan sekali). */
export type PolaPemakaian = 'RUTIN' | 'JARANG' | 'TIDAK_ADA';

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
