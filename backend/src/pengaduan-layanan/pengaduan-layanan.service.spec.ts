import { DivisiPengaduan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PengaduanLayananService } from './pengaduan-layanan.service';

function buatService(overrides: {
  findMany?: jest.Mock;
  create?: jest.Mock;
} = {}) {
  const findMany = overrides.findMany ?? jest.fn().mockResolvedValue([]);
  const create =
    overrides.create ??
    jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));

  const prisma = {
    pengaduanLayanan: {
      findMany,
      create,
    },
  } as unknown as PrismaService;

  const service = new PengaduanLayananService(prisma);

  return { service, prisma, findMany, create };
}

describe('PengaduanLayananService.create', () => {
  it('menyimpan divisi, rating, dan pengirimId sesuai input', async () => {
    const { service, create } = buatService();

    await service.create(
      { divisi: DivisiPengaduan.HC, rating: 4, komentar: '  Cepat tanggap  ' },
      18,
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        divisi: DivisiPengaduan.HC,
        rating: 4,
        komentar: 'Cepat tanggap',
        pengirimId: 18,
      },
    });
  });

  it('komentar kosong disimpan sebagai null, bukan string kosong', async () => {
    const { service, create } = buatService();

    await service.create({ divisi: DivisiPengaduan.GA, rating: 5 }, 1);

    expect(create.mock.calls[0][0].data.komentar).toBeNull();
  });
});

describe('PengaduanLayananService.rekap', () => {
  it('menyaring berdasarkan divisi dan rentang satu bulan penuh', async () => {
    const { service, findMany } = buatService();

    await service.rekap(DivisiPengaduan.CIVIL, 3, 2026);

    const whereBulanIni = findMany.mock.calls[0][0].where;
    expect(whereBulanIni.divisi).toBe(DivisiPengaduan.CIVIL);
    expect(whereBulanIni.createdAt).toEqual({
      gte: new Date(2026, 2, 1),
      lt: new Date(2026, 3, 1),
    });
  });

  it('menghitung rata-rata dan distribusi bintang dengan benar', async () => {
    const daftar = [
      { id: 1, rating: 5, komentar: 'Bagus', createdAt: new Date(2026, 7, 5), pengirim: { id: 1, name: 'Andi' } },
      { id: 2, rating: 5, komentar: null, createdAt: new Date(2026, 7, 6), pengirim: { id: 2, name: 'Budi' } },
      { id: 3, rating: 3, komentar: 'Lumayan', createdAt: new Date(2026, 7, 7), pengirim: { id: 3, name: 'Cici' } },
    ];
    const findMany = jest.fn()
      .mockResolvedValueOnce(daftar)
      .mockResolvedValueOnce([]);
    const { service } = buatService({ findMany });

    const hasil = await service.rekap(DivisiPengaduan.HC, 8, 2026);

    expect(hasil.jumlahPengaduan).toBe(3);
    expect(hasil.rataRata).toBeCloseTo((5 + 5 + 3) / 3, 2);
    expect(hasil.distribusiBintang).toEqual({ 1: 0, 2: 0, 3: 1, 4: 0, 5: 2 });
    expect(hasil.daftar[0]).toEqual({
      id: 1,
      rating: 5,
      komentar: 'Bagus',
      pengirim: 'Andi',
      createdAt: daftar[0].createdAt,
    });
  });

  it('rata-rata 0 dan daftar kosong kalau tidak ada pengaduan bulan itu', async () => {
    const { service } = buatService();

    const hasil = await service.rekap(DivisiPengaduan.GA, 1, 2026);

    expect(hasil.jumlahPengaduan).toBe(0);
    expect(hasil.rataRata).toBe(0);
    expect(hasil.daftar).toEqual([]);
  });

  it('default ke bulan & tahun berjalan kalau tidak diberikan', async () => {
    const { service, findMany } = buatService();
    const sekarang = new Date();

    const hasil = await service.rekap(DivisiPengaduan.HC);

    expect(hasil.bulan).toBe(sekarang.getMonth() + 1);
    expect(hasil.tahun).toBe(sekarang.getFullYear());
    expect(findMany).toHaveBeenCalled();
  });

  it('tren 6 bulan mencakup bulan acuan sebagai entri terakhir', async () => {
    const trenData = [
      { rating: 4, createdAt: new Date(2026, 6, 10) },
      { rating: 2, createdAt: new Date(2026, 7, 15) },
    ];
    const findMany = jest.fn()
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(trenData);
    const { service } = buatService({ findMany });

    const hasil = await service.rekap(DivisiPengaduan.CIVIL, 8, 2026);

    expect(hasil.tren).toHaveLength(6);
    expect(hasil.tren[5]).toMatchObject({ bulan: 8, tahun: 2026, rataRata: 2, jumlah: 1 });
    expect(hasil.tren[4]).toMatchObject({ bulan: 7, tahun: 2026, rataRata: 4, jumlah: 1 });
    expect(hasil.tren[0]).toMatchObject({ bulan: 3, tahun: 2026, jumlah: 0 });
  });
});
