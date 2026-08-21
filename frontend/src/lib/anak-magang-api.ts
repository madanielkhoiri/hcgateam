// ==================================================
// FILE: frontend/src/lib/anak-magang-api.ts
// FUNGSI: Klien API "Database Anak Magang" (R & D) + tipe data bersama
// ==================================================

import { getAccessToken } from './access-control';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type StatusAnakMagang = 'AKTIF' | 'NONAKTIF';
export type GenderAnakMagang = 'MALE' | 'FEMALE';

export type AnakMagang = {
  id: number;
  nrp: string | null;
  nama: string;
  gender: GenderAnakMagang | null;
  universitas: string | null;
  jurusan: string | null;
  maritalStatus: string | null;
  agama: string | null;
  departemen: string | null;
  jabatan: string | null;
  posisi: string | null;
  tempatLahir: string | null;
  tanggalLahir: string | null;
  pendidikan: string | null;
  tanggalMulai: string | null;
  tanggalSelesai: string | null;
  email: string | null;
  noHp: string | null;
  noKtp: string | null;
  npwp: string | null;
  nomorRekening: string | null;
  bank: string | null;
  namaRekening: string | null;
  alamat: string | null;
  site: string | null;
  golonganDarah: string | null;
  bpjsTk: string | null;
  bpjsKesehatan: string | null;
  tanggalMcu: string | null;
  tanggalPemeriksaan: string | null;
  tanggalInduksi: string | null;
  ukuranBaju: string | null;
  ukuranCelana: string | null;
  ukuranSepatu: string | null;
  noKk: string | null;
  rekomendasi: string | null;
  atasanLangsung: string | null;
  status: StatusAnakMagang;
  createdAt: string;
  updatedAt: string;
};

export class AnakMagangApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AnakMagangApiError';
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
  const response = await fetch(`${API_URL}/anak-magang${path}`, {
    ...init,
    headers: {
      ...headerAuth(),
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new AnakMagangApiError(await bacaError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const anakMagangApi = {
  ambil: <T>(path: string) => request<T>(path),

  kirim: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),

  ubah: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
};

export const LABEL_STATUS_ANAK_MAGANG: Record<StatusAnakMagang, string> = {
  AKTIF: 'Aktif',
  NONAKTIF: 'Non Aktif',
};

export function formatTanggalSingkat(
  nilai: string | null | undefined,
): string {
  if (!nilai) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(nilai));
}
