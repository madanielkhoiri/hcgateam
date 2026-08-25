// ==================================================
// FILE: frontend/src/lib/postingan-api.ts
// FUNGSI: Klien API Postingan (poster/video carousel beranda) + tipe data
// ==================================================

import { getAccessToken, type PortalUser } from './access-control';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type TipePostingan = 'POSTER' | 'VIDEO';

export type Postingan = {
  id: number;
  judul: string;
  deskripsi: string | null;
  tipe: TipePostingan;
  urlMedia: string;
  tampilBeranda: boolean;
  urutan: number;
  createdAt: string;
  uploadedBy: { id: number; name: string; nrp: string | null };
};

export class PostinganApiError extends Error {
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
  const response = await fetch(`${API_URL}/postingan${path}`, {
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
    throw new PostinganApiError(await bacaError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const postinganApi = {
  daftar: () => request<Postingan[]>(''),
  beranda: () => request<Postingan[]>('/beranda'),
  unggah: (data: {
    judul: string;
    deskripsi?: string;
    tipe: TipePostingan;
    tampilBeranda: boolean;
    urutan?: number;
    file: File;
  }) => {
    const form = new FormData();
    form.append('judul', data.judul);
    if (data.deskripsi) form.append('deskripsi', data.deskripsi);
    form.append('tipe', data.tipe);
    form.append('tampilBeranda', String(data.tampilBeranda));
    if (data.urutan !== undefined) form.append('urutan', String(data.urutan));
    form.append('file', data.file);
    return request<Postingan>('', { method: 'POST', body: form });
  },
  ubah: (
    id: number,
    data: Partial<{
      judul: string;
      deskripsi: string;
      tampilBeranda: boolean;
      urutan: number;
    }>,
  ) =>
    request<Postingan>(`/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  hapus: (id: number) =>
    request<{ message: string }>(`/${id}`, { method: 'DELETE' }),
};

export function urlMediaPostingan(pathRelatif: string): string {
  return `${API_URL}/uploads/${pathRelatif}`;
}

export function bolehKelolaPostingan(user: PortalUser | null): boolean {
  return (
    user?.role === 'ADMIN' ||
    user?.role === 'SUPER_ADMIN' ||
    user?.role === 'ADMIN_COMBEN' ||
    user?.role === 'SECTION_HEAD'
  );
}
