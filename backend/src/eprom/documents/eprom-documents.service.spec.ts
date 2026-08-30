import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ScopeDocumentFolder, TipeFileEprom, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { AktorEprom } from '../common/eprom-aktor';
import { EpromFileService } from '../common/eprom-file.service';
import { EpromDocumentsService } from './eprom-documents.service';

function aktor(role: UserRole, overrides: Partial<AktorEprom> = {}): AktorEprom {
  return { id: 1, username: 'test', role, ...overrides };
}

function folderTenderFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, scope: ScopeDocumentFolder.TENDER_DOKUMEN, tenderId: 5, vendorId: null, namaFolder: 'Folder A', parentFolderId: null, ...overrides };
}

function folderVendorFixture(overrides: Record<string, unknown> = {}) {
  return { id: 2, scope: ScopeDocumentFolder.LEGALITAS_VENDOR, tenderId: null, vendorId: 9, namaFolder: 'Folder Vendor', parentFolderId: null, ...overrides };
}

function buatService(overrides: {
  folder?: unknown;
  folderCreate?: jest.Mock;
  folderUpdate?: jest.Mock;
  folderDelete?: jest.Mock;
  folderFindMany?: unknown[];
  subfolderFindMany?: unknown[];
  fileFindMany?: unknown[];
  fileUploadDetail?: unknown;
  fileUploadCreate?: jest.Mock;
  fileUploadDelete?: jest.Mock;
} = {}) {
  const folderCreate = overrides.folderCreate ?? jest.fn(({ data }) => Promise.resolve({ id: 10, ...data }));
  const folderUpdate = overrides.folderUpdate ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const folderDelete = overrides.folderDelete ?? jest.fn().mockResolvedValue({});
  const fileUploadCreate = overrides.fileUploadCreate ?? jest.fn(({ data }) => Promise.resolve({ id: 100, ...data }));
  const fileUploadDelete = overrides.fileUploadDelete ?? jest.fn().mockResolvedValue({});

  let documentFolderFindManyCallCount = 0;
  const documentFolderFindMany = jest.fn().mockImplementation(({ where }: any) => {
    documentFolderFindManyCallCount += 1;
    if (where?.parentFolderId !== undefined && where.parentFolderId !== null) {
      return Promise.resolve(overrides.subfolderFindMany ?? []);
    }
    return Promise.resolve(overrides.folderFindMany ?? []);
  });

  const fileUploadFindMany = jest.fn().mockResolvedValue(overrides.fileFindMany ?? []);

  const prisma = {
    documentFolder: {
      findUnique: jest.fn().mockResolvedValue('folder' in overrides ? overrides.folder : folderTenderFixture()),
      findMany: documentFolderFindMany,
      create: folderCreate,
      update: folderUpdate,
      delete: folderDelete,
    },
    fileUpload: {
      findUnique: jest.fn().mockResolvedValue('fileUploadDetail' in overrides ? overrides.fileUploadDetail : { id: 100, urlFile: 'eprom/tender/5/a.pdf', folder: folderTenderFixture() }),
      findMany: fileUploadFindMany,
      create: fileUploadCreate,
      delete: fileUploadDelete,
    },
  } as unknown as PrismaService;

  const akses = new EpromAksesService(prisma);
  const file = {
    tebakTipe: jest.fn().mockReturnValue(TipeFileEprom.PDF),
    simpan: jest.fn().mockReturnValue('eprom/tender/5/a.pdf'),
    resolveAbsolut: jest.fn().mockReturnValue('/abs/eprom/tender/5/a.pdf'),
    hapus: jest.fn().mockReturnValue(true),
  } as unknown as EpromFileService;

  const service = new EpromDocumentsService(prisma, akses, file);

  return { service, prisma, file, folderCreate, folderUpdate, folderDelete, fileUploadCreate, fileUploadDelete };
}

