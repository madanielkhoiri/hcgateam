import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AktorPostingan } from '../postingan/postingan-aktor';
import { AlbumFileService } from './album-file.service';
import { AlbumService } from './album.service';

function aktor(role: UserRole): AktorPostingan {
  return { id: 9, role };
}

function albumFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, judul: 'Album A', foto: [], ...overrides };
}

function buatService(overrides: {
  album?: unknown;
  albumDetail?: unknown;
  foto?: unknown;
  create?: jest.Mock;
  createMany?: jest.Mock;
  albumDelete?: jest.Mock;
  fotoDelete?: jest.Mock;
} = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const createMany = overrides.createMany ?? jest.fn().mockResolvedValue({});
  const albumDelete = overrides.albumDelete ?? jest.fn().mockResolvedValue({});
  const fotoDelete = overrides.fotoDelete ?? jest.fn().mockResolvedValue({});

  const prisma = {
    albumDokumentasi: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockImplementation(() =>
        Promise.resolve('albumDetail' in overrides ? overrides.albumDetail : ('album' in overrides ? overrides.album : albumFixture())),
      ),
      create,
      delete: albumDelete,
    },
    albumFoto: {
      findUnique: jest.fn().mockResolvedValue('foto' in overrides ? overrides.foto : { id: 1, urlFoto: 'album/a.jpg' }),
      createMany,
      delete: fotoDelete,
    },
  } as unknown as PrismaService;

  const file = {
    simpan: jest.fn((f: any) => `album/${f.originalname}`),
    hapus: jest.fn(),
  } as unknown as AlbumFileService;

  const service = new AlbumService(prisma, file);

  return { service, prisma, file, create, createMany, albumDelete, fotoDelete };
}

describe('AlbumService.daftar', () => {
  it('menghitung totalFoto dan sampul dari foto pertama', async () => {
    const { service, prisma } = buatService();
    (prisma.albumDokumentasi.findMany as jest.Mock).mockResolvedValue([
      { id: 1, judul: 'A', deskripsi: null, uploadedBy: {}, createdAt: new Date(), _count: { foto: 3 }, foto: [{ urlFoto: 'album/a.jpg' }] },
      { id: 2, judul: 'B', deskripsi: null, uploadedBy: {}, createdAt: new Date(), _count: { foto: 0 }, foto: [] },
    ]);

    const hasil = await service.daftar();

    expect(hasil[0]).toEqual(expect.objectContaining({ totalFoto: 3, sampul: 'album/a.jpg' }));
    expect(hasil[1]).toEqual(expect.objectContaining({ totalFoto: 0, sampul: null }));
  });
});

describe('AlbumService.detail', () => {
  it('melempar NotFoundException kalau album tidak ada', async () => {
    const { service } = buatService({ albumDetail: null });

    await expect(service.detail(1)).rejects.toThrow(NotFoundException);
  });
});

describe('AlbumService.buat', () => {
  it('menolak role selain kelola', async () => {
    const { service } = buatService();

    await expect(service.buat(aktor(UserRole.KARYAWAN), 'Judul')).rejects.toThrow(ForbiddenException);
  });

  it('menolak judul kosong', async () => {
    const { service } = buatService();

    await expect(service.buat(aktor(UserRole.ADMIN), '   ')).rejects.toThrow('Judul album wajib diisi');
  });

  it('berhasil membuat album dengan deskripsi kosong jadi null', async () => {
    const { service, create } = buatService();

    await service.buat(aktor(UserRole.ADMIN), '  Album Baru  ', '  ');

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ judul: 'Album Baru', deskripsi: null, uploadedById: 9 }) }),
    );
  });
});

describe('AlbumService.tambahFoto', () => {
  it('menolak role selain kelola', async () => {
    const { service } = buatService();

    await expect(service.tambahFoto(aktor(UserRole.KARYAWAN), 1, [])).rejects.toThrow(ForbiddenException);
  });

  it('melempar NotFoundException kalau album tidak ada', async () => {
    const { service } = buatService({ album: null });

    await expect(service.tambahFoto(aktor(UserRole.ADMIN), 1, [{} as any])).rejects.toThrow(NotFoundException);
  });

  it('menolak tanpa file', async () => {
    const { service } = buatService();

    await expect(service.tambahFoto(aktor(UserRole.ADMIN), 1, [])).rejects.toThrow('Minimal 1 foto wajib diunggah');
  });

  it('berhasil menyimpan banyak foto sekaligus', async () => {
    const { service, createMany } = buatService();
    const files = [{ originalname: 'a.jpg' }, { originalname: 'b.jpg' }] as Express.Multer.File[];

    await service.tambahFoto(aktor(UserRole.ADMIN), 1, files);

    expect(createMany).toHaveBeenCalledWith({
      data: [{ albumId: 1, urlFoto: 'album/a.jpg' }, { albumId: 1, urlFoto: 'album/b.jpg' }],
    });
  });
});

describe('AlbumService.hapusAlbum', () => {
  it('menolak role selain kelola', async () => {
    const { service } = buatService();

    await expect(service.hapusAlbum(aktor(UserRole.KARYAWAN), 1)).rejects.toThrow(ForbiddenException);
  });

  it('melempar NotFoundException kalau album tidak ada', async () => {
    const { service } = buatService({ album: null });

    await expect(service.hapusAlbum(aktor(UserRole.ADMIN), 1)).rejects.toThrow(NotFoundException);
  });

  it('menghapus album beserta seluruh file foto di dalamnya', async () => {
    const { service, albumDelete, file } = buatService({
      album: albumFixture({ foto: [{ urlFoto: 'album/a.jpg' }, { urlFoto: 'album/b.jpg' }] }),
    });

    const hasil = await service.hapusAlbum(aktor(UserRole.ADMIN), 1);

    expect(albumDelete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(file.hapus).toHaveBeenCalledTimes(2);
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});

describe('AlbumService.hapusFoto', () => {
  it('menolak role selain kelola', async () => {
    const { service } = buatService();

    await expect(service.hapusFoto(aktor(UserRole.KARYAWAN), 1)).rejects.toThrow(ForbiddenException);
  });

  it('melempar NotFoundException kalau foto tidak ada', async () => {
    const { service } = buatService({ foto: null });

    await expect(service.hapusFoto(aktor(UserRole.ADMIN), 1)).rejects.toThrow(NotFoundException);
  });

  it('berhasil hapus foto dan file fisiknya', async () => {
    const { service, fotoDelete, file } = buatService();

    const hasil = await service.hapusFoto(aktor(UserRole.ADMIN), 1);

    expect(fotoDelete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(file.hapus).toHaveBeenCalledWith('album/a.jpg');
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});
