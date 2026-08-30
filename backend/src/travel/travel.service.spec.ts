import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, StatusTravel } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TravelAksesService } from './travel-akses.service';
import { TravelFileService } from './travel-file.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { TravelService } from './travel.service';

function driverFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, nama: 'Budi', noTelepon: '0812', statusAktif: true, ...overrides };
}

function jadwalFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    status: StatusTravel.DIJADWALKAN,
    driverId: 1,
    waktuBerangkatRencana: new Date(Date.now() + 60 * 60 * 1000),
    driverCheckIn: null,
    driverCheckOut: null,
    driver: driverFixture(),
    penumpang: [],
    ...overrides,
  };
}

function penumpangFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, travelId: 1, karyawanId: 1, checkInWaktu: null, checkOutWaktu: null, ratingBintang: null, ...overrides };
}

function buatService(overrides: {
  driver?: unknown;
  driverHapus?: unknown;
  jadwal?: unknown;
  penumpang?: unknown;
  karyawanTertaut?: unknown;
  driverTertaut?: unknown;
  karyawanCount?: number;
  driverCreate?: jest.Mock;
  driverUpdate?: jest.Mock;
  driverDelete?: jest.Mock;
  jadwalCreate?: jest.Mock;
  jadwalUpdate?: jest.Mock;
  jadwalDelete?: jest.Mock;
  penumpangUpdate?: jest.Mock;
  userCreate?: jest.Mock;
  whatsappAktif?: boolean;
} = {}) {
  const driverCreate = overrides.driverCreate ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const driverUpdate = overrides.driverUpdate ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const driverDelete = overrides.driverDelete ?? jest.fn().mockResolvedValue({});
  const jadwalCreate = overrides.jadwalCreate ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const jadwalUpdate = overrides.jadwalUpdate ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const jadwalDelete = overrides.jadwalDelete ?? jest.fn().mockResolvedValue({});
  const penumpangUpdate = overrides.penumpangUpdate ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const userCreate = overrides.userCreate ?? jest.fn(({ data }) => Promise.resolve({ id: 2, ...data }));
  const penumpangDeleteMany = jest.fn().mockResolvedValue({});
  const penumpangCreateMany = jest.fn().mockResolvedValue({});

  const prisma: any = {
    driver: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockImplementation(() => Promise.resolve('driver' in overrides ? overrides.driver : driverFixture())),
      create: driverCreate,
      update: driverUpdate,
      delete: driverDelete,
    },
    karyawan: {
      findMany: jest.fn().mockResolvedValue([]),
      count: jest.fn().mockResolvedValue(overrides.karyawanCount ?? 1),
      findUnique: jest.fn().mockResolvedValue('karyawanTertaut' in overrides ? overrides.karyawanTertaut : { id: 1, akunId: 9 }),
    },
    travelJadwal: {
      findUnique: jest.fn().mockResolvedValue('jadwal' in overrides ? overrides.jadwal : jadwalFixture()),
      create: jadwalCreate,
      update: jadwalUpdate,
      delete: jadwalDelete,
    },
    travelPenumpang: {
      findUnique: jest.fn().mockResolvedValue('penumpang' in overrides ? overrides.penumpang : penumpangFixture()),
      findMany: jest.fn().mockResolvedValue([]),
      update: penumpangUpdate,
      deleteMany: penumpangDeleteMany,
      createMany: penumpangCreateMany,
    },
    user: {
      create: userCreate,
    },
  };

  prisma.$transaction = jest.fn((arg: any) => {
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return arg(prisma);
  });

  if ('driverHapus' in overrides) {
    prisma.driver.findUnique = jest.fn().mockResolvedValue(overrides.driverHapus);
  }

  const akses = new TravelAksesService(prisma as PrismaService);
  if ('driverTertaut' in overrides) {
    prisma.driver.findFirst = jest.fn().mockResolvedValue(overrides.driverTertaut);
  } else {
    prisma.driver.findFirst = jest.fn().mockResolvedValue(driverFixture());
  }

  const file = {
    simpanFoto: jest.fn().mockReturnValue('travel/jadwal-1/foto.jpg'),
    hapus: jest.fn(),
  } as unknown as TravelFileService;

  const whatsapp = {
    aktif: overrides.whatsappAktif ?? false,
    kirim: jest.fn().mockResolvedValue(true),
  } as unknown as WhatsappService;

  const service = new TravelService(prisma as PrismaService, file, akses, whatsapp);

  return { service, prisma, file, whatsapp, driverCreate, driverUpdate, driverDelete, jadwalCreate, jadwalUpdate, jadwalDelete, penumpangUpdate, userCreate, penumpangDeleteMany, penumpangCreateMany };
}

