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

function hasilFixture(overrides: Partial<{ fileDihapusAt: Date | null }> = {}) {
  return {
    id: 1,
    fileHasilMcu: 'mcu/hasil-mcu/x.pdf',
    fileDihapusAt: overrides.fileDihapusAt ?? null,
  };
}

function buatService(overrides: {
  jadwal?: unknown;
  hasil?: unknown;
  klinikDariAkun?: unknown;
  create?: jest.Mock;
  jadwalUpdate?: jest.Mock;
  hasilUpdate?: jest.Mock;
} = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 10, ...data }));
  const jadwalUpdateDalamTx = jest.fn().mockResolvedValue({});
  const hasilUpdate = overrides.hasilUpdate ?? jest.fn(({ data }) => Promise.resolve({ ...(hasilFixture() as object), ...data }));

  const prisma = {
    jadwalMcu: {
      findUnique: jest.fn().mockResolvedValue('jadwal' in overrides ? overrides.jadwal : jadwalFixture()),
      findMany: jest.fn().mockResolvedValue([]),
    },
    hasilMcu: {
      findUnique: jest.fn().mockResolvedValue('hasil' in overrides ? overrides.hasil : hasilFixture()),
      update: hasilUpdate,
    },
    klinik: {
      findFirst: jest.fn().mockResolvedValue('klinikDariAkun' in overrides ? overrides.klinikDariAkun : { id: 5 }),
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

  return { service, create, jadwalUpdateDalamTx, hasilUpdate };
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

  it.each([UserRole.KARYAWAN, UserRole.ADMIN_DEPT, UserRole.KLINIK])(
    'menolak role %s membuka file medis mentah',
    async (role) => {
      const { service } = buatService();

      await expect(service.pathFile(1, aktor(role))).rejects.toThrow(ForbiddenException);
    },
  );

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
