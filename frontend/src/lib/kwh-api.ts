// ==================================================
// FILE: frontend/src/lib/kwh-api.ts
// FUNGSI: Klien API Perhitungan KWH (Civil > GA MEP > Electric) + tipe data
// Pemakaian bulan berjalan = stand bulan ini - stand bulan lalu.
// ==================================================

import { getAccessToken } from './access-control';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type KwhMeter = { id: number; nama: string; lokasi: string | null; aktif: boolean };

export type KwhPencatatan = {
  id: number;
  meterId: number;
  meter: { id: number; nama: string; lokasi: string | null };
  tahun: number;
  bulan: number;
  standMeter: number;
  /** Stand bulan ini dikurangi stand bulan lalu; null bila bulan lalu belum dicatat. */
  pemakaian: number | null;
  tanggalCatat: string;
  /** true bila dicatat tanggal 1 di atas pukul 10.00 WITA. */
  tepatWaktu: boolean;
  catatan: string | null;
  pencatat: { id: number; name: string };
};

export type RingkasanKwh = {
  tahun: number;
  bulan: number;
  totalMeter: number;
  pemakaianBulanIni: number;
  pemakaianBulanLalu: number;
  selisihPersen: number | null;
  meterBelumDicatatBulanIni: number;
};

export type TrenKwh = {
  tahun: number;
  bulan: number;
  trenBulanan: { bulan: number; total: number }[];
  perMeter: { meterId: number; nama: string; total: number }[];
};

export type PayloadBuatKwh = {
  meterId?: number;
  namaMeterBaru?: string;
  lokasiMeterBaru?: string;
  standMeter: number;
  tanggalCatat?: string;
  catatan?: string;
};

export class KwhApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'KwhApiError';
  }
}

async function bacaError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) return data.message.join(', ');
    return data.message || `Permintaan gagal (${response.status})`;
  } catch {
    return `Permintaan gagal (${response.status})`;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });
  if (!response.ok) throw new KwhApiError(await bacaError(response), response.status);
  return (await response.json()) as T;
}

export const kwhApi = {
  ringkasan: () => request<RingkasanKwh>('/kwh/dashboard/ringkasan'),
  tren: () => request<TrenKwh>('/kwh/dashboard/tren'),
  daftarMeter: () => request<KwhMeter[]>('/kwh/meter'),
  daftarPencatatan: (filter?: { tahun?: number; meterId?: number }) => {
    const params = new URLSearchParams();
    if (filter?.tahun) params.set('tahun', String(filter.tahun));
    if (filter?.meterId) params.set('meterId', String(filter.meterId));
    const query = params.toString();
    return request<KwhPencatatan[]>(`/kwh/pencatatan${query ? `?${query}` : ''}`);
  },
  buat: (payload: PayloadBuatKwh) =>
    request<unknown>('/kwh/pencatatan', { method: 'POST', body: JSON.stringify(payload) }),
  ubah: (id: number, payload: { standMeter: number; tanggalCatat?: string; catatan?: string }) =>
    request<unknown>(`/kwh/pencatatan/${id}`, { method: 'PATCH', body: JSON.stringify(payload) }),
  hapus: (id: number) => request<unknown>(`/kwh/pencatatan/${id}`, { method: 'DELETE' }),
};