describe('TravelService.buatDriver', () => {
  it('menolak kalau hanya salah satu dari username/password diisi', async () => {
    const { service } = buatService();

    await expect(service.buatDriver({ nama: 'Budi', username: 'budi' } as any)).rejects.toThrow(
      'Username dan password akun login harus diisi bersamaan',
    );
  });

  it('menolak username yang sudah dipakai (P2002)', async () => {
    const driverCreate = jest.fn().mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: '5' } as any),
    );
    const { service } = buatService({ driverCreate });

    await expect(
      service.buatDriver({ nama: 'Budi', username: 'budi', password: 'rahasia123' } as any),
    ).rejects.toThrow('Username sudah digunakan');
  });

  it('berhasil membuat driver tanpa akun login', async () => {
    const { service, driverCreate, userCreate } = buatService();

    await service.buatDriver({ nama: '  Budi  ' } as any);

    expect(driverCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ nama: 'Budi' }) }));
    expect(userCreate).not.toHaveBeenCalled();
  });

  it('berhasil membuat driver dengan akun login role DRIVER', async () => {
    const { service, userCreate } = buatService();

    await service.buatDriver({ nama: 'Budi', username: 'budi', password: 'rahasia123' } as any);

    expect(userCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ username: 'budi', role: 'DRIVER' }) }),
    );
  });
});

describe('TravelService.ubahDriver', () => {
  it('melempar NotFoundException kalau driver tidak ada', async () => {
    const { service } = buatService({ driver: null });

    await expect(service.ubahDriver(1, {} as any)).rejects.toThrow(NotFoundException);
  });

  it('hanya mengubah field yang dikirim', async () => {
    const { service, driverUpdate } = buatService();

    await service.ubahDriver(1, { statusAktif: false } as any);

    expect(driverUpdate).toHaveBeenCalledWith({ where: { id: 1 }, data: { statusAktif: false } });
  });
});

