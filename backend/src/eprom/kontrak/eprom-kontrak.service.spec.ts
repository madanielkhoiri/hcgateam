import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StatusTender } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromFileService } from '../common/eprom-file.service';
import { EpromKontrakService } from './eprom-kontrak.service';

function tenderSiapKontrakFixture(overrides: Partial<{ status: StatusTender; sph: unknown[]; kontrak: unknown }> = {}) {
  return {
    id: 1,
    status: overrides.status ?? StatusTender.SELESAI,
    sph: 'sph' in overrides ? overrides.sph : [{ vendorId: 9 }],
    kontrak: 'kontrak' in overrides ? overrides.kontrak : null,
  };
}

function buatService(overrides: {
  tenderSiapKontrak?: unknown;
  kontrakDetail?: unknown;
  hapusFindUnique?: unknown;
  create?: jest.Mock;
  update?: jest.Mock;
  deleteFn?: jest.Mock;
  projectCreate?: jest.Mock;
} = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const update = overrides.update ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const deleteFn = overrides.deleteFn ?? jest.fn().mockResolvedValue({});
  const projectCreate = overrides.projectCreate ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));

  const kontrakDetailFixture = 'kontrakDetail' in overrides
    ? overrides.kontrakDetail
    : { id: 1, tenderId: 1, tanggalMulai: new Date('2026-01-01'), tanggalSelesai: new Date('2026-06-01') };

  const prisma = {
    tenderProcess: {
      findUnique: jest.fn().mockResolvedValue('tenderSiapKontrak' in overrides ? overrides.tenderSiapKontrak : tenderSiapKontrakFixture()),
    },
    kontrak: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockImplementation(() =>
        Promise.resolve('hapusFindUnique' in overrides ? overrides.hapusFindUnique : kontrakDetailFixture),
      ),
      create,
      update,
      delete: deleteFn,
    },
    project: {
      create: projectCreate,
    },
  } as unknown as PrismaService;

  const file = {
    simpanDokumen: jest.fn().mockReturnValue('eprom/tender/1/kontrak/a.pdf'),
  } as unknown as EpromFileService;

  const service = new EpromKontrakService(prisma, file);

  return { service, prisma, file, create, update, deleteFn, projectCreate };
}

describe('EpromKontrakService.detail', () => {
  it('melempar NotFoundException kalau kontrak tidak ada', async () => {
    const { service } = buatService({ kontrakDetail: null });

    await expect(service.detail(1)).rejects.toThrow(NotFoundException);
  });
});

describe('EpromKontrakService.buat', () => {
  const dtoDasar = { tenderId: 1, nomorKontrak: '  KTR-001  ', tanggalMulai: '2026-01-01', tanggalSelesai: '2026-06-01' };

  it('melempar NotFoundException kalau tender tidak ada', async () => {
    const { service } = buatService({ tenderSiapKontrak: null });

    await expect(service.buat(dtoDasar as any)).rejects.toThrow(NotFoundException);
  });

  it('menolak kalau tender belum SELESAI', async () => {
    const { service } = buatService({ tenderSiapKontrak: tenderSiapKontrakFixture({ status: StatusTender.EVALUASI_SPH }) });

    await expect(service.buat(dtoDasar as any)).rejects.toThrow('belum memiliki pemenang');
  });

  it('menolak kalau tender SELESAI tapi tidak ada SPH pemenang', async () => {
    const { service } = buatService({ tenderSiapKontrak: tenderSiapKontrakFixture({ sph: [] }) });

    await expect(service.buat(dtoDasar as any)).rejects.toThrow('belum memiliki pemenang');
  });

  it('menolak kalau tender sudah punya Kontrak', async () => {
    const { service } = buatService({ tenderSiapKontrak: tenderSiapKontrakFixture({ kontrak: { id: 5 } }) });

    await expect(service.buat(dtoDasar as any)).rejects.toThrow('sudah dibuat');
  });

  it('menolak tanggal selesai sebelum tanggal mulai', async () => {
    const { service } = buatService();

    await expect(
      service.buat({ ...dtoDasar, tanggalMulai: '2026-06-01', tanggalSelesai: '2026-01-01' } as any),
    ).rejects.toThrow('tidak boleh sebelum Tanggal Mulai');
  });

  it('berhasil membuat kontrak dengan vendorId dari SPH pemenang, trim nomor', async () => {
    const { service, create } = buatService();

    await service.buat(dtoDasar as any);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ vendorId: 9, nomorKontrak: 'KTR-001', fileKontrak: null }),
      }),
    );
  });

  it('menyimpan file kontrak kalau diunggah', async () => {
    const { service, create, file } = buatService();
    const dummyFile = { originalname: 'a.pdf' } as Express.Multer.File;

    await service.buat(dtoDasar as any, dummyFile);

    expect(file.simpanDokumen).toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ fileKontrak: 'eprom/tender/1/kontrak/a.pdf' }) }),
    );
  });
});

describe('EpromKontrakService.ubah', () => {
  it('menolak tanggal selesai baru sebelum tanggal mulai lama (dto hanya kirim salah satu)', async () => {
    const { service } = buatService({
      kontrakDetail: { id: 1, tenderId: 1, tanggalMulai: new Date('2026-06-01'), tanggalSelesai: new Date('2026-06-01') },
    });

    await expect(service.ubah(1, { tanggalSelesai: '2026-01-01' } as any)).rejects.toThrow(
      'tidak boleh sebelum Tanggal Mulai',
    );
  });

  it('berhasil update hanya field yang dikirim', async () => {
    const { service, update } = buatService();

    await service.ubah(1, { nomorKontrak: '  KTR-002  ' } as any);

    expect(update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { nomorKontrak: 'KTR-002' },
    });
  });
});

describe('EpromKontrakService.hapus', () => {
  it('melempar NotFoundException kalau kontrak tidak ada', async () => {
    const { service } = buatService({ hapusFindUnique: null });

    await expect(service.hapus(1)).rejects.toThrow(NotFoundException);
  });

  it('menolak hapus kalau kontrak sudah membuka Project', async () => {
    const { service } = buatService({ hapusFindUnique: { id: 1, _count: { project: 2 } } });

    await expect(service.hapus(1)).rejects.toThrow('sudah membuka Project');
  });

  it('berhasil hapus kontrak yang belum membuka Project', async () => {
    const { service, deleteFn } = buatService({ hapusFindUnique: { id: 1, _count: { project: 0 } } });

    const hasil = await service.hapus(1);

    expect(deleteFn).toHaveBeenCalled();
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});

describe('EpromKontrakService.bukaProject', () => {
  it('melempar NotFoundException kalau kontrak tidak ada', async () => {
    const { service } = buatService({ kontrakDetail: null });

    await expect(service.bukaProject(1, { namaProject: 'Project A' } as any)).rejects.toThrow(NotFoundException);
  });

  it('berhasil membuat project dengan nama yang di-trim', async () => {
    const { service, projectCreate } = buatService();

    await service.bukaProject(1, { namaProject: '  Project A  ' } as any);

    expect(projectCreate).toHaveBeenCalledWith({
      data: { kontrakId: 1, namaProject: 'Project A' },
    });
  });
});