describe('EpromDocumentsService.isiFolder — akses per scope', () => {
  it('TENDER_DOKUMEN hanya boleh diakses Owner', async () => {
    const { service } = buatService();

    await expect(
      service.isiFolder(aktor(UserRole.VENDOR, { vendorId: 1 }), { scope: ScopeDocumentFolder.TENDER_DOKUMEN, tenderId: 5 }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('LEGALITAS_VENDOR tanpa vendorId hanya boleh Owner', async () => {
    const { service } = buatService();

    await expect(
      service.isiFolder(aktor(UserRole.VENDOR, { vendorId: 1 }), { scope: ScopeDocumentFolder.LEGALITAS_VENDOR }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('LEGALITAS_VENDOR dengan vendorId menolak Vendor lain', async () => {
    const { service } = buatService();

    await expect(
      service.isiFolder(aktor(UserRole.VENDOR, { vendorId: 1 }), { scope: ScopeDocumentFolder.LEGALITAS_VENDOR, vendorId: 9 }),
    ).rejects.toThrow('Akun Vendor hanya dapat mengelola datanya sendiri');
  });

  it('LEGALITAS_VENDOR mengizinkan Vendor pemilik vendorId tersebut', async () => {
    const { service } = buatService({ folderFindMany: [folderVendorFixture()] });

    const hasil = await service.isiFolder(aktor(UserRole.VENDOR, { vendorId: 9 }), {
      scope: ScopeDocumentFolder.LEGALITAS_VENDOR,
      vendorId: 9,
    });

    expect(hasil.folders).toEqual([folderVendorFixture()]);
  });

  it('menyertakan daftar file hanya kalau parentFolderId diberikan', async () => {
    const { service, prisma } = buatService({ fileFindMany: [{ id: 1 }] });

    const hasil = await service.isiFolder(aktor(UserRole.OWNER), {
      scope: ScopeDocumentFolder.TENDER_DOKUMEN,
      tenderId: 5,
      parentFolderId: 1,
    });

    expect(prisma.fileUpload.findMany).toHaveBeenCalled();
    expect(hasil.files).toEqual([{ id: 1 }]);
  });
});

describe('EpromDocumentsService.buatFolder', () => {
  it('menolak scope TENDER_DOKUMEN tanpa tenderId', async () => {
    const { service } = buatService();

    await expect(
      service.buatFolder(aktor(UserRole.OWNER), { scope: ScopeDocumentFolder.TENDER_DOKUMEN, namaFolder: 'A' } as any),
    ).rejects.toThrow('tenderId wajib diisi');
  });

  it('menolak scope LEGALITAS_VENDOR tanpa vendorId', async () => {
    const { service } = buatService();

    await expect(
      service.buatFolder(aktor(UserRole.OWNER), { scope: ScopeDocumentFolder.LEGALITAS_VENDOR, namaFolder: 'A' } as any),
    ).rejects.toThrow('vendorId wajib diisi');
  });

  it('subfolder mewarisi scope/tenderId/vendorId dari folder induk', async () => {
    const { service, folderCreate } = buatService({ folder: folderTenderFixture({ id: 1, tenderId: 5 }) });

    await service.buatFolder(aktor(UserRole.OWNER), {
      scope: ScopeDocumentFolder.LEGALITAS_VENDOR,
      vendorId: 999,
      namaFolder: '  Subfolder  ',
      parentFolderId: 1,
    } as any);

    expect(folderCreate).toHaveBeenCalledWith({
      data: {
        scope: ScopeDocumentFolder.TENDER_DOKUMEN,
        tenderId: 5,
        vendorId: null,
        namaFolder: 'Subfolder',
        parentFolderId: 1,
      },
    });
  });

  it('menolak Vendor membuat folder root LEGALITAS_VENDOR milik vendor lain', async () => {
    const { service } = buatService();

    await expect(
      service.buatFolder(aktor(UserRole.VENDOR, { vendorId: 1 }), {
        scope: ScopeDocumentFolder.LEGALITAS_VENDOR,
        vendorId: 9,
        namaFolder: 'A',
      } as any),
    ).rejects.toThrow(ForbiddenException);
  });
});

describe('EpromDocumentsService.ubahFolder', () => {
  it('menolak role selain Owner', async () => {
    const { service } = buatService();

    await expect(service.ubahFolder(aktor(UserRole.VENDOR), 1, 'Baru')).rejects.toThrow(ForbiddenException);
  });

  it('melempar NotFoundException kalau folder tidak ada', async () => {
    const { service } = buatService({ folder: null });

    await expect(service.ubahFolder(aktor(UserRole.OWNER), 1, 'Baru')).rejects.toThrow(NotFoundException);
  });

  it('menolak nama folder kosong', async () => {
    const { service } = buatService();

    await expect(service.ubahFolder(aktor(UserRole.OWNER), 1, '   ')).rejects.toThrow(
      'Nama folder tidak boleh kosong',
    );
  });

  it('berhasil ubah nama folder ter-trim', async () => {
    const { service, folderUpdate } = buatService();

    await service.ubahFolder(aktor(UserRole.OWNER), 1, '  Nama Baru  ');

    expect(folderUpdate).toHaveBeenCalledWith({ where: { id: 1 }, data: { namaFolder: 'Nama Baru' } });
  });
});

describe('EpromDocumentsService.unggahFile', () => {
  it('menolak Vendor mengunggah ke folder tender (Owner only)', async () => {
    const { service } = buatService({ folder: folderTenderFixture() });
    const dummyFile = { originalname: 'a.pdf' } as Express.Multer.File;

    await expect(service.unggahFile(aktor(UserRole.VENDOR, { vendorId: 1 }), 1, dummyFile)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('menyimpan file ke folder vendor/<vendorId> untuk scope LEGALITAS_VENDOR', async () => {
    const { service, file, fileUploadCreate } = buatService({ folder: folderVendorFixture({ vendorId: 9 }) });
    const dummyFile = { originalname: 'a.pdf' } as Express.Multer.File;

    await service.unggahFile(aktor(UserRole.VENDOR, { vendorId: 9 }), 2, dummyFile);

    expect(file.simpan).toHaveBeenCalledWith(dummyFile, 'vendor/9', TipeFileEprom.PDF);
    expect(fileUploadCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ folderId: 2, uploadedById: 1 }) }),
    );
  });
});

describe('EpromDocumentsService.fileUntukDiunduh', () => {
  it('melempar NotFoundException kalau file tidak ada', async () => {
    const { service } = buatService({ fileUploadDetail: null });

    await expect(service.fileUntukDiunduh(aktor(UserRole.OWNER), 1)).rejects.toThrow(NotFoundException);
  });

  it('menolak Vendor mengunduh file dari folder tender', async () => {
    const { service } = buatService({
      fileUploadDetail: { id: 1, urlFile: 'a.pdf', folder: folderTenderFixture() },
    });

    await expect(service.fileUntukDiunduh(aktor(UserRole.VENDOR, { vendorId: 1 }), 1)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('berhasil resolve path absolut untuk Owner', async () => {
    const { service, file } = buatService();

    const hasil = await service.fileUntukDiunduh(aktor(UserRole.OWNER), 1);

    expect(file.resolveAbsolut).toHaveBeenCalledWith('eprom/tender/5/a.pdf');
    expect(hasil.absolutePath).toBe('/abs/eprom/tender/5/a.pdf');
  });
});

describe('EpromDocumentsService.semuaFileUntukDiunduh', () => {
  it('melempar NotFoundException kalau tidak ada file sama sekali', async () => {
    const { service } = buatService({ folderFindMany: [], subfolderFindMany: [], fileFindMany: [] });

    await expect(
      service.semuaFileUntukDiunduh(aktor(UserRole.OWNER), { scope: ScopeDocumentFolder.TENDER_DOKUMEN, tenderId: 5 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('mengumpulkan file dari root folder dengan nama entri zip mencerminkan struktur folder', async () => {
    const { service } = buatService({
      folderFindMany: [{ id: 1, namaFolder: 'Root' }],
      subfolderFindMany: [],
      fileFindMany: [{ namaFile: 'a.pdf', urlFile: 'eprom/tender/5/a.pdf' }],
    });

    const hasil = await service.semuaFileUntukDiunduh(aktor(UserRole.OWNER), {
      scope: ScopeDocumentFolder.TENDER_DOKUMEN,
      tenderId: 5,
    });

    expect(hasil[0].item.namaEntriZip).toBe('Root/a.pdf');
  });
});

describe('EpromDocumentsService.hapusFolder', () => {
  it('menolak role selain Owner', async () => {
    const { service } = buatService();

    await expect(service.hapusFolder(aktor(UserRole.VENDOR), 1)).rejects.toThrow(ForbiddenException);
  });

  it('menghapus folder dan seluruh file fisik di dalamnya', async () => {
    const { service, folderDelete, file } = buatService({
      subfolderFindMany: [],
      fileFindMany: [{ namaFile: 'a.pdf', urlFile: 'eprom/tender/5/a.pdf' }],
    });

    const hasil = await service.hapusFolder(aktor(UserRole.OWNER), 1);

    expect(folderDelete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(file.hapus).toHaveBeenCalledWith('eprom/tender/5/a.pdf');
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});

describe('EpromDocumentsService.hapusFile', () => {
  it('menolak role selain Owner', async () => {
    const { service } = buatService();

    await expect(service.hapusFile(aktor(UserRole.VENDOR), 1)).rejects.toThrow(ForbiddenException);
  });

  it('melempar NotFoundException kalau file tidak ada', async () => {
    const { service } = buatService({ fileUploadDetail: null });

    await expect(service.hapusFile(aktor(UserRole.OWNER), 1)).rejects.toThrow(NotFoundException);
  });

  it('berhasil hapus file dan file fisiknya', async () => {
    const { service, fileUploadDelete, file } = buatService({
      fileUploadDetail: { id: 1, urlFile: 'eprom/tender/5/a.pdf' },
    });

    const hasil = await service.hapusFile(aktor(UserRole.OWNER), 1);

    expect(fileUploadDelete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(file.hapus).toHaveBeenCalledWith('eprom/tender/5/a.pdf');
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});
