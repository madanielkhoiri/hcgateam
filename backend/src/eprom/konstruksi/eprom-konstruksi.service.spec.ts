import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StatusApprovalEprom, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { AktorEprom } from '../common/eprom-aktor';
import { EpromFileService } from '../common/eprom-file.service';
import { EpromKonstruksiService } from './eprom-konstruksi.service';

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
    checklistKonstruksi: sharedModel,
    iBPR: sharedModel,
    jSA: sharedModel,
    project: { findUnique: jest.fn().mockResolvedValue('projectAkses' in overrides ? overrides.projectAkses : { kontrak: { vendorId: 1 } }) },
  } as unknown as PrismaService;

  const akses = new EpromAksesService(prisma);
  const file = {
    simpanDokumen: jest.fn().mockReturnValue('eprom/project/1/konstruksi/x.pdf'),
    hapus: jest.fn().mockReturnValue(true),
  } as unknown as EpromFileService;

  const service = new EpromKonstruksiService(prisma, akses, file);

  return { service, prisma, akses, file, sharedModel };
}

describe('EpromKonstruksiService.validasiTipe', () => {
  const service = buatService().service;

  it('menerima tipe valid', () => {
    expect(service.validasiTipe('ibpr')).toBe('ibpr');
  });

  it('menolak tipe tidak dikenal', () => {
    expect(() => service.validasiTipe('ngasal')).toThrow(BadRequestException);
  });
});

describe('EpromKonstruksiService.buat', () => {
  it('menolak Vendor bukan pemilik project', async () => {
    const { service } = buatService({ projectAkses: { kontrak: { vendorId: 999 } } });

    await expect(service.buat(aktor(UserRole.VENDOR, { vendorId: 1 }), 'ibpr', 1, {} as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('menolak checklist-tahapan tanpa nama', async () => {
    const { service } = buatService();

    await expect(service.buat(aktor(UserRole.OWNER), 'checklist-tahapan', 1, {} as any)).rejects.toThrow(
      'Nama wajib diisi untuk Checklist Tahapan Pekerjaan',
    );
  });

  it('tidak mewajibkan nama untuk ibpr (tanpa field nama)', async () => {
    const { service, sharedModel } = buatService();

    await service.buat(aktor(UserRole.OWNER), 'ibpr', 1, {} as any);

    expect(sharedModel.create).toHaveBeenCalledWith({ data: { projectId: 1, fileUrl: null } });
  });

  it('berhasil membuat jsa dengan namaPekerjaan ter-trim dan fileUrl', async () => {
    const { service, sharedModel, file } = buatService();
    const dummyFile = { originalname: 'a.pdf' } as Express.Multer.File;

    await service.buat(aktor(UserRole.OWNER), 'jsa', 1, { nama: '  Pekerjaan A  ' } as any, dummyFile);

    expect(file.simpanDokumen).toHaveBeenCalled();
    expect(sharedModel.create).toHaveBeenCalledWith({
      data: { projectId: 1, fileUrl: 'eprom/project/1/konstruksi/x.pdf', namaPekerjaan: 'Pekerjaan A' },
    });
  });
});

describe('EpromKonstruksiService.review', () => {
  it('menolak role selain Owner', async () => {
    const { service } = buatService();

    await expect(service.review(aktor(UserRole.VENDOR), 'ibpr', 1, { status: 'APPROVED' } as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('melempar NotFoundException kalau item tidak ada', async () => {
    const { service } = buatService({ item: null });

    await expect(service.review(aktor(UserRole.OWNER), 'ibpr', 1, { status: 'APPROVED' } as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('menolak review ulang item yang sudah tidak PENDING', async () => {
    const { service } = buatService({ item: itemFixture({ status: StatusApprovalEprom.REJECTED }) });

    await expect(service.review(aktor(UserRole.OWNER), 'ibpr', 1, { status: 'APPROVED' } as any)).rejects.toThrow(
      'sudah direview sebelumnya',
    );
  });

  it('berhasil approve dengan komentar kosong menjadi null', async () => {
    const { service, sharedModel } = buatService();

    await service.review(aktor(UserRole.OWNER), 'ibpr', 1, { status: 'APPROVED', komentar: '   ' } as any);

    expect(sharedModel.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'APPROVED', komentar: null },
    });
  });
});

describe('EpromKonstruksiService.hapus', () => {
  it('melempar NotFoundException kalau item tidak ada', async () => {
    const { service } = buatService({ item: null });

    await expect(service.hapus(aktor(UserRole.OWNER), 'ibpr', 1)).rejects.toThrow(NotFoundException);
  });

  it('menolak hapus item yang sudah direview', async () => {
    const { service } = buatService({ item: itemFixture({ status: StatusApprovalEprom.APPROVED }) });

    await expect(service.hapus(aktor(UserRole.OWNER), 'ibpr', 1)).rejects.toThrow(
      'sudah direview tidak dapat dihapus',
    );
  });

  it('berhasil hapus item PENDING dan file fisiknya', async () => {
    const { service, sharedModel, file } = buatService();

    const hasil = await service.hapus(aktor(UserRole.OWNER), 'ibpr', 1);

    expect(sharedModel.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(file.hapus).toHaveBeenCalledWith('eprom/a.pdf');
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});

describe('EpromKonstruksiService.ringkasanPending', () => {
  it('menghitung PENDING untuk ketiga tipe konstruksi', async () => {
    const { service, sharedModel } = buatService();
    sharedModel.count.mockResolvedValue(1);

    const hasil = await service.ringkasanPending(aktor(UserRole.OWNER), 1);

    expect(Object.keys(hasil)).toHaveLength(3);
    expect(hasil.jsa).toBe(1);
  });
});
