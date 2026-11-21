// ==================================================
// FILE: backend/src/inventory/stock-opname.service.ts
// FUNGSI: Stock Opname (cek fisik barang) untuk Inventory Infras, Mess, Electric.
// Alur: admin mulai sesi -> checklist semua barang aktif (snapshot stok sistem)
// -> isi jumlah fisik + kondisi per barang -> Selesaikan: stok disesuaikan
// otomatis dan selisih dicatat di Deviasi Stok. Tanpa tahap persetujuan.
// ==================================================

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  InventoryScope,
  KondisiBarangOpname,
  LokasiGudang,
  StatusStockOpname,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DeviasiStokService } from './deviasi-stok.service';
import { InventoryAksesService } from './inventory-akses.service';
import { BuatStockOpnameDto, IsiStockOpnameItemDto } from './dto/stock-opname.dto';

export type AktorOpname = { id: number; role: UserRole; nama?: string | null; username?: string | null };

const KODE_SCOPE: Record<InventoryScope, string> = {
  GENERAL: 'INF',
  MESS: 'MES',
  ELECTRIC: 'ELC',
};

const ITEM_SELECT = {
  id: true,
  code: true,
  name: true,
  unit: true,
  category: true,
  lokasiGudang: true,
  photoPath: true,
} as const;

