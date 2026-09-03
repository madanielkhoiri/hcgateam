// ==================================================
// FILE: frontend/src/lib/deviasi-stok-api.ts
// FUNGSI: Klien API dashboard Deviasi Stok (khusus Admin/Section Head)
// ==================================================

import { getAccessToken } from './access-control';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type JenisDeviasiStok = 'KURANG' | 'LEBIH';

export type BarisDeviasiStok = {
  id: number;
  kodeBarang: string;
  namaBarang: string;
  area: 'GENERAL' | 'MESS' | 'ELECTRIC';
  satuan: string;
  stokLama: number;
  stokBaru: number;
  selisih: number;
  jenis: JenisDeviasiStok;
  diubahOleh: string;
  createdAt: string;
};

export type DeviasiPerBulan = {
  bulan: number;
  label: string;
  kurang: number;
  lebih: number;
};

export type RekapDeviasiStok = {
  bulan: number | null;
  tahun: number;
  totalDeviasi: number;
  totalKurang: number;
  totalLebih: number;
  daftar: BarisDeviasiStok[];
  perBulan: DeviasiPerBulan[];
};

export const LABEL_AREA_DEVIASI: Record<BarisDeviasiStok['area'], string> = {
  GENERAL: 'Inventory',
  MESS: 'Mess',
  ELECTRIC: 'Electric',
};

export class DeviasiStokApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'DeviasiStokApiError';
  }
}

function headerAuth(): HeadersInit {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function bacaError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string | string[] };
    return Array.isArray(data.message) ? data.message.join(', ') : data.message || `Permintaan gagal (${response.status})`;
  } catch {
    return `Permintaan gagal (${response.status})`;
  }
}

export const deviasiStokApi = {
  rekap: async (bulan: number | null, tahun: number): Promise<RekapDeviasiStok> => {
    const params = new URLSearchParams({ tahun: String(tahun) });
    if (bulan) params.set('bulan', String(bulan));

    const response = await fetch(`${API_URL}/inventory/deviasi-stok?${params.toString()}`, {
      headers: headerAuth(),
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new DeviasiStokApiError(await bacaError(response), response.status);
    }

    return response.json();
  },
};

export function namaBulan(bulan: number): string {
  return new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(new Date(2026, bulan - 1, 1));
}
