import { ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InventoryScope, ItemCategory, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryAksesService } from './inventory-akses.service';
import { DeviasiStokService } from './deviasi-stok.service';
import { InventoryAreaService } from './inventory-area.service';

function itemFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, code: 'ATK-01', name: 'PULPEN', category: ItemCategory.ATK, unit: 'PCS', isActive: true, inventoryScope: InventoryScope.MESS, ...overrides };
}

function buatService(overrides: {
  itemFindFirst?: unknown;
  itemFindMany?: unknown[];
  duplicateItem?: unknown;
  stockFindFirst?: unknown;
  stockInFindFirst?: unknown;
  stockOutFindFirst?: unknown;
  stocksByItemId?: Record<number, unknown>;
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

  const prisma: any = {
    item: {
      findFirst: jest.fn().mockResolvedValue('itemFindFirst' in overrides ? overrides.itemFindFirst : itemFixture()),
      findMany: jest.fn().mockResolvedValue(overrides.itemFindMany ?? []),
      create: itemCreate,
      update: itemUpdate,
      delete: itemDelete,
    },
    inventoryStock: {
      findFirst: jest.fn().mockResolvedValue('stockFindFirst' in overrides ? overrides.stockFindFirst : { id: 1, quantity: 10 }),
      findUnique: jest.fn().mockImplementation(({ where: { itemId } }: any) => Promise.resolve(overrides.stocksByItemId?.[itemId] ?? null)),
      findMany: jest.fn().mockResolvedValue([]),
      update: stockUpdate,
    },
    stockIn: {
      findFirst: jest.fn().mockResolvedValue('stockInFindFirst' in overrides ? overrides.stockInFindFirst : null),
      findMany: jest.fn().mockResolvedValue([]),
      create: stockInCreate,
      update: stockInUpdate,
      delete: stockInDelete,
    },
    stockOut: {
      findFirst: jest.fn().mockResolvedValue('stockOutFindFirst' in overrides ? overrides.stockOutFindFirst : null),
      findMany: jest.fn().mockResolvedValue([]),
      create: stockOutCreate,
      update: stockOutUpdate,
      delete: stockOutDelete,
    },
  };

  prisma.$transaction = jest.fn((cb: any) => cb(prisma));

  if ('duplicateItem' in overrides) {
    prisma.item.findFirst = jest.fn().mockResolvedValue(overrides.duplicateItem);
  }

  const akses = { wajibBolehEditStok: jest.fn() } as unknown as InventoryAksesService;
  const deviasiStok = { catatJikaBerubah: jest.fn(), rekap: jest.fn() } as unknown as DeviasiStokService;

  const service = new InventoryAreaService(prisma as PrismaService, akses, deviasiStok);

  return { service, prisma, akses, deviasiStok, itemCreate, itemUpdate, itemDelete, stockUpdate, stockInCreate, stockInDelete, stockOutCreate, stockOutDelete };
}

describe('InventoryAreaService — parseScope', () => {
  it('menolak scope selain GENERAL/MESS/ELECTRIC', async () => {
    const { service } = buatService();

    await expect(service.getItems('KANTIN')).rejects.toThrow('hanya GENERAL, MESS, atau ELECTRIC');
  });

  it('menerima scope lowercase dan mengubahnya ke uppercase', async () => {
    const { service, prisma } = buatService();

    await service.getItems('mess');

    expect(prisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { inventoryScope: InventoryScope.MESS } }),
    );
  });
});

