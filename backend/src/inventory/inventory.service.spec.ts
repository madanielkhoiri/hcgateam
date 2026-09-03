import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ItemCategory, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryAksesService } from './inventory-akses.service';
import { DeviasiStokService } from './deviasi-stok.service';
import { InventoryService } from './inventory.service';

function itemFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, code: 'ATK-01', name: 'PULPEN', category: ItemCategory.ATK, unit: 'PCS', isActive: true, ...overrides };
}

function buatService(overrides: {
  items?: Record<number, unknown>;
  stocks?: Record<number, unknown>;
  itemFindMany?: unknown[];
  duplicateItem?: unknown;
  stockInDetail?: unknown;
  stockOutDetail?: unknown;
  itemDeleteDetail?: unknown;
} = {}) {
  const itemCreate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const itemUpdate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const itemDelete = jest.fn().mockResolvedValue({});
  const stockUpdate = jest.fn(({ data, where }) => Promise.resolve({ id: 1, where, ...data }));
  const stockInCreate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const stockInUpdate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const stockInDelete = jest.fn().mockResolvedValue({});
  const stockOutCreate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const stockOutUpdate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const stockOutDelete = jest.fn().mockResolvedValue({});

  const prisma = {
    item: {
      findUnique: jest.fn().mockImplementation(({ where: { id } }: any) => Promise.resolve(overrides.items?.[id] ?? null)),
      findFirst: jest.fn().mockResolvedValue(overrides.duplicateItem ?? null),
      findMany: jest.fn().mockResolvedValue(overrides.itemFindMany ?? []),
      create: itemCreate,
      update: itemUpdate,
      delete: itemDelete,
    },
    inventoryStock: {
      findUnique: jest.fn().mockImplementation(({ where }: any) => {
        const key = where.itemId ?? where.id;
        return Promise.resolve(overrides.stocks?.[key] ?? null);
      }),
      findMany: jest.fn().mockResolvedValue([]),
      update: stockUpdate,
    },
    stockIn: {
      findUnique: jest.fn().mockResolvedValue('stockInDetail' in overrides ? overrides.stockInDetail : null),
      findMany: jest.fn().mockResolvedValue([]),
      create: stockInCreate,
      update: stockInUpdate,
      delete: stockInDelete,
    },
    stockOut: {
      findUnique: jest.fn().mockResolvedValue('stockOutDetail' in overrides ? overrides.stockOutDetail : null),
      findMany: jest.fn().mockResolvedValue([]),
      create: stockOutCreate,
      update: stockOutUpdate,
      delete: stockOutDelete,
    },
  } as any;

  prisma.$transaction = jest.fn((cb: any) => cb(prisma));

  // deleteItem punya include _count berbeda dari getById biasa — override lewat itemDeleteDetail kalau perlu
  if ('itemDeleteDetail' in overrides) {
    prisma.item.findUnique = jest.fn().mockResolvedValue(overrides.itemDeleteDetail);
  }

  const akses = { wajibBolehEditStok: jest.fn() } as unknown as InventoryAksesService;
  const deviasiStok = { catatJikaBerubah: jest.fn(), rekap: jest.fn() } as unknown as DeviasiStokService;

  const service = new InventoryService(prisma as PrismaService, akses, deviasiStok);

  return { service, prisma, akses, deviasiStok, itemCreate, itemUpdate, itemDelete, stockUpdate, stockInCreate, stockInUpdate, stockInDelete, stockOutCreate, stockOutUpdate, stockOutDelete };
}

describe('InventoryService.getItems — sorting', () => {
  it('mengurutkan berdasarkan kategori lalu nomor urut kode', async () => {
    const { service, prisma } = buatService();
    (prisma.item.findMany as jest.Mock).mockResolvedValue([
      itemFixture({ id: 1, category: ItemCategory.BAJU, code: 'BJ-02' }),
      itemFixture({ id: 2, category: ItemCategory.ATK, code: 'ATK-05' }),
      itemFixture({ id: 3, category: ItemCategory.ATK, code: 'ATK-01' }),
    ]);

    const hasil = await service.getItems();

    expect(hasil.map((i) => i.id)).toEqual([3, 2, 1]);
  });
});

