import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StatusInduksiUlang, StatusKerja, StatusKesehatanDirumahkan, StatusRekomendasi, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { McuAksesService } from '../common/mcu-akses.service';
import { AktorMcu } from '../common/mcu-aktor';
import { McuKaryawanService } from '../karyawan/mcu-karyawan.service';
import { McuNotifikasiService } from '../notifikasi/mcu-notifikasi.service';
import { McuInduksiService } from './mcu-induksi.service';

function aktor(role: UserRole, id = 1): AktorMcu {
  return { id, role, username: 'test' };
}

function rekomendasiFixture(overrides: Partial<{ status: StatusRekomendasi; induksiUlang: unknown }> = {}) {
  return {
    id: 1,
    status: overrides.status ?? StatusRekomendasi.FIT,
    induksiUlang: 'induksiUlang' in overrides ? overrides.induksiUlang : null,
    hasilMcu: {
      jadwalMcu: {
        karyawanId: 7,
        departemenId: 3,
        karyawan: { id: 7, nik: '1', nama: 'Budi' },
        departemen: { id: 3, namaDepartemen: 'GA' },
      },
    },
  };
}

function induksiFixture(overrides: Partial<{ status: StatusInduksiUlang; statusKerjaKaryawan: StatusKerja; sheId: number | null }> = {}) {
  return {
    id: 1,
    karyawanId: 7,
    sheId: overrides.sheId ?? null,
    status: overrides.status ?? StatusInduksiUlang.MENUNGGU,
    karyawan: { id: 7, nama: 'Budi', email: 'b@x.com', akunId: 70, statusKerja: overrides.statusKerjaKaryawan ?? StatusKerja.AKTIF },
    departemen: { id: 3, namaDepartemen: 'GA', adminAkunId: 30, adminAkun: { id: 30, email: 'a@x.com' } },
    rekomendasiPemic: { hasilMcu: { jadwalMcu: { tanggalMcu: new Date() } } },
  };
}

function buatService(overrides: {
  rekomendasi?: unknown;
  induksi?: unknown;
  departemenFindMany?: jest.Mock;
  create?: jest.Mock;
  update?: jest.Mock;
  karyawan?: unknown;
  karyawanUpdate?: jest.Mock;
  induksiUpdateDalamTx?: jest.Mock;
  karyawanUpdateDalamTx?: jest.Mock;
} = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data, karyawan: { id: 7, nik: '1', nama: 'Budi' }, departemen: { id: 3 } }));
  const update = overrides.update ?? jest.fn(({ data }) => Promise.resolve({ ...(induksiFixture() as object), ...data }));
  const karyawanUpdate = overrides.karyawanUpdate ?? jest.fn().mockResolvedValue({});
  const induksiUpdateDalamTx = overrides.induksiUpdateDalamTx ?? jest.fn(({ data }) => Promise.resolve({ ...(induksiFixture() as object), ...data }));
  const karyawanUpdateDalamTx = overrides.karyawanUpdateDalamTx ?? jest.fn().mockResolvedValue({});

  const prisma = {
    rekomendasiMcu: {
      findUnique: jest.fn().mockResolvedValue('rekomendasi' in overrides ? overrides.rekomendasi : rekomendasiFixture()),
    },
    induksiUlang: {
      findUnique: jest.fn().mockResolvedValue('induksi' in overrides ? overrides.induksi : induksiFixture()),
      create,
      update,
    },
    karyawan: {
      findUnique: jest.fn().mockResolvedValue('karyawan' in overrides ? overrides.karyawan : { id: 7, statusKerja: StatusKerja.DIRUMAHKAN }),
      update: karyawanUpdate,
    },
    departemen: { findMany: overrides.departemenFindMany ?? jest.fn().mockResolvedValue([{ id: 3 }]) },
    $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        induksiUlang: { update: induksiUpdateDalamTx },
        karyawan: { update: karyawanUpdateDalamTx },
      }),
    ),
  } as unknown as PrismaService;

  const akses = new McuAksesService(prisma);
  const karyawanService = { perbaruiMasaBerlaku: jest.fn().mockResolvedValue(undefined) } as unknown as McuKaryawanService;
  const notifikasi = {
    untukPeran: jest.fn().mockResolvedValue([]),
    penerimaPeran: jest.fn().mockResolvedValue([]),
    kirimBanyak: jest.fn().mockResolvedValue(undefined),
    duaKanal: jest.fn().mockReturnValue([]),
  } as unknown as McuNotifikasiService;

  const service = new McuInduksiService(prisma, akses, karyawanService, notifikasi);

  return { service, create, update, karyawanUpdate, induksiUpdateDalamTx, karyawanUpdateDalamTx, karyawanService };
}

describe('McuInduksiService.daftarkan', () => {
  it('menolak role selain Admin Dept/HC', async () => {
    const { service } = buatService();

    await expect(service.daftarkan(1, {} as any, aktor(UserRole.SHE))).rejects.toThrow(ForbiddenException);
  });

  it('melempar NotFoundException kalau rekomendasi tidak ada', async () => {
    const { service } = buatService({ rekomendasi: null });

    await expect(service.daftarkan(1, {} as any, aktor(UserRole.HC))).rejects.toThrow(NotFoundException);
  });

  it('menolak kalau rekomendasi bukan FIT', async () => {
    const { service } = buatService({ rekomendasi: rekomendasiFixture({ status: StatusRekomendasi.FOLLOW_UP }) });

    await expect(service.daftarkan(1, {} as any, aktor(UserRole.HC))).rejects.toThrow(
      'Induksi ulang hanya untuk rekomendasi berstatus FIT',
    );
  });

  it('menolak kalau rekomendasi sudah punya induksi ulang', async () => {
    const { service } = buatService({ rekomendasi: rekomendasiFixture({ induksiUlang: { id: 5 } }) });

    await expect(service.daftarkan(1, {} as any, aktor(UserRole.HC))).rejects.toThrow(
      'Induksi ulang untuk rekomendasi ini sudah didaftarkan',
    );
  });

  it('Admin Dept ditolak untuk karyawan di luar departemennya', async () => {
    const { service } = buatService({ departemenFindMany: jest.fn().mockResolvedValue([{ id: 99 }]) });

    await expect(service.daftarkan(1, {} as any, aktor(UserRole.ADMIN_DEPT))).rejects.toThrow(ForbiddenException);
  });

  it('berhasil mendaftarkan -> status MENUNGGU', async () => {
    const { service, create } = buatService();

    await service.daftarkan(1, { catatan: 'Segera' } as any, aktor(UserRole.HC));

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: StatusInduksiUlang.MENUNGGU }) }),
    );
  });
});

