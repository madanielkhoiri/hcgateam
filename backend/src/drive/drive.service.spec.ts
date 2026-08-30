import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ScopeDrive, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AktorPostingan } from '../postingan/postingan-aktor';
import { DriveFileService } from './drive-file.service';
import { DriveService } from './drive.service';

function aktor(role: UserRole): AktorPostingan {
  return { id: 9, role };
}

function folderFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, scope: ScopeDrive.CSR, namaFolder: 'Folder A', parentFolderId: null, ...overrides };
}

function buatService(overrides: {
  folder?: unknown;
  folderCreate?: jest.Mock;
  folderUpdate?: jest.Mock;
  folderDelete?: jest.Mock;
  folderFindMany?: unknown[];
  subfolderFindMany?: unknown[];
  fileFindMany?: unknown[];
  fileDetail?: unknown;
  fileCreate?: jest.Mock;
  fileDelete?: jest.Mock;
} = {}) {
  const folderCreate = overrides.folderCreate ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const folderUpdate = overrides.folderUpdate ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const folderDelete = overrides.folderDelete ?? jest.fn().mockResolvedValue({});
  const fileCreate = overrides.fileCreate ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const fileDelete = overrides.fileDelete ?? jest.fn().mockResolvedValue({});

  let subfolderCallDone = false;
  const folderFindMany = jest.fn().mockImplementation(({ where }: any) => {
    if (where.parentFolderId !== undefined && where.parentFolderId !== null) {
      return Promise.resolve(subfolderCallDone ? [] : (overrides.subfolderFindMany ?? []));
    }
    subfolderCallDone = true;
    return Promise.resolve(overrides.folderFindMany ?? []);
  });

  const prisma = {
    driveFolder: {
      findUnique: jest.fn().mockResolvedValue('folder' in overrides ? overrides.folder : folderFixture()),
      findMany: folderFindMany,
      create: folderCreate,
      update: folderUpdate,
      delete: folderDelete,
    },
    driveFile: {
      findMany: jest.fn().mockResolvedValue(overrides.fileFindMany ?? []),
      findUnique: jest.fn().mockResolvedValue('fileDetail' in overrides ? overrides.fileDetail : { id: 1, urlFile: 'drive/a.pdf' }),
      create: fileCreate,
      delete: fileDelete,
    },
  } as unknown as PrismaService;

  const file = {
    simpan: jest.fn().mockReturnValue('drive/baru.pdf'),
    hapus: jest.fn(),
  } as unknown as DriveFileService;

  const service = new DriveService(prisma, file);

  return { service, prisma, file, folderCreate, folderUpdate, folderDelete, fileCreate, fileDelete };
}

describe('DriveService.isiFolder', () => {
  it('menolak scope tidak valid', async () => {
    const { service } = buatService();

    await expect(service.isiFolder('SALAH')).rejects.toThrow(BadRequestException);
  });

  it('menyertakan daftar file hanya kalau parentFolderId diberikan', async () => {
    const { service, prisma } = buatService({ fileFindMany: [{ id: 1 }] });

    const hasil = await service.isiFolder('CSR', 1);

    expect(prisma.driveFile.findMany).toHaveBeenCalled();
    expect(hasil.files).toEqual([{ id: 1 }]);
  });

  it('tidak query file kalau tidak ada parentFolderId', async () => {
    const { service, prisma } = buatService();

    const hasil = await service.isiFolder('CSR');

    expect(prisma.driveFile.findMany).not.toHaveBeenCalled();
    expect(hasil.files).toEqual([]);
  });
});

describe('DriveService.buatFolder', () => {
  it('menolak role selain kelola', async () => {
    const { service } = buatService();

    await expect(service.buatFolder(aktor(UserRole.KARYAWAN), 'CSR', 'Folder A')).rejects.toThrow(ForbiddenException);
  });

  it('menolak scope tidak valid', async () => {
    const { service } = buatService();

    await expect(service.buatFolder(aktor(UserRole.ADMIN), 'SALAH', 'Folder A')).rejects.toThrow(BadRequestException);
  });

  it('menolak nama folder kosong', async () => {
    const { service } = buatService();

    await expect(service.buatFolder(aktor(UserRole.ADMIN), 'CSR', '   ')).rejects.toThrow(
      'Nama folder wajib diisi',
    );
  });

  it('subfolder mewarisi scope dari folder induk (mengabaikan scope yang dikirim)', async () => {
    const { service, folderCreate } = buatService({ folder: folderFixture({ scope: ScopeDrive.FORM_DOWNLOAD }) });

    await service.buatFolder(aktor(UserRole.ADMIN), 'CSR', 'Subfolder', 1);

    expect(folderCreate).toHaveBeenCalledWith({
      data: { scope: ScopeDrive.FORM_DOWNLOAD, namaFolder: 'Subfolder', parentFolderId: 1 },
    });
  });

  it('berhasil membuat folder root dengan nama ter-trim', async () => {
    const { service, folderCreate } = buatService();

    await service.buatFolder(aktor(UserRole.SECTION_HEAD), 'CSR', '  Folder Baru  ');

    expect(folderCreate).toHaveBeenCalledWith({
      data: { scope: ScopeDrive.CSR, namaFolder: 'Folder Baru', parentFolderId: null },
    });
  });
});

