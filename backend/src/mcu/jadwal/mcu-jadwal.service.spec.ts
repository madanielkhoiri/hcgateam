import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { JenisMcu, StatusKerja, StatusPendaftaran, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { McuAksesService } from '../common/mcu-akses.service';
import { AktorMcu } from '../common/mcu-aktor';
import { McuNotifikasiService } from '../notifikasi/mcu-notifikasi.service';
import { hariIni, tambahHari } from '../mcu-date.util';
import { McuJadwalService } from './mcu-jadwal.service';

function aktor(role: UserRole, id = 1): AktorMcu {
  return { id, role, username: 'test' };
}

function karyawanFixture(overrides: Partial<{ statusKerja: StatusKerja; departemenId: number }> = {}) {
  return {
    id: 7,
    nama: 'Budi',
    nik: '12345',
    email: 'budi@x.com',
    akunId: 70,
    departemenId: overrides.departemenId ?? 3,
    statusKerja: overrides.statusKerja ?? StatusKerja.AKTIF,
  };
}

function jadwalFixture(overrides: Partial<{
  statusPendaftaran: StatusPendaftaran;
  tanggalLock: Date;
  tanggalMcu: Date;
  departemenId: number;
}> = {}) {
  return {
    id: 1,
    karyawanId: 7,
    departemenId: overrides.departemenId ?? 3,
    tanggalMcu: overrides.tanggalMcu ?? tambahHari(hariIni(), 10),
    tanggalLock: overrides.tanggalLock ?? tambahHari(hariIni(), 7),
    statusPendaftaran: overrides.statusPendaftaran ?? StatusPendaftaran.DRAFT,
    jenisMcu: JenisMcu.BERKALA,
    klinik: null,
    karyawan: karyawanFixture(),
  };
}

function isoTanggal(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function buatService(overrides: {
  karyawan?: unknown;
  jadwalBerjalan?: unknown;
  jadwalFindUnique?: unknown;
  klinik?: unknown;
  create?: jest.Mock;
  update?: jest.Mock;
  updateMany?: jest.Mock;
  departemenFindMany?: jest.Mock;
} = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data, karyawan: karyawanFixture(), klinik: null }));
  const update = overrides.update ?? jest.fn(({ data }) => Promise.resolve({ ...(jadwalFixture() as object), ...data }));
  const updateMany = overrides.updateMany ?? jest.fn().mockResolvedValue({ count: 0 });

  const prisma = {
    karyawan: {
      findUnique: jest.fn().mockResolvedValue('karyawan' in overrides ? overrides.karyawan : karyawanFixture()),
    },
    jadwalMcu: {
      findFirst: jest.fn().mockResolvedValue(overrides.jadwalBerjalan ?? null),
      findUnique: jest.fn().mockResolvedValue('jadwalFindUnique' in overrides ? overrides.jadwalFindUnique : jadwalFixture()),
      create,
      update,
      updateMany,
    },
    klinik: {
      findUnique: jest.fn().mockResolvedValue('klinik' in overrides ? overrides.klinik : { id: 1, statusAktif: true }),
    },
    departemen: { findMany: overrides.departemenFindMany ?? jest.fn().mockResolvedValue([{ id: 3 }]) },
  } as unknown as PrismaService;

  const akses = new McuAksesService(prisma);
  const notifikasi = {
    penerimaPeran: jest.fn().mockResolvedValue([]),
    kirimBanyak: jest.fn().mockResolvedValue(undefined),
    duaKanal: jest.fn().mockReturnValue([]),
  } as unknown as McuNotifikasiService;

  const service = new McuJadwalService(prisma, akses, notifikasi);

  return { service, prisma, create, update, updateMany };
}

const DTO_DASAR = { karyawanId: 7, tanggalMcu: isoTanggal(tambahHari(hariIni(), 10)) };