describe('TravelService.hapusDriver', () => {
  it('melempar NotFoundException kalau driver tidak ada', async () => {
    const { service } = buatService({ driverHapus: null });

    await expect(service.hapusDriver(1)).rejects.toThrow(NotFoundException);
  });

  it('menolak hapus driver yang sudah punya jadwal', async () => {
    const { service } = buatService({ driverHapus: { id: 1, _count: { travelJadwal: 2 } } });

    await expect(service.hapusDriver(1)).rejects.toThrow('sudah memiliki jadwal Travel');
  });

  it('berhasil hapus driver tanpa jadwal', async () => {
    const { service, driverDelete } = buatService({ driverHapus: { id: 1, _count: { travelJadwal: 0 } } });

    const hasil = await service.hapusDriver(1);

    expect(driverDelete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});

describe('TravelService.buatJadwal', () => {
  const dtoDasar = { armada: 'Hiace', driverId: 1, tujuan: 'Site A', waktuBerangkatRencana: '2026-01-05T08:00:00Z', karyawanIds: [1, 2] };

  it('menolak driver tidak ditemukan/tidak aktif', async () => {
    const { service } = buatService({ driver: null });

    await expect(service.buatJadwal(dtoDasar as any, 9)).rejects.toThrow('Driver tidak ditemukan atau tidak aktif');
  });

  it('menolak format waktu tidak valid', async () => {
    const { service } = buatService();

    await expect(service.buatJadwal({ ...dtoDasar, waktuBerangkatRencana: 'bukan-tanggal' } as any, 9)).rejects.toThrow(
      'Format waktu berangkat tidak valid',
    );
  });

  it('menolak kalau sebagian karyawan tidak ditemukan', async () => {
    const { service } = buatService({ karyawanCount: 1 });

    await expect(service.buatJadwal(dtoDasar as any, 9)).rejects.toThrow('Sebagian karyawan yang dipilih tidak ditemukan');
  });

  it('men-dedup karyawanIds duplikat sebelum menghitung', async () => {
    const { service, prisma } = buatService({ karyawanCount: 2 });

    await service.buatJadwal({ ...dtoDasar, karyawanIds: [1, 1, 2] } as any, 9);

    expect(prisma.karyawan.count).toHaveBeenCalledWith({ where: { id: { in: [1, 2] } } });
  });

  it('tidak mengirim notifikasi WA kalau whatsapp tidak aktif', async () => {
    const { service, whatsapp } = buatService({ karyawanCount: 2, whatsappAktif: false });

    await service.buatJadwal(dtoDasar as any, 9);

    expect(whatsapp.kirim).not.toHaveBeenCalled();
  });
});

describe('TravelService.ubahJadwal', () => {
  it('menolak ubah field inti kalau jadwal sudah tidak DIJADWALKAN', async () => {
    const { service } = buatService({ jadwal: jadwalFixture({ status: StatusTravel.BERJALAN }) });

    await expect(service.ubahJadwal(1, { armada: 'Elf' } as any)).rejects.toThrow(
      'sudah berjalan/selesai tidak dapat diubah',
    );
  });

  it('mengizinkan ubah status walau jadwal sudah berjalan (bukan field inti)', async () => {
    const { service, jadwalUpdate } = buatService({ jadwal: jadwalFixture({ status: StatusTravel.BERJALAN }) });

    await service.ubahJadwal(1, { status: StatusTravel.SELESAI } as any);

    expect(jadwalUpdate).toHaveBeenCalled();
  });

  it('menolak driver baru yang tidak aktif', async () => {
    const { service, prisma } = buatService();
    (prisma.driver.findUnique as jest.Mock).mockResolvedValue(driverFixture({ statusAktif: false }));

    await expect(service.ubahJadwal(1, { driverId: 2 } as any)).rejects.toThrow('Driver tidak ditemukan atau tidak aktif');
  });

  it('mengganti seluruh daftar penumpang kalau karyawanIds dikirim', async () => {
    const { service, penumpangDeleteMany, penumpangCreateMany } = buatService({ karyawanCount: 2 });

    await service.ubahJadwal(1, { karyawanIds: [1, 2] } as any);

    expect(penumpangDeleteMany).toHaveBeenCalledWith({ where: { travelId: 1 } });
    expect(penumpangCreateMany).toHaveBeenCalledWith({
      data: [{ travelId: 1, karyawanId: 1 }, { travelId: 1, karyawanId: 2 }],
    });
  });
});

describe('TravelService.hapusJadwal', () => {
  it('menolak hapus jadwal yang sudah berjalan/selesai', async () => {
    const { service } = buatService({ jadwal: jadwalFixture({ status: StatusTravel.SELESAI }) });

    await expect(service.hapusJadwal(1)).rejects.toThrow('sudah berjalan/selesai tidak dapat dihapus');
  });

  it('berhasil hapus jadwal DIJADWALKAN', async () => {
    const { service, jadwalDelete } = buatService();

    const hasil = await service.hapusJadwal(1);

    expect(jadwalDelete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});

describe('TravelService — self-service karyawan', () => {
  it('checkin menolak kalau bukan penumpang terdaftar', async () => {
    const { service } = buatService({ penumpang: null });

    await expect(service.checkin(9, 1)).rejects.toThrow(ForbiddenException);
  });

  it('checkin menolak kalau sudah check-in', async () => {
    const { service } = buatService({ penumpang: penumpangFixture({ checkInWaktu: new Date() }) });

    await expect(service.checkin(9, 1)).rejects.toThrow('sudah check-in untuk jadwal ini');
  });

  it('checkin menolak kalau masih di luar jendela H-2 jam', async () => {
    const { service } = buatService({ jadwal: jadwalFixture({ waktuBerangkatRencana: new Date(Date.now() + 5 * 60 * 60 * 1000) }) });

    await expect(service.checkin(9, 1)).rejects.toThrow('mulai H-2 jam sebelum keberangkatan');
  });

  it('checkin berhasil dalam jendela H-2 jam', async () => {
    const { service, penumpangUpdate } = buatService({
      jadwal: jadwalFixture({ waktuBerangkatRencana: new Date(Date.now() + 60 * 60 * 1000) }),
    });

    await service.checkin(9, 1);

    expect(penumpangUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ checkInWaktu: expect.any(Date) }) }),
    );
  });

  it('checkout menolak kalau belum check-in', async () => {
    const { service } = buatService();

    await expect(service.checkout(9, 1)).rejects.toThrow('belum check-in untuk jadwal ini');
  });

  it('checkout menolak kalau sudah check-out', async () => {
    const { service } = buatService({
      penumpang: penumpangFixture({ checkInWaktu: new Date(), checkOutWaktu: new Date() }),
    });

    await expect(service.checkout(9, 1)).rejects.toThrow('sudah check-out untuk jadwal ini');
  });

  it('rating menolak sebelum check-out', async () => {
    const { service } = buatService();

    await expect(service.rating(9, 1, { bintang: 5 } as any)).rejects.toThrow('setelah Anda check-out');
  });

  it('rating menolak kalau sudah pernah dirating', async () => {
    const { service } = buatService({
      penumpang: penumpangFixture({ checkOutWaktu: new Date(), ratingBintang: 4 }),
    });

    await expect(service.rating(9, 1, { bintang: 5 } as any)).rejects.toThrow('sudah memberi rating');
  });

  it('rating berhasil setelah check-out', async () => {
    const { service, penumpangUpdate } = buatService({ penumpang: penumpangFixture({ checkOutWaktu: new Date() }) });

    await service.rating(9, 1, { bintang: 5, ulasan: '  Bagus  ' } as any);

    expect(penumpangUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { ratingBintang: 5, ratingUlasan: 'Bagus' } }),
    );
  });
});

