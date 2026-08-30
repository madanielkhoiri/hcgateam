import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ItemCategory } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ElectricStockOutService } from './electric-stock-out.service';

function itemFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, code: 'EL-01', name: 'KABEL', category: ItemCategory.ELEKTRONIK, unit: 'PCS', isActive: true, ...overrides };
}

function buatService(overrides: {
  itemFindFirst?: unknown;
  stocksByItemId?: Record<number, unknown>;
  stockOutFindFirst?: unknown;
} = {}) {
  const stockOutCreate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const stockOutUpdate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const stockUpdate = jest.fn(({ data, where }) => Promise.resolve({ id: 1, where, ...data }));

  const prisma: any = {
    item: {
      findFirst: jest.fn().mockImplementation(({ where }: any) =>
        Promise.resolve('itemFindFirst' in overrides ? overrides.itemFindFirst : itemFixture({ id: where.id })),
      ),
    },
    inventoryStock: {
      findUnique: jest.fn().mockImplementation(({ where: { itemId } }: any) => Promise.resolve(overrides.stocksByItemId?.[itemId] ?? null)),
      update: stockUpdate,
    },
    stockOut: {
      findFirst: jest.fn().mockResolvedValue('stockOutFindFirst' in overrides ? overrides.stockOutFindFirst : { id: 1, itemId: 1, quantity: 5 }),
      create: stockOutCreate,
      update: stockOutUpdate,
    },
  };

  prisma.$transaction = jest.fn((cb: any) => cb(prisma));

  const service = new ElectricStockOutService(prisma as PrismaService);

  return { service, prisma, stockOutCreate, stockOutUpdate, stockUpdate };
}

describe('ElectricStockOutService.createBatch — validasi', () => {
  const inputDasar = { date: '2026-01-05', taker: 'Budi', description: 'Ambil kabel', items: [{ itemId: 1, quantity: 2 }] };

  it('menolak tanpa tanggal', async () => {
    const { service } = buatService();

    await expect(service.createBatch({ ...inputDasar, date: '' })).rejects.toThrow('Tanggal wajib diisi');
  });

  it('menolak nama pengambil kurang dari 2 karakter', async () => {
    const { service } = buatService();

    await expect(service.createBatch({ ...inputDasar, taker: 'B' })).rejects.toThrow('Nama pengambil wajib diisi');
  });

  it('menolak keterangan kosong', async () => {
    const { service } = buatService();

    await expect(service.createBatch({ ...inputDasar, description: '   ' })).rejects.toThrow('Keterangan wajib diisi');
  });

  it('menolak keterangan lebih dari 500 kata', async () => {
    const { service } = buatService();
    const deskripsiPanjang = new Array(501).fill('kata').join(' ');

    await expect(service.createBatch({ ...inputDasar, description: deskripsiPanjang })).rejects.toThrow(
      'Keterangan maksimal 500 kata',
    );
  });

  it('menolak kalau tidak ada barang dipilih', async () => {
    const { service } = buatService();

    await expect(service.createBatch({ ...inputDasar, items: [] })).rejects.toThrow('Minimal satu barang harus dipilih');
  });

  it('menolak barang yang sama dipilih dua kali', async () => {
    const { service } = buatService();

    await expect(
      service.createBatch({ ...inputDasar, items: [{ itemId: 1, quantity: 1 }, { itemId: 1, quantity: 2 }] }),
    ).rejects.toThrow('tidak boleh dipilih dua kali');
  });

  it('menolak quantity non-integer atau <= 0', async () => {
    const { service } = buatService();

    await expect(
      service.createBatch({ ...inputDasar, items: [{ itemId: 1, quantity: 0 }] }),
    ).rejects.toThrow('Barang dan jumlah tidak valid');
  });

  it('menolak barang yang bukan scope ELECTRIC / tidak aktif', async () => {
    const { service } = buatService({ itemFindFirst: null });

    await expect(service.createBatch(inputDasar)).rejects.toThrow(NotFoundException);
  });

  it('menolak kalau stok tidak mencukupi', async () => {
    const { service } = buatService({ stocksByItemId: { 1: { quantity: 1 } } });

    await expect(service.createBatch(inputDasar)).rejects.toThrow('tidak mencukupi');
  });
});