describe('DriveService.ubahFolder', () => {
  it('menolak role selain kelola', async () => {
    const { service } = buatService();

    await expect(service.ubahFolder(aktor(UserRole.KARYAWAN), 1, 'Baru')).rejects.toThrow(ForbiddenException);
  });

  it('melempar NotFoundException kalau folder tidak ada', async () => {
    const { service } = buatService({ folder: null });

    await expect(service.ubahFolder(aktor(UserRole.ADMIN), 1, 'Baru')).rejects.toThrow(NotFoundException);
  });

  it('menolak nama kosong', async () => {
    const { service } = buatService();

    await expect(service.ubahFolder(aktor(UserRole.ADMIN), 1, '   ')).rejects.toThrow(
      'Nama folder tidak boleh kosong',
    );
  });

  it('berhasil ubah nama ter-trim', async () => {
    const { service, folderUpdate } = buatService();

    await service.ubahFolder(aktor(UserRole.ADMIN), 1, '  Nama Baru  ');

    expect(folderUpdate).toHaveBeenCalledWith({ where: { id: 1 }, data: { namaFolder: 'Nama Baru' } });
  });
});

describe('DriveService.hapusFolder', () => {
  it('menolak role selain kelola', async () => {
    const { service } = buatService();

    await expect(service.hapusFolder(aktor(UserRole.KARYAWAN), 1)).rejects.toThrow(ForbiddenException);
  });

  it('melempar NotFoundException kalau folder tidak ada', async () => {
    const { service } = buatService({ folder: null });

    await expect(service.hapusFolder(aktor(UserRole.ADMIN), 1)).rejects.toThrow(NotFoundException);
  });

  it('menghapus folder beserta seluruh file fisik di dalamnya (rekursif)', async () => {
    const { service, folderDelete, file } = buatService({
      fileFindMany: [{ urlFile: 'drive/a.pdf' }],
      subfolderFindMany: [],
    });

    const hasil = await service.hapusFolder(aktor(UserRole.ADMIN), 1);

    expect(folderDelete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(file.hapus).toHaveBeenCalledWith('drive/a.pdf');
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});

describe('DriveService.unggahFile', () => {
  it('menolak role selain kelola', async () => {
    const { service } = buatService();

    await expect(service.unggahFile(aktor(UserRole.KARYAWAN), 1, {} as any)).rejects.toThrow(ForbiddenException);
  });

  it('melempar NotFoundException kalau folder tidak ada', async () => {
    const { service } = buatService({ folder: null });

    await expect(service.unggahFile(aktor(UserRole.ADMIN), 1, {} as any)).rejects.toThrow(NotFoundException);
  });

  it('berhasil upload file ke folder', async () => {
    const { service, fileCreate } = buatService();
    const dummyFile = { originalname: 'a.pdf' } as Express.Multer.File;

    await service.unggahFile(aktor(UserRole.ADMIN), 1, dummyFile);

    expect(fileCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ folderId: 1, namaFile: 'a.pdf', urlFile: 'drive/baru.pdf', uploadedById: 9 }) }),
    );
  });
});

describe('DriveService.hapusFile', () => {
  it('menolak role selain kelola', async () => {
    const { service } = buatService();

    await expect(service.hapusFile(aktor(UserRole.KARYAWAN), 1)).rejects.toThrow(ForbiddenException);
  });

  it('melempar NotFoundException kalau file tidak ada', async () => {
    const { service } = buatService({ fileDetail: null });

    await expect(service.hapusFile(aktor(UserRole.ADMIN), 1)).rejects.toThrow(NotFoundException);
  });

  it('berhasil hapus file dan file fisiknya', async () => {
    const { service, fileDelete, file } = buatService();

    const hasil = await service.hapusFile(aktor(UserRole.ADMIN), 1);

    expect(fileDelete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(file.hapus).toHaveBeenCalledWith('drive/a.pdf');
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});
