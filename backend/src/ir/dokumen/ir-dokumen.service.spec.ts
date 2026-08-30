import { BadRequestException, NotFoundException } from '@nestjs/common';
import { KategoriDokumenIr, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IrFileService } from '../common/ir-file.service';
import { AktorIr } from '../common/ir-aktor';
import { IrDokumenService } from './ir-dokumen.service';

function aktor(overrides: Partial<AktorIr> = {}): AktorIr {
  return { id: 1, nama: 'Budi', nrp: '12345', role: UserRole.KARYAWAN, ...overrides };
}

function dokumenFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, kategori: KategoriDokumenIr.SK, judul: 'SK 001', urlFile: 'ir/dokumen/a.pdf', ...overrides };
}

function buatService(overrides: { dokumen?: unknown; findMany?: unknown[]; create?: jest.Mock; deleteFn?: jest.Mock } = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const deleteFn = overrides.deleteFn ?? jest.fn().mockResolvedValue({});

  const prisma = {
    dokumenIr: {
      findMany: jest.fn().mockResolvedValue(overrides.findMany ?? []),
      findUnique: jest.fn().mockResolvedValue('dokumen' in overrides ? overrides.dokumen : dokumenFixture()),
      create,
      delete: deleteFn,
    },
  } as unknown as PrismaService;

  const file = {
    simpanDokumen: jest.fn().mockReturnValue('ir/dokumen/baru.pdf'),
    hapus: jest.fn(),
  } as unknown as IrFileService;

  const service = new IrDokumenService(prisma, file);

  return { service, prisma, file, create, deleteFn };
}

describe('IrDokumenService.daftar', () => {
  it('mengabaikan filter kategori yang tidak valid (menampilkan semua)', async () => {
    const { service, prisma } = buatService();

    await service.daftar('KATEGORI_NGASAL');

    expect(prisma.dokumenIr.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: undefined }));
  });

  it('menerapkan filter kategori yang valid', async () => {
    const { service, prisma } = buatService();

    await service.daftar('SK');

    expect(prisma.dokumenIr.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { kategori: KategoriDokumenIr.SK } }),
    );
  });
});

describe('IrDokumenService.unggah', () => {
  it('menolak kategori tidak valid', async () => {
    const { service } = buatService();

    await expect(service.unggah('SALAH', 'Judul', {} as any, aktor())).rejects.toThrow(
      'Kategori dokumen tidak valid',
    );
  });

  it('menolak judul kosong', async () => {
    const { service } = buatService();

    await expect(service.unggah('SK', '   ', {} as any, aktor())).rejects.toThrow('Judul dokumen wajib diisi');
  });

  it('berhasil upload dengan judul ter-trim', async () => {
    const { service, create } = buatService();
    const file = { originalname: 'sk.pdf' } as Express.Multer.File;

    await service.unggah('SK', '  SK 001  ', file, aktor());

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ kategori: 'SK', judul: 'SK 001', namaFile: 'sk.pdf', urlFile: 'ir/dokumen/baru.pdf' }),
      }),
    );
  });
});

describe('IrDokumenService.hapus', () => {
  it('melempar NotFoundException kalau dokumen tidak ada', async () => {
    const { service } = buatService({ dokumen: null });

    await expect(service.hapus(1)).rejects.toThrow(NotFoundException);
  });

  it('berhasil hapus dokumen dan file fisiknya', async () => {
    const { service, deleteFn, file } = buatService();

    const hasil = await service.hapus(1);

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(file.hapus).toHaveBeenCalledWith('ir/dokumen/a.pdf');
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});
