import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { AktorEprom } from '../common/eprom-aktor';
import { EpromFileService } from '../common/eprom-file.service';
import { EpromSosialisasiJsaService } from './eprom-sosialisasi-jsa.service';

function aktor(role: UserRole, overrides: Partial<AktorEprom> = {}): AktorEprom {
  return { id: 1, username: 'test', role, ...overrides };
}

function buatService(overrides: { jsa?: unknown; projectAkses?: unknown; upsert?: jest.Mock } = {}) {
  const upsert = overrides.upsert ?? jest.fn(({ create, update }) => Promise.resolve({ id: 1, ...create, ...update }));

  const prisma = {
    jSA: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue('jsa' in overrides ? overrides.jsa : { id: 1, projectId: 1, sosialisasi: null }),
    },
    sosialisasiJSA: { upsert },
    project: { findUnique: jest.fn().mockResolvedValue('projectAkses' in overrides ? overrides.projectAkses : { kontrak: { vendorId: 1 } }) },
  } as unknown as PrismaService;

  const akses = new EpromAksesService(prisma);
  const file = {
    simpanDokumen: jest.fn().mockReturnValue('eprom/project/1/sosialisasi-jsa/baru.pdf'),
    hapus: jest.fn().mockReturnValue(true),
  } as unknown as EpromFileService;

  const service = new EpromSosialisasiJsaService(prisma, akses, file);

  return { service, upsert, file };
}

describe('EpromSosialisasiJsaService.unggah', () => {
  it('menolak tanpa file', async () => {
    const { service } = buatService();

    await expect(service.unggah(aktor(UserRole.OWNER), 1)).rejects.toThrow('File wajib diunggah');
  });

  it('melempar NotFoundException kalau JSA tidak ada', async () => {
    const { service } = buatService({ jsa: null });
    const dummyFile = { originalname: 'a.pdf' } as Express.Multer.File;

    await expect(service.unggah(aktor(UserRole.OWNER), 1, dummyFile)).rejects.toThrow(NotFoundException);
  });

  it('menolak Vendor bukan pemilik project JSA tersebut', async () => {
    const { service } = buatService({ projectAkses: { kontrak: { vendorId: 999 } } });
    const dummyFile = { originalname: 'a.pdf' } as Express.Multer.File;

    await expect(service.unggah(aktor(UserRole.VENDOR, { vendorId: 1 }), 1, dummyFile)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('upsert membuat slot baru kalau belum pernah ada sosialisasi', async () => {
    const { service, upsert, file } = buatService({ jsa: { id: 1, projectId: 1, sosialisasi: null } });
    const dummyFile = { originalname: 'a.pdf' } as Express.Multer.File;

    await service.unggah(aktor(UserRole.OWNER), 1, dummyFile);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { jsaId: 1 }, create: expect.objectContaining({ jsaId: 1, fileUrl: 'eprom/project/1/sosialisasi-jsa/baru.pdf' }) }),
    );
    expect(file.hapus).not.toHaveBeenCalled();
  });

  it('replace: menghapus file lama setelah upsert berhasil menyimpan file baru', async () => {
    const { service, upsert, file } = buatService({
      jsa: { id: 1, projectId: 1, sosialisasi: { fileUrl: 'eprom/project/1/sosialisasi-jsa/lama.pdf' } },
    });
    const dummyFile = { originalname: 'a.pdf' } as Express.Multer.File;

    await service.unggah(aktor(UserRole.OWNER), 1, dummyFile);

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ update: expect.objectContaining({ fileUrl: 'eprom/project/1/sosialisasi-jsa/baru.pdf' }) }),
    );
    expect(file.hapus).toHaveBeenCalledWith('eprom/project/1/sosialisasi-jsa/lama.pdf');
  });
});
