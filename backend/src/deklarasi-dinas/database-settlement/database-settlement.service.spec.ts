import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DatabaseSettlementService } from './database-settlement.service';

function deklarasiFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 5,
    jenisDeklarasi: 'UANG_OPERASIONAL',
    createdAt: new Date('2026-01-01'),
    nomorStd: null,
    kodeDeklarasi: 'DK-005',
    namaPengguna: 'Budi',
    idPengguna: 1,
    idSaldo: null,
    ...overrides,
  } as any;
}

function notaFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    idDeklarasi: 5,
    createdAt: new Date('2026-01-02'),
    nominalFinal: null,
    nominalOcr: null,
    barangJasa: null,
    kategoriNota: null,
    keteranganSettlement: null,
    picSettlement: null,
    ...overrides,
  } as any;
}

function buatService(overrides: {
  notaFindMany?: unknown[];
  pengajuanFindFirst?: unknown;
  deklarasiFindMany?: unknown[];
  settlementCount?: number;
  settlementFindMany?: unknown[];
} = {}) {
  const deleteMany = jest.fn().mockResolvedValue({});
  const createMany = jest.fn().mockResolvedValue({});

  const prisma = {
    databaseSettlement: {
      deleteMany,
      createMany,
      findMany: jest.fn().mockResolvedValue(overrides.settlementFindMany ?? []),
      count: jest.fn().mockResolvedValue(overrides.settlementCount ?? 0),
    },
    nota: { findMany: jest.fn().mockResolvedValue(overrides.notaFindMany ?? []) },
    pengajuan: { findFirst: jest.fn().mockResolvedValue('pengajuanFindFirst' in overrides ? overrides.pengajuanFindFirst : null) },
    deklarasi: { findMany: jest.fn().mockResolvedValue(overrides.deklarasiFindMany ?? []) },
  } as unknown as PrismaService;

  const service = new DatabaseSettlementService(prisma);

  return { service, prisma, deleteMany, createMany };
}

