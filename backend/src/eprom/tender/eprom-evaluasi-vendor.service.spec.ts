import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromEvaluasiVendorService } from './eprom-evaluasi-vendor.service';

function buatService(overrides: {
  tender?: unknown;
  undangan?: unknown;
  undanganList?: unknown[];
  evaluasiList?: unknown[];
  upsert?: jest.Mock;
} = {}) {
  const upsert = overrides.upsert ?? jest.fn(({ create, update }) => Promise.resolve({ tenderId: 1, vendorId: 1, ...create, ...update }));

  const prisma = {
    tenderProcess: {
      findUnique: jest.fn().mockResolvedValue('tender' in overrides ? overrides.tender : { id: 1 }),
    },
    tenderUndangan: {
      findUnique: jest.fn().mockResolvedValue('undangan' in overrides ? overrides.undangan : { tenderId: 1, vendorId: 1 }),
      findMany: jest.fn().mockResolvedValue(overrides.undanganList ?? []),
    },
    evaluasiVendor: {
      findMany: jest.fn().mockResolvedValue(overrides.evaluasiList ?? []),
      upsert,
    },
  } as unknown as PrismaService;

  const service = new EpromEvaluasiVendorService(prisma);

  return { service, prisma, upsert };
}

describe('EpromEvaluasiVendorService.daftar — nilaiAvg eksternal', () => {
  it('vendor tanpa evaluasi sama sekali menghasilkan evaluasi & nilaiAvg null', async () => {
    const { service } = buatService({
      undanganList: [{ vendor: { id: 1, namaVendor: 'PT A' } }],
      evaluasiList: [],
    });

    const [hasil] = await service.daftar(1);

    expect(hasil.evaluasi).toBeNull();
    expect(hasil.nilaiAvg).toBeNull();
    expect(hasil.nilaiTeknis).toBeNull();
  });

  it('menghitung rata-rata bobot kode 1-4 dengan benar', async () => {
    const { service } = buatService({
      undanganList: [{ vendor: { id: 1, namaVendor: 'PT A' } }],
      evaluasiList: [{ vendorId: 1, bumdesKode: 1, bupatiDprKode: 2 }],
    });

    const [hasil] = await service.daftar(1);

    expect(hasil.nilaiAvg).toBe(87.5);
  });

  it('kode 4 (Track Record Tidak Baik) bernilai bobot 0', async () => {
    const { service } = buatService({
      undanganList: [{ vendor: { id: 1, namaVendor: 'PT A' } }],
      evaluasiList: [{ vendorId: 1, bumdesKode: 4 }],
    });

    const [hasil] = await service.daftar(1);

    expect(hasil.nilaiAvg).toBe(0);
  });
});

describe('EpromEvaluasiVendorService.daftar — nilaiTeknis berbobot', () => {
  it('menghitung nilaiTeknis berbobot penuh saat kelima kriteria terisi', async () => {
    const { service } = buatService({
      undanganList: [{ vendor: { id: 1, namaVendor: 'PT A' } }],
      evaluasiList: [{
        vendorId: 1,
        teknikalMetode: 8, teknikalAlatKerja: 8, teknikalSpesifikasi: 8, teknikalPengalaman: 8, teknikalKomunikatif: 8,
        scheduleSkor: 6,
        hargaKetepatanWaktu: 10, hargaNegosiasi: 10,
        sheSkor: 4,
        legalitasSkor: 10,
      }],
    });

    const [hasil] = await service.daftar(1);

    expect(hasil.teknikalAvg).toBe(8);
    expect(hasil.hargaAvg).toBe(10);
    expect(hasil.nilaiTeknis).toBe(7.5);
    expect(hasil.roundTeknis).toBe(8);
  });

  it('hanya menghitung dari kriteria yang terisi kalau sebagian kosong', async () => {
    const { service } = buatService({
      undanganList: [{ vendor: { id: 1, namaVendor: 'PT A' } }],
      evaluasiList: [{
        vendorId: 1,
        teknikalMetode: 8, teknikalAlatKerja: 8, teknikalSpesifikasi: 8, teknikalPengalaman: 8, teknikalKomunikatif: 8,
      }],
    });

    const [hasil] = await service.daftar(1);

    expect(hasil.teknikalAvg).toBe(8);
    expect(hasil.nilaiTeknis).toBe(8);
    expect(hasil.roundTeknis).toBe(8);
  });
});

describe('EpromEvaluasiVendorService.ubah', () => {
  it('melempar NotFoundException kalau tender tidak ada', async () => {
    const { service } = buatService({ tender: null });

    await expect(service.ubah(1, 1, {} as any)).rejects.toThrow(NotFoundException);
  });

  it('menolak kalau vendor belum diundang pada tender tersebut', async () => {
    const { service } = buatService({ undangan: null });

    await expect(service.ubah(1, 1, {} as any)).rejects.toThrow(BadRequestException);
  });

  it('upsert evaluasi dan mengembalikan skor terhitung', async () => {
    const { service, upsert } = buatService();

    const hasil = await service.ubah(1, 1, { bumdesKode: 1 } as any);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenderId_vendorId: { tenderId: 1, vendorId: 1 } },
        create: { tenderId: 1, vendorId: 1, bumdesKode: 1 },
        update: { bumdesKode: 1 },
      }),
    );
    expect(hasil.nilaiAvg).toBe(100);
  });
});
