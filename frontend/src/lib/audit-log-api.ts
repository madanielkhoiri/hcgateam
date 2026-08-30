// ==================================================
// FILE: frontend/src/lib/audit-log-api.ts
// FUNGSI: Klien API audit log (siapa-ubah-apa-kapan) — khusus Admin/Super Admin.
// ==================================================

import { getAccessToken } from './access-control';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type AuditLogEntry = {
  id: number;
  actorId: number | null;
  actorUsername: string | null;
  actorName: string | null;
  aksi: string;
  entitas: string;
  entitasId: number | null;
  detail: Record<string, unknown> | null;
  alamatIp: string | null;
  createdAt: string;
};

export type AuditLogHalaman = {
  data: AuditLogEntry[];
  total: number;
  halaman: number;
  ukuranHalaman: number;
};

export class AuditLogApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'AuditLogApiError';
  }
}

function headerAuth(): HeadersInit {
  const token = getAccessToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
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

async function request<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    headers: headerAuth(),
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new AuditLogApiError(await bacaError(response), response.status);
  }

  return (await response.json()) as T;
}

export const auditLogApi = {
  daftar: (filter: { entitas?: string; actorId?: number; dari?: string; sampai?: string; halaman?: number }) => {
    const params = new URLSearchParams();
    if (filter.entitas) params.set('entitas', filter.entitas);
    if (filter.actorId) params.set('actorId', String(filter.actorId));
    if (filter.dari) params.set('dari', filter.dari);
    if (filter.sampai) params.set('sampai', filter.sampai);
    if (filter.halaman) params.set('halaman', String(filter.halaman));
    const qs = params.toString();
    return request<AuditLogHalaman>(`/audit-log/admin${qs ? `?${qs}` : ''}`);
  },
  daftarEntitas: () => request<string[]>('/audit-log/admin/entitas'),
};
