import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StatusPendaftaran, StatusReview, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { McuAksesService } from '../common/mcu-akses.service';
import { AktorMcu } from '../common/mcu-aktor';
import { McuFileService } from '../common/mcu-file.service';
import { McuNotifikasiService } from '../notifikasi/mcu-notifikasi.service';
import { McuHasilService } from './mcu-hasil.service';

function aktor(role: UserRole, id = 1): AktorMcu {
  return { id, role, username: 'test' };
}

function jadwalFixture(overrides: Partial<{
  statusPendaftaran: StatusPendaftaran;
  hasilMcu: unknown;
  klinikId: number | null;
}> = {}) {
  return {
    id: 1,
    klinikId: overrides.klinikId ?? 5,
    statusPendaftaran: overrides.statusPendaftaran ?? StatusPendaftaran.TERKUNCI,
    hasilMcu: 'hasilMcu' in overrides ? overrides.hasilMcu : null,
    karyawan: { id: 7, nik: '12345', nama: 'Budi', akunId: 70, email: 'budi@x.com' },
    klinik: { id: 5 },
  };
}

function hasilFixture(overrides: Partial<{ fileDihapusAt: Date | null; karyawanId: number }> = {}) {
  return {
    id: 1,
    fileHasilMcu: 'mcu/hasil-mcu/x.pdf',
    fileDihapusAt: overrides.fileDihapusAt ?? null,
    jadwalMcu: { karyawanId: overrides.karyawanId ?? 7 },
  };
}

function buatService(overrides: {
  jadwal?: unknown;
  hasil?: unknown;
  klinikDariAkun?: unknown;
  karyawanDariAkun?: unknown;
  create?: jest.Mock;
  jadwalUpdate?: jest.Mock;
  hasilUpdate?: jest.Mock;
  hasilFindMany?: jest.Mock;
  hasilCount?: jest.Mock;
} = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 10, ...data }));
  const jadwalUpdateDalamTx = jest.fn().mockResolvedValue({});
  const hasilUpdate = overrides.hasilUpdate ?? jest.fn(({ data }) => Promise.resolve({ ...(hasilFixture() as object), ...data }));
  const hasilFindMany = overrides.hasilFindMany ?? jest.fn().mockResolvedValue([]);
  const hasilCount = overrides.hasilCount ?? jest.fn().mockResolvedValue(0);

  const prisma = {
    jadwalMcu: {
      findUnique: jest.fn().mockResolvedValue('jadwal' in overrides ? overrides.jadwal : jadwalFixture()),
      findMany: jest.fn().mockResolvedValue([]),
    },
    hasilMcu: {
      findUnique: jest.fn().mockResolvedValue('hasil' in overrides ? overrides.hasil : hasilFixture()),
      update: hasilUpdate,
      findMany: hasilFindMany,
      count: hasilCount,
    },
    klinik: {
      findFirst: jest.fn().mockResolvedValue('klinikDariAkun' in overrides ? overrides.klinikDariAkun : { id: 5 }),
    },
    karyawan: {
      findUnique: jest.fn().mockResolvedValue('karyawanDariAkun' in overrides ? overrides.karyawanDariAkun : null),
    },
    $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        hasilMcu: { create },
        jadwalMcu: { update: jadwalUpdateDalamTx },
      }),
    ),
  } as unknown as PrismaService;

  const akses = new McuAksesService(prisma);
  const berkas = {
    simpan: jest.fn().mockReturnValue('mcu/hasil-mcu/x.pdf'),
    resolveAbsolut: jest.fn().mockReturnValue('/abs/mcu/hasil-mcu/x.pdf'),
  } as unknown as McuFileService;
  const notifikasi = {
    untukPeran: jest.fn().mockResolvedValue([]),
    kirimBanyak: jest.fn().mockResolvedValue(undefined),
  } as unknown as McuNotifikasiService;

  const service = new McuHasilService(prisma, akses, berkas, notifikasi);

  return { service, create, jadwalUpdateDalamTx, hasilUpdate, hasilFindMany, hasilCount };
}

const FILE = { originalname: 'hasil.pdf' } as Express.Multer.File;