@Injectable()
export class StockOpnameService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: InventoryAksesService,
    private readonly deviasi: DeviasiStokService,
  ) {}

  private parseScope(value: string): InventoryScope {
    const mentah = String(value ?? '').trim().toUpperCase();
    const scope = mentah === 'INFRAS' ? InventoryScope.GENERAL : mentah;
    if (!(Object.values(InventoryScope) as string[]).includes(scope)) {
      throw new BadRequestException('Tipe inventory hanya Infras, Mess, atau Electric');
    }
    return scope as InventoryScope;
  }

  /** Opname = mengubah stok, jadi aksesnya sama dengan edit stok. */
  private wajibAkses(aktor: AktorOpname, scope: InventoryScope) {
    this.akses.wajibBolehEditStokArea(aktor.role, scope);
  }

  private namaAktor(aktor: AktorOpname) {
    return (aktor.nama || aktor.username || `User #${aktor.id}`).trim();
  }

  /** Ringkasan progres & selisih satu sesi. */
  private ringkas(items: Array<{ stokSistem: number; stokFisik: number | null; kondisi: KondisiBarangOpname | null }>) {
    const dicek = items.filter((item) => item.stokFisik !== null);
    const selisih = dicek.filter((item) => item.stokFisik !== item.stokSistem);
    return {
      totalBarang: items.length,
      sudahDicek: dicek.length,
      barangSelisih: selisih.length,
      totalKurang: selisih.reduce((t, i) => t + Math.max(0, i.stokSistem - (i.stokFisik ?? 0)), 0),
      totalLebih: selisih.reduce((t, i) => t + Math.max(0, (i.stokFisik ?? 0) - i.stokSistem), 0),
      barangRusak: dicek.filter((i) => i.kondisi === KondisiBarangOpname.RUSAK).length,
      barangKadaluarsa: dicek.filter((i) => i.kondisi === KondisiBarangOpname.KADALUARSA).length,
    };
  }

  async daftar(scopeValue: string, aktor: AktorOpname) {
    const scope = this.parseScope(scopeValue);
    this.wajibAkses(aktor, scope);

    const sesi = await this.prisma.stockOpname.findMany({
      where: { inventoryScope: scope },
      include: { items: { select: { stokSistem: true, stokFisik: true, kondisi: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return sesi.map(({ items, ...rest }) => ({ ...rest, ringkasan: this.ringkas(items) }));
  }

  async detail(scopeValue: string, id: number, aktor: AktorOpname) {
    const scope = this.parseScope(scopeValue);
    this.wajibAkses(aktor, scope);

    const sesi = await this.prisma.stockOpname.findFirst({
      where: { id, inventoryScope: scope },
      include: { items: { include: { item: { select: ITEM_SELECT } } } },
    });
    if (!sesi) throw new NotFoundException('Sesi stock opname tidak ditemukan');

    const items = [...sesi.items].sort((a, b) => a.item.code.localeCompare(b.item.code, 'id', { numeric: true }));
    return { ...sesi, items, ringkasan: this.ringkas(items) };
  }

  async buat(scopeValue: string, dto: BuatStockOpnameDto, aktor: AktorOpname) {
    const scope = this.parseScope(scopeValue);
    this.wajibAkses(aktor, scope);

    const lokasi: LokasiGudang | null = scope === InventoryScope.ELECTRIC ? dto.lokasiGudang ?? null : null;

    // Sesi berjalan tidak boleh tumpang tindih (lokasi sama, atau salah satunya "semua lokasi").
    const bentrok = await this.prisma.stockOpname.findFirst({
      where: {
        inventoryScope: scope,
        status: StatusStockOpname.BERJALAN,
        ...(lokasi ? { OR: [{ lokasiGudang: null }, { lokasiGudang: lokasi }] } : {}),
      },
      select: { nomor: true },
    });
    if (bentrok) {
      throw new ConflictException(`Masih ada stock opname berjalan (${bentrok.nomor}). Selesaikan atau batalkan dulu.`);
    }

    const barang = await this.prisma.item.findMany({
      where: { inventoryScope: scope, isActive: true, ...(lokasi ? { lokasiGudang: lokasi } : {}) },
      select: { id: true, stock: { select: { quantity: true } } },
    });
    if (!barang.length) {
      throw new BadRequestException('Tidak ada barang aktif untuk dicek pada lingkup ini');
    }

    const sekarang = new Date();
    const periode = `${sekarang.getFullYear()}${String(sekarang.getMonth() + 1).padStart(2, '0')}`;
    const awalan = `SO-${KODE_SCOPE[scope]}-${periode}-`;

    return this.prisma.$transaction(async (tx) => {
      const terakhir = await tx.stockOpname.findFirst({
        where: { nomor: { startsWith: awalan } },
        orderBy: { nomor: 'desc' },
        select: { nomor: true },
      });
      const urut = (Number(terakhir?.nomor.slice(awalan.length)) || 0) + 1;

      return tx.stockOpname.create({
        data: {
          nomor: `${awalan}${String(urut).padStart(3, '0')}`,
          inventoryScope: scope,
          lokasiGudang: lokasi,
          catatan: dto.catatan?.trim() || null,
          dibuatOlehId: aktor.id,
          dibuatOlehNama: this.namaAktor(aktor),
          items: {
            create: barang.map((item) => ({ itemId: item.id, stokSistem: item.stock?.quantity ?? 0 })),
          },
        },
      });
    });
  }

  async isiItem(scopeValue: string, id: number, itemId: number, dto: IsiStockOpnameItemDto, aktor: AktorOpname) {
    const scope = this.parseScope(scopeValue);
    this.wajibAkses(aktor, scope);

    const baris = await this.prisma.stockOpnameItem.findFirst({
      where: { opnameId: id, itemId, opname: { inventoryScope: scope } },
      include: { opname: { select: { status: true } } },
    });
    if (!baris) throw new NotFoundException('Barang tidak ada di sesi stock opname ini');
    if (baris.opname.status !== StatusStockOpname.BERJALAN) {
      throw new BadRequestException('Stock opname sudah selesai, data tidak bisa diubah');
    }

    return this.prisma.stockOpnameItem.update({
      where: { id: baris.id },
      data: {
        stokFisik: dto.stokFisik,
        kondisi: dto.kondisi ?? KondisiBarangOpname.BAIK,
        catatan: dto.catatan?.trim() || null,
        dicekOlehNama: this.namaAktor(aktor),
        dicekAt: new Date(),
      },
      include: { item: { select: ITEM_SELECT } },
    });
  }

  /**
   * Selesaikan sesi: semua barang wajib sudah dicek. Stok baru = stok saat ini
   * + (fisik - snapshot), jadi transaksi masuk/keluar selama opname tetap terhitung.
   */
  async selesaikan(scopeValue: string, id: number, aktor: AktorOpname) {
    const scope = this.parseScope(scopeValue);
    this.wajibAkses(aktor, scope);

    const sesi = await this.prisma.stockOpname.findFirst({
      where: { id, inventoryScope: scope },
      include: { items: true },
    });
    if (!sesi) throw new NotFoundException('Sesi stock opname tidak ditemukan');
    if (sesi.status !== StatusStockOpname.BERJALAN) {
      throw new BadRequestException('Stock opname ini sudah selesai');
    }

    const belum = sesi.items.filter((item) => item.stokFisik === null).length;
    if (belum > 0) {
      throw new BadRequestException(`Masih ada ${belum} barang yang belum dicek`);
    }

    await this.prisma.$transaction(
      async (tx) => {
        for (const baris of sesi.items) {
          const selisih = (baris.stokFisik ?? 0) - baris.stokSistem;
          if (selisih === 0) continue;

          const stok = await tx.inventoryStock.findUnique({ where: { itemId: baris.itemId } });
          const stokLama = stok?.quantity ?? 0;
          const stokBaru = Math.max(0, stokLama + selisih);

          if (stok) {
            await tx.inventoryStock.update({ where: { itemId: baris.itemId }, data: { quantity: stokBaru } });
          } else {
            await tx.inventoryStock.create({ data: { itemId: baris.itemId, quantity: stokBaru } });
          }
          await this.deviasi.catatJikaBerubah(tx, baris.itemId, stokLama, stokBaru, aktor.id);
        }

        await tx.stockOpname.update({
          where: { id },
          data: {
            status: StatusStockOpname.SELESAI,
            selesaiAt: new Date(),
            selesaiOlehId: aktor.id,
            selesaiOlehNama: this.namaAktor(aktor),
          },
        });
      },
      { timeout: 120_000, maxWait: 20_000 },
    );

    return this.detail(scopeValue, id, aktor);
  }

  async batalkan(scopeValue: string, id: number, aktor: AktorOpname) {
    const scope = this.parseScope(scopeValue);
    this.wajibAkses(aktor, scope);

    const sesi = await this.prisma.stockOpname.findFirst({ where: { id, inventoryScope: scope } });
    if (!sesi) throw new NotFoundException('Sesi stock opname tidak ditemukan');
    if (sesi.status !== StatusStockOpname.BERJALAN) {
      throw new BadRequestException('Stock opname yang sudah selesai tidak bisa dibatalkan');
    }

    await this.prisma.stockOpname.delete({ where: { id } });
    return { message: `Stock opname ${sesi.nomor} dibatalkan` };
  }
}
