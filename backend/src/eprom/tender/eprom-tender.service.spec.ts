import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StatusTender } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromFileService } from '../common/eprom-file.service';
import { EpromTenderService } from './eprom-tender.service';

function buatService(overrides: {
  tender?: unknown;
  undangan?: unknown;
  jumlahSph?: number;
  roundTerakhir?: unknown;
  undanganList?: unknown[];
  roundByIdMap?: Record<number, unknown>;
} = {}) {
  const tenderUpdate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const tenderUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
  const tenderCreate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const tenderDelete = jest.fn().mockResolvedValue({});

  const undanganUpsert = jest.fn().mockResolvedValue({});
  const undanganDelete = jest.fn().mockResolvedValue({});

  const sphCreate = jest.fn(({ data }) => Promise.resolve({ id: 100, isFinal: false, ...data }));
  const sphUpdate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const sphUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
  const sphDelete = jest.fn().mockResolvedValue({});

  const detailFixture = 'tender' in overrides ? overrides.tender : { id: 1, status: StatusTender.PERSIAPAN };

  const prisma = {
    tenderProcess: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(detailFixture),
      create: tenderCreate,
      update: tenderUpdate,
      updateMany: tenderUpdateMany,
      delete: tenderDelete,
    },
    tenderUndangan: {
      findUnique: jest.fn().mockResolvedValue('undangan' in overrides ? overrides.undangan : { tenderId: 1, vendorId: 1 }),
      findMany: jest.fn().mockResolvedValue(overrides.undanganList ?? []),
      upsert: undanganUpsert,
      delete: undanganDelete,
    },
    tenderSPH: {
      count: jest.fn().mockResolvedValue(overrides.jumlahSph ?? 0),
      findFirst: jest.fn().mockResolvedValue('roundTerakhir' in overrides ? overrides.roundTerakhir : null),
      findUnique: jest.fn().mockImplementation(({ where: { id } }: any) => {
        const map = overrides.roundByIdMap ?? {};
        return Promise.resolve(id in map ? map[id] : null);
      }),
      create: sphCreate,
      update: sphUpdate,
      updateMany: sphUpdateMany,
      delete: sphDelete,
    },
    $transaction: jest.fn((arg) => {
      if (Array.isArray(arg)) {
        return Promise.all(arg);
      }
      return arg({ tenderUndangan: { upsert: undanganUpsert }, tenderProcess: { update: tenderUpdate }, tenderSPH: { updateMany: sphUpdateMany, update: sphUpdate } });
    }),
  } as unknown as PrismaService;

  const file = {
    simpan: jest.fn().mockReturnValue('eprom/tender/1/sph/a.pdf'),
    tebakTipe: jest.fn().mockReturnValue('PDF'),
  } as unknown as EpromFileService;

  const service = new EpromTenderService(prisma, file);

  return {
    service,
    prisma,
    file,
    tenderUpdate,
    tenderUpdateMany,
    tenderCreate,
    tenderDelete,
    undanganUpsert,
    undanganDelete,
    sphCreate,
    sphUpdate,
    sphUpdateMany,
    sphDelete,
  };
}

describe('EpromTenderService.daftar', () => {
  it('mengekstrak pemenang dari sph[0] atau null kalau belum ada', async () => {
    const { service, prisma } = buatService();
    (prisma.tenderProcess.findMany as jest.Mock).mockResolvedValue([
      { id: 1, sph: [{ vendor: { id: 5, namaVendor: 'PT A' } }] },
      { id: 2, sph: [] },
    ]);

    const hasil = await service.daftar();

    expect(hasil[0].pemenang).toEqual({ vendor: { id: 5, namaVendor: 'PT A' } });
    expect(hasil[1].pemenang).toBeNull();
  });
});

describe('EpromTenderService.detail', () => {
  it('melempar NotFoundException kalau tender tidak ada', async () => {
    const { service } = buatService({ tender: null });

    await expect(service.detail(1)).rejects.toThrow(NotFoundException);
  });
});

describe('EpromTenderService.buat', () => {
  it('trim nama dan konversi tanggal', async () => {
    const { service, tenderCreate } = buatService();

    await service.buat({ namaTender: '  Tender A  ', tanggalMulai: '2026-01-01' } as any);

    expect(tenderCreate).toHaveBeenCalledWith({
      data: { namaTender: 'Tender A', tanggalMulai: new Date('2026-01-01'), tanggalSelesai: null },
    });
  });
});

