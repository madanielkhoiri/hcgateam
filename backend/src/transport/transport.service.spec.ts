import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransportService } from './transport.service';

function recordFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    unitNumber: 'DT-01',
    department: 'MINING',
    fuelDate: new Date('2026-01-05'),
    hmStart: 100,
    hmEnd: 200,
    totalLiter: 50,
    lostTimeBd: 0,
    ...overrides,
  };
}

function buatService(overrides: { current?: unknown; create?: jest.Mock; update?: jest.Mock; deleteFn?: jest.Mock; rows?: unknown[] } = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const update = overrides.update ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const deleteFn = overrides.deleteFn ?? jest.fn().mockResolvedValue({});

  const prisma = {
    transportRecord: {
      findMany: jest.fn().mockResolvedValue(overrides.rows ?? []),
      findUnique: jest.fn().mockResolvedValue('current' in overrides ? overrides.current : recordFixture()),
      create,
      update,
      delete: deleteFn,
    },
  } as unknown as PrismaService;

  const service = new TransportService(prisma);

  return { service, prisma, create, update, deleteFn };
}

function decVal(value: unknown): number {
  return Number((value as { toString(): string }).toString());
}

describe('TransportService.create — perhitungan (calculate)', () => {
  const dtoDasar = { unitNumber: 'dt-01', department: 'mining', fuelDate: '2026-01-05', hmStart: 100, hmEnd: 800, totalLiter: 100, lostTimeBd: 10 };

  it('menghitung totalHm, hmPerShift, kmPerLiter, targetUa, actualUa, uaPercentage sesuai rumus (Januari = 31 hari)', async () => {
    const { service, create } = buatService();

    await service.create(dtoDasar as any, 9);

    const data = create.mock.calls[0][0].data;
    expect(decVal(data.totalHm)).toBe(700);
    expect(decVal(data.hmPerShift)).toBeCloseTo(700 / 62, 6);
    expect(decVal(data.kmPerLiter)).toBe(7);
    expect(decVal(data.targetUa)).toBe(744); // 31 * 24
    expect(decVal(data.actualUa)).toBe(734); // 744 - 10
    expect(decVal(data.uaPercentage)).toBeCloseTo((734 / 744) * 100, 6);
  });

  it('totalHm tidak pernah negatif walau hmEnd < hmStart', async () => {
    const { service, create } = buatService();

    await service.create({ ...dtoDasar, hmStart: 800, hmEnd: 100 } as any, 9);

    expect(decVal(create.mock.calls[0][0].data.totalHm)).toBe(0);
  });

  it('kmPerLiter 0 kalau totalLiter 0 (menghindari pembagian dengan nol)', async () => {
    const { service, create } = buatService();

    await service.create({ ...dtoDasar, totalLiter: 0 } as any, 9);

    expect(decVal(create.mock.calls[0][0].data.kmPerLiter)).toBe(0);
  });

  it('unitStatus otomatis BREAKDOWN kalau lostTimeBd > 0 dan tidak diisi eksplisit', async () => {
    const { service, create } = buatService();

    await service.create(dtoDasar as any, 9);

    expect(create.mock.calls[0][0].data.unitStatus).toBe('BREAKDOWN');
  });

  it('unitStatus otomatis READY kalau lostTimeBd 0', async () => {
    const { service, create } = buatService();

    await service.create({ ...dtoDasar, lostTimeBd: 0 } as any, 9);

    expect(create.mock.calls[0][0].data.unitStatus).toBe('READY');
  });

  it('achievement TERCAPAI kalau uaPercentage >= 100 (lostTimeBd 0)', async () => {
    const { service, create } = buatService();

    await service.create({ ...dtoDasar, lostTimeBd: 0 } as any, 9);

    expect(create.mock.calls[0][0].data.achievement).toBe('TERCAPAI');
  });

  it('achievement TIDAK TERCAPAI kalau uaPercentage < 100', async () => {
    const { service, create } = buatService();

    await service.create(dtoDasar as any, 9);

    expect(create.mock.calls[0][0].data.achievement).toBe('TIDAK TERCAPAI');
  });

  it('unitNumber & department di-trim dan uppercase', async () => {
    const { service, create } = buatService();

    await service.create(dtoDasar as any, 9);

    expect(create.mock.calls[0][0].data.unitNumber).toBe('DT-01');
    expect(create.mock.calls[0][0].data.department).toBe('MINING');
  });

  it('vehicleType default BUS kalau unitNumber mengandung "BUS"', async () => {
    const { service, create } = buatService();

    await service.create({ ...dtoDasar, unitNumber: 'BUS-01', vehicleType: undefined } as any, 9);

    expect(create.mock.calls[0][0].data.vehicleType).toBe('BUS');
  });

  it('vehicleType default LV kalau unitNumber bukan bus', async () => {
    const { service, create } = buatService();

    await service.create({ ...dtoDasar, vehicleType: undefined } as any, 9);

    expect(create.mock.calls[0][0].data.vehicleType).toBe('LV');
  });

  it('createdBy diisi dari userId', async () => {
    const { service, create } = buatService();

    await service.create(dtoDasar as any, 9);

    expect(create.mock.calls[0][0].data.createdBy).toBe(9);
  });
});

