import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DivisiPengaduan, LokasiPengaduan, StatusPengaduan } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PengaduanLayananService } from './pengaduan-layanan.service';

function buatService(overrides: {
  findMany?: jest.Mock;
  create?: jest.Mock;
  findUnique?: jest.Mock;
  update?: jest.Mock;
} = {}) {
  const findMany = overrides.findMany ?? jest.fn().mockResolvedValue([]);
  const create =
    overrides.create ??
    jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const findUnique = overrides.findUnique ?? jest.fn().mockResolvedValue({ id: 1 });
  const update = overrides.update ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));

  const prisma = {
    pengaduanLayanan: {
      findMany,
      create,
      findUnique,
      update,
    },
  } as unknown as PrismaService;

  const service = new PengaduanLayananService(prisma);

  return { service, prisma, findMany, create, findUnique, update };
}

describe('PengaduanLayananService.create', () => {
  it('menyimpan divisi, rating, lokasi, dan pengirimId sesuai input (GA)', async () => {
    const { service, create } = buatService();

    await service.create(
      {
        divisi: DivisiPengaduan.GA,
        rating: 4,
        komentar: '  Cepat tanggap  ',
        lokasi: LokasiPengaduan.TAMBANG,
      },
      18,
    );

    expect(create).toHaveBeenCalledWith({
      data: {
        divisi: DivisiPengaduan.GA,
        rating: 4,
        komentar: 'Cepat tanggap',
        lokasi: LokasiPengaduan.TAMBANG,
        pengirimId: 18,
      },
    });
  });

  it('menolak GA/CIVIL tanpa lokasi', async () => {
    const { service } = buatService();

    await expect(
      service.create({ divisi: DivisiPengaduan.GA, rating: 5 }, 1),
    ).rejects.toThrow(BadRequestException);
    await expect(
      service.create({ divisi: DivisiPengaduan.CIVIL, rating: 5 }, 1),
    ).rejects.toThrow(BadRequestException);
  });

  it('HC tidak wajib lokasi, dan lokasi selalu disimpan null walau dikirim', async () => {
    const { service, create } = buatService();

    await service.create(
      { divisi: DivisiPengaduan.HC, rating: 4, lokasi: LokasiPengaduan.TAMBANG },
      1,
    );

    expect(create.mock.calls[0][0].data.lokasi).toBeNull();
  });

  it('komentar kosong disimpan sebagai null, bukan string kosong', async () => {
    const { service, create } = buatService();

    await service.create(
      { divisi: DivisiPengaduan.GA, rating: 5, lokasi: LokasiPengaduan.MESS },
      1,
    );

    expect(create.mock.calls[0][0].data.komentar).toBeNull();
  });
});

describe('PengaduanLayananService.ubahStatus', () => {
  it('melempar NotFoundException kalau pengaduan tidak ada', async () => {
    const { service } = buatService({ findUnique: jest.fn().mockResolvedValue(null) });

    await expect(
      service.ubahStatus(99, { status: StatusPengaduan.DISETUJUI }, 1),
    ).rejects.toThrow(NotFoundException);
  });

  it('menolak Hold tanpa catatan', async () => {
    const { service } = buatService();

    await expect(
      service.ubahStatus(1, { status: StatusPengaduan.DITAHAN }, 1),
    ).rejects.toThrow(BadRequestException);
  });

  it('menolak Reject tanpa catatan', async () => {
    const { service } = buatService();

    await expect(
      service.ubahStatus(1, { status: StatusPengaduan.DITOLAK, catatanAdmin: '   ' }, 1),
    ).rejects.toThrow(BadRequestException);
  });

  it('Approve boleh tanpa catatan', async () => {
    const { service, update } = buatService();

    await service.ubahStatus(1, { status: StatusPengaduan.DISETUJUI }, 7);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          status: StatusPengaduan.DISETUJUI,
          catatanAdmin: null,
          diprosesOlehId: 7,
        }),
      }),
    );
  });

  it('Hold dengan catatan tersimpan trim', async () => {
    const { service, update } = buatService();

    await service.ubahStatus(1, { status: StatusPengaduan.DITAHAN, catatanAdmin: '  perlu cek dulu  ' }, 7);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: StatusPengaduan.DITAHAN, catatanAdmin: 'perlu cek dulu' }),
      }),
    );
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
      {
        id: 1,
        rating: 5,
        komentar: 'Bagus',
        lokasi: LokasiPengaduan.TAMBANG,
        status: StatusPengaduan.MENUNGGU,
        catatanAdmin: null,
        createdAt: new Date(2026, 7, 5),
        pengirim: { id: 1, name: 'Andi' },
      },
      {
        id: 2,
        rating: 5,
        komentar: null,
        lokasi: LokasiPengaduan.MESS,
        status: StatusPengaduan.MENUNGGU,
        catatanAdmin: null,
        createdAt: new Date(2026, 7, 6),
        pengirim: { id: 2, name: 'Budi' },
      },
      {
        id: 3,
        rating: 3,
        komentar: 'Lumayan',
        lokasi: LokasiPengaduan.MESS,
        status: StatusPengaduan.MENUNGGU,
        catatanAdmin: null,
        createdAt: new Date(2026, 7, 7),
        pengirim: { id: 3, name: 'Cici' },
      },
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
      lokasi: LokasiPengaduan.TAMBANG,
      status: StatusPengaduan.MENUNGGU,
      catatanAdmin: null,
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
