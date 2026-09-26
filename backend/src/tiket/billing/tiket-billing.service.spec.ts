import { BadRequestException, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { PrismaService } from '../../prisma/prisma.service';
import { TiketBillingRekapService } from './tiket-billing-rekap.service';
import { TiketBillingService } from './tiket-billing.service';

const berkasDitulis: string[] = [];

afterEach(() => {
  // Bersihkan file PDF asli yang sungguhan ditulis ke disk oleh buat() -
  // jangan pernah wipe seluruh folder uploads/tiket-billing (bisa kena
  // file rekap asli yang sedang dites manual di sesi yang sama).
  for (const path of berkasDitulis) {
    if (existsSync(path)) {
      unlinkSync(path);
    }
  }
  berkasDitulis.length = 0;
  jest.restoreAllMocks();
});

function buatService(overrides: {
  generate?: jest.Mock;
  create?: jest.Mock;
  findMany?: jest.Mock;
  findUnique?: jest.Mock;
  update?: jest.Mock;
  deleteFn?: jest.Mock;
} = {}) {
  const create =
    overrides.create ??
    jest.fn(({ data }) => {
      const path = join(process.cwd(), data.filePdf.replace(/^\//, ''));
      berkasDitulis.push(path);
      return Promise.resolve({ id: 1, ...data });
    });

  const prisma = {
    tiketBilling: {
      create,
      findMany: overrides.findMany ?? jest.fn().mockResolvedValue([]),
      findUnique:
        overrides.findUnique ??
        jest.fn().mockResolvedValue({
          id: 1,
          namaRekapan: 'Rekap Contoh',
          bulan: 9,
          tahun: 2026,
          subTotal: 1_000_000,
          filePdf: '/uploads/tiket-billing/contoh.pdf',
        }),
      update: overrides.update ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data })),
      delete: overrides.deleteFn ?? jest.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaService;

  const rekap = {
    generate:
      overrides.generate ??
      jest.fn().mockResolvedValue({
        pdf: Buffer.from('%PDF-1.4 palsu'),
        subTotal: 1_000_000,
        jumlahInvoice: 5,
      }),
  } as unknown as TiketBillingRekapService;

  const service = new TiketBillingService(prisma, rekap);

  return { service, prisma, rekap, create };
}

describe('TiketBillingService.buat', () => {
  it('menolak bulan di luar rentang 1-12', async () => {
    const { service } = buatService();

    await expect(
      service.buat(
        { namaRekapan: 'Rekap', bulan: '13', tahun: '2026' },
        Buffer.from(''),
        'test.zip',
        1,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('menolak tahun tidak valid', async () => {
    const { service } = buatService();

    await expect(
      service.buat(
        { namaRekapan: 'Rekap', bulan: '9', tahun: 'abcd' },
        Buffer.from(''),
        'test.zip',
        1,
      ),
    ).rejects.toThrow(BadRequestException);
  });

  it('berhasil membuat record dengan subTotal & jumlahInvoice dari rekap service', async () => {
    const { service, create } = buatService();

    const hasil = await service.buat(
      { namaRekapan: 'Billing ADW 09-15 Sep 2026', bulan: '9', tahun: '2026' },
      Buffer.from('zip-palsu'),
      'INV.zip',
      7,
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          namaRekapan: 'Billing ADW 09-15 Sep 2026',
          bulan: 9,
          tahun: 2026,
          namaFileZip: 'INV.zip',
          jumlahInvoice: 5,
          subTotal: 1_000_000,
          createdBy: 7,
        }),
      }),
    );
    expect(hasil).toHaveProperty('filePdf');
  });

  it('benar-benar menulis file PDF ke disk (bukan cuma path palsu)', async () => {
    const { service } = buatService();

    const hasil: any = await service.buat(
      { namaRekapan: 'Rekap', bulan: '9', tahun: '2026' },
      Buffer.from('zip-palsu'),
      'INV.zip',
      1,
    );

    const pathAbsolut = join(process.cwd(), hasil.filePdf.replace(/^\//, ''));
    expect(existsSync(pathAbsolut)).toBe(true);
  });
});

describe('TiketBillingService.daftar', () => {
  it('meneruskan filter bulan & tahun ke query', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const { service } = buatService({ findMany });

    await service.daftar({ bulan: 9, tahun: 2026 });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ bulan: 9, tahun: 2026 }),
      }),
    );
  });
});

describe('TiketBillingService.detail', () => {
  it('melempar NotFoundException kalau tidak ketemu', async () => {
    const { service } = buatService({ findUnique: jest.fn().mockResolvedValue(null) });

    await expect(service.detail(99)).rejects.toThrow(NotFoundException);
  });
});

