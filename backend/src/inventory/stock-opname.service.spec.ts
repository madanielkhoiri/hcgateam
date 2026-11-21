import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InventoryScope, KondisiBarangOpname, StatusStockOpname, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DeviasiStokService } from './deviasi-stok.service';
import { InventoryAksesService } from './inventory-akses.service';
import { StockOpnameService } from './stock-opname.service';

const ADMIN = { id: 1, role: UserRole.ADMIN, nama: 'Admin GA' };

function buatService(prismaMock: Record<string, unknown>) {
  const deviasi = { catatJikaBerubah: jest.fn().mockResolvedValue(undefined) };
  const prisma = {
    ...prismaMock,
    $transaction: jest.fn((callback: (tx: unknown) => unknown) => callback(prisma)),
  } as unknown as PrismaService;
  const service = new StockOpnameService(prisma, new InventoryAksesService(), deviasi as unknown as DeviasiStokService);
  return { service, prisma, deviasi };
}

describe('StockOpnameService', () => {
  it('akun tanpa hak edit stok (Karyawan) ditolak', async () => {
    const { service } = buatService({});
    await expect(service.daftar('INFRAS', { id: 9, role: UserRole.KARYAWAN })).rejects.toThrow(ForbiddenException);
  });

  it('Elektrik boleh opname Electric, tapi tidak boleh Infras', async () => {
    const { service } = buatService({ stockOpname: { findMany: jest.fn().mockResolvedValue([]) } });
    await expect(service.daftar('ELECTRIC', { id: 5, role: UserRole.ELEKTRIK })).resolves.toEqual([]);
    await expect(service.daftar('INFRAS', { id: 5, role: UserRole.ELEKTRIK })).rejects.toThrow(ForbiddenException);
  });

  it('tidak boleh membuat sesi baru kalau masih ada yang berjalan', async () => {
    const { service } = buatService({
      stockOpname: { findFirst: jest.fn().mockResolvedValue({ nomor: 'SO-INF-202611-001' }) },
    });
    await expect(service.buat('INFRAS', {}, ADMIN)).rejects.toThrow(ConflictException);
  });

  it('membuat sesi berisi snapshot stok sistem semua barang aktif', async () => {
    const create = jest.fn().mockResolvedValue({ id: 1 });
    const { service } = buatService({
      stockOpname: {
        findFirst: jest.fn().mockResolvedValue(null),
        create,
      },
      item: {
        findMany: jest.fn().mockResolvedValue([
          { id: 10, stock: { quantity: 6 } },
          { id: 11, stock: null },
        ]),
      },
    });

    await service.buat('ELECTRIC', { lokasiGudang: 'GUDANG_GA' }, ADMIN);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          inventoryScope: InventoryScope.ELECTRIC,
          lokasiGudang: 'GUDANG_GA',
          nomor: expect.stringMatching(/^SO-ELC-\d{6}-001$/),
          items: { create: [{ itemId: 10, stokSistem: 6 }, { itemId: 11, stokSistem: 0 }] },
        }),
      }),
    );
  });

  it('tidak bisa diselesaikan kalau masih ada barang belum dicek', async () => {
    const { service } = buatService({
      stockOpname: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1,
          status: StatusStockOpname.BERJALAN,
          items: [{ itemId: 10, stokSistem: 6, stokFisik: 5 }, { itemId: 11, stokSistem: 2, stokFisik: null }],
        }),
      },
    });
    await expect(service.selesaikan('INFRAS', 1, ADMIN)).rejects.toThrow('Masih ada 1 barang yang belum dicek');
  });

  it('selesai: stok = stok saat ini + (fisik - snapshot), selisih dicatat ke Deviasi Stok', async () => {
    const inventoryUpdate = jest.fn().mockResolvedValue({});
    const opnameUpdate = jest.fn().mockResolvedValue({});
    const findFirst = jest
      .fn()
      // dipanggil saat selesaikan
      .mockResolvedValueOnce({
        id: 1,
        status: StatusStockOpname.BERJALAN,
        items: [
          { itemId: 10, stokSistem: 6, stokFisik: 5 }, // kurang 1
          { itemId: 11, stokSistem: 2, stokFisik: 2 }, // sama, tidak diubah
        ],
      })
      // dipanggil lagi oleh detail() setelah selesai
      .mockResolvedValueOnce({ id: 1, items: [] });
    const { service, deviasi } = buatService({
      stockOpname: { findFirst, update: opnameUpdate },
      // Selama opname ada barang keluar 2, jadi stok saat ini 4 (bukan 6).
      inventoryStock: { findUnique: jest.fn().mockResolvedValue({ itemId: 10, quantity: 4 }), update: inventoryUpdate },
    });

    await service.selesaikan('INFRAS', 1, ADMIN);

    expect(inventoryUpdate).toHaveBeenCalledTimes(1);
    expect(inventoryUpdate).toHaveBeenCalledWith({ where: { itemId: 10 }, data: { quantity: 3 } });
    expect(deviasi.catatJikaBerubah).toHaveBeenCalledWith(expect.anything(), 10, 4, 3, 1);
    expect(opnameUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: StatusStockOpname.SELESAI, selesaiOlehNama: 'Admin GA' }) }),
    );
  });

  it('isi barang ditolak kalau sesi sudah selesai', async () => {
    const { service } = buatService({
      stockOpnameItem: {
        findFirst: jest.fn().mockResolvedValue({ id: 3, opname: { status: StatusStockOpname.SELESAI } }),
      },
    });
    await expect(
      service.isiItem('INFRAS', 1, 10, { stokFisik: 5, kondisi: KondisiBarangOpname.BAIK }, ADMIN),
    ).rejects.toThrow(BadRequestException);
  });
});
