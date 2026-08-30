import { PrismaService } from '../prisma/prisma.service';
import { AktivitasService } from './aktivitas.service';

const uploader = { id: 1, name: 'Budi', nrp: '001' };

function buatService(overrides: {
  postingan?: unknown[];
  dokumenIr?: unknown[];
  irCourseVideo?: unknown[];
} = {}) {
  const findManyPostingan = jest.fn().mockResolvedValue(overrides.postingan ?? []);
  const findManyDokumen = jest.fn().mockResolvedValue(overrides.dokumenIr ?? []);
  const findManyVideo = jest.fn().mockResolvedValue(overrides.irCourseVideo ?? []);

  const prisma = {
    postingan: { findMany: findManyPostingan },
    dokumenIr: { findMany: findManyDokumen },
    irCourseVideo: { findMany: findManyVideo },
  } as unknown as PrismaService;

  const service = new AktivitasService(prisma);

  return { service, findManyPostingan, findManyDokumen, findManyVideo };
}

describe('AktivitasService.terbaru', () => {
  it('mengembalikan array kosong kalau ketiga sumber kosong', async () => {
    const { service } = buatService();

    const hasil = await service.terbaru();

    expect(hasil).toEqual([]);
  });

  it('memetakan postingan tipe VIDEO/POSTER, dokumen IR, dan IR Course ke jenis yang benar', async () => {
    const { service } = buatService({
      postingan: [
        { judul: 'Poster A', tipe: 'POSTER', uploadedBy: uploader, createdAt: new Date('2026-01-01') },
        { judul: 'Video A', tipe: 'VIDEO', uploadedBy: uploader, createdAt: new Date('2026-01-02') },
      ],
      dokumenIr: [
        { judul: 'Dokumen A', uploadedBy: uploader, createdAt: new Date('2026-01-03') },
      ],
      irCourseVideo: [
        { judul: 'Course A', uploadedBy: uploader, createdAt: new Date('2026-01-04') },
      ],
    });

    const hasil = await service.terbaru();

    expect(hasil.map((item) => item.jenis)).toEqual(
      expect.arrayContaining(['POSTINGAN_POSTER', 'POSTINGAN_VIDEO', 'DOKUMEN_IR', 'IR_COURSE']),
    );
  });

  it('mengurutkan gabungan berdasarkan createdAt terbaru lebih dulu', async () => {
    const { service } = buatService({
      postingan: [
        { judul: 'Lama', tipe: 'POSTER', uploadedBy: uploader, createdAt: new Date('2026-01-01') },
      ],
      dokumenIr: [
        { judul: 'Baru', uploadedBy: uploader, createdAt: new Date('2026-06-01') },
      ],
    });

    const hasil = await service.terbaru();

    expect(hasil[0].judul).toBe('Baru');
    expect(hasil[1].judul).toBe('Lama');
  });

  it('membatasi hasil sesuai limit yang diberikan', async () => {
    const { service, findManyPostingan } = buatService({
      postingan: Array.from({ length: 5 }, (_, index) => ({
        judul: `Poster ${index}`,
        tipe: 'POSTER',
        uploadedBy: uploader,
        createdAt: new Date(2026, 0, index + 1),
      })),
    });

    const hasil = await service.terbaru(3);

    expect(hasil).toHaveLength(3);
    expect(findManyPostingan).toHaveBeenCalledWith(
      expect.objectContaining({ take: 3 }),
    );
  });

  it('default limit 8 kalau tidak diberikan', async () => {
    const { service, findManyPostingan, findManyDokumen, findManyVideo } = buatService();

    await service.terbaru();

    expect(findManyPostingan).toHaveBeenCalledWith(expect.objectContaining({ take: 8 }));
    expect(findManyDokumen).toHaveBeenCalledWith(expect.objectContaining({ take: 8 }));
    expect(findManyVideo).toHaveBeenCalledWith(expect.objectContaining({ take: 8 }));
  });
});
