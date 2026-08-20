// ==================================================
// FILE: frontend/src/lib/helpdesk-api.ts
// FUNGSI: Klien API modul Helpdesk Center + tipe data bersama
// ==================================================

import { getAccessToken } from './access-control';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

// ==================================================
// TIPE DATA
// ==================================================

export type StatusTiketHelpdesk = 'TERBUKA' | 'DIPROSES' | 'SELESAI';
export type LevelTiketHelpdesk = 'RENDAH' | 'SEDANG' | 'TINGGI';

export type PelaporTiket = {
  id: number;
  name: string;
  role: string;
  departemen: string | null;
  jabatan: string | null;
  phoneNumber: string | null;
};

/** Kategori -> Sub Kategori -> daftar Masalah. */
export type PohonKategoriHelpdesk = Record<string, Record<string, string[]>>;

export type TiketHelpdesk = {
  id: number;
  nomorTiket: string;
  kategori: string;
  subKategori: string;
  masalah: string | null;
  deskripsi: string;
  lampiran: string | null;
  namaFileAsli: string | null;
  status: StatusTiketHelpdesk;
  level: LevelTiketHelpdesk | null;
  catatanPenyelesaian: string | null;
  dibuatPada: string;
  diprosesPada: string | null;
  selesaiPada: string | null;
  pembuat: PelaporTiket;
  pic: { id: number; name: string } | null;
};

export type RingkasanHelpdesk = {
  antrian: number;
};

// ==================================================
// KLIEN HTTP
// ==================================================

export class HelpdeskApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'HelpdeskApiError';
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

async function request<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_URL}/helpdesk${path}`, {
    ...init,
    headers: {
      ...headerAuth(),
      ...(init.body instanceof FormData
        ? {}
        : { 'Content-Type': 'application/json' }),
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new HelpdeskApiError(await bacaError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const helpdeskApi = {
  ambil: <T>(path: string) => request<T>(path),

  ubah: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'PATCH',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),

  buatTiket: <T>(data: {
    kategori: string;
    subKategori: string;
    masalah?: string;
    deskripsi: string;
    lampiran?: File | null;
  }) => {
    const form = new FormData();
    form.append('kategori', data.kategori);
    form.append('subKategori', data.subKategori);
    if (data.masalah) {
      form.append('masalah', data.masalah);
    }
    form.append('deskripsi', data.deskripsi);

    if (data.lampiran) {
      form.append('lampiran', data.lampiran);
    }

    return request<T>('', { method: 'POST', body: form });
  },

  /** URL lampiran publik (tidak butuh header Authorization terpisah). */
  urlLampiran: (path: string) => `${API_URL}${path}`,
};

// ==================================================
// FORMAT TAMPILAN
// ==================================================

export function formatTanggalWaktu(nilai: string | null | undefined): string {
  if (!nilai) {
    return '-';
  }

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(nilai));
}

export const LABEL_STATUS_HELPDESK: Record<StatusTiketHelpdesk, string> = {
  TERBUKA: 'Open',
  DIPROSES: 'On Progress',
  SELESAI: 'Closed',
};

export const LABEL_LEVEL_HELPDESK: Record<LevelTiketHelpdesk, string> = {
  RENDAH: 'Low',
  SEDANG: 'Medium',
  TINGGI: 'High',
};

export function nadaStatusHelpdesk(nilai: StatusTiketHelpdesk): string {
  switch (nilai) {
    case 'SELESAI':
      return 'sukses';
    case 'DIPROSES':
      return 'info';
    default:
      return 'peringatan';
  }
}

export function nadaLevelHelpdesk(nilai: LevelTiketHelpdesk | null): string {
  switch (nilai) {
    case 'TINGGI':
      return 'bahaya';
    case 'SEDANG':
      return 'peringatan';
    case 'RENDAH':
      return 'info';
    default:
      return 'netral';
  }
}
