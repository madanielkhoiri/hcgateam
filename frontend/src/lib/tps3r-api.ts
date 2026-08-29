// ==================================================
// FILE: frontend/src/lib/tps3r-api.ts
// FUNGSI: Klien API Laporan Timbangan Sampah TPS 3R (Civil Infras) + tipe data
// Satu laporan mencakup Organik, Non Organik, Guna Ulang/Reuse,
// Daur Ulang/Recycle, dan Residu sekaligus (kg).
// ==================================================

import { getAccessToken } from './access-control';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type LaporanTps3r = {
  id: number;
  tanggal: string;
  beratOrganik: number;
  beratNonOrganik: number;
  beratReuse: number;
  beratRecycle: number;
  beratResidu: number;
  createdBy: { id: number; name: string; nrp: string | null };
  createdAt: string;
};

export type RingkasanTps3r = {
  totalLaporan: number;
  totalOrganik: number;
  totalNonOrganik: number;
  totalReuse: number;
  totalRecycle: number;
  totalResidu: number;
};

export type TrenBulananTps3r = {
  bulan: number;
  totalKg: number;
};

export class Tps3rApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function headerAuth(): Record<string, string> {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function bacaError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    const pesan = Array.isArray(data?.message) ? data.message[0] : data?.message;
    return pesan || `Permintaan gagal (${response.status})`;
  } catch {
    return `Permintaan gagal (${response.status})`;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}/civil-tps3r${path}`, {
    ...init,
    headers: {
      ...headerAuth(),
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Tps3rApiError(await bacaError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export type LaporanTps3rInput = {
  tanggal: string;
  beratOrganik: number;
  beratNonOrganik: number;
  beratReuse: number;
  beratRecycle: number;
  beratResidu: number;
};

export const tps3rApi = {
  daftar: (bulan?: number, tahun?: number) => {
    const params = new URLSearchParams();
    if (bulan) params.set('bulan', String(bulan));
    if (tahun) params.set('tahun', String(tahun));
    const query = params.toString();
    return request<LaporanTps3r[]>(query ? `?${query}` : '');
  },
  ringkasan: (bulan?: number, tahun?: number) => {
    const params = new URLSearchParams();
    if (bulan) params.set('bulan', String(bulan));
    if (tahun) params.set('tahun', String(tahun));
    const query = params.toString();
    return request<RingkasanTps3r>(`/ringkasan${query ? `?${query}` : ''}`);
  },
  tren: (tahun: number) => request<TrenBulananTps3r[]>(`/tren?tahun=${tahun}`),
  buat: (data: LaporanTps3rInput) =>
    request<LaporanTps3r>('', { method: 'POST', body: JSON.stringify(data) }),
  ubah: (id: number, data: Partial<LaporanTps3rInput>) =>
    request<LaporanTps3r>(`/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  hapus: (id: number) => request<{ message: string }>(`/${id}`, { method: 'DELETE' }),
};
