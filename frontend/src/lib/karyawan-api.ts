// ==================================================
// FILE: frontend/src/lib/karyawan-api.ts
// FUNGSI: Klien API "Database Karyawan" - master data karyawan HC,
// dipakai bersama oleh card-card lain yang butuh data karyawan
// (mis. MCU Periodik). Tipe data dipakai ulang dari mcu-api.ts karena
// satu tabel karyawan yang sama.
// ==================================================

import { getAccessToken } from './access-control';

export type {
  Departemen,
  Karyawan,
  StatusKerja,
  StatusKesehatanDirumahkan,
} from './mcu-api';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export class KaryawanApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'KaryawanApiError';
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
  const response = await fetch(`${API_URL}/database-karyawan${path}`, {
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
    throw new KaryawanApiError(await bacaError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const karyawanApi = {
  ambil: <T>(path: string) => request<T>(path),

  kirim: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),

  ubah: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),

  hapus: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
};