// ==================================================
// FILE: frontend/src/lib/gudang-api.ts
// FUNGSI: Klien API alur self-order "Ambil Barang" (role Gudang, Section
// Head, Admin). Sengaja lewat /api/gudang/* (bukan /api/inventory-area)
// supaya akun role GUDANG yang tidak punya accessKey admin tetap bisa
// pakai — lihat backend/src/gudang/gudang.controller.ts.
// ==================================================

import { getAccessToken } from './access-control';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api';

export type InventoryScopeGudang = 'GENERAL' | 'MESS' | 'ELECTRIC';

export type BarangGudang = {
  id: number;
  code: string;
  name: string;
  category: 'ATK' | 'HOUSEKEEPING' | 'BAJU' | 'ELEKTRONIK' | 'FURNITURE';
  unit: string;
  stock: number;
  photoPath: string | null;
};

export type ItemKeranjang = {
  itemId: number;
  quantity: number;
};

export type CheckoutGudangInput = {
  scope: InventoryScopeGudang;
  taker: string;
  department: string;
  note?: string;
  items: ItemKeranjang[];
  foto?: File;
};

export type HasilCheckoutGudang = {
  message: string;
  transaksi: Array<{
    id: number;
    namaBarang: string;
    quantity: number;
    unit: string;
  }>;
};

export class GudangApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'GudangApiError';
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

/** Foto barang/bukti diserve statis lewat /api/uploads/... — lihat main.ts useStaticAssets. */
export function urlFotoGudang(filename: string, folder: 'items' | 'gudang-checkout'): string {
  return `${API_URL}/uploads/${folder}/${filename}`;
}

export const gudangApi = {
  daftarBarang: async (scope: InventoryScopeGudang): Promise<BarangGudang[]> => {
    const response = await fetch(
      `${API_URL}/gudang/barang?scope=${encodeURIComponent(scope)}`,
      { headers: headerAuth(), cache: 'no-store' },
    );

    if (!response.ok) {
      throw new GudangApiError(await bacaError(response), response.status);
    }

    return response.json();
  },

  checkout: async (input: CheckoutGudangInput): Promise<HasilCheckoutGudang> => {
    const form = new FormData();
    form.append('scope', input.scope);
    form.append('taker', input.taker);
    form.append('department', input.department);
    if (input.note) {
      form.append('note', input.note);
    }
    form.append('items', JSON.stringify(input.items));
    if (input.foto) {
      form.append('photo', input.foto);
    }

    const response = await fetch(`${API_URL}/gudang/checkout`, {
      method: 'POST',
      headers: headerAuth(),
      body: form,
    });

    if (!response.ok) {
      throw new GudangApiError(await bacaError(response), response.status);
    }

    return response.json();
  },
};