describe('InventoryService.createItem', () => {
  it('menolak nama duplikat (case-insensitive)', async () => {
    const { service } = buatService({ duplicateItem: itemFixture() });

    await expect(service.createItem({ name: 'pulpen', category: ItemCategory.ATK, unit: 'PCS' } as any)).rejects.toThrow(
      ConflictException,
    );
  });

  it('generate kode sesuai prefix kategori dan nomor urut berikutnya', async () => {
    const { service, prisma, itemCreate } = buatService();
    (prisma.item.findMany as jest.Mock).mockResolvedValue([{ code: 'ATK-01' }, { code: 'ATK-02' }]);

    await service.createItem({ name: 'Spidol', category: ItemCategory.ATK, unit: 'PCS' } as any);

    expect(itemCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ code: 'ATK-03', name: 'SPIDOL' }) }),
    );
  });

  it('kode dimulai dari 01 kalau belum ada barang kategori tersebut', async () => {
    const { service, itemCreate } = buatService();

    await service.createItem({ name: 'Kursi', category: ItemCategory.FURNITURE, unit: 'PCS' } as any);

    expect(itemCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ code: 'FR-01' }) }),
    );
  });

  it('stok awal dibuat 0', async () => {
    const { service, itemCreate } = buatService();

    await service.createItem({ name: 'Laptop', category: ItemCategory.ELEKTRONIK, unit: 'UNIT' } as any);

    expect(itemCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ stock: { create: { quantity: 0 } } }) }),
    );
  });
});

describe('InventoryService.updateItem', () => {
  it('melempar NotFoundException kalau barang tidak ada', async () => {
    const { service } = buatService({ items: {} });

    await expect(service.updateItem(1, { name: 'X' } as any)).rejects.toThrow(NotFoundException);
  });

  it('menolak nama duplikat milik barang lain', async () => {
    const { service } = buatService({ items: { 1: itemFixture() }, duplicateItem: itemFixture({ id: 2 }) });

    await expect(service.updateItem(1, { name: 'PENSIL' } as any)).rejects.toThrow(ConflictException);
  });

  it('berhasil update tanpa perlu cek duplikat kalau nama tidak diubah', async () => {
    const { service, itemUpdate, prisma } = buatService({ items: { 1: itemFixture() } });

    await service.updateItem(1, { isActive: false } as any);

    expect(prisma.item.findFirst).not.toHaveBeenCalled();
    expect(itemUpdate).toHaveBeenCalled();
  });
});