describe('TransportService.update', () => {
  it('melempar NotFoundException kalau data tidak ada', async () => {
    const { service } = buatService({ current: null });

    await expect(service.update(1, {} as any)).rejects.toThrow(NotFoundException);
  });

  it('field yang tidak dikirim di dto mengambil nilai dari data lama (current) untuk kalkulasi ulang', async () => {
    const { service, update } = buatService({
      current: recordFixture({ hmStart: 100, hmEnd: 800, totalLiter: 100, lostTimeBd: 0, fuelDate: new Date('2026-01-05') }),
    });

    await service.update(1, { lostTimeBd: 10 } as any);

    const data = update.mock.calls[0][0].data;
    expect(decVal(data.totalHm)).toBe(700);
    expect(decVal(data.actualUa)).toBe(734);
  });
});

describe('TransportService.remove', () => {
  it('melempar NotFoundException kalau data tidak ada', async () => {
    const { service } = buatService({ current: null });

    await expect(service.remove(1)).rejects.toThrow(NotFoundException);
  });

  it('berhasil menghapus data', async () => {
    const { service, deleteFn } = buatService();

    const hasil = await service.remove(1);

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});

describe('TransportService.importRows — validasi', () => {
  it('menolak kalau tidak ada baris data', async () => {
    const { service } = buatService();

    await expect(service.importRows([], 9)).rejects.toThrow(BadRequestException);
  });

  it('menolak lebih dari 5000 baris', async () => {
    const { service } = buatService();
    const banyak = Array.from({ length: 5001 }, () => ({}));

    await expect(service.importRows(banyak, 9)).rejects.toThrow('Maksimal 5.000 baris');
  });

  it('baris dengan unitNumber kosong masuk ke failed', async () => {
    const { service } = buatService();

    const hasil = await service.importRows([{ unitNumber: '', department: 'MINING', hmStart: 0, hmEnd: 100 }], 9);

    expect(hasil.failedCount).toBe(1);
    expect(hasil.failed[0].message).toBe('No lambung kosong');
  });

  it('baris dengan hmEnd < hmStart masuk ke failed', async () => {
    const { service } = buatService();

    const hasil = await service.importRows(
      [{ unitNumber: 'DT-01', department: 'MINING', hmStart: 500, hmEnd: 100, fuelDate: '2026-01-05' }],
      9,
    );

    expect(hasil.failed[0].message).toBe('HM akhir lebih kecil dari HM awal');
  });

  it('baris tanpa tanggal fallback ke tanggal 1 bulan/tahun terpilih', async () => {
    const { service, create } = buatService();

    const hasil = await service.importRows(
      [{ unitNumber: 'DT-01', department: 'MINING', hmStart: 0, hmEnd: 100 }],
      9,
      3,
      2026,
    );

    expect(hasil.successCount).toBe(1);
    expect(create.mock.calls[0][0].data.fuelDate).toEqual(new Date('2026-03-01T00:00:00.000Z'));
  });

  it('baris tanpa tanggal dan tanpa bulan/tahun terpilih masuk ke failed', async () => {
    const { service } = buatService();

    const hasil = await service.importRows([{ unitNumber: 'DT-01', department: 'MINING', hmStart: 0, hmEnd: 100 }], 9);

    expect(hasil.failed[0].message).toBe('Tanggal kosong');
  });

  it('baris dengan tanggal di luar bulan yang dipilih masuk ke failed', async () => {
    const { service } = buatService();

    const hasil = await service.importRows(
      [{ unitNumber: 'DT-01', department: 'MINING', hmStart: 0, hmEnd: 100, fuelDate: '2026-02-05' }],
      9,
      3,
      2026,
    );

    expect(hasil.failed[0].message).toBe('Tanggal bukan bulan 3');
  });

  it('baris dengan tanggal di luar tahun yang dipilih masuk ke failed', async () => {
    const { service } = buatService();

    const hasil = await service.importRows(
      [{ unitNumber: 'DT-01', department: 'MINING', hmStart: 0, hmEnd: 100, fuelDate: '2025-03-05' }],
      9,
      3,
      2026,
    );

    expect(hasil.failed[0].message).toBe('Tanggal bukan tahun 2026');
  });

  it('baris valid berhasil disimpan dengan nomor baris (row) dihitung dari index+2 (header + 1-index)', async () => {
    const { service } = buatService();

    const hasil = await service.importRows(
      [{ unitNumber: 'DT-01', department: 'MINING', hmStart: 0, hmEnd: 100, fuelDate: '2026-01-05' }],
      9,
    );

    expect(hasil.successful[0].row).toBe(2);
  });

  it('menggabungkan hasil sukses & gagal dalam satu batch dengan pesan yang sesuai', async () => {
    const { service } = buatService();

    const hasil = await service.importRows(
      [
        { unitNumber: 'DT-01', department: 'MINING', hmStart: 0, hmEnd: 100, fuelDate: '2026-01-05' },
        { unitNumber: '', department: 'MINING', hmStart: 0, hmEnd: 100 },
      ],
      9,
    );

    expect(hasil.total).toBe(2);
    expect(hasil.successCount).toBe(1);
    expect(hasil.failedCount).toBe(1);
    expect(hasil.message).toBe('Import Excel selesai dengan beberapa data gagal');
  });

  it('pesan sukses penuh kalau tidak ada yang gagal', async () => {
    const { service } = buatService();

    const hasil = await service.importRows(
      [{ unitNumber: 'DT-01', department: 'MINING', hmStart: 0, hmEnd: 100, fuelDate: '2026-01-05' }],
      9,
    );

    expect(hasil.message).toBe('Seluruh data Excel berhasil diimport');
  });
});

describe('TransportService.dashboard', () => {
  it('bulan 0 berarti seluruh tahun (rentang 1 Jan - 31 Des)', async () => {
    const { service, prisma } = buatService();

    await service.dashboard(0, 2026);

    expect(prisma.transportRecord.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { fuelDate: { gte: new Date(Date.UTC(2026, 0, 1)), lt: new Date(Date.UTC(2027, 0, 1)) } },
      }),
    );
  });

  it('mengagregasi total unit unik, HM, liter, dan rata-rata availability', async () => {
    const { service } = buatService({
      rows: [
        recordFixture({ unitNumber: 'DT-01', department: 'MINING', totalHm: 10, totalLiter: 5, uaPercentage: 80 }),
        recordFixture({ unitNumber: 'DT-02', department: 'MINING', totalHm: 20, totalLiter: 10, uaPercentage: 100 }),
      ],
    });

    const hasil = await service.dashboard(1, 2026);

    expect(hasil.totals.units).toBe(2);
    expect(hasil.totals.hm).toBe(30);
    expect(hasil.totals.liters).toBe(15);
    expect(hasil.totals.availability).toBe(90);
  });

  it('mengelompokkan availability & HM per departemen', async () => {
    const { service } = buatService({
      rows: [
        recordFixture({ unitNumber: 'DT-01', department: 'MINING', totalHm: 10, uaPercentage: 80 }),
        recordFixture({ unitNumber: 'DT-02', department: 'MINING', totalHm: 20, uaPercentage: 100 }),
        recordFixture({ unitNumber: 'DT-03', department: 'PLANT', totalHm: 5, uaPercentage: 50 }),
      ],
    });

    const hasil = await service.dashboard(1, 2026);

    expect(hasil.availabilityByDepartment).toEqual([
      { name: 'MINING', value: 90 },
      { name: 'PLANT', value: 50 },
    ]);
    expect(hasil.hmByDepartment).toEqual([
      { name: 'MINING', value: 30 },
      { name: 'PLANT', value: 5 },
    ]);
  });

  it('mengelompokkan hmPerShift & liter per unit', async () => {
    const { service } = buatService({
      rows: [
        recordFixture({ unitNumber: 'DT-01', hmPerShift: 5, totalLiter: 10 }),
        recordFixture({ unitNumber: 'DT-01', hmPerShift: 7, totalLiter: 20 }),
      ],
    });

    const hasil = await service.dashboard(1, 2026);

    expect(hasil.hmPerShiftByUnit).toEqual([{ name: 'DT-01', value: 6 }]);
    expect(hasil.litersByUnit).toEqual([{ name: 'DT-01', value: 30 }]);
  });

  it('availability 0 kalau tidak ada data sama sekali', async () => {
    const { service } = buatService({ rows: [] });

    const hasil = await service.dashboard(1, 2026);

    expect(hasil.totals.availability).toBe(0);
  });
});