describe('McuHasilService.unggah', () => {
  it('menolak role selain HC/Klinik', async () => {
    const { service } = buatService();

    await expect(service.unggah(1, FILE, aktor(UserRole.ADMIN_DEPT))).rejects.toThrow(ForbiddenException);
  });

  it('melempar NotFoundException kalau jadwal tidak ada', async () => {
    const { service } = buatService({ jadwal: null });

    await expect(service.unggah(1, FILE, aktor(UserRole.HC))).rejects.toThrow(NotFoundException);
  });

  it('menolak upload kalau hasil MCU untuk jadwal itu sudah ada', async () => {
    const { service } = buatService({ jadwal: jadwalFixture({ hasilMcu: { id: 99 } }) });

    await expect(service.unggah(1, FILE, aktor(UserRole.HC))).rejects.toThrow(
      'Hasil MCU untuk jadwal ini sudah diupload',
    );
  });

  it('menolak upload untuk jadwal yang sudah dibatalkan', async () => {
    const { service } = buatService({
      jadwal: jadwalFixture({ statusPendaftaran: StatusPendaftaran.DIBATALKAN }),
    });

    await expect(service.unggah(1, FILE, aktor(UserRole.HC))).rejects.toThrow('Jadwal MCU sudah dibatalkan');
  });

  it('Klinik ditolak upload untuk jadwal milik klinik lain', async () => {
    const { service } = buatService({
      jadwal: jadwalFixture({ klinikId: 5 }),
      klinikDariAkun: { id: 999 },
    });

    await expect(service.unggah(1, FILE, aktor(UserRole.KLINIK))).rejects.toThrow(ForbiddenException);
  });

  it('Klinik berhasil upload untuk jadwal miliknya sendiri', async () => {
    const { service, create } = buatService({
      jadwal: jadwalFixture({ klinikId: 5 }),
      klinikDariAkun: { id: 5 },
    });

    await expect(service.unggah(1, FILE, aktor(UserRole.KLINIK))).resolves.toBeDefined();
    expect(create).toHaveBeenCalled();
  });

  it('berhasil upload -> hasilMcu MENUNGGU review & jadwal jadi SELESAI', async () => {
    const { service, create, jadwalUpdateDalamTx } = buatService();

    await service.unggah(1, FILE, aktor(UserRole.HC, 9));

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ diunggahOlehId: 9, statusReview: StatusReview.MENUNGGU }),
      }),
    );
    expect(jadwalUpdateDalamTx).toHaveBeenCalledWith(
      expect.objectContaining({ data: { statusPendaftaran: StatusPendaftaran.SELESAI } }),
    );
  });
});

describe('McuHasilService.pathFile', () => {
  it.each([UserRole.HC, UserRole.DOKTER])('mengizinkan role %s membuka file', async (role) => {
    const { service } = buatService();

    await expect(service.pathFile(1, aktor(role))).resolves.toBe('/abs/mcu/hasil-mcu/x.pdf');
  });

  it.each([UserRole.ADMIN_DEPT, UserRole.KLINIK])(
    'menolak role %s membuka file medis mentah',
    async (role) => {
      const { service } = buatService();

      await expect(service.pathFile(1, aktor(role))).rejects.toThrow(ForbiddenException);
    },
  );

  it('Karyawan yang belum tertaut ke data karyawan ditolak', async () => {
    const { service } = buatService({ karyawanDariAkun: null });

    await expect(service.pathFile(1, aktor(UserRole.KARYAWAN))).rejects.toThrow(NotFoundException);
  });

  it('Karyawan yang bukan pemilik hasil MCU ini ditolak', async () => {
    const { service } = buatService({
      hasil: hasilFixture({ karyawanId: 7 }),
      karyawanDariAkun: { id: 999 },
    });

    await expect(service.pathFile(1, aktor(UserRole.KARYAWAN))).rejects.toThrow(NotFoundException);
  });

  it('Karyawan pemilik hasil MCU ini boleh unduh file miliknya sendiri', async () => {
    const { service } = buatService({
      hasil: hasilFixture({ karyawanId: 7 }),
      karyawanDariAkun: { id: 7 },
    });

    await expect(service.pathFile(1, aktor(UserRole.KARYAWAN))).resolves.toBe('/abs/mcu/hasil-mcu/x.pdf');
  });

  it('menolak kalau file sudah dihapus sesuai kebijakan retensi', async () => {
    const { service } = buatService({ hasil: hasilFixture({ fileDihapusAt: new Date() }) });

    await expect(service.pathFile(1, aktor(UserRole.HC))).rejects.toThrow(/sudah dihapus/);
  });
});

