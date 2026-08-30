import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { AktorEprom } from '../common/eprom-aktor';
import { EpromFileService } from '../common/eprom-file.service';
import { EpromProgressService } from './eprom-progress.service';

function aktor(role: UserRole, overrides: Partial<AktorEprom> = {}): AktorEprom {
  return { id: 1, username: 'test', role, ...overrides };
}

function buatService(overrides: {
  projectAkses?: unknown;
  items?: unknown[];
  itemDetail?: unknown;
  progressMingguan?: unknown[];
} = {}) {
  const modelFindMany = jest.fn().mockResolvedValue(overrides.items ?? []);
  const modelFindUnique = jest.fn().mockResolvedValue('itemDetail' in overrides ? overrides.itemDetail : { id: 1, projectId: 1, fileUrl: 'eprom/a.pdf' });
  const modelCreate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const modelDelete = jest.fn().mockResolvedValue({});
  const modelCount = jest.fn().mockResolvedValue(0);

  const sharedModel = {
    findMany: modelFindMany,
    findUnique: modelFindUnique,
    create: modelCreate,
    delete: modelDelete,
    count: modelCount,
  };

  const progressMingguanFindMany = jest.fn().mockResolvedValue(overrides.progressMingguan ?? []);

  const prisma = {
    inspeksiAreaPekerjaan: sharedModel,
    inspeksiPeralatan: sharedModel,
    progressHarian: sharedModel,
    progressMingguan: { ...sharedModel, findMany: progressMingguanFindMany },
    progressBulanan: sharedModel,
    tTA: sharedModel,
    kTA: sharedModel,
    project: {
      findUnique: jest.fn().mockResolvedValue('projectAkses' in overrides ? overrides.projectAkses : { kontrak: { vendorId: 1 } }),
    },
  } as unknown as PrismaService;

  const akses = new EpromAksesService(prisma);
  const file = {
    simpanDokumen: jest.fn().mockReturnValue('eprom/project/1/progress/a.pdf'),
    hapus: jest.fn().mockReturnValue(true),
  } as unknown as EpromFileService;

  const service = new EpromProgressService(prisma, akses, file);

  return { service, prisma, akses, file, sharedModel, progressMingguanFindMany };
}

describe('EpromProgressService.validasiTipe', () => {
  const service = buatService().service;

  it('menerima tipe valid', () => {
    expect(service.validasiTipe('tta')).toBe('tta');
  });

  it('menolak tipe tidak dikenal', () => {
    expect(() => service.validasiTipe('ngasal')).toThrow(BadRequestException);
  });
});

describe('EpromProgressService.jamUpload', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-05T01:00:00Z')); // 09:00 WITA
  });
  afterEach(() => jest.useRealTimers());

  it('tta tidak dibatasi jam sama sekali', () => {
    const { service } = buatService();
    const hasil = service.jamUpload(aktor(UserRole.VENDOR), 'tta');

    expect(hasil.dibatasi).toBe(false);
    expect(hasil.bukaSekarang).toBe(true);
  });

  it('Vendor dalam jam buka: bukaSekarang true, bebasSebagaiOwner false', () => {
    const { service } = buatService();
    const hasil = service.jamUpload(aktor(UserRole.VENDOR), 'inspeksi-area');

    expect(hasil.bukaSekarang).toBe(true);
    expect(hasil.bebasSebagaiOwner).toBe(false);
  });

  it('Vendor di luar jam buka (23:00 WITA): bukaSekarang false', () => {
    jest.setSystemTime(new Date('2026-01-05T15:00:00Z')); // 23:00 WITA
    const { service } = buatService();
    const hasil = service.jamUpload(aktor(UserRole.VENDOR), 'inspeksi-area');

    expect(hasil.bukaSekarang).toBe(false);
  });

  it('Owner tetap bukaSekarang true di luar jam, ditandai bebasSebagaiOwner', () => {
    jest.setSystemTime(new Date('2026-01-05T15:00:00Z')); // 23:00 WITA
    const { service } = buatService();
    const hasil = service.jamUpload(aktor(UserRole.OWNER), 'inspeksi-area');

    expect(hasil.bukaSekarang).toBe(true);
    expect(hasil.bebasSebagaiOwner).toBe(true);
  });
});