describe('EpromTenderService.hapus', () => {
  it('melempar NotFoundException kalau tender tidak ada', async () => {
    const { service } = buatService({ tender: null });

    await expect(service.hapus(1)).rejects.toThrow(NotFoundException);
  });

  it('menolak hapus kalau tender sudah punya Kontrak', async () => {
    const { service } = buatService({ tender: { id: 1, kontrak: { id: 9 } } });

    await expect(service.hapus(1)).rejects.toThrow('sudah memiliki Kontrak');
  });

  it('berhasil hapus tender tanpa kontrak', async () => {
    const { service, tenderDelete } = buatService({ tender: { id: 1, kontrak: null } });

    const hasil = await service.hapus(1);

    expect(tenderDelete).toHaveBeenCalled();
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});

describe('EpromTenderService.kirimUndangan', () => {
  it('upsert undangan untuk tiap vendorId dan ubah status kalau masih PERSIAPAN', async () => {
    const { service, undanganUpsert, tenderUpdate } = buatService({ tender: { id: 1, status: StatusTender.PERSIAPAN } });

    await service.kirimUndangan(1, { vendorIds: [1, 2] } as any);

    expect(undanganUpsert).toHaveBeenCalledTimes(2);
    expect(tenderUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: StatusTender.UNDANGAN_TERKIRIM } }),
    );
  });

  it('tidak ubah status kalau tender sudah lewat PERSIAPAN', async () => {
    const { service, tenderUpdate } = buatService({ tender: { id: 1, status: StatusTender.EVALUASI_SPH } });

    await service.kirimUndangan(1, { vendorIds: [1] } as any);

    expect(tenderUpdate).not.toHaveBeenCalled();
  });
});

describe('EpromTenderService.hapusUndangan', () => {
  it('melempar NotFoundException kalau undangan tidak ada', async () => {
    const { service } = buatService({ undangan: null });

    await expect(service.hapusUndangan(1, 1)).rejects.toThrow(NotFoundException);
  });

  it('menolak batalkan undangan kalau vendor sudah unggah SPH', async () => {
    const { service } = buatService({ jumlahSph: 1 });

    await expect(service.hapusUndangan(1, 1)).rejects.toThrow('sudah mengunggah SPH');
  });

  it('berhasil batalkan undangan tanpa SPH', async () => {
    const { service, undanganDelete } = buatService({ jumlahSph: 0 });

    const hasil = await service.hapusUndangan(1, 1);

    expect(undanganDelete).toHaveBeenCalled();
    expect(hasil.message).toMatch(/berhasil dibatalkan/);
  });
});

describe('EpromTenderService.buatRoundSph', () => {
  it('menolak kalau vendor belum diundang', async () => {
    const { service } = buatService({ undangan: null });

    await expect(service.buatRoundSph({} as any, 1, 1)).rejects.toThrow('belum diundang');
  });

  it('menolak kalau SPH terakhir vendor sudah final', async () => {
    const { service } = buatService({ roundTerakhir: { roundKe: 2, isFinal: true } });

    await expect(service.buatRoundSph({} as any, 1, 1)).rejects.toThrow('sudah final');
  });

  it('roundKe dimulai dari 1 kalau belum ada SPH sebelumnya', async () => {
    const { service, sphCreate } = buatService({ roundTerakhir: null });

    await service.buatRoundSph({} as any, 1, 1, undefined, 1000);

    expect(sphCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ roundKe: 1, hargaPenawaran: 1000 }) }),
    );
  });

  it('roundKe lanjut dari round terakhir + 1 dan menyimpan file kalau ada', async () => {
    const { service, sphCreate, file } = buatService({ roundTerakhir: { roundKe: 3, isFinal: false } });
    const dummyFile = { originalname: 'a.pdf' } as Express.Multer.File;

    await service.buatRoundSph({} as any, 1, 1, dummyFile);

    expect(file.simpan).toHaveBeenCalled();
    expect(sphCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ roundKe: 4 }) }),
    );
  });

  it('mengubah status tender dari UNDANGAN_TERKIRIM ke EVALUASI_SPH', async () => {
    const { service, tenderUpdateMany } = buatService({ roundTerakhir: null });

    await service.buatRoundSph({} as any, 1, 1);

    expect(tenderUpdateMany).toHaveBeenCalledWith({
      where: { id: 1, status: StatusTender.UNDANGAN_TERKIRIM },
      data: { status: StatusTender.EVALUASI_SPH },
    });
  });
});

