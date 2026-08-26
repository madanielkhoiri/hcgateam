// ==================================================
// FILE: frontend/src/lib/drive-api.ts
// FUNGSI: Klien API Drive Administrasi (CSR, Form Download) + tipe data
// ==================================================

import { getAccessToken } from './access-control';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type ScopeDrive = 'CSR' | 'FORM_DOWNLOAD';

export type DriveFolder = {
  id: number;
  scope: ScopeDrive;
  namaFolder: string;
  parentFolderId: number | null;
  createdAt: string;
};

export type DriveFile = {
  id: number;
  folderId: number;
  namaFile: string;
  urlFile: string;
  uploadedAt: string;
  uploadedBy: { id: number; name: string; nrp: string | null };
};

export class DriveApiError extends Error {
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
  const response = await fetch(`${API_URL}/drive${path}`, {
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
    throw new DriveApiError(await bacaError(response), response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const driveApi = {
  isiFolder: (scope: ScopeDrive, parentFolderId?: number | null) =>
    request<{ folders: DriveFolder[]; files: DriveFile[] }>(
      `?scope=${scope}${parentFolderId ? `&parentFolderId=${parentFolderId}` : ''}`,
    ),
  buatFolder: (scope: ScopeDrive, namaFolder: string, parentFolderId?: number) =>
    request<DriveFolder>('/folder', {
      method: 'POST',
      body: JSON.stringify({ scope, namaFolder, parentFolderId }),
    }),
  ubahFolder: (id: number, namaFolder: string) =>
    request<DriveFolder>(`/folder/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ namaFolder }),
    }),
  hapusFolder: (id: number) =>
    request<{ message: string }>(`/folder/${id}`, { method: 'DELETE' }),
  unggahFile: (folderId: number, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return request<DriveFile>(`/folder/${folderId}/file`, {
      method: 'POST',
      body: form,
    });
  },
  hapusFile: (id: number) =>
    request<{ message: string }>(`/file/${id}`, { method: 'DELETE' }),
};

export function urlFileDrive(pathRelatif: string): string {
  return `${API_URL}/uploads/${pathRelatif}`;
}