describe('EpromProgressService.daftar', () => {
  it('menghitung deviasi & status hanya untuk progress-mingguan', async () => {
    const { service } = buatService({
      progressMingguan: [{ id: 1, planned: 50, actual: 45 }],
    });

    const [hasil] = await service.daftar(aktor(UserRole.OWNER), 'progress-mingguan', 1);

    expect(hasil.deviasi).toBe(-5);
    expect(hasil.status).toBe('WASPADA');
  });

  it('tipe selain progress-mingguan dikembalikan apa adanya', async () => {
    const { service } = buatService({ items: [{ id: 1, fileUrl: 'a.pdf' }] });

    const hasil = await service.daftar(aktor(UserRole.OWNER), 'tta', 1);

    expect(hasil).toEqual([{ id: 1, fileUrl: 'a.pdf' }]);
  });

  it('menolak Vendor yang bukan pemilik project', async () => {
    const { service } = buatService({ projectAkses: { kontrak: { vendorId: 999 } } });

    await expect(service.daftar(aktor(UserRole.VENDOR, { vendorId: 1 }), 'tta', 1)).rejects.toThrow(
      ForbiddenException,
    );
  });
});

describe('EpromProgressService.buat', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-05T01:00:00Z')); // 09:00 WITA
  });
  afterEach(() => jest.useRealTimers());

  it('progress-mingguan menolak tanpa namaPekerjaan', async () => {
    const { service } = buatService();

    await expect(
      service.buat(aktor(UserRole.OWNER), 'progress-mingguan', 1, { planned: 10, actual: 10 } as any),
    ).rejects.toThrow('Nama Pekerjaan wajib diisi');
  });

  it('progress-mingguan menolak tanpa planned/actual', async () => {
    const { service } = buatService();

    await expect(
      service.buat(aktor(UserRole.OWNER), 'progress-mingguan', 1, { namaPekerjaan: 'A' } as any),
    ).rejects.toThrow('Planned dan Actual wajib diisi');
  });

  it('tipe selain progress-mingguan menolak tanpa file', async () => {
    const { service } = buatService();

    await expect(service.buat(aktor(UserRole.OWNER), 'inspeksi-area', 1, {} as any)).rejects.toThrow(
      'File wajib diunggah',
    );
  });

  it('menolak Vendor upload di luar jam WITA', async () => {
    jest.setSystemTime(new Date('2026-01-05T15:00:00Z')); // 23:00 WITA
    const { service } = buatService();
    const file = { originalname: 'a.jpg' } as Express.Multer.File;

    await expect(service.buat(aktor(UserRole.VENDOR, { vendorId: 1 }), 'inspeksi-area', 1, {} as any, file)).rejects.toThrow(
      'hanya dibuka pukul',
    );
  });

  it('Owner boleh upload di luar jam WITA', async () => {
    jest.setSystemTime(new Date('2026-01-05T15:00:00Z')); // 23:00 WITA
    const { service, sharedModel } = buatService();
    const file = { originalname: 'a.jpg' } as Express.Multer.File;

    await service.buat(aktor(UserRole.OWNER), 'inspeksi-area', 1, {} as any, file);

    expect(sharedModel.create).toHaveBeenCalled();
  });

  it('progress-harian menyimpan tanggal hari ini WITA', async () => {
    const { service, sharedModel } = buatService();
    const file = { originalname: 'a.jpg' } as Express.Multer.File;

    await service.buat(aktor(UserRole.OWNER), 'progress-harian', 1, {} as any, file);

    expect(sharedModel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tanggal: new Date('2026-01-05T00:00:00Z') }),
    });
  });

  it('progress-bulanan/tta/kta menyimpan bulan WITA berjalan', async () => {
    const { service, sharedModel } = buatService();

    await service.buat(aktor(UserRole.OWNER), 'tta', 1, {} as any, { originalname: 'a.jpg' } as Express.Multer.File);

    expect(sharedModel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ bulan: '2026-01' }),
    });
  });

  it('progress-mingguan berhasil menyimpan nama ter-trim, planned, actual, mingguKe', async () => {
    const { service, sharedModel } = buatService();

    await service.buat(aktor(UserRole.OWNER), 'progress-mingguan', 1, { namaPekerjaan: '  Pekerjaan A  ', planned: 40, actual: 35 } as any);

    expect(sharedModel.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ namaPekerjaan: 'Pekerjaan A', planned: 40, actual: 35, mingguKe: expect.any(Number) }),
    });
  });
});

