import { getAccessToken } from './access-control';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type ScopeOpname = 'GENERAL' | 'MESS' | 'ELECTRIC';
export type LokasiGudang = 'GUDANG_GA' | 'GUDANG_ELEKTRIK';
export type KondisiOpname = 'BAIK' | 'RUSAK' | 'KADALUARSA';

export type RingkasanOpname = {
  totalBarang: number;
  sudahDicek: number;
  barangSelisih: number;
  totalKurang: number;
  totalLebih: number;
  barangRusak: number;
  barangKadaluarsa: number;
};

export type SesiOpname = {
  id: number;
  nomor: string;
  inventoryScope: ScopeOpname;
  lokasiGudang: LokasiGudang | null;
  status: 'BERJALAN' | 'SELESAI';
  catatan: string | null;
  dibuatOlehNama: string;
  selesaiOlehNama: string | null;
  selesaiAt: string | null;
  createdAt: string;
  ringkasan: RingkasanOpname;
};

export type BarisOpname = {
  id: number;
  itemId: number;
  stokSistem: number;
  stokFisik: number | null;
  kondisi: KondisiOpname | null;
  catatan: string | null;
  dicekOlehNama: string | null;
  dicekAt: string | null;
  item: {
    id: number;
    code: string;
    name: string;
    unit: string;
    category: string;
    lokasiGudang: LokasiGudang | null;
    photoPath: string | null;
  };
};

export type DetailOpname = SesiOpname & { items: BarisOpname[] };

async function request<T>(scope: ScopeOpname, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}/inventory-area/${scope}/stock-opname${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAccessToken() ?? ''}`,
      ...init?.headers,
    },
    cache: 'no-store',
  });
  const text = await response.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text };
  }
  if (!response.ok) {
    const pesan = (data as { message?: string | string[] }).message;
    throw new Error((Array.isArray(pesan) ? pesan[0] : pesan) || `Permintaan gagal (${response.status})`);
  }
  return data as T;
}

export const stockOpnameApi = {
  daftar: (scope: ScopeOpname) => request<SesiOpname[]>(scope, ''),
  detail: (scope: ScopeOpname, id: number) => request<DetailOpname>(scope, `/${id}`),
  buat: (scope: ScopeOpname, data: { lokasiGudang?: LokasiGudang; catatan?: string }) =>
    request<SesiOpname>(scope, '', { method: 'POST', body: JSON.stringify(data) }),
  isiItem: (scope: ScopeOpname, id: number, itemId: number, data: { stokFisik: number; kondisi: KondisiOpname; catatan?: string }) =>
    request<BarisOpname>(scope, `/${id}/items/${itemId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  selesaikan: (scope: ScopeOpname, id: number) => request<DetailOpname>(scope, `/${id}/selesai`, { method: 'POST' }),
  batalkan: (scope: ScopeOpname, id: number) => request<{ message: string }>(scope, `/${id}`, { method: 'DELETE' }),
};