describe('McuJadwalService.buat', () => {
  it('menolak role selain Admin Dept/HC', async () => {
    const { service } = buatService();

    await expect(service.buat(DTO_DASAR as any, aktor(UserRole.KARYAWAN))).rejects.toThrow(ForbiddenException);
  });

  it('melempar NotFoundException kalau karyawan tidak ada', async () => {
    const { service } = buatService({ karyawan: null });

    await expect(service.buat(DTO_DASAR as any, aktor(UserRole.HC))).rejects.toThrow(NotFoundException);
  });

  it('Admin Dept ditolak menjadwalkan karyawan di luar departemennya', async () => {
    const { service } = buatService({
      karyawan: karyawanFixture({ departemenId: 99 }),
      departemenFindMany: jest.fn().mockResolvedValue([{ id: 3 }]),
    });

    await expect(service.buat(DTO_DASAR as any, aktor(UserRole.ADMIN_DEPT))).rejects.toThrow(ForbiddenException);
  });

  it('menolak karyawan berstatus RESIGN', async () => {
    const { service } = buatService({ karyawan: karyawanFixture({ statusKerja: StatusKerja.RESIGN }) });

    await expect(service.buat(DTO_DASAR as any, aktor(UserRole.HC))).rejects.toThrow(
      'Karyawan berstatus resign tidak dapat dijadwalkan MCU',
    );
  });

  it('menolak penjadwalan kurang dari H-3 hari', async () => {
    const { service } = buatService();
    const besok = isoTanggal(tambahHari(hariIni(), 1));

    await expect(
      service.buat({ ...DTO_DASAR, tanggalMcu: besok } as any, aktor(UserRole.HC)),
    ).rejects.toThrow(/paling lambat H-3 hari/);
  });

  it('menolak kalau karyawan masih punya jadwal berjalan (DRAFT/TERKUNCI)', async () => {
    const { service } = buatService({ jadwalBerjalan: jadwalFixture() });

    await expect(service.buat(DTO_DASAR as any, aktor(UserRole.HC))).rejects.toThrow(/masih memiliki jadwal MCU berjalan/);
  });

  it('menolak klinik yang tidak aktif', async () => {
    const { service } = buatService({ klinik: { id: 1, statusAktif: false } });

    await expect(service.buat({ ...DTO_DASAR, klinikId: 1 } as any, aktor(UserRole.HC))).rejects.toThrow(
      'Klinik sedang tidak aktif',
    );
  });

  it('berhasil membuat jadwal berstatus DRAFT dengan tanggalLock H-3 dari tanggalMcu', async () => {
    const { service, create } = buatService();
    const tanggalMcu = tambahHari(hariIni(), 10);

    await service.buat({ ...DTO_DASAR, tanggalMcu: isoTanggal(tanggalMcu) } as any, aktor(UserRole.HC, 9));

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          statusPendaftaran: StatusPendaftaran.DRAFT,
          dibuatOlehId: 9,
          tanggalLock: tambahHari(tanggalMcu, -3),
        }),
      }),
    );
  });
});

describe('McuJadwalService.buatBatch', () => {
  it('tetap memproses item lain walau satu item gagal (tidak fail-fast)', async () => {
    let panggilanKe = 0;
    const prisma = {
      karyawan: {
        findUnique: jest.fn().mockImplementation(() => {
          panggilanKe += 1;
          return Promise.resolve(panggilanKe === 1 ? null : karyawanFixture());
        }),
      },
      jadwalMcu: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn(({ data }) => Promise.resolve({ id: 2, ...data, karyawan: karyawanFixture(), klinik: null })),
      },
      klinik: { findUnique: jest.fn() },
      departemen: { findMany: jest.fn().mockResolvedValue([{ id: 3 }]) },
    } as unknown as PrismaService;
    const akses = new McuAksesService(prisma);
    const notifikasi = {
      penerimaPeran: jest.fn().mockResolvedValue([]),
      kirimBanyak: jest.fn().mockResolvedValue(undefined),
      duaKanal: jest.fn().mockReturnValue([]),
    } as unknown as McuNotifikasiService;
    const service = new McuJadwalService(prisma, akses, notifikasi);

    const hasil = await service.buatBatch(
      { jadwal: [{ ...DTO_DASAR, karyawanId: 1 }, { ...DTO_DASAR, karyawanId: 2 }] } as any,
      aktor(UserRole.HC),
    );

    expect(hasil.totalBerhasil).toBe(1);
    expect(hasil.gagal).toHaveLength(1);
    expect(hasil.gagal[0].karyawanId).toBe(1);
  });
});

