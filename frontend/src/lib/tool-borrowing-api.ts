import { getAccessToken } from './access-control';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type ToolEmployee = {
  id: number; nrp: string; name: string; isActive: boolean; qrPayload: string;
};
export type ToolAsset = {
  id: number; owner: 'GA' | 'ELECTRIC'; code: string; name: string;
  status: 'AVAILABLE' | 'BORROWED' | 'DAMAGED' | 'LOST';
  inspectionType: string | null;
  /** Jenis checklist yang dipakai: pilihan Master Alat atau tebakan dari nama alat. */
  inspectionKey: string;
  loans: Array<{ id: number; borrowedAt: string; borrower: ToolEmployee }>;
};
export type ToolInspectionTemplate = {
  key: string; title: string; withLocation?: boolean; items: Array<{ item: string; standard: string }>;
};
export type ToolInspectionResult = {
  form: string; templateKey: string; title: string;
  items: Array<{ no: number; item: string; standard: string; condition: 'BAIK' | 'TIDAK_BAIK'; hazardCode: 'H' | 'S' | 'M' | null; note: string | null }>;
  notes: string | null;
  location: string | null;
  inspectedBy: { nrp: string; name: string };
  checkedBy: { userId: number; name: string | null };
  inspectedAt: string;
};
export type ToolLoan = {
  id: number; borrowedAt: string; returnedAt: string | null;
  returnCondition: 'GOOD' | 'DAMAGED' | 'LOST' | null; returnNote: string | null;
  borrowMethod: 'SCAN' | 'MANUAL' | null; returnMethod: 'SCAN' | 'MANUAL' | null;
  borrowInspection: ToolInspectionResult | null;
  tool: ToolAsset; borrower: ToolEmployee; returner: ToolEmployee | null;
};
export type ToolIdentity = { qrData?: string; nrp?: string };
export type ToolInspectionInput = {
  items: Array<{ condition: 'BAIK' | 'TIDAK_BAIK' | ''; hazardCode: string; note: string }>;
  notes: string;
  location: string;
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
  lookupEmployee: (nrp: string) => request<{ nrp: string; name: string }>(`/gudang/tool-borrowing/employees/lookup?nrp=${encodeURIComponent(nrp)}`),
  createEmployee: (data: { nrp: string; name: string }) => request<ToolEmployee>('/gudang/tool-borrowing/employees', { method: 'POST', body: JSON.stringify(data) }),
  qrBlob: async (id: number) => {
    const response = await fetch(`${API_URL}/gudang/tool-borrowing/employees/${id}/qr`, { headers: auth() });
    if (!response.ok) throw new Error('Gagal membuat QR karyawan');
    return response.blob();
  },
  inspectionTemplates: () => request<ToolInspectionTemplate[]>('/gudang/tool-borrowing/inspection-templates'),
  tools: (owner?: string) => request<ToolAsset[]>(`/gudang/tool-borrowing/tools${owner ? `?owner=${owner}` : ''}`),
  createTool: (data: { owner: string; code: string; name: string; inspectionType: string }) => request<ToolAsset>('/gudang/tool-borrowing/tools', { method: 'POST', body: JSON.stringify(data) }),
  updateToolInspection: (id: number, inspectionType: string) => request<ToolAsset>(`/gudang/tool-borrowing/tools/${id}`, { method: 'PATCH', body: JSON.stringify({ inspectionType }) }),
  borrow: (id: number, data: ToolIdentity & { inspection: ToolInspectionInput }) => request(`/gudang/tool-borrowing/tools/${id}/borrow`, { method: 'POST', body: JSON.stringify(data) }),
  returnTool: (id: number, data: ToolIdentity & { condition: string; note: string }) => request(`/gudang/tool-borrowing/tools/${id}/return`, { method: 'POST', body: JSON.stringify(data) }),
  history: () => request<ToolLoan[]>('/gudang/tool-borrowing/history'),
};