describe('McuInduksiService.jadwalkan', () => {
  it('menolak role selain SHE', async () => {
    const { service } = buatService();

    await expect(
      service.jadwalkan(1, { tanggalPelaksanaan: '2026-01-10' } as any, aktor(UserRole.HC)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('menolak menjadwalkan induksi yang sudah SELESAI', async () => {
    const { service } = buatService({ induksi: induksiFixture({ status: StatusInduksiUlang.SELESAI }) });

    await expect(
      service.jadwalkan(1, { tanggalPelaksanaan: '2026-01-10' } as any, aktor(UserRole.SHE)),
    ).rejects.toThrow('Induksi ulang sudah selesai');
  });

  it('berhasil menjadwalkan -> status TERJADWAL & sheId tercatat', async () => {
    const { service, update } = buatService();

    await service.jadwalkan(1, { tanggalPelaksanaan: '2026-01-10' } as any, aktor(UserRole.SHE, 8));

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: StatusInduksiUlang.TERJADWAL, sheId: 8 }),
      }),
    );
  });
});

describe('McuInduksiService.selesaikan', () => {
  it('menolak role selain SHE', async () => {
    const { service } = buatService();

    await expect(service.selesaikan(1, {} as any, aktor(UserRole.HC))).rejects.toThrow(ForbiddenException);
  });

  it('menolak menyelesaikan induksi yang sudah SELESAI', async () => {
    const { service } = buatService({ induksi: induksiFixture({ status: StatusInduksiUlang.SELESAI }) });

    await expect(service.selesaikan(1, {}, aktor(UserRole.SHE))).rejects.toThrow('Induksi ulang sudah selesai');
  });

  it('berhasil menyelesaikan -> memperbarui masa berlaku MCU karyawan', async () => {
    const { service, karyawanService } = buatService();

    await service.selesaikan(1, {}, aktor(UserRole.SHE));

    expect(karyawanService.perbaruiMasaBerlaku).toHaveBeenCalledWith(7, expect.any(Date), expect.anything());
  });

  it('karyawan berstatus DIRUMAHKAN diaktifkan kembali setelah induksi FIT MCU selesai', async () => {
    const { service, karyawanUpdateDalamTx } = buatService({
      induksi: induksiFixture({ statusKerjaKaryawan: StatusKerja.DIRUMAHKAN }),
      induksiUpdateDalamTx: jest.fn(({ data }) => Promise.resolve({ ...induksiFixture({ statusKerjaKaryawan: StatusKerja.DIRUMAHKAN }), ...data })),
    });

    await service.selesaikan(1, {}, aktor(UserRole.SHE));

    expect(karyawanUpdateDalamTx).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statusKerja: StatusKerja.AKTIF, statusKesehatanDirumahkan: null }),
      }),
    );
  });

  it('karyawan yang sudah AKTIF tidak ikut diubah statusnya', async () => {
    const { service, karyawanUpdateDalamTx } = buatService({
      induksi: induksiFixture({ statusKerjaKaryawan: StatusKerja.AKTIF }),
      induksiUpdateDalamTx: jest.fn(({ data }) => Promise.resolve({ ...induksiFixture({ statusKerjaKaryawan: StatusKerja.AKTIF }), ...data })),
    });

    await service.selesaikan(1, {}, aktor(UserRole.SHE));

    expect(karyawanUpdateDalamTx).not.toHaveBeenCalled();
  });
});

describe('McuInduksiService.tandaiFitSakit', () => {
  it('menolak role selain HC/Dokter', async () => {
    const { service } = buatService();

    await expect(service.tandaiFitSakit(7, aktor(UserRole.ADMIN_DEPT))).rejects.toThrow(ForbiddenException);
  });

  it('melempar NotFoundException kalau karyawan tidak ada', async () => {
    const { service } = buatService({ karyawan: null });

    await expect(service.tandaiFitSakit(7, aktor(UserRole.HC))).rejects.toThrow(NotFoundException);
  });

  it('menolak kalau karyawan tidak berstatus DIRUMAHKAN', async () => {
    const { service } = buatService({ karyawan: { id: 7, statusKerja: StatusKerja.AKTIF } });

    await expect(service.tandaiFitSakit(7, aktor(UserRole.HC))).rejects.toThrow(
      'Tahap FIT dari sakit hanya berlaku untuk karyawan dirumahkan',
    );
  });

  it('berhasil menandai FIT_SAKIT untuk karyawan dirumahkan', async () => {
    const { service, karyawanUpdate } = buatService({ karyawan: { id: 7, statusKerja: StatusKerja.DIRUMAHKAN } });

    await service.tandaiFitSakit(7, aktor(UserRole.DOKTER));

    expect(karyawanUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { statusKesehatanDirumahkan: StatusKesehatanDirumahkan.FIT_SAKIT },
      }),
    );
  });
});