describe('InventoryService.deleteItem', () => {
  it('melempar NotFoundException kalau barang tidak ada', async () => {
    const { service } = buatService({ itemDeleteDetail: null });

    await expect(service.deleteItem(1)).rejects.toThrow(NotFoundException);
  });

  it('menolak hapus barang yang sudah punya transaksi stok masuk/keluar', async () => {
    const { service } = buatService({ itemDeleteDetail: { id: 1, _count: { stockIns: 1, stockOuts: 0 } } });

    await expect(service.deleteItem(1)).rejects.toThrow('sudah memiliki transaksi');
  });

  it('berhasil hapus barang tanpa transaksi', async () => {
    const { service, itemDelete } = buatService({ itemDeleteDetail: { id: 1, _count: { stockIns: 0, stockOuts: 0 } } });

    const hasil = await service.deleteItem(1);

    expect(itemDelete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});

describe('InventoryService.updateStock', () => {
  it('menolak kalau role tidak diizinkan (dicek lewat InventoryAksesService)', async () => {
    const { service, akses } = buatService();
    (akses.wajibBolehEditStok as jest.Mock).mockImplementation(() => {
      throw new ForbiddenException('Hanya Admin atau Section Head yang boleh mengubah stok');
    });

    await expect(service.updateStock(1, { quantity: 10 } as any, UserRole.KARYAWAN, 9)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('melempar NotFoundException kalau data stok tidak ada', async () => {
    const { service, prisma } = buatService();
    (prisma.inventoryStock.findUnique as jest.Mock).mockResolvedValue(null);

    await expect(service.updateStock(1, { quantity: 10 } as any, UserRole.ADMIN, 9)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('mencatat deviasi via DeviasiStokService kalau quantity berubah', async () => {
    const { service, prisma, deviasiStok } = buatService({ stocks: { 1: { id: 1, itemId: 5, quantity: 10 } } });

    await service.updateStock(1, { quantity: 15 } as any, UserRole.ADMIN, 9);

    expect(deviasiStok.catatJikaBerubah).toHaveBeenCalledWith(prisma, 5, 10, 15, 9);
  });
});

describe('InventoryService.createStockInBatch', () => {
  it('menolak kalau salah satu barang tidak ditemukan/tidak aktif', async () => {
    const { service } = buatService({ items: { 1: itemFixture({ id: 1 }) } });

    await expect(
      service.createStockInBatch({ date: '2026-01-05', items: [{ itemId: 1, quantity: 5 }, { itemId: 2, quantity: 3 }] } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('berhasil menambah stok untuk setiap barang dalam batch', async () => {
    const { service, prisma } = buatService({
      items: { 1: itemFixture({ id: 1 }), 2: itemFixture({ id: 2, code: 'ATK-02' }) },
      stocks: { 1: { quantity: 10 }, 2: { quantity: 5 } },
    });

    const hasil = await service.createStockInBatch({
      date: '2026-01-05',
      items: [{ itemId: 1, quantity: 5 }, { itemId: 2, quantity: 3 }],
    } as any);

    expect(hasil.data).toHaveLength(2);
    expect(hasil.message).toMatch(/2 barang masuk/);
    expect(prisma.inventoryStock.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { itemId: 1 }, data: { quantity: { increment: 5 } } }),
    );
  });
});

describe('InventoryService.createStockOutBatch', () => {
  it('menolak kalau stok salah satu barang tidak mencukupi', async () => {
    const { service } = buatService({
      items: { 1: itemFixture({ id: 1 }) },
      stocks: { 1: { quantity: 2 } },
    });

    await expect(
      service.createStockOutBatch({ date: '2026-01-05', taker: 'Budi', department: 'HC', items: [{ itemId: 1, quantity: 5 }] } as any),
    ).rejects.toThrow('tidak mencukupi');
  });

  it('taker & department disimpan uppercase, stok berkurang', async () => {
    const { service, prisma, stockOutCreate } = buatService({
      items: { 1: itemFixture({ id: 1 }) },
      stocks: { 1: { quantity: 10 } },
    });

    await service.createStockOutBatch({
      date: '2026-01-05',
      taker: 'budi',
      department: 'hc',
      items: [{ itemId: 1, quantity: 4 }],
    } as any);

    expect(stockOutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ taker: 'BUDI', department: 'HC' }) }),
    );
    expect(prisma.inventoryStock.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { itemId: 1 }, data: { quantity: { decrement: 4 } } }),
    );
  });
});

describe('InventoryService.createStockIn / updateStockIn / deleteStockIn', () => {
  it('createStockIn menolak barang tidak aktif', async () => {
    const { service } = buatService({ items: { 1: itemFixture({ isActive: false }) } });

    await expect(service.createStockIn({ itemId: 1, date: '2026-01-05', quantity: 5 } as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updateStockIn menolak kalau stok sudah terpakai (quantity lama > stok saat ini)', async () => {
    const { service } = buatService({
      stockInDetail: { id: 1, itemId: 1, quantity: 10 },
      items: { 2: itemFixture({ id: 2 }) },
      stocks: { 1: { quantity: 3 } },
    });

    await expect(service.updateStockIn(1, { itemId: 2, date: '2026-01-05', quantity: 5 } as any)).rejects.toThrow(
      'stok sudah digunakan',
    );
  });

  it('updateStockIn berhasil: kurangi stok barang lama, tambah stok barang baru', async () => {
    const { service, prisma } = buatService({
      stockInDetail: { id: 1, itemId: 1, quantity: 10 },
      items: { 2: itemFixture({ id: 2 }) },
      stocks: { 1: { quantity: 20 } },
    });

    await service.updateStockIn(1, { itemId: 2, date: '2026-01-05', quantity: 7 } as any);

    expect(prisma.inventoryStock.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { itemId: 1 }, data: { quantity: { decrement: 10 } } }),
    );
    expect(prisma.inventoryStock.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { itemId: 2 }, data: { quantity: { increment: 7 } } }),
    );
  });

  it('deleteStockIn menolak kalau stok sudah terpakai', async () => {
    const { service } = buatService({
      stockInDetail: { id: 1, itemId: 1, quantity: 10 },
      stocks: { 1: { quantity: 5 } },
    });

    await expect(service.deleteStockIn(1)).rejects.toThrow('stok sudah digunakan');
  });

  it('deleteStockIn berhasil mengembalikan stok', async () => {
    const { service, prisma, stockInDelete } = buatService({
      stockInDetail: { id: 1, itemId: 1, quantity: 10 },
      stocks: { 1: { quantity: 20 } },
    });

    const hasil = await service.deleteStockIn(1);

    expect(prisma.inventoryStock.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { itemId: 1 }, data: { quantity: { decrement: 10 } } }),
    );
    expect(stockInDelete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});

describe('InventoryService.createStockOut / updateStockOut / deleteStockOut', () => {
  it('createStockOut menolak kalau stok tidak cukup', async () => {
    const { service } = buatService({
      items: { 1: itemFixture({ id: 1 }) },
      stocks: { 1: { quantity: 2 } },
    });

    await expect(
      service.createStockOut({ itemId: 1, date: '2026-01-05', quantity: 5, taker: 'Budi', department: 'HC' } as any),
    ).rejects.toThrow('Stok tidak mencukupi');
  });

  it('updateStockOut: kembalikan stok lama dulu, baru cek stok baru cukup', async () => {
    const { service, prisma } = buatService({
      stockOutDetail: { id: 1, itemId: 1, quantity: 5 },
      items: { 2: itemFixture({ id: 2 }) },
      stocks: { 1: { quantity: 10 }, 2: { quantity: 3 } },
    });

    await expect(
      service.updateStockOut(1, { itemId: 2, date: '2026-01-05', quantity: 10, taker: 'Budi', department: 'HC' } as any),
    ).rejects.toThrow('Stok tidak mencukupi');

    expect(prisma.inventoryStock.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { itemId: 1 }, data: { quantity: { increment: 5 } } }),
    );
  });

  it('updateStockOut berhasil memindahkan stok antar barang', async () => {
    const { service, prisma } = buatService({
      stockOutDetail: { id: 1, itemId: 1, quantity: 5 },
      items: { 2: itemFixture({ id: 2 }) },
      stocks: { 1: { quantity: 10 }, 2: { quantity: 20 } },
    });

    await service.updateStockOut(1, { itemId: 2, date: '2026-01-05', quantity: 8, taker: 'Budi', department: 'HC' } as any);

    expect(prisma.inventoryStock.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { itemId: 2 }, data: { quantity: { decrement: 8 } } }),
    );
  });

  it('deleteStockOut mengembalikan stok', async () => {
    const { service, prisma, stockOutDelete } = buatService({
      stockOutDetail: { id: 1, itemId: 1, quantity: 5 },
    });

    const hasil = await service.deleteStockOut(1);

    expect(prisma.inventoryStock.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { itemId: 1 }, data: { quantity: { increment: 5 } } }),
    );
    expect(stockOutDelete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});