describe('ElectricStockOutService.createBatch — sukses', () => {
  it('taker uppercase, department selalu null, department Electric tidak dipakai', async () => {
    const { service, stockOutCreate } = buatService({ stocksByItemId: { 1: { quantity: 10 } } });

    await service.createBatch({ date: '2026-01-05', taker: 'budi', description: 'Ambil kabel', items: [{ itemId: 1, quantity: 2 }] });

    expect(stockOutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ taker: 'BUDI', department: null }) }),
    );
  });

  it('menyimpan photoPath kalau diberikan', async () => {
    const { service, stockOutCreate } = buatService({ stocksByItemId: { 1: { quantity: 10 } } });

    await service.createBatch(
      { date: '2026-01-05', taker: 'Budi', description: 'Ambil kabel', items: [{ itemId: 1, quantity: 2 }] },
      'uploads/foto.jpg',
    );

    expect(stockOutCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ photoPath: 'uploads/foto.jpg' }) }),
    );
  });

  it('mengurangi stok sesuai quantity', async () => {
    const { service, prisma } = buatService({ stocksByItemId: { 1: { quantity: 10 } } });

    await service.createBatch({ date: '2026-01-05', taker: 'Budi', description: 'Ambil kabel', items: [{ itemId: 1, quantity: 3 }] });

    expect(prisma.inventoryStock.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { itemId: 1 }, data: { quantity: { decrement: 3 } } }),
    );
  });
});

describe('ElectricStockOutService.update — validasi', () => {
  const inputDasar = { date: '2026-01-05', itemId: 2, quantity: 3, taker: 'Budi', description: 'Ralat jumlah' };

  it('menolak tanpa tanggal', async () => {
    const { service } = buatService();

    await expect(service.update(1, { ...inputDasar, date: '' })).rejects.toThrow('Tanggal wajib diisi');
  });

  it('menolak quantity <= 0', async () => {
    const { service } = buatService();

    await expect(service.update(1, { ...inputDasar, quantity: 0 })).rejects.toThrow('Jumlah barang wajib lebih dari 0');
  });

  it('melempar NotFoundException kalau data barang keluar tidak ada di scope Electric', async () => {
    const { service } = buatService({ stockOutFindFirst: null });

    await expect(service.update(1, inputDasar)).rejects.toThrow('Barang keluar Electric tidak ditemukan');
  });

  it('melempar NotFoundException kalau barang baru tidak ada/tidak aktif', async () => {
    const { service } = buatService({ itemFindFirst: null });

    await expect(service.update(1, inputDasar)).rejects.toThrow('Master Barang Electric tidak ditemukan');
  });

  it('menolak kalau stok barang baru tidak mencukupi setelah stok lama dikembalikan', async () => {
    const { service } = buatService({ stocksByItemId: { 2: { quantity: 1 } } });

    await expect(service.update(1, inputDasar)).rejects.toThrow('tidak mencukupi');
  });
});

describe('ElectricStockOutService.update — sukses', () => {
  it('mengembalikan stok barang lama lalu mengurangi stok barang baru', async () => {
    const { service, prisma } = buatService({ stocksByItemId: { 2: { quantity: 10 } } });

    await service.update(1, { date: '2026-01-05', itemId: 2, quantity: 4, taker: 'Budi', description: 'Ralat' });

    expect(prisma.inventoryStock.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { itemId: 1 }, data: { quantity: { increment: 5 } } }),
    );
    expect(prisma.inventoryStock.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { itemId: 2 }, data: { quantity: { decrement: 4 } } }),
    );
  });

  it('tidak menimpa photoPath kalau tidak ada foto baru diunggah', async () => {
    const { service, stockOutUpdate } = buatService({ stocksByItemId: { 2: { quantity: 10 } } });

    await service.update(1, { date: '2026-01-05', itemId: 2, quantity: 4, taker: 'Budi', description: 'Ralat' });

    expect(stockOutUpdate.mock.calls[0][0].data.photoPath).toBeUndefined();
  });
});