describe('EpromTenderService.ubahRoundSph', () => {
  it('melempar NotFoundException kalau round tidak ditemukan / salah tender-vendor', async () => {
    const { service } = buatService({ roundByIdMap: { 1: { id: 1, tenderId: 99, vendorId: 1 } } });

    await expect(service.ubahRoundSph(1, 1, 1)).rejects.toThrow(NotFoundException);
  });

  it('menolak ubah SPH yang sudah final', async () => {
    const { service } = buatService({ roundByIdMap: { 1: { id: 1, tenderId: 1, vendorId: 1, isFinal: true } } });

    await expect(service.ubahRoundSph(1, 1, 1)).rejects.toThrow('sudah final');
  });

  it('berhasil ubah harga saja tanpa menyentuh file', async () => {
    const { service, sphUpdate } = buatService({ roundByIdMap: { 1: { id: 1, tenderId: 1, vendorId: 1, isFinal: false } } });

    await service.ubahRoundSph(1, 1, 1, undefined, 5000);

    expect(sphUpdate).toHaveBeenCalledWith({ where: { id: 1 }, data: { hargaPenawaran: 5000 } });
  });
});

describe('EpromTenderService.hapusRoundSph', () => {
  it('melempar NotFoundException kalau round tidak ditemukan', async () => {
    const { service } = buatService({ roundByIdMap: {} });

    await expect(service.hapusRoundSph(1, 1, 1)).rejects.toThrow(NotFoundException);
  });

  it('menolak hapus SPH yang sudah final', async () => {
    const { service } = buatService({ roundByIdMap: { 1: { id: 1, tenderId: 1, vendorId: 1, isFinal: true } } });

    await expect(service.hapusRoundSph(1, 1, 1)).rejects.toThrow('sudah final');
  });

  it('berhasil hapus SPH yang belum final', async () => {
    const { service, sphDelete } = buatService({ roundByIdMap: { 1: { id: 1, tenderId: 1, vendorId: 1, isFinal: false } } });

    const hasil = await service.hapusRoundSph(1, 1, 1);

    expect(sphDelete).toHaveBeenCalled();
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});

describe('EpromTenderService.finalisasiTender', () => {
  it('menolak kalau belum ada vendor diundang', async () => {
    const { service } = buatService({ undanganList: [] });

    await expect(service.finalisasiTender(1)).rejects.toThrow('Belum ada vendor diundang');
  });

  it('menolak dan menyebutkan nama vendor yang belum isi harga', async () => {
    const { service, prisma } = buatService({
      undanganList: [{ vendorId: 1, vendor: { namaVendor: 'PT A' } }, { vendorId: 2, vendor: { namaVendor: 'PT B' } }],
    });
    (prisma.tenderSPH.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: 1, hargaPenawaran: 1000, isFinal: false })
      .mockResolvedValueOnce({ id: 2, hargaPenawaran: null, isFinal: false });

    await expect(service.finalisasiTender(1)).rejects.toThrow('PT B');
  });

  it('hanya memfinalkan round yang belum final', async () => {
    const { service, prisma, sphUpdate } = buatService({
      undanganList: [{ vendorId: 1, vendor: { namaVendor: 'PT A' } }, { vendorId: 2, vendor: { namaVendor: 'PT B' } }],
    });
    (prisma.tenderSPH.findFirst as jest.Mock)
      .mockResolvedValueOnce({ id: 1, hargaPenawaran: 1000, isFinal: true })
      .mockResolvedValueOnce({ id: 2, hargaPenawaran: 2000, isFinal: false });

    await service.finalisasiTender(1);

    expect(sphUpdate).toHaveBeenCalledTimes(1);
    expect(sphUpdate).toHaveBeenCalledWith({ where: { id: 2 }, data: { isFinal: true } });
  });
});

describe('EpromTenderService.tetapkanPemenang', () => {
  it('menolak kalau vendor belum punya SPH final berharga', async () => {
    const { service } = buatService({ roundTerakhir: null });

    await expect(service.tetapkanPemenang(1, 1)).rejects.toThrow('belum memiliki SPH final berharga');
  });

  it('reset pemenang lama, set pemenang baru, dan set status tender SELESAI', async () => {
    const { service, sphUpdateMany, sphUpdate, tenderUpdate } = buatService({
      roundTerakhir: { id: 10, isFinal: true, hargaPenawaran: 5000 },
    });

    await service.tetapkanPemenang(1, 1);

    expect(sphUpdateMany).toHaveBeenCalledWith({
      where: { tenderId: 1, statusPemenang: true },
      data: { statusPemenang: false },
    });
    expect(sphUpdate).toHaveBeenCalledWith({ where: { id: 10 }, data: { statusPemenang: true } });
    expect(tenderUpdate).toHaveBeenCalledWith({ where: { id: 1 }, data: { status: StatusTender.SELESAI } });
  });
});
