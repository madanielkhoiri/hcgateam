import { JenisDeviasiStok } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DeviasiStokService } from './deviasi-stok.service';

describe('DeviasiStokService.catatJikaBerubah', () => {
  it('tidak mencatat apapun kalau quantity tidak berubah', async () => {
    const create = jest.fn();
    const tx = { deviasiStok: { create } } as any;
    const service = new DeviasiStokService({} as PrismaService);

    await service.catatJikaBerubah(tx, 1, 10, 10, 9);

    expect(create).not.toHaveBeenCalled();
  });

  it('mencatat jenis KURANG kalau stok baru lebih kecil dari stok lama', async () => {
    const create = jest.fn();
    const tx = { deviasiStok: { create } } as any;
    const service = new DeviasiStokService({} as PrismaService);

    await service.catatJikaBerubah(tx, 1, 10, 5, 9);

    expect(create).toHaveBeenCalledWith({
      data: { itemId: 1, stokLama: 10, stokBaru: 5, selisih: -5, jenis: JenisDeviasiStok.KURANG, diubahOleh: 9 },
    });
  });

  it('mencatat jenis LEBIH kalau stok baru lebih besar dari stok lama', async () => {
    const create = jest.fn();
    const tx = { deviasiStok: { create } } as any;
    const service = new DeviasiStokService({} as PrismaService);

    await service.catatJikaBerubah(tx, 1, 10, 15, 9);

    expect(create).toHaveBeenCalledWith({
      data: { itemId: 1, stokLama: 10, stokBaru: 15, selisih: 5, jenis: JenisDeviasiStok.LEBIH, diubahOleh: 9 },
    });
  });
});

describe('DeviasiStokService.rekap', () => {
  function buatService(daftarDeviasi: any[] = []) {
    const findMany = jest.fn().mockResolvedValue(daftarDeviasi);
    const prisma = { deviasiStok: { findMany } } as unknown as PrismaService;
    const service = new DeviasiStokService(prisma);
    return { service, findMany };
  }

  it('bulan kosong -> filter satu tahun penuh (1 Jan s.d. 1 Jan tahun berikutnya)', async () => {
    const { service, findMany } = buatService([]);

    await service.rekap(undefined, 2026);

    const where = findMany.mock.calls[0][0].where;
    expect(where.createdAt.gte).toEqual(new Date(2026, 0, 1));
    expect(where.createdAt.lt).toEqual(new Date(2027, 0, 1));
  });

  it('bulan diisi -> filter satu bulan itu saja', async () => {
    const { service, findMany } = buatService([]);

    await service.rekap(3, 2026);

    const where = findMany.mock.calls[0][0].where;
    expect(where.createdAt.gte).toEqual(new Date(2026, 2, 1));
    expect(where.createdAt.lt).toEqual(new Date(2026, 3, 1));
  });

  it('menghitung totalKurang/totalLebih dan memetakan daftar dengan benar', async () => {
    const { service } = buatService([
      {
        id: 1,
        stokLama: 10,
        stokBaru: 5,
        selisih: -5,
        jenis: JenisDeviasiStok.KURANG,
        createdAt: new Date('2026-03-05'),
        item: { code: 'ATK-01', name: 'PULPEN', inventoryScope: 'GENERAL', unit: 'PCS', category: 'ATK' },
        pengubah: { id: 1, name: 'Budi' },
      },
      {
        id: 2,
        stokLama: 10,
        stokBaru: 15,
        selisih: 5,
        jenis: JenisDeviasiStok.LEBIH,
        createdAt: new Date('2026-03-06'),
        item: { code: 'ATK-02', name: 'SPIDOL', inventoryScope: 'GENERAL', unit: 'PCS', category: 'ATK' },
        pengubah: { id: 2, name: 'Ani' },
      },
    ]);

    const hasil = await service.rekap(3, 2026);

    expect(hasil.totalDeviasi).toBe(2);
    expect(hasil.totalKurang).toBe(1);
    expect(hasil.totalLebih).toBe(1);
    expect(hasil.daftar[0]).toMatchObject({ kodeBarang: 'ATK-01', namaBarang: 'PULPEN', diubahOleh: 'Budi' });
    expect(hasil.perBulan).toHaveLength(12);
  });
});