describe('TravelService — Driver', () => {
  it('detailTrip menolak driver yang bukan pemilik trip', async () => {
    const { service } = buatService({ driverTertaut: driverFixture({ id: 999 }), jadwal: jadwalFixture({ driverId: 1 }) });

    await expect(service.detailTrip(9, 1)).rejects.toThrow(ForbiddenException);
  });

  it('driverCheckin menolak jadwal yang bukan DIJADWALKAN', async () => {
    const { service } = buatService({ jadwal: jadwalFixture({ status: StatusTravel.BERJALAN }) });

    await expect(service.driverCheckin(9, 1, { originalname: 'a.jpg' } as any)).rejects.toThrow(
      'sudah check-in/selesai sebelumnya',
    );
  });

  it('driverCheckin menolak tanpa foto', async () => {
    const { service } = buatService();

    await expect(service.driverCheckin(9, 1)).rejects.toThrow('Foto check-in wajib diunggah');
  });

  it('driverCheckin berhasil mengubah status jadi BERJALAN', async () => {
    const { service, jadwalUpdate } = buatService();

    await service.driverCheckin(9, 1, { originalname: 'a.jpg' } as any);

    expect(jadwalUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: StatusTravel.BERJALAN, driverCheckInFoto: 'travel/jadwal-1/foto.jpg' }) }),
    );
  });

  it('driverCheckout menolak kalau belum check-in', async () => {
    const { service } = buatService();

    await expect(service.driverCheckout(9, 1)).rejects.toThrow('belum check-in keberangkatan');
  });

  it('driverCheckout menolak kalau sudah check-out', async () => {
    const { service } = buatService({ jadwal: jadwalFixture({ driverCheckIn: new Date(), driverCheckOut: new Date() }) });

    await expect(service.driverCheckout(9, 1)).rejects.toThrow('sudah check-out sebelumnya');
  });

  it('driverCheckout menghitung durasiMenit dan set status SELESAI', async () => {
    const checkInWaktu = new Date(Date.now() - 45 * 60 * 1000);
    const { service, jadwalUpdate } = buatService({ jadwal: jadwalFixture({ driverCheckIn: checkInWaktu }) });

    await service.driverCheckout(9, 1);

    const data = jadwalUpdate.mock.calls[0][0].data;
    expect(data.status).toBe(StatusTravel.SELESAI);
    expect(data.durasiMenit).toBeGreaterThanOrEqual(44);
    expect(data.durasiMenit).toBeLessThanOrEqual(46);
  });
});