describe('EpromProgressService.hapus', () => {
  it('melempar NotFoundException kalau item tidak ada', async () => {
    const { service } = buatService({ itemDetail: null });

    await expect(service.hapus(aktor(UserRole.OWNER), 'tta', 1)).rejects.toThrow(NotFoundException);
  });

  it('menolak Vendor bukan pemilik project item', async () => {
    const { service } = buatService({ projectAkses: { kontrak: { vendorId: 999 } } });

    await expect(service.hapus(aktor(UserRole.VENDOR, { vendorId: 1 }), 'tta', 1)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('berhasil hapus item dan file fisiknya', async () => {
    const { service, sharedModel, file } = buatService();

    const hasil = await service.hapus(aktor(UserRole.OWNER), 'tta', 1);

    expect(sharedModel.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(file.hapus).toHaveBeenCalledWith('eprom/a.pdf');
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});

describe('EpromProgressService.progresFisikProject', () => {
  it('mengembalikan null kalau belum ada data progress mingguan', async () => {
    const { service } = buatService({ progressMingguan: [] });

    const hasil = await service.progresFisikProject(1);

    expect(hasil).toBeNull();
  });

  it('menjumlahkan actual TERBARU per nama pekerjaan (bukan rata-rata)', async () => {
    const { service } = buatService({
      progressMingguan: [
        { namaPekerjaan: 'A', actual: 60 },
        { namaPekerjaan: 'B', actual: 30 },
        { namaPekerjaan: 'A', actual: 40 },
      ],
    });

    const hasil = await service.progresFisikProject(1);

    expect(hasil).toBe(90);
  });
});

describe('EpromProgressService.trendMingguan', () => {
  it('mengelompokkan rata-rata actual per bulan WITA, terurut menaik', async () => {
    const { service } = buatService({
      progressMingguan: [
        { uploadedAt: new Date('2026-02-01T01:00:00Z'), actual: 50 },
        { uploadedAt: new Date('2026-01-15T01:00:00Z'), actual: 20 },
        { uploadedAt: new Date('2026-01-20T01:00:00Z'), actual: 30 },
      ],
    });

    const hasil = await service.trendMingguan(1);

    expect(hasil).toEqual([
      { bulan: '2026-01', actual: 25 },
      { bulan: '2026-02', actual: 50 },
    ]);
  });
});

describe('EpromProgressService.progresMingguanTerbaru', () => {
  it('mengambil baris terbaru per pekerjaan dengan deviasi & status', async () => {
    const { service } = buatService({
      progressMingguan: [{ id: 1, namaPekerjaan: 'A', planned: 50, actual: 60 }],
    });

    const [hasil] = await service.progresMingguanTerbaru(aktor(UserRole.OWNER), 1);

    expect(hasil.deviasi).toBe(10);
    expect(hasil.status).toBe('ON_TRACK');
  });
});

describe('EpromProgressService.performaBulanIni', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-01-05T01:00:00Z'));
  });
  afterEach(() => jest.useRealTimers());

  it('persen dihitung dari target 8 upload/bulan, dibatasi maksimal 100', async () => {
    const { service, sharedModel } = buatService();
    sharedModel.count.mockResolvedValue(4);

    const hasil = await service.performaBulanIni(aktor(UserRole.OWNER), 'tta', 1);

    expect(hasil).toEqual({ bulan: '2026-01', jumlah: 4, target: 8, persen: 50 });
  });

  it('persen tidak melebihi 100 walau jumlah melebihi target', async () => {
    const { service, sharedModel } = buatService();
    sharedModel.count.mockResolvedValue(20);

    const hasil = await service.performaBulanIni(aktor(UserRole.OWNER), 'kta', 1);

    expect(hasil.persen).toBe(100);
  });
});
