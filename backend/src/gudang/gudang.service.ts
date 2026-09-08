// ==================================================
// FILE: backend/src/gudang/gudang.service.ts
// FUNGSI: Logika alur self-order "Ambil Barang" untuk role Gudang —
// reuse penuh InventoryAreaService (bukan duplikasi logic transaksi),
// cuma menambahkan gerbang peran + bentuk data yang cocok untuk menu.
// ==================================================

import { BadRequestException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { InventoryAreaService } from '../inventory/inventory-area.service';
import { GudangAksesService } from './gudang-akses.service';

export type AktorGudang = {
  id: number;
  role: UserRole;
  username?: string;
};

export type CheckoutItemInput = {
  itemId: number;
  quantity: number;
};

export type CheckoutInput = {
  taker: string;
  department: string;
  note?: string;
  items: CheckoutItemInput[];
};

@Injectable()
export class GudangService {
  constructor(
    private readonly inventoryArea: InventoryAreaService,
    private readonly akses: GudangAksesService,
  ) {}

  private today(): string {
    return new Date().toISOString().slice(0, 10);
  }

  /** Daftar barang aktif + stok untuk ditampilkan sebagai menu self-order. */
  async daftarBarang(aktor: AktorGudang, scope: string) {
    this.akses.wajibGudang(aktor.role);

    const items = await this.inventoryArea.getItems(scope);

    return items
      .filter((item) => item.isActive)
      .map((item) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        category: item.category,
        unit: item.unit,
        stock: item.stock?.quantity ?? 0,
        photoPath: item.photoPath,
      }));
  }

  async checkout(
    aktor: AktorGudang,
    scope: string,
    input: CheckoutInput,
    photoFilename?: string,
  ) {
    this.akses.wajibGudang(aktor.role);

    if (!input.taker?.trim() || input.taker.trim().length < 2) {
      throw new BadRequestException('Nama pengambil wajib diisi');
    }

    if (!input.department?.trim() || input.department.trim().length < 2) {
      throw new BadRequestException('Departemen/site wajib diisi');
    }

    if (!input.items.length) {
      throw new BadRequestException('Keranjang masih kosong');
    }

    for (const line of input.items) {
      if (!Number.isInteger(line.itemId) || line.itemId <= 0) {
        throw new BadRequestException('ID barang tidak valid');
      }

      if (!Number.isInteger(line.quantity) || line.quantity <= 0) {
        throw new BadRequestException('Qty barang harus lebih dari 0');
      }
    }

    const hasil = await this.inventoryArea.createStockOutBatch(
      scope,
      {
        date: this.today(),
        taker: input.taker,
        department: input.department,
        description: input.note,
        items: input.items,
      },
      photoFilename,
    );

    return {
      message: hasil.message,
      transaksi: hasil.data.map((row) => ({
        id: row.id,
        namaBarang: row.item.name,
        quantity: row.quantity,
        unit: row.unit,
      })),
    };
  }
}