describe('DatabaseSettlementService.sinkronkanDariDeklarasi', () => {
  it('mengabaikan deklarasi selain jenis UANG_OPERASIONAL tanpa menyentuh database', async () => {
    const { service, deleteMany } = buatService();

    const hasil = await service.sinkronkanDariDeklarasi(deklarasiFixture({ jenisDeklarasi: 'TIKET_PESAWAT' }));

    expect(hasil).toEqual([]);
    expect(deleteMany).not.toHaveBeenCalled();
  });

  it('menghapus data lama lalu tidak membuat apapun kalau tidak ada nota', async () => {
    const { service, deleteMany, createMany } = buatService({ notaFindMany: [] });

    const hasil = await service.sinkronkanDariDeklarasi(deklarasiFixture());

    expect(deleteMany).toHaveBeenCalledWith({ where: { idDeklarasi: 5 } });
    expect(createMany).not.toHaveBeenCalled();
    expect(hasil).toEqual([]);
  });

  it('nomorSettlement adalah id deklarasi di-pad 3 digit, itemSett & kodeJanganDiubah mengikuti urutan nota', async () => {
    const { service, createMany } = buatService({
      notaFindMany: [notaFixture({ id: 1 }), notaFixture({ id: 2 })],
    });

    await service.sinkronkanDariDeklarasi(deklarasiFixture({ id: 5 }));

    const data = createMany.mock.calls[0][0].data;
    expect(data[0]).toEqual(expect.objectContaining({ nomorSettlement: '005', item: 1, itemSett: '005-1', kodeJanganDiubah: '15' }));
    expect(data[1]).toEqual(expect.objectContaining({ item: 2, itemSett: '005-2', kodeJanganDiubah: '25' }));
  });

  it('nominal fallback ke nominalOcr kalau nominalFinal kosong, lalu ke 0 kalau keduanya kosong', async () => {
    const { service, createMany } = buatService({
      notaFindMany: [notaFixture({ nominalFinal: null, nominalOcr: 50000 }), notaFixture({ nominalFinal: null, nominalOcr: null })],
    });

    await service.sinkronkanDariDeklarasi(deklarasiFixture());

    const data = createMany.mock.calls[0][0].data;
    expect((data[0].total as Prisma.Decimal).toString()).toBe('50000');
    expect((data[1].total as Prisma.Decimal).toString()).toBe('0');
  });

  it('namaBarangJasa fallback ke kategori (underscore jadi spasi) kalau barangJasa kosong', async () => {
    const { service, createMany } = buatService({
      notaFindMany: [notaFixture({ barangJasa: '  ', kategoriNota: 'BIAYA_TRANSPORT' })],
    });

    await service.sinkronkanDariDeklarasi(deklarasiFixture());

    expect(createMany.mock.calls[0][0].data[0].namaBarangJasa).toBe('BIAYA TRANSPORT');
  });

  it('namaBarangJasa fallback ke "UANG OPERASIONAL" kalau barangJasa dan kategori kosong', async () => {
    const { service, createMany } = buatService({
      notaFindMany: [notaFixture({ barangJasa: null, kategoriNota: null })],
    });

    await service.sinkronkanDariDeklarasi(deklarasiFixture());

    expect(createMany.mock.calls[0][0].data[0].namaBarangJasa).toBe('UANG OPERASIONAL');
  });

  it('keterangan fallback ke namaBarangJasa kalau keteranganSettlement kosong', async () => {
    const { service, createMany } = buatService({
      notaFindMany: [notaFixture({ barangJasa: 'Bensin', keteranganSettlement: '  ' })],
    });

    await service.sinkronkanDariDeklarasi(deklarasiFixture());

    expect(createMany.mock.calls[0][0].data[0].keterangan).toBe('Bensin');
  });

  it('pic fallback ke namaPengguna deklarasi kalau picSettlement kosong', async () => {
    const { service, createMany } = buatService({
      notaFindMany: [notaFixture({ picSettlement: null })],
    });

    await service.sinkronkanDariDeklarasi(deklarasiFixture({ namaPengguna: 'Siti' }));

    expect(createMany.mock.calls[0][0].data[0].pic).toBe('Siti');
  });

  it('nomorRabPb default dari nomorStd/kodeDeklarasi kalau tidak ada idSaldo', async () => {
    const { service, createMany } = buatService({ notaFindMany: [notaFixture()] });

    await service.sinkronkanDariDeklarasi(deklarasiFixture({ nomorStd: null, kodeDeklarasi: 'DK-005', idSaldo: null }));

    expect(createMany.mock.calls[0][0].data[0].nomorRabPb).toBe('DK-005');
  });

  it('nomorRabPb diambil dari nomorRab pengajuan terkait idSaldo kalau tersedia', async () => {
    const { service, createMany, prisma } = buatService({
      notaFindMany: [notaFixture()],
      pengajuanFindFirst: { nomorRab: 'RAB-999' },
    });

    await service.sinkronkanDariDeklarasi(deklarasiFixture({ idSaldo: 42, kodeDeklarasi: 'DK-005' }));

    expect(prisma.pengajuan.findFirst).toHaveBeenCalledWith({ where: { idSaldo: 42 } });
    expect(createMany.mock.calls[0][0].data[0].nomorRabPb).toBe('RAB-999');
  });

  it('mengembalikan data settlement yang baru dibuat untuk deklarasi ini', async () => {
    const hasilAkhir = [{ id: 1, idDeklarasi: 5 }];
    const { service } = buatService({ notaFindMany: [notaFixture()], settlementFindMany: hasilAkhir });

    const hasil = await service.sinkronkanDariDeklarasi(deklarasiFixture());

    expect(hasil).toEqual(hasilAkhir);
  });
});

describe('DatabaseSettlementService.sinkronkanDataLamaDisetujui', () => {
  it('hanya sinkron ulang deklarasi yang BELUM punya data settlement AKTIF', async () => {
    const { service, prisma, createMany } = buatService({
      deklarasiFindMany: [deklarasiFixture({ id: 1 }), deklarasiFixture({ id: 2 })],
      notaFindMany: [notaFixture()],
    });
    (prisma.databaseSettlement.count as jest.Mock)
      .mockResolvedValueOnce(0) // deklarasi id 1: belum ada
      .mockResolvedValueOnce(3); // deklarasi id 2: sudah ada

    await service.sinkronkanDataLamaDisetujui();

    expect(createMany).toHaveBeenCalledTimes(1);
  });

  it('query hanya mengambil deklarasi UANG_OPERASIONAL berstatus DISETUJUI', async () => {
    const { service, prisma } = buatService();

    await service.sinkronkanDataLamaDisetujui();

    expect(prisma.deklarasi.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { jenisDeklarasi: 'UANG_OPERASIONAL', status: 'DISETUJUI' } }),
    );
  });
});

describe('DatabaseSettlementService.ambilBerdasarkanDeklarasi', () => {
  it('melempar NotFoundException kalau data settlement tetap kosong setelah sinkron', async () => {
    const { service } = buatService({ settlementFindMany: [] });

    await expect(service.ambilBerdasarkanDeklarasi(5)).rejects.toThrow(NotFoundException);
  });

  it('mengembalikan data kalau tersedia', async () => {
    const { service } = buatService({ settlementFindMany: [{ id: 1 }] });

    const hasil = await service.ambilBerdasarkanDeklarasi(5);

    expect(hasil).toEqual([{ id: 1 }]);
  });
});
