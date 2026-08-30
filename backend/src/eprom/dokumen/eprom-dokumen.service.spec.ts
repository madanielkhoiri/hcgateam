import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { AktorEprom } from '../common/eprom-aktor';
import { EpromFileService } from '../common/eprom-file.service';
import { EpromDokumenService } from './eprom-dokumen.service';

function aktor(role: UserRole, overrides: Partial<AktorEprom> = {}): AktorEprom {
  return { id: 1, username: 'test', role, ...overrides };
}

function buatService(overrides: { item?: unknown; projectAkses?: unknown } = {}) {
  const create = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const deleteFn = jest.fn().mockResolvedValue({});

  const prisma = {
    dokumenSurat: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue('item' in overrides ? overrides.item : { id: 1, projectId: 1, fileUrl: 'eprom/a.pdf' }),
      create,
      delete: deleteFn,
    },
    project: { findUnique: jest.fn().mockResolvedValue('projectAkses' in overrides ? overrides.projectAkses : { kontrak: { vendorId: 1 } }) },
  } as unknown as PrismaService;

  const akses = new EpromAksesService(prisma);
  const file = {
    simpanDokumen: jest.fn().mockReturnValue('eprom/project/1/dokumen/surat_teguran/x.pdf'),
    hapus: jest.fn().mockReturnValue(true),
  } as unknown as EpromFileService;

  const service = new EpromDokumenService(prisma, akses, file);

  return { service, create, deleteFn, file };
}

describe('EpromDokumenService.validasiTipe', () => {
  const service = buatService().service;

  it('menerima tipe valid', () => {
    expect(service.validasiTipe('MEMO')).toBe('MEMO');
  });

  it('menolak tipe tidak dikenal', () => {
    expect(() => service.validasiTipe('NGASAL')).toThrow(BadRequestException);
  });
});

describe('EpromDokumenService.buat', () => {
  it('menolak Vendor bukan pemilik project', async () => {
    const { service } = buatService({ projectAkses: { kontrak: { vendorId: 999 } } });

    await expect(
      service.buat(aktor(UserRole.VENDOR, { vendorId: 1 }), { projectId: 1, tipe: 'MEMO', tanggal: '2026-01-05' } as any),
    ).rejects.toThrow(ForbiddenException);
  });

  it('menyimpan file ke folder sesuai tipe (lowercase)', async () => {
    const { service, create, file } = buatService();
    const dummyFile = { originalname: 'a.pdf' } as Express.Multer.File;

    await service.buat(aktor(UserRole.OWNER), { projectId: 1, tipe: 'SURAT_TEGURAN', tanggal: '2026-01-05' } as any, dummyFile);

    expect(file.simpanDokumen).toHaveBeenCalledWith(dummyFile, 'project/1/dokumen/surat_teguran');
    expect(create).toHaveBeenCalledWith({
      data: { projectId: 1, tipe: 'SURAT_TEGURAN', fileUrl: 'eprom/project/1/dokumen/surat_teguran/x.pdf', tanggal: new Date('2026-01-05') },
    });
  });

  it('berhasil tanpa file (fileUrl null)', async () => {
    const { service, create } = buatService();

    await service.buat(aktor(UserRole.OWNER), { projectId: 1, tipe: 'MEMO', tanggal: '2026-01-05' } as any);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ fileUrl: null }) }));
  });
});

describe('EpromDokumenService.hapus', () => {
  it('melempar NotFoundException kalau dokumen tidak ada', async () => {
    const { service } = buatService({ item: null });

    await expect(service.hapus(aktor(UserRole.OWNER), 1)).rejects.toThrow(NotFoundException);
  });

  it('menolak Vendor bukan pemilik project', async () => {
    const { service } = buatService({ projectAkses: { kontrak: { vendorId: 999 } } });

    await expect(service.hapus(aktor(UserRole.VENDOR, { vendorId: 1 }), 1)).rejects.toThrow(ForbiddenException);
  });

  it('berhasil hapus dokumen dan file fisiknya', async () => {
    const { service, deleteFn, file } = buatService();

    const hasil = await service.hapus(aktor(UserRole.OWNER), 1);

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(file.hapus).toHaveBeenCalledWith('eprom/a.pdf');
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});