describe('McuHasilService.tandaiDireview', () => {
  it('menolak role selain Dokter/HC', async () => {
    const { service } = buatService();

    await expect(service.tandaiDireview(1, aktor(UserRole.ADMIN_DEPT))).rejects.toThrow(ForbiddenException);
  });

  it('berhasil menandai status DIREVIEW', async () => {
    const { service, hasilUpdate } = buatService();

    await service.tandaiDireview(1, aktor(UserRole.DOKTER));

    expect(hasilUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { statusReview: StatusReview.DIREVIEW } }),
    );
  });
});

describe('McuHasilService — Karyawan tidak boleh lihat daftar/antrean/detail administratif', () => {
  it('daftar() menolak Karyawan', async () => {
    const { service } = buatService();

    await expect(service.daftar({}, aktor(UserRole.KARYAWAN))).rejects.toThrow(ForbiddenException);
  });

  it('jadwalMenungguHasil() menolak Karyawan', async () => {
    const { service } = buatService();

    await expect(service.jadwalMenungguHasil(aktor(UserRole.KARYAWAN))).rejects.toThrow(ForbiddenException);
  });

  it('detailAdmin() menolak Karyawan', async () => {
    const { service } = buatService();

    await expect(service.detailAdmin(1, aktor(UserRole.KARYAWAN))).rejects.toThrow(ForbiddenException);
  });

  it('daftar() tetap boleh diakses HC', async () => {
    const { service, hasilFindMany } = buatService();

    await service.daftar({}, aktor(UserRole.HC));

    expect(hasilFindMany).toHaveBeenCalled();
  });
});

describe('McuHasilService.hasilSaya', () => {
  it('melempar NotFoundException kalau akun belum tertaut ke data karyawan', async () => {
    const { service } = buatService({ karyawanDariAkun: null });

    await expect(service.hasilSaya(aktor(UserRole.KARYAWAN))).rejects.toThrow(NotFoundException);
  });

  it('scoping ke karyawanId milik akun sendiri, mengabaikan input lain', async () => {
    const { service, hasilFindMany } = buatService({ karyawanDariAkun: { id: 7 } });

    await service.hasilSaya(aktor(UserRole.KARYAWAN, 70));

    expect(hasilFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ jadwalMcu: { karyawanId: 7 } }),
      }),
    );
  });

  it('select tidak menyertakan path file mentah (fileHasilMcu)', async () => {
    const { service, hasilFindMany } = buatService({ karyawanDariAkun: { id: 7 } });

    await service.hasilSaya(aktor(UserRole.KARYAWAN, 70));

    const panggilan = hasilFindMany.mock.calls[0][0];
    expect(panggilan.select.fileHasilMcu).toBeUndefined();
  });
});

describe('McuHasilService.daftar — pencarian nama/NIK karyawan', () => {
  it('tanpa filter cari, where tidak menyertakan jadwalMcu', async () => {
    const { service, hasilFindMany } = buatService();

    await service.daftar({}, aktor(UserRole.HC));

    const panggilan = hasilFindMany.mock.calls[0][0];
    expect(panggilan.where.jadwalMcu).toBeUndefined();
  });

  it('menerapkan pencarian nama/NIK karyawan (case-insensitive)', async () => {
    const { service, hasilFindMany } = buatService();

    await service.daftar({ cari: 'budi' }, aktor(UserRole.HC));

    expect(hasilFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          jadwalMcu: {
            karyawan: {
              OR: [
                { nama: { contains: 'budi', mode: 'insensitive' } },
                { nik: { contains: 'budi', mode: 'insensitive' } },
              ],
            },
          },
        }),
      }),
    );
  });

  it('menggabungkan filter statusReview dan cari sekaligus', async () => {
    const { service, hasilFindMany } = buatService();

    await service.daftar({ statusReview: StatusReview.MENUNGGU, cari: 'budi' }, aktor(UserRole.HC));

    expect(hasilFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          statusReview: StatusReview.MENUNGGU,
          jadwalMcu: expect.any(Object),
        }),
      }),
    );
  });
});