describe('TiketBillingService.hitungRekap', () => {
  it('menghitung grandTotalHitung = subTotal - ppn - pph23', async () => {
    const update = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
    const { service } = buatService({ update });

    const hasil = await service.hitungRekap(
      1,
      { ppn: 50_000, pph23: 20_000, grandTotalVendor: 980_000 },
      3,
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ppn: 50_000,
          pph23: 20_000,
          grandTotalVendor: 980_000,
          grandTotalHitung: 1_000_000 - 20_000,
          dihitungOlehId: 3,
        }),
      }),
    );
    expect((hasil as any).grandTotalHitung).toBe(980_000);
  });

  it('PPN disimpan untuk referensi saja - TIDAK ikut dikurangi (sudah termasuk di Sub Total dari Grand Total tiap invoice)', async () => {
    const update = jest.fn(({ data }) => Promise.resolve({ id: 2, ...data }));

    // Data asli: Sub Total 243.545.987 (termasuk PPN 272.580 tiap invoice)
    // - PPH23 49.560 = 243.496.427, persis SUBTOTAL final di rekap Excel.
    const { service } = buatService({
      update,
      findUnique: jest.fn().mockResolvedValue({
        id: 2,
        subTotal: 243_545_987,
      }),
    });

    await service.hitungRekap(
      2,
      { ppn: 272_580, pph23: 49_560, grandTotalVendor: 243_496_427 },
      1,
    );

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ grandTotalHitung: 243_496_427 }),
      }),
    );
  });
});

describe('TiketBillingService.ubah', () => {
  it('melempar NotFoundException kalau billing tidak ada', async () => {
    const { service } = buatService({ findUnique: jest.fn().mockResolvedValue(null) });

    await expect(service.ubah(99, { namaRekapan: 'Baru' })).rejects.toThrow(
      NotFoundException,
    );
  });

  it('mengubah namaRekapan saja tanpa menyentuh bulan/tahun', async () => {
    const update = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
    const { service } = buatService({ update });

    await service.ubah(1, { namaRekapan: 'Nama Baru' });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { namaRekapan: 'Nama Baru' },
      }),
    );
  });

  it('menolak bulan tidak valid saat edit', async () => {
    const { service } = buatService();

    await expect(service.ubah(1, { bulan: '13' })).rejects.toThrow(
      BadRequestException,
    );
  });

  it('mengubah bulan & tahun bersamaan', async () => {
    const update = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
    const { service } = buatService({ update });

    await service.ubah(1, { bulan: '10', tahun: '2027' });

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { bulan: 10, tahun: 2027 },
      }),
    );
  });
});

describe('TiketBillingService.hapus', () => {
  it('melempar NotFoundException kalau billing tidak ada', async () => {
    const { service } = buatService({ findUnique: jest.fn().mockResolvedValue(null) });

    await expect(service.hapus(99)).rejects.toThrow(NotFoundException);
  });

  it('menghapus record di database', async () => {
    const deleteFn = jest.fn().mockResolvedValue({});
    const { service } = buatService({ deleteFn });

    await service.hapus(1);

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('menghapus file PDF fisik yang path-nya di dalam folder uploads/tiket-billing', async () => {
    const dir = join(process.cwd(), 'uploads', 'tiket-billing');
    mkdirSync(dir, { recursive: true });
    const pathFile = join(dir, 'test-hapus-sungguhan.pdf');
    writeFileSync(pathFile, 'isi palsu');

    const { service } = buatService({
      findUnique: jest.fn().mockResolvedValue({
        id: 5,
        namaRekapan: 'Akan Dihapus',
        filePdf: '/uploads/tiket-billing/test-hapus-sungguhan.pdf',
      }),
    });

    await service.hapus(5);

    expect(existsSync(pathFile)).toBe(false);
  });

  it('tidak menghapus file di luar folder uploads/tiket-billing (path-traversal aman)', async () => {
    const pathLuar = join(process.cwd(), 'uploads', 'jangan-hapus-ini.txt');
    mkdirSync(join(process.cwd(), 'uploads'), { recursive: true });
    writeFileSync(pathLuar, 'jangan dihapus');

    const { service } = buatService({
      findUnique: jest.fn().mockResolvedValue({
        id: 6,
        namaRekapan: 'Aneh',
        filePdf: '/uploads/../jangan-hapus-ini.txt',
      }),
    });

    try {
      await service.hapus(6);
      expect(existsSync(pathLuar)).toBe(true);
    } finally {
      unlinkSync(pathLuar);
    }
  });
});
