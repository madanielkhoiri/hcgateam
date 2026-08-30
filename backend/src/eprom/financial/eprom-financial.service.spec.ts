import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StatusApprovalEprom, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { AktorEprom } from '../common/eprom-aktor';
import { EpromFileService } from '../common/eprom-file.service';
import { EpromFinancialService } from './eprom-financial.service';

function aktor(role: UserRole, overrides: Partial<AktorEprom> = {}): AktorEprom {
  return { id: 1, username: 'test', role, ...overrides };
}

function itemFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, projectId: 1, progressPersen: 50, fileUrl: 'eprom/a.pdf', status: StatusApprovalEprom.PENDING, komentar: null, ...overrides };
}

function buatService(overrides: { item?: unknown; projectAkses?: unknown } = {}) {
  const create = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const update = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const deleteFn = jest.fn().mockResolvedValue({});
  const count = jest.fn().mockResolvedValue(0);

  const prisma = {
    opnamePekerjaan: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue('item' in overrides ? overrides.item : itemFixture()),
      create,
      update,
      delete: deleteFn,
      count,
    },
    project: { findUnique: jest.fn().mockResolvedValue('projectAkses' in overrides ? overrides.projectAkses : { kontrak: { vendorId: 1 } }) },
  } as unknown as PrismaService;

  const akses = new EpromAksesService(prisma);
  const file = {
    simpanDokumen: jest.fn().mockReturnValue('eprom/project/1/financial/opname/x.pdf'),
    hapus: jest.fn().mockReturnValue(true),
  } as unknown as EpromFileService;

  const service = new EpromFinancialService(prisma, akses, file);

  return { service, create, update, deleteFn, count, file };
}

describe('EpromFinancialService.buat', () => {
  it('menolak Vendor bukan pemilik project', async () => {
    const { service } = buatService({ projectAkses: { kontrak: { vendorId: 999 } } });

    await expect(
      service.buat(aktor(UserRole.VENDOR, { vendorId: 1 }), { projectId: 1, progressPersen: 50 } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('berhasil membuat opname tanpa file', async () => {
    const { service, create } = buatService();

    await service.buat(aktor(UserRole.OWNER), { projectId: 1, progressPersen: 75 } as any);

    expect(create).toHaveBeenCalledWith({ data: { projectId: 1, progressPersen: 75, fileUrl: null } });
  });

  it('berhasil membuat opname dengan file', async () => {
    const { service, create, file } = buatService();
    const dummyFile = { originalname: 'a.pdf' } as Express.Multer.File;

    await service.buat(aktor(UserRole.OWNER), { projectId: 1, progressPersen: 75 } as any, dummyFile);

    expect(file.simpanDokumen).toHaveBeenCalled();
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ fileUrl: 'eprom/project/1/financial/opname/x.pdf' }) }),
    );
  });
});

describe('EpromFinancialService.review', () => {
  it('menolak role selain Owner', async () => {
    const { service } = buatService();

    await expect(service.review(aktor(UserRole.VENDOR), 1, { status: 'APPROVED' } as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('melempar NotFoundException kalau item tidak ada', async () => {
    const { service } = buatService({ item: null });

    await expect(service.review(aktor(UserRole.OWNER), 1, { status: 'APPROVED' } as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('menolak review ulang item yang sudah tidak PENDING', async () => {
    const { service } = buatService({ item: itemFixture({ status: StatusApprovalEprom.APPROVED }) });

    await expect(service.review(aktor(UserRole.OWNER), 1, { status: 'REJECTED' } as any)).rejects.toThrow(
      'sudah direview sebelumnya',
    );
  });

  it('berhasil review dengan komentar ter-trim', async () => {
    const { service, update } = buatService();

    await service.review(aktor(UserRole.OWNER), 1, { status: 'REJECTED', komentar: '  Data kurang  ' } as any);

    expect(update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'REJECTED', komentar: 'Data kurang' },
    });
  });
});

describe('EpromFinancialService.hapus', () => {
  it('melempar NotFoundException kalau item tidak ada', async () => {
    const { service } = buatService({ item: null });

    await expect(service.hapus(aktor(UserRole.OWNER), 1)).rejects.toThrow(NotFoundException);
  });

  it('menolak hapus item yang sudah direview', async () => {
    const { service } = buatService({ item: itemFixture({ status: StatusApprovalEprom.APPROVED }) });

    await expect(service.hapus(aktor(UserRole.OWNER), 1)).rejects.toThrow('sudah direview tidak dapat dihapus');
  });

  it('berhasil hapus item PENDING dan file fisiknya', async () => {
    const { service, deleteFn, file } = buatService();

    const hasil = await service.hapus(aktor(UserRole.OWNER), 1);

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(file.hapus).toHaveBeenCalledWith('eprom/a.pdf');
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});

describe('EpromFinancialService.ringkasanPending', () => {
  it('mengembalikan jumlah PENDING dengan key opname-pekerjaan', async () => {
    const { service, count } = buatService();
    count.mockResolvedValue(3);

    const hasil = await service.ringkasanPending(aktor(UserRole.OWNER), 1);

    expect(hasil).toEqual({ 'opname-pekerjaan': 3 });
  });
});
