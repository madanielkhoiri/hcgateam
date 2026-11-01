import { getAccessToken } from './access-control';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type ToolEmployee = {
  id: number; nrp: string; name: string; isActive: boolean; qrPayload: string;
};
export type ToolAsset = {
  id: number; owner: 'GA' | 'ELECTRIC'; code: string; name: string;
  status: 'AVAILABLE' | 'BORROWED' | 'DAMAGED' | 'LOST';
  loans: Array<{ id: number; borrowedAt: string; borrower: ToolEmployee }>;
};
export type ToolLoan = {
  id: number; borrowedAt: string; returnedAt: string | null;
  returnCondition: 'GOOD' | 'DAMAGED' | 'LOST' | null; returnNote: string | null;
  tool: ToolAsset; borrower: ToolEmployee; returner: ToolEmployee | null;
};

function auth(json = false): HeadersInit {
  const token = getAccessToken();
  return { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(json ? { 'Content-Type': 'application/json' } : {}) };
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, { ...init, headers: { ...auth(Boolean(init?.body)), ...init?.headers }, cache: 'no-store' });
  if (!response.ok) {
    const data = await response.json().catch(() => null) as { message?: string | string[] } | null;
    const message = Array.isArray(data?.message) ? data.message.join(', ') : data?.message;
    throw new Error(message || `Permintaan gagal (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const toolBorrowingApi = {
  employees: () => request<ToolEmployee[]>('/gudang/tool-borrowing/employees'),
  createEmployee: (data: { nrp: string; name: string }) => request<ToolEmployee>('/gudang/tool-borrowing/employees', { method: 'POST', body: JSON.stringify(data) }),
  qrBlob: async (id: number) => {
    const response = await fetch(`${API_URL}/gudang/tool-borrowing/employees/${id}/qr`, { headers: auth() });
    if (!response.ok) throw new Error('Gagal membuat QR karyawan');
    return response.blob();
  },
  tools: (owner?: string) => request<ToolAsset[]>(`/gudang/tool-borrowing/tools${owner ? `?owner=${owner}` : ''}`),
  createTool: (data: { owner: string; code: string; name: string }) => request<ToolAsset>('/gudang/tool-borrowing/tools', { method: 'POST', body: JSON.stringify(data) }),
  borrow: (id: number, qrData: string) => request(`/gudang/tool-borrowing/tools/${id}/borrow`, { method: 'POST', body: JSON.stringify({ qrData }) }),
  returnTool: (id: number, data: { qrData: string; condition: string; note: string }) => request(`/gudang/tool-borrowing/tools/${id}/return`, { method: 'POST', body: JSON.stringify(data) }),
  history: () => request<ToolLoan[]>('/gudang/tool-borrowing/history'),
};
