import { getAccessToken } from './access-control';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export const TAHAPAN_PROJECT_TAMBANG = [
  'pengajuanProjectCharter', 'reviewApprovalAi', 'pengecekanArea', 'dokumenProject',
  'kickOffMeeting', 'pelaksanaan', 'komisioning', 'selesai',
] as const;
export type TahapanProjectTambang = (typeof TAHAPAN_PROJECT_TAMBANG)[number];
export type FieldProjectTambang = TahapanProjectTambang | 'dokumenProjectTidakBerlaku';

export type MonitoringProjectTambang = {
  id: number;
  namaPekerjaan: string;
  pengajuanProjectCharter: boolean;
  reviewApprovalAi: boolean;
  pengecekanArea: boolean;
  dokumenProject: boolean;
  dokumenProjectTidakBerlaku: boolean;
  kickOffMeeting: boolean;
  pelaksanaan: boolean;
  komisioning: boolean;
  selesai: boolean;
  createdById: number;
  createdByName: string;
  updatedById: number;
  updatedByName: string;
  createdAt: string;
  updatedAt: string;
};

export type RiwayatMonitoringProject = {
  id: number; projectId: number; field: string; nilaiSebelum: string | null;
  nilaiSesudah: string | null; actorId: number; actorName: string; createdAt: string;
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(`${API_URL}/civil-monitoring-project${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
    cache: 'no-store',
  });
  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = Array.isArray(data?.message) ? data.message[0] : data?.message;
    throw new Error(message || `Permintaan gagal (${response.status})`);
  }
  return response.json();
}

export const civilMonitoringProjectApi = {
  daftar: () => request<MonitoringProjectTambang[]>(''),
  buat: (namaPekerjaan: string) => request<MonitoringProjectTambang>('', { method: 'POST', body: JSON.stringify({ namaPekerjaan }) }),
  ubahNama: (id: number, namaPekerjaan: string) => request<MonitoringProjectTambang>(`/${id}/nama`, { method: 'PATCH', body: JSON.stringify({ namaPekerjaan }) }),
  ubahTahapan: (id: number, field: FieldProjectTambang, value: boolean) => request<MonitoringProjectTambang>(`/${id}/tahapan`, { method: 'PATCH', body: JSON.stringify({ field, value }) }),
  hapus: (id: number) => request<{ message: string }>(`/${id}`, { method: 'DELETE' }),
  riwayat: (id: number) => request<RiwayatMonitoringProject[]>(`/${id}/riwayat`),
};
