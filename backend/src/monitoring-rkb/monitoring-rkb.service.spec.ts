import { KategoriRkb, StatusRkb } from '@prisma/client';
import { MonitoringRkbService } from './monitoring-rkb.service';

const dto = (jumlah = 2) => ({
  tanggal: '2026-10-16', nomorRkb: 'RKB-001', kategori: KategoriRkb.PROJECT, status: StatusRkb.WAITING_APPROVAL,
  barang: Array.from({ length: jumlah }, (_, i) => ({ namaBarang: `Barang ${i + 1}`, qty: i + 1, satuan: 'PCS' })),
});

describe('MonitoringRkbService', () => {
  function setup() {
    const model = { findMany: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() };
    const item = { deleteMany: jest.fn() };
    const prisma: any = { monitoringRkb: model, monitoringRkbBarang: item };
    prisma.$transaction = jest.fn((callback) => callback(prisma));
    return { service: new MonitoringRkbService(prisma), model, item };
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

  it('menghapus induk RKB setelah memastikan datanya ada', async () => {
    const { service, model } = setup(); model.findUnique.mockResolvedValue({ id: 7 }); model.delete.mockResolvedValue({ id: 7 });
    await expect(service.hapus(7)).resolves.toEqual({ message: 'Data RKB berhasil dihapus' });
    expect(model.delete).toHaveBeenCalledWith({ where: { id: 7 } });
  });
});
