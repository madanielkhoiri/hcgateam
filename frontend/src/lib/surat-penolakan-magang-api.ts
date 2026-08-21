// ==================================================
// FILE: frontend/src/lib/surat-penolakan-magang-api.ts
// FUNGSI: Klien API "Surat Penolakan Magang" (R & D) + tipe data bersama
// ==================================================

import { getAccessToken } from './access-control';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type AkunRingkas = {
  id: number;
  name: string;
  role: string;
};

export type AnakMagangRingkas = {
  id: number;
  nama: string;
  nrp: string | null;
};

export type SuratPenolakanMagang = {
  id: number;
  nomor: string;
  nama: string;
  sapaan: 'Saudara' | 'Saudari';
  alasanPenolakan: string;
  filePdf: string | null;
  createdAt: string;
  anakMagang: AnakMagangRingkas;
  dibuatOleh: AkunRingkas;
};

export class SuratPenolakanMagangApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'SuratPenolakanMagangApiError';
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
  const response = await fetch(`${API_URL}/surat-penolakan-magang${path}`, {
    ...init,
    headers: {
      ...headerAuth(),
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new SuratPenolakanMagangApiError(
      await bacaError(response),
      response.status,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const suratPenolakanMagangApi = {
  ambil: <T>(path: string) => request<T>(path),

  kirim: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),

  urlPdf: (filePdf: string) => `${API_URL}/uploads/${filePdf}`,
};

export function formatTanggal(nilai: string | null | undefined): string {
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
