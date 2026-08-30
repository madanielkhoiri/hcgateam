import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IrFileService } from '../common/ir-file.service';
import { AktorIr } from '../common/ir-aktor';
import { IrCourseService } from './ir-course.service';

function aktor(overrides: Partial<AktorIr> = {}): AktorIr {
  return { id: 1, nama: 'Budi', nrp: '12345', role: UserRole.KARYAWAN, ...overrides };
}

function videoFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, judul: 'Video A', urlVideo: 'ir/course/a.mp4', ...overrides };
}

function buatService(overrides: { video?: unknown; findMany?: unknown[]; create?: jest.Mock; deleteFn?: jest.Mock; upsert?: jest.Mock } = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const deleteFn = overrides.deleteFn ?? jest.fn().mockResolvedValue({});
  const upsert = overrides.upsert ?? jest.fn(({ create: c }) => Promise.resolve({ id: 1, ...c }));

  const prisma = {
    irCourseVideo: {
      findMany: jest.fn().mockResolvedValue(overrides.findMany ?? []),
      findUnique: jest.fn().mockResolvedValue('video' in overrides ? overrides.video : videoFixture()),
      create,
      delete: deleteFn,
    },
    irCourseTontonan: {
      upsert,
    },
  } as unknown as PrismaService;

  const file = {
    simpanVideo: jest.fn().mockReturnValue('ir/course/baru.mp4'),
    hapus: jest.fn(),
  } as unknown as IrFileService;

  const service = new IrCourseService(prisma, file);

  return { service, prisma, file, create, deleteFn, upsert };
}

describe('IrCourseService.daftar', () => {
  it('menghitung sudahDitonton & ditontonPada dari tontonan milik aktor', async () => {
    const { service, prisma } = buatService();
    (prisma.irCourseVideo.findMany as jest.Mock).mockResolvedValue([
      { id: 1, judul: 'A', deskripsi: null, urlVideo: 'x', uploadedBy: {}, createdAt: new Date(), _count: { tontonan: 3 }, tontonan: [{ ditontonPada: new Date('2026-01-05') }] },
      { id: 2, judul: 'B', deskripsi: null, urlVideo: 'y', uploadedBy: {}, createdAt: new Date(), _count: { tontonan: 0 }, tontonan: [] },
    ]);

    const hasil = await service.daftar(aktor());

    expect(hasil[0]).toEqual(expect.objectContaining({ totalDitonton: 3, sudahDitonton: true, ditontonPada: new Date('2026-01-05') }));
    expect(hasil[1]).toEqual(expect.objectContaining({ totalDitonton: 0, sudahDitonton: false, ditontonPada: null }));
  });
});

describe('IrCourseService.unggah', () => {
  it('menolak judul kosong', async () => {
    const { service } = buatService();

    await expect(service.unggah('   ', undefined, {} as any, aktor())).rejects.toThrow(
      'Judul video wajib diisi',
    );
  });

  it('berhasil upload dengan deskripsi kosong jadi null', async () => {
    const { service, create } = buatService();

    await service.unggah('  Video A  ', '  ', {} as any, aktor());

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ judul: 'Video A', deskripsi: null, urlVideo: 'ir/course/baru.mp4' }) }),
    );
  });
});

describe('IrCourseService.hapus', () => {
  it('melempar NotFoundException kalau video tidak ada', async () => {
    const { service } = buatService({ video: null });

    await expect(service.hapus(1)).rejects.toThrow(NotFoundException);
  });

  it('berhasil hapus video dan file fisiknya', async () => {
    const { service, deleteFn, file } = buatService();

    const hasil = await service.hapus(1);

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(file.hapus).toHaveBeenCalledWith('ir/course/a.mp4');
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});

describe('IrCourseService.tandaiDitonton', () => {
  it('melempar NotFoundException kalau video tidak ada', async () => {
    const { service } = buatService({ video: null });

    await expect(service.tandaiDitonton(1, aktor())).rejects.toThrow(NotFoundException);
  });

  it('berhasil upsert tontonan (idempoten kalau sudah pernah ditandai)', async () => {
    const { service, upsert } = buatService();

    await service.tandaiDitonton(1, aktor({ id: 9 }));

    expect(upsert).toHaveBeenCalledWith({
      where: { videoId_userId: { videoId: 1, userId: 9 } },
      create: { videoId: 1, userId: 9 },
      update: {},
    });
  });
});

describe('IrCourseService.daftarPenonton', () => {
  it('melempar NotFoundException kalau video tidak ada', async () => {
    const { service } = buatService({ video: null });

    await expect(service.daftarPenonton(1)).rejects.toThrow(NotFoundException);
  });

  it('mengembalikan detail video dengan daftar tontonan', async () => {
    const { service } = buatService({ video: videoFixture({ tontonan: [{ user: { id: 2 } }] }) });

    const hasil = await service.daftarPenonton(1);

    expect(hasil.tontonan).toEqual([{ user: { id: 2 } }]);
  });
});