describe('InventoryAreaService.createItem', () => {
  it('menolak nama duplikat DALAM scope yang sama', async () => {
    const { service } = buatService({ duplicateItem: itemFixture() });

    await expect(
      service.createItem('MESS', { name: 'pulpen', category: ItemCategory.ATK, unit: 'PCS' } as any),
    ).rejects.toThrow(ConflictException);
  });

  it('generate kode berikutnya HANYA berdasarkan item pada scope yang sama', async () => {
    const { service, prisma, itemCreate } = buatService({ duplicateItem: null });
    (prisma.item.findMany as jest.Mock).mockResolvedValue([{ code: 'ATK-01' }]);

    await service.createItem('ELECTRIC', { name: 'Kabel', category: ItemCategory.ATK, unit: 'PCS' } as any);

    expect(prisma.item.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ inventoryScope: InventoryScope.ELECTRIC }) }),
    );
    expect(itemCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ code: 'ATK-02', inventoryScope: InventoryScope.ELECTRIC }) }),
    );
  });
});

describe('InventoryAreaService.updateItem / deleteItem — terikat scope', () => {
  it('updateItem melempar NotFoundException kalau barang tidak ada di scope tersebut', async () => {
    const { service } = buatService({ itemFindFirst: null });

    await expect(service.updateItem('MESS', 1, { name: 'X' } as any)).rejects.toThrow(NotFoundException);
  });

  it('deleteItem menolak hapus barang yang sudah punya transaksi', async () => {
    const { service } = buatService({ itemFindFirst: itemFixture({ _count: { stockIns: 1, stockOuts: 0 } }) });

    await expect(service.deleteItem('MESS', 1)).rejects.toThrow('sudah memiliki transaksi');
  });

  it('deleteItem berhasil kalau belum ada transaksi', async () => {
    const { service, itemDelete } = buatService({ itemFindFirst: itemFixture({ _count: { stockIns: 0, stockOuts: 0 } }) });

    const hasil = await service.deleteItem('MESS', 1);

    expect(itemDelete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});

describe('InventoryAreaService.getStocks — urutan mengikuti sortByCode item', () => {
  it('mengurutkan baris stok berdasarkan urutan kategori+kode item terkait', async () => {
    const { service, prisma } = buatService();
    (prisma.inventoryStock.findMany as jest.Mock).mockResolvedValue([
      { itemId: 2, item: itemFixture({ id: 2, category: ItemCategory.ATK, code: 'ATK-05' }) },
      { itemId: 1, item: itemFixture({ id: 1, category: ItemCategory.ATK, code: 'ATK-01' }) },
    ]);

    const hasil = await service.getStocks('MESS');

    expect(hasil.map((s: any) => s.itemId)).toEqual([1, 2]);
  });
});

describe('InventoryAreaService.updateStock', () => {
  it('menolak kalau role tidak diizinkan (dicek lewat InventoryAksesService)', async () => {
    const { service, akses } = buatService();
    (akses.wajibBolehEditStok as jest.Mock).mockImplementation(() => {
      throw new ForbiddenException('Hanya Admin atau Section Head yang boleh mengubah stok');
    });

    await expect(service.updateStock('MESS', 1, { quantity: 5 } as any, UserRole.KARYAWAN, 9)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('melempar NotFoundException kalau stok tidak ditemukan pada scope tersebut', async () => {
    const { service } = buatService({ stockFindFirst: null });

    await expect(service.updateStock('MESS', 1, { quantity: 5 } as any, UserRole.ADMIN, 9)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('mencatat deviasi via DeviasiStokService kalau quantity berubah', async () => {
    const { service, prisma, deviasiStok } = buatService({ stockFindFirst: { id: 1, itemId: 5, quantity: 10 } });

    await service.updateStock('MESS', 1, { quantity: 6 } as any, UserRole.ADMIN, 9);

    expect(deviasiStok.catatJikaBerubah).toHaveBeenCalledWith(prisma, 5, 10, 6, 9);
  });
});

describe('InventoryAreaService.createStockInBatch / createStockOutBatch', () => {
  it('createStockInBatch menolak barang aktif yang tidak ditemukan pada scope ini', async () => {
    const { service } = buatService({ itemFindFirst: null });

    await expect(
      service.createStockInBatch('MESS', { date: '2026-01-05', items: [{ itemId: 1, quantity: 5 }] } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('createStockOutBatch menolak kalau stok tidak mencukupi', async () => {
    const { service } = buatService({ stocksByItemId: { 1: { quantity: 2 } } });

    await expect(
      service.createStockOutBatch('MESS', {
        date: '2026-01-05',
        taker: 'Budi',
        department: 'HC',
        items: [{ itemId: 1, quantity: 5 }],
      } as any),
    ).rejects.toThrow('tidak mencukupi');
  });

  it('createStockOutBatch berhasil dan menyimpan taker/department uppercase', async () => {
    const { service, stockOutCreate, prisma } = buatService({ stocksByItemId: { 1: { quantity: 10 } } });

    await service.createStockOutBatch('MESS', {
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

describe('InventoryAreaService.createStockIn / createStockOut (single) — delegasi ke batch', () => {
  it('createStockIn membungkus satu item ke createStockInBatch', async () => {
    const { service, stockInCreate } = buatService({ stocksByItemId: { 1: { quantity: 0 } } });

    await service.createStockIn('MESS', { itemId: 1, date: '2026-01-05', quantity: 3 } as any);

    expect(stockInCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ itemId: 1, quantity: 3 }) }),
    );
  });

  it('createStockOut membungkus satu item ke createStockOutBatch', async () => {
    const { service, stockOutCreate } = buatService({ stocksByItemId: { 1: { quantity: 10 } } });

    await service.createStockOut('MESS', { itemId: 1, date: '2026-01-05', quantity: 3, taker: 'Budi', department: 'HC' } as any);

    expect(stockOutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ itemId: 1, quantity: 3 }) }),
    );
  });
});

describe('InventoryAreaService.updateStockIn / deleteStockIn — terikat scope', () => {
  it('updateStockIn menolak kalau barang masuk tidak ditemukan pada scope ini', async () => {
    const { service } = buatService({ stockInFindFirst: null });

    await expect(service.updateStockIn('MESS', 1, { itemId: 2, date: '2026-01-05', quantity: 5 } as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updateStockIn menolak kalau stok sudah digunakan', async () => {
    const { service } = buatService({
      stockInFindFirst: { id: 1, itemId: 1, quantity: 10 },
      stocksByItemId: { 1: { quantity: 3 } },
    });

    await expect(service.updateStockIn('MESS', 1, { itemId: 2, date: '2026-01-05', quantity: 5 } as any)).rejects.toThrow(
      'stok sudah digunakan',
    );
  });

  it('deleteStockIn mengembalikan stok ke barang asal', async () => {
    const { service, prisma, stockInDelete } = buatService({
      stockInFindFirst: { id: 1, itemId: 1, quantity: 10 },
      stocksByItemId: { 1: { quantity: 20 } },
    });

    await service.deleteStockIn('MESS', 1);

    expect(prisma.inventoryStock.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { itemId: 1 }, data: { quantity: { decrement: 10 } } }),
    );
    expect(stockInDelete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});

describe('InventoryAreaService.updateStockOut / deleteStockOut — terikat scope', () => {
  it('updateStockOut menolak kalau barang keluar tidak ditemukan pada scope ini', async () => {
    const { service } = buatService({ stockOutFindFirst: null });

    await expect(
      service.updateStockOut('MESS', 1, { itemId: 2, date: '2026-01-05', quantity: 5, taker: 'Budi', department: 'HC' } as any),
    ).rejects.toThrow(NotFoundException);
  });

  it('deleteStockOut mengembalikan stok ke barang asal', async () => {
    const { service, prisma, stockOutDelete } = buatService({
      stockOutFindFirst: { id: 1, itemId: 1, quantity: 5 },
    });

    await service.deleteStockOut('MESS', 1);

    expect(prisma.inventoryStock.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { itemId: 1 }, data: { quantity: { increment: 5 } } }),
    );
    expect(stockOutDelete).toHaveBeenCalledWith({ where: { id: 1 } });
  });
});
