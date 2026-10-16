import { getAccessToken } from './access-control';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';
export type KategoriRkb = 'PROJECT' | 'MAINTENANCE';
export type StatusRkb = 'WAITING_APPROVAL' | 'WAITING_SUPPLY' | 'CLOSE';
export type BarangRkb = { id?: number; namaBarang: string; qty: number; satuan: string };
export type ProjectRkb = { id:number; namaProject:string; kategori:KategoriRkb; rkb:MonitoringRkb[]; createdAt:string; updatedAt:string };
export type MonitoringRkb = { id: number; projectId:number; tanggal: string; nomorRkb: string; kategori: KategoriRkb; status: StatusRkb; barang: BarangRkb[]; project?:ProjectRkb; createdAt: string; updatedAt: string };
export type MonitoringRkbInput = { projectId:number; tanggal:string; nomorRkb:string; status:StatusRkb; barang?:BarangRkb[] };

async function request<T>(path = '', init: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const response = await fetch(`${API_URL}/monitoring-rkb${path}`, {
    ...init, cache: 'no-store', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers ?? {}) },
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const message = Array.isArray(body?.message) ? body.message[0] : body?.message;
    throw new Error(message || `Permintaan gagal (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const monitoringRkbApi = {
  daftar: (filter?: { kategori?: string; status?: string; cari?: string; projectId?:number }) => {
    const params = new URLSearchParams();
    if (filter?.kategori) params.set('kategori', filter.kategori);
    if (filter?.status) params.set('status', filter.status);
    if (filter?.cari) params.set('cari', filter.cari);
    if (filter?.projectId) params.set('projectId', String(filter.projectId));
    const query = params.toString();
    return request<MonitoringRkb[]>(query ? `?${query}` : '');
  },
  buat: (data: MonitoringRkbInput) => request<MonitoringRkb>('', { method: 'POST', body: JSON.stringify(data) }),
  detail: (id: number) => request<MonitoringRkb>(`/${id}`),
  ubah: (id: number, data: MonitoringRkbInput) => request<MonitoringRkb>(`/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  hapus: (id: number) => request<{ message: string }>(`/${id}`, { method: 'DELETE' }),
  tambahBarang: (id: number, barang: BarangRkb[]) => request<MonitoringRkb>(`/${id}/barang`, { method: 'POST', body: JSON.stringify({ barang }) }),
  ubahBarang: (id: number, barangId: number, barang: BarangRkb) => request<MonitoringRkb>(`/${id}/barang/${barangId}`, { method: 'PATCH', body: JSON.stringify(barang) }),
  hapusBarang: (id: number, barangId: number) => request<{ message: string }>(`/${id}/barang/${barangId}`, { method: 'DELETE' }),
  daftarProject: () => request<ProjectRkb[]>('/projects'),
  detailProject: (id:number) => request<ProjectRkb>(`/projects/${id}`),
  buatProject: (data:{namaProject:string;kategori:KategoriRkb}) => request<ProjectRkb>('/projects',{method:'POST',body:JSON.stringify(data)}),
  ubahProject: (id:number,data:{namaProject:string;kategori:KategoriRkb}) => request<ProjectRkb>(`/projects/${id}`,{method:'PATCH',body:JSON.stringify(data)}),
  hapusProject: (id:number) => request<{message:string}>(`/projects/${id}`,{method:'DELETE'}),
};
