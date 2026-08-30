import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StatusApprovalEprom, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { AktorEprom } from '../common/eprom-aktor';
import { EpromFileService } from '../common/eprom-file.service';
import { EpromClosingService } from './eprom-closing.service';

function aktor(role: UserRole, overrides: Partial<AktorEprom> = {}): AktorEprom {
  return { id: 1, username: 'test', role, ...overrides };
}

function itemFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, projectId: 1, fileUrl: 'eprom/a.pdf', status: StatusApprovalEprom.PENDING, komentar: null, ...overrides };
}

function buatService(overrides: { item?: unknown; projectAkses?: unknown } = {}) {
  const modelFindMany = jest.fn().mockResolvedValue([]);
  const modelFindUnique = jest.fn().mockResolvedValue('item' in overrides ? overrides.item : itemFixture());
  const modelCreate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const modelUpdate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const modelDelete = jest.fn().mockResolvedValue({});
  const modelCount = jest.fn().mockResolvedValue(0);

  const sharedModel = { findMany: modelFindMany, findUnique: modelFindUnique, create: modelCreate, update: modelUpdate, delete: modelDelete, count: modelCount };

  const prisma = {
    asBuildDrawing: sharedModel,
    komisioning: sharedModel,
    serahTerima: sharedModel,
    masaPemeliharaanChecklist: sharedModel,
    bASerahTerima: sharedModel,
    project: { findUnique: jest.fn().mockResolvedValue('projectAkses' in overrides ? overrides.projectAkses : { kontrak: { vendorId: 1 } }) },
    $transaction: jest.fn((arg) => Promise.all(arg)),
  } as unknown as PrismaService;

  const akses = new EpromAksesService(prisma);
  const file = {
    simpanDokumen: jest.fn().mockReturnValue('eprom/project/1/closing/x.pdf'),
    hapus: jest.fn().mockReturnValue(true),
  } as unknown as EpromFileService;

  const service = new EpromClosingService(prisma, akses, file);

  return { service, prisma, akses, file, sharedModel };
}

describe('EpromClosingService.validasiTipe', () => {
  const service = buatService().service;

  it('menerima tipe valid', () => {
    expect(service.validasiTipe('komisioning')).toBe('komisioning');
  });

  it('menolak tipe tidak dikenal', () => {
    expect(() => service.validasiTipe('ngasal')).toThrow(BadRequestException);
  });
});

describe('EpromClosingService.buat', () => {
  it('menolak Vendor bukan pemilik project', async () => {
    const { service } = buatService({ projectAkses: { kontrak: { vendorId: 999 } } });

    await expect(service.buat(aktor(UserRole.VENDOR, { vendorId: 1 }), 'komisioning', 1)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('tanpa file membuat satu item dengan fileUrl null', async () => {
    const { service, sharedModel } = buatService();

    const hasil = await service.buat(aktor(UserRole.OWNER), 'komisioning', 1);

    expect(sharedModel.create).toHaveBeenCalledWith({ data: { projectId: 1, fileUrl: null } });
    expect(hasil).toHaveLength(1);
  });

  it('multi-file membuat satu item per file dalam satu transaksi', async () => {
    const { service, sharedModel } = buatService();
    const files = [{ originalname: 'a.pdf' }, { originalname: 'b.pdf' }] as Express.Multer.File[];

    const hasil = await service.buat(aktor(UserRole.OWNER), 'komisioning', 1, files);

    expect(sharedModel.create).toHaveBeenCalledTimes(2);
    expect(hasil).toHaveLength(2);
  });

  it('menghapus file yang sudah tersimpan kalau transaksi gagal', async () => {
    const { service, prisma, file } = buatService();
    (prisma.$transaction as jest.Mock).mockRejectedValue(new Error('DB error'));
    const files = [{ originalname: 'a.pdf' }, { originalname: 'b.pdf' }] as Express.Multer.File[];

    await expect(service.buat(aktor(UserRole.OWNER), 'komisioning', 1, files)).rejects.toThrow('DB error');
    expect(file.hapus).toHaveBeenCalledTimes(2);
  });
});

describe('EpromClosingService.review', () => {
  it('menolak role selain Owner', async () => {
    const { service } = buatService();

    await expect(service.review(aktor(UserRole.VENDOR), 'komisioning', 1, { status: 'APPROVED' } as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('melempar NotFoundException kalau item tidak ada', async () => {
    const { service } = buatService({ item: null });

    await expect(service.review(aktor(UserRole.OWNER), 'komisioning', 1, { status: 'APPROVED' } as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('menolak review ulang item yang sudah tidak PENDING', async () => {
    const { service } = buatService({ item: itemFixture({ status: StatusApprovalEprom.APPROVED }) });

    await expect(service.review(aktor(UserRole.OWNER), 'komisioning', 1, { status: 'REJECTED' } as any)).rejects.toThrow(
      'sudah direview sebelumnya',
    );
  });

  it('berhasil approve tanpa komentar (null)', async () => {
    const { service, sharedModel } = buatService();

    await service.review(aktor(UserRole.OWNER), 'komisioning', 1, { status: 'APPROVED' } as any);

    expect(sharedModel.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'APPROVED', komentar: null },
    });
  });

  it('berhasil reject dengan komentar ter-trim', async () => {
    const { service, sharedModel } = buatService();

    await service.review(aktor(UserRole.OWNER), 'komisioning', 1, { status: 'REJECTED', komentar: '  Kurang lengkap  ' } as any);

    expect(sharedModel.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'REJECTED', komentar: 'Kurang lengkap' },
    });
  });
});

describe('EpromClosingService.hapus', () => {
  it('melempar NotFoundException kalau item tidak ada', async () => {
    const { service } = buatService({ item: null });

    await expect(service.hapus(aktor(UserRole.OWNER), 'komisioning', 1)).rejects.toThrow(NotFoundException);
  });

  it('menolak hapus item yang sudah direview', async () => {
    const { service } = buatService({ item: itemFixture({ status: StatusApprovalEprom.APPROVED }) });

    await expect(service.hapus(aktor(UserRole.OWNER), 'komisioning', 1)).rejects.toThrow(
      'sudah direview tidak dapat dihapus',
    );
  });

  it('berhasil hapus item PENDING dan file fisiknya', async () => {
    const { service, sharedModel, file } = buatService();

    const hasil = await service.hapus(aktor(UserRole.OWNER), 'komisioning', 1);

    expect(sharedModel.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(file.hapus).toHaveBeenCalledWith('eprom/a.pdf');
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});

describe('EpromClosingService.ringkasanPending', () => {
  it('menghitung PENDING untuk kelima tipe closing', async () => {
    const { service, sharedModel } = buatService();
    sharedModel.count.mockResolvedValue(2);

    const hasil = await service.ringkasanPending(aktor(UserRole.OWNER), 1);

    expect(Object.keys(hasil)).toHaveLength(5);
    expect(hasil['as-build-drawing']).toBe(2);
  });
});
