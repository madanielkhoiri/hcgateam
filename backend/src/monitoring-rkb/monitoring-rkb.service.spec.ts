import { KategoriRkb, StatusRkb } from '@prisma/client';
import { MonitoringRkbService } from './monitoring-rkb.service';

const dto = (jumlah = 2) => ({
  projectId: 10, tanggal: '2026-10-16', nomorRkb: 'RKB-001', kategori: KategoriRkb.PROJECT, status: StatusRkb.WAITING_APPROVAL,
  barang: Array.from({ length: jumlah }, (_, i) => ({ namaBarang: `Barang ${i + 1}`, qty: i + 1, satuan: 'PCS' })),
});

describe('MonitoringRkbService', () => {
  function setup() {
    const model = { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() };
    const item = { deleteMany: jest.fn(), createMany: jest.fn(), findFirst: jest.fn(), update: jest.fn() };
    const project = { findMany: jest.fn(), findUnique: jest.fn().mockResolvedValue({ id: 10, kategori: KategoriRkb.PROJECT, rkb: [] }), create: jest.fn(), update: jest.fn(), delete: jest.fn() };
    const prisma: any = { monitoringRkb: model, monitoringRkbBarang: item, monitoringRkbProject: project };
    prisma.$transaction = jest.fn((callback) => callback(prisma));
    return { service: new MonitoringRkbService(prisma), model, item, project };
  }

  it('menyimpan seluruh barang tanpa batas tetap', async () => {
    const { service, model } = setup(); model.create.mockResolvedValue({ id: 1 });
    await service.buat(9, dto(12));
    expect(model.create.mock.calls[0][0].data.barang.create).toHaveLength(12);
    expect(model.create.mock.calls[0][0].data.createdById).toBe(9);
  });

  it('mengganti rincian barang saat RKB diedit', async () => {
    const { service, model, item } = setup(); model.findUnique.mockResolvedValue({ id: 4 }); model.update.mockResolvedValue({ id: 4 });
    await service.ubah(4, dto(3));
    expect(item.deleteMany).toHaveBeenCalledWith({ where: { rkbId: 4 } });
    expect(model.update.mock.calls[0][0].data.barang.create).toHaveLength(3);
  });

  it('edit header RKB tidak menghapus barang yang sudah ada', async () => {
    const { service, model, item } = setup(); model.findUnique.mockResolvedValue({ id: 4, barang: [{ id: 1 }] }); model.update.mockResolvedValue({ id: 4 });
    const { barang: _barang, ...header } = dto(2);
    await service.ubah(4, header);
    expect(item.deleteMany).not.toHaveBeenCalled();
    expect(model.update.mock.calls[0][0].data.barang).toBeUndefined();
  });

  it('menambahkan beberapa barang ke detail RKB', async () => {
    const { service, model, item } = setup();
    model.findUnique
      .mockResolvedValueOnce({ id: 4, barang: [{ id: 1 }] })
      .mockResolvedValueOnce({ id: 4, barang: [{ id: 1 }, { id: 2 }, { id: 3 }] });
    item.createMany.mockResolvedValue({ count: 2 });
    await service.tambahBarang(4, dto(2).barang);
    expect(item.createMany.mock.calls[0][0].data).toHaveLength(2);
    expect(item.createMany.mock.calls[0][0].data[0].urutan).toBe(1);
  });

  it('menghapus induk RKB setelah memastikan datanya ada', async () => {
    const { service, model } = setup(); model.findUnique.mockResolvedValue({ id: 7 }); model.delete.mockResolvedValue({ id: 7 });
    await expect(service.hapus(7)).resolves.toEqual({ message: 'Data RKB berhasil dihapus' });
    expect(model.delete).toHaveBeenCalledWith({ where: { id: 7 } });
  });
});