describe('McuJadwalService.ubah', () => {
  it('melempar NotFoundException kalau jadwal tidak ada', async () => {
    const { service } = buatService({ jadwalFindUnique: null });

    await expect(service.ubah(1, {} as any, aktor(UserRole.HC))).rejects.toThrow(NotFoundException);
  });

  it('menolak ubah jadwal yang sudah SELESAI', async () => {
    const { service } = buatService({
      jadwalFindUnique: jadwalFixture({ statusPendaftaran: StatusPendaftaran.SELESAI }),
    });

    await expect(service.ubah(1, {} as any, aktor(UserRole.HC))).rejects.toThrow(
      'Jadwal yang sudah selesai tidak dapat diubah',
    );
  });

  it('jadwal yang sudah terkunci hanya bisa diubah HC, bukan Admin Dept', async () => {
    const { service } = buatService({
      jadwalFindUnique: jadwalFixture({ statusPendaftaran: StatusPendaftaran.TERKUNCI }),
    });

    await expect(service.ubah(1, {} as any, aktor(UserRole.ADMIN_DEPT))).rejects.toThrow(ForbiddenException);
  });

  it('jadwal belum terkunci: Admin Dept di luar departemennya ditolak', async () => {
    const { service } = buatService({
      jadwalFindUnique: jadwalFixture({ statusPendaftaran: StatusPendaftaran.DRAFT, departemenId: 3 }),
      departemenFindMany: jest.fn().mockResolvedValue([{ id: 99 }]),
    });

    await expect(service.ubah(1, {} as any, aktor(UserRole.ADMIN_DEPT))).rejects.toThrow(ForbiddenException);
  });

  it('HC mengubah jadwal terkunci -> tercatat diubahOlehHcId & alasan', async () => {
    const { service, update } = buatService({
      jadwalFindUnique: jadwalFixture({ statusPendaftaran: StatusPendaftaran.TERKUNCI }),
    });

    await service.ubah(1, { alasanPerubahanHc: 'Klinik penuh' } as any, aktor(UserRole.HC, 5));

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ diubahOlehHcId: 5, alasanPerubahanHc: 'Klinik penuh' }),
      }),
    );
  });

  it('HC boleh mengubah tanggal ke kurang dari H-3 hari (override lock)', async () => {
    const { service, update } = buatService({
      jadwalFindUnique: jadwalFixture({ statusPendaftaran: StatusPendaftaran.TERKUNCI }),
    });
    const besok = isoTanggal(tambahHari(hariIni(), 1));

    await expect(
      service.ubah(1, { tanggalMcu: besok } as any, aktor(UserRole.HC)),
    ).resolves.toBeDefined();
    expect(update).toHaveBeenCalled();
  });

  it('Admin Dept (belum terkunci) TETAP kena aturan H-3 hari kalau ganti tanggal', async () => {
    const { service } = buatService({
      jadwalFindUnique: jadwalFixture({ statusPendaftaran: StatusPendaftaran.DRAFT, departemenId: 3 }),
    });
    const besok = isoTanggal(tambahHari(hariIni(), 1));

    await expect(service.ubah(1, { tanggalMcu: besok } as any, aktor(UserRole.ADMIN_DEPT))).rejects.toThrow(
      /paling lambat H-3 hari/,
    );
  });
});

describe('McuJadwalService.batalkan', () => {
  it('menolak role selain HC', async () => {
    const { service } = buatService();

    await expect(
      service.batalkan(1, { alasanPerubahanHc: 'x' } as any, aktor(UserRole.ADMIN_DEPT)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('menolak membatalkan jadwal yang sudah SELESAI', async () => {
    const { service } = buatService({
      jadwalFindUnique: jadwalFixture({ statusPendaftaran: StatusPendaftaran.SELESAI }),
    });

    await expect(service.batalkan(1, { alasanPerubahanHc: 'x' } as any, aktor(UserRole.HC))).rejects.toThrow(
      'Jadwal yang sudah selesai tidak dapat dibatalkan',
    );
  });

  it('HC berhasil membatalkan jadwal -> status DIBATALKAN', async () => {
    const { service, update } = buatService();

    await service.batalkan(1, { alasanPerubahanHc: 'Karyawan cuti' } as any, aktor(UserRole.HC));

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statusPendaftaran: StatusPendaftaran.DIBATALKAN }),
      }),
    );
  });
});

describe('McuJadwalService.kunciJadwalJatuhTempo', () => {
  it('mengunci semua jadwal DRAFT yang tanggalLock-nya sudah lewat', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 3 });
    const { service } = buatService({ updateMany });

    const hasil = await service.kunciJadwalJatuhTempo();

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ statusPendaftaran: StatusPendaftaran.DRAFT }),
        data: { statusPendaftaran: StatusPendaftaran.TERKUNCI },
      }),
    );
    expect(hasil).toEqual({ terkunci: 3 });
  });
});

describe('McuJadwalService.detail — status lock terhitung benar', () => {
  it('terkunci true kalau sisa hari sampai tanggalLock <= 0', async () => {
    const { service } = buatService({
      jadwalFindUnique: jadwalFixture({
        statusPendaftaran: StatusPendaftaran.DRAFT,
        tanggalLock: tambahHari(hariIni(), -1),
      }),
    });

    const hasil = await service.detail(1);

    expect(hasil.terkunci).toBe(true);
  });

  it('terkunci false kalau masih ada sisa hari sebelum tanggalLock', async () => {
    const { service } = buatService({
      jadwalFindUnique: jadwalFixture({
        statusPendaftaran: StatusPendaftaran.DRAFT,
        tanggalLock: tambahHari(hariIni(), 5),
      }),
    });

    const hasil = await service.detail(1);

    expect(hasil.terkunci).toBe(false);
  });
});
