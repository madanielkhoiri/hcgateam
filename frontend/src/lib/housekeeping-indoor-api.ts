// ==================================================
// FILE: frontend/src/lib/housekeeping-indoor-api.ts
// FUNGSI: Klien API modul GA ▸ Housekeeping Indoor + tipe data
// ==================================================

import { getAccessToken } from './access-control';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type LokasiHousekeepingIndoor =
  | 'OFFICE'
  | 'PLANT'
  | 'CSA_GIBSON'
  | 'VIEW_POINT'
  | 'CSA_MONTE_BARU'
  | 'CSA_MONTE_BARU_SUPPORT';

export const LOKASI_HOUSEKEEPING_INDOOR: LokasiHousekeepingIndoor[] = [
  'OFFICE',
  'PLANT',
  'CSA_GIBSON',
  'VIEW_POINT',
  'CSA_MONTE_BARU',
  'CSA_MONTE_BARU_SUPPORT',
];

export const LABEL_LOKASI_HOUSEKEEPING_INDOOR: Record<LokasiHousekeepingIndoor, string> = {
  OFFICE: 'Office',
  PLANT: 'Plant',
  CSA_GIBSON: 'CSA Gibson',
  VIEW_POINT: 'View Point',
  CSA_MONTE_BARU: 'CSA Monte Baru',
  CSA_MONTE_BARU_SUPPORT: 'CSA Monte Baru & CSA Support',
};

export type HousekeepingIndoorFoto = {
  id: number;
  fileUrl: string;
};

export type HousekeepingIndoorLaporan = {
  id: number;
  lokasi: LokasiHousekeepingIndoor;
  namaPetugas: string;
  createdAt: string;
  foto: HousekeepingIndoorFoto[];
  pengirim?: { id: number; name: string };
};

export class HousekeepingIndoorApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'HousekeepingIndoorApiError';
  }
}

function headerAuth(): HeadersInit {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function bacaError(response: Response): Promise<string> {
  try {
    const data = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(data.message)) {
      return data.message.join(', ');
    }
    return data.message || `Permintaan gagal (${response.status})`;
  } catch {
    return `Permintaan gagal (${response.status})`;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...headerAuth(),
      ...(init.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new HousekeepingIndoorApiError(await bacaError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function urlFileHousekeepingIndoor(pathRelatif: string): string {
  return `${API_URL}/uploads/${pathRelatif}`;
}

export const housekeepingIndoorApi = {
  daftar: (lokasi?: LokasiHousekeepingIndoor) =>
    request<HousekeepingIndoorLaporan[]>(`/housekeeping-indoor${lokasi ? `?lokasi=${lokasi}` : ''}`),
  buat: (data: { lokasi: LokasiHousekeepingIndoor; namaPetugas: string }, files: File[]) => {
    const form = new FormData();
    form.append('lokasi', data.lokasi);
    form.append('namaPetugas', data.namaPetugas);
    files.forEach((file) => form.append('file', file));
    return request<HousekeepingIndoorLaporan>('/housekeeping-indoor', { method: 'POST', body: form });
  },
  hapus: (id: number) => request<{ message: string }>(`/housekeeping-indoor/${id}`, { method: 'DELETE' }),
};
