// ==================================================
// FILE: frontend/src/lib/album-api.ts
// FUNGSI: Klien API Album Dokumentasi (foto kegiatan) + tipe data
// ==================================================

import { getAccessToken } from './access-control';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type AlbumRingkas = {
  id: number;
  judul: string;
  deskripsi: string | null;
  uploadedBy: { id: number; name: string; nrp: string | null };
  createdAt: string;
  totalFoto: number;
  sampul: string | null;
};

export type AlbumFoto = {
  id: number;
  albumId: number;
  urlFoto: string;
  createdAt: string;
};

export type AlbumDetail = {
  id: number;
  judul: string;
  deskripsi: string | null;
  uploadedBy: { id: number; name: string; nrp: string | null };
  createdAt: string;
  foto: AlbumFoto[];
};

export class AlbumApiError extends Error {
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
  const response = await fetch(`${API_URL}/album${path}`, {
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
    throw new AlbumApiError(await bacaError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const albumApi = {
  daftar: () => request<AlbumRingkas[]>(''),
  detail: (id: number) => request<AlbumDetail>(`/${id}`),
  buat: (judul: string, deskripsi?: string) =>
    request<{ id: number }>('', {
      method: 'POST',
      body: JSON.stringify({ judul, deskripsi }),
    }),
  tambahFoto: (albumId: number, files: File[]) => {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    return request<AlbumDetail>(`/${albumId}/foto`, {
      method: 'POST',
      body: form,
    });
  },
  hapusAlbum: (id: number) =>
    request<{ message: string }>(`/${id}`, { method: 'DELETE' }),
  hapusFoto: (id: number) =>
    request<{ message: string }>(`/foto/${id}`, { method: 'DELETE' }),
};

export function urlFotoAlbum(pathRelatif: string): string {
  return `${API_URL}/uploads/${pathRelatif}`;
}
