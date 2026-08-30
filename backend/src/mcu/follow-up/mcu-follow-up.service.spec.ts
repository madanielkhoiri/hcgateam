import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StatusFollowUp, StatusReview, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { McuAksesService } from '../common/mcu-akses.service';
import { AktorMcu } from '../common/mcu-aktor';
import { McuFileService } from '../common/mcu-file.service';
import { McuNotifikasiService } from '../notifikasi/mcu-notifikasi.service';
import { hariIni, tambahBulan, tambahHari } from '../mcu-date.util';
import { McuFollowUpService } from './mcu-follow-up.service';

function aktor(role: UserRole, id = 1): AktorMcu {
  return { id, role, username: 'test' };
}

function followUpFixture(overrides: Partial<{
  status: StatusFollowUp;
  batasWaktuFu: Date | null;
  karyawanId: number;
  tanggalMcu: Date;
}> = {}) {
  return {
    id: 1,
    karyawanId: overrides.karyawanId ?? 7,
    status: overrides.status ?? StatusFollowUp.MENUNGGU_TANGGAL,
    batasWaktuFu: overrides.batasWaktuFu ?? null,
    jumlahReminderHc: 0,
    karyawan: {
      id: 7,
      nama: 'Budi',
      email: 'budi@x.com',
      akunId: 70,
      departemenId: 3,
      departemen: { id: 3, adminAkunId: 30, adminAkun: { id: 30, email: 'a@x.com' } },
    },
    rekomendasi: {
      hasilMcu: { jadwalMcu: { tanggalMcu: overrides.tanggalMcu ?? hariIni() } },
    },
  };
}

function buatService(overrides: {
  followUp?: unknown;
  update?: jest.Mock;
  karyawanDariAkun?: unknown;
  hasilFollowUpCreate?: jest.Mock;
} = {}) {
  const update = overrides.update ?? jest.fn(({ data }) => Promise.resolve({ ...(followUpFixture() as object), ...data }));
  const hasilFollowUpCreate = overrides.hasilFollowUpCreate ?? jest.fn(({ data }) => Promise.resolve({ id: 500, ...data }));
  const followUpUpdateDalamTx = jest.fn().mockResolvedValue({});

  const prisma = {
    followUp: {
      findUnique: jest.fn().mockResolvedValue('followUp' in overrides ? overrides.followUp : followUpFixture()),
      update,
      findMany: jest.fn().mockResolvedValue([]),
    },
    karyawan: {
      findUnique: jest.fn().mockResolvedValue(overrides.karyawanDariAkun ?? null),
    },
    $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        hasilFollowUp: { create: hasilFollowUpCreate },
        followUp: { update: followUpUpdateDalamTx },
      }),
    ),
  } as unknown as PrismaService;

  const akses = new McuAksesService(prisma);
  const berkas = { simpan: jest.fn().mockReturnValue('mcu/hasil-follow-up/x.pdf') } as unknown as McuFileService;
  const notifikasi = {
    penerimaPeran: jest.fn().mockResolvedValue([]),
    kirimBanyak: jest.fn().mockResolvedValue(undefined),
    duaKanal: jest.fn().mockReturnValue([]),
  } as unknown as McuNotifikasiService;

  const service = new McuFollowUpService(prisma, akses, berkas, notifikasi);

  return { service, prisma, update, hasilFollowUpCreate, followUpUpdateDalamTx };
}

function isoTanggal(date: Date): string {
  return date.toISOString().slice(0, 10);
}

describe('McuFollowUpService.tetapkanBatas', () => {
  it('menolak role selain HC', async () => {
    const { service } = buatService();

    await expect(
      service.tetapkanBatas(1, { batasWaktuFu: isoTanggal(hariIni()) } as any, aktor(UserRole.ADMIN_DEPT)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('menolak batas waktu melebihi maksimal (2 bulan setelah MCU ulang)', async () => {
    const tanggalMcu = hariIni();
    const { service } = buatService({ followUp: followUpFixture({ tanggalMcu }) });
    const batasTerlaluJauh = tambahBulan(tanggalMcu, 3);

    await expect(
      service.tetapkanBatas(1, { batasWaktuFu: isoTanggal(batasTerlaluJauh) } as any, aktor(UserRole.HC)),
    ).rejects.toThrow(/Batas waktu FU maksimal/);
  });

  it('menolak batas waktu di masa lalu', async () => {
    const { service } = buatService({ followUp: followUpFixture({ tanggalMcu: hariIni() }) });
    const kemarin = tambahHari(hariIni(), -1);

    await expect(
      service.tetapkanBatas(1, { batasWaktuFu: isoTanggal(kemarin) } as any, aktor(UserRole.HC)),
    ).rejects.toThrow('Batas waktu FU tidak boleh lebih awal dari hari ini');
  });

  it('berhasil menetapkan batas & mereset status TERLAMBAT_RESCHEDULE jadi MENUNGGU_TANGGAL', async () => {
    const { service, update } = buatService({
      followUp: followUpFixture({ status: StatusFollowUp.TERLAMBAT_RESCHEDULE, tanggalMcu: hariIni() }),
    });
    const batasValid = tambahHari(hariIni(), 10);

    await service.tetapkanBatas(1, { batasWaktuFu: isoTanggal(batasValid) } as any, aktor(UserRole.HC, 9));

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ditetapkanOlehHcId: 9,
          status: StatusFollowUp.MENUNGGU_TANGGAL,
        }),
      }),
    );
  });
});

describe('McuFollowUpService.pilihTanggal', () => {
  it('menolak karyawan lain yang bukan pemilik Follow Up', async () => {
    const { service } = buatService({
      followUp: followUpFixture({ karyawanId: 7, batasWaktuFu: tambahHari(hariIni(), 5) }),
      karyawanDariAkun: { id: 99 },
    });

    await expect(
      service.pilihTanggal(1, { tanggalPilihanKaryawan: isoTanggal(hariIni()) } as any, aktor(UserRole.KARYAWAN)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('menolak kalau HC belum menetapkan batas waktu', async () => {
    const { service } = buatService({ followUp: followUpFixture({ batasWaktuFu: null }) });

    await expect(
      service.pilihTanggal(1, { tanggalPilihanKaryawan: isoTanggal(hariIni()) } as any, aktor(UserRole.HC)),
    ).rejects.toThrow('HC belum menetapkan batas waktu Follow Up');
  });

  it('menolak tanggal pilihan di masa lalu', async () => {
    const { service } = buatService({
      followUp: followUpFixture({ batasWaktuFu: tambahHari(hariIni(), 10) }),
    });
    const kemarin = tambahHari(hariIni(), -1);

    await expect(
      service.pilihTanggal(1, { tanggalPilihanKaryawan: isoTanggal(kemarin) } as any, aktor(UserRole.HC)),
    ).rejects.toThrow('Tanggal Follow Up tidak boleh di masa lalu');
  });

  it('menolak tanggal pilihan melewati batas waktu', async () => {
    const { service } = buatService({
      followUp: followUpFixture({ batasWaktuFu: tambahHari(hariIni(), 5) }),
    });
    const lewatBatas = tambahHari(hariIni(), 10);

    await expect(
      service.pilihTanggal(1, { tanggalPilihanKaryawan: isoTanggal(lewatBatas) } as any, aktor(UserRole.HC)),
    ).rejects.toThrow(/melewati batas/);
  });

  it('berhasil memilih tanggal dalam batas -> status TERJADWAL', async () => {
    const { service, update } = buatService({
      followUp: followUpFixture({ batasWaktuFu: tambahHari(hariIni(), 10) }),
    });
    const pilihan = tambahHari(hariIni(), 3);

    await service.pilihTanggal(1, { tanggalPilihanKaryawan: isoTanggal(pilihan) } as any, aktor(UserRole.HC));

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: StatusFollowUp.TERJADWAL }) }),
    );
  });
});

describe('McuFollowUpService.unggahHasil', () => {
  const FILE = { originalname: 'hasil.pdf' } as Express.Multer.File;

  it('menolak karyawan lain yang bukan pemilik Follow Up', async () => {
    const { service } = buatService({
      followUp: followUpFixture({ karyawanId: 7 }),
      karyawanDariAkun: { id: 99 },
    });

    await expect(service.unggahHasil(1, FILE, aktor(UserRole.KARYAWAN))).rejects.toThrow(ForbiddenException);
  });

  it('menolak upload kalau Follow Up sudah SELESAI', async () => {
    const { service } = buatService({ followUp: followUpFixture({ status: StatusFollowUp.SELESAI }) });

    await expect(service.unggahHasil(1, FILE, aktor(UserRole.HC))).rejects.toThrow('Follow Up ini sudah ditutup');
  });

  it('berhasil upload -> catat hasilFollowUp MENUNGGU review & followUp jadi TERLAKSANA', async () => {
    const { service, hasilFollowUpCreate, followUpUpdateDalamTx } = buatService();

    await service.unggahHasil(1, FILE, aktor(UserRole.HC, 9));

    expect(hasilFollowUpCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ diunggahOlehId: 9, statusReview: StatusReview.MENUNGGU }),
      }),
    );
    expect(followUpUpdateDalamTx).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: StatusFollowUp.TERLAKSANA } }),
    );
  });
});

describe('McuFollowUpService.reminderFuTerlambat', () => {
  it('menolak role selain HC', async () => {
    const { service } = buatService();

    await expect(service.reminderFuTerlambat(1, {}, aktor(UserRole.ADMIN_DEPT))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('menolak kalau Follow Up sudah SELESAI', async () => {
    const { service } = buatService({ followUp: followUpFixture({ status: StatusFollowUp.SELESAI }) });

    await expect(service.reminderFuTerlambat(1, {}, aktor(UserRole.HC))).rejects.toThrow(
      'Follow Up ini sudah ditutup',
    );
  });

  it('berhasil menandai TERLAMBAT_RESCHEDULE & menambah jumlahReminderHc', async () => {
    const { service, update } = buatService();

    await service.reminderFuTerlambat(1, {}, aktor(UserRole.HC));

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: StatusFollowUp.TERLAMBAT_RESCHEDULE,
          jumlahReminderHc: { increment: 1 },
        }),
      }),
    );
  });
});

describe('McuFollowUpService.detail — melewatiBatas', () => {
  it('melewatiBatas true kalau batas sudah lewat dan status belum SELESAI', async () => {
    const { service } = buatService({
      followUp: followUpFixture({ batasWaktuFu: tambahHari(hariIni(), -3), status: StatusFollowUp.MENUNGGU_TANGGAL }),
    });

    const hasil = await service.detail(1);

    expect(hasil.melewatiBatas).toBe(true);
  });

  it('melewatiBatas false kalau status sudah SELESAI walau batas sudah lewat', async () => {
    const { service } = buatService({
      followUp: followUpFixture({ batasWaktuFu: tambahHari(hariIni(), -3), status: StatusFollowUp.SELESAI }),
    });

    const hasil = await service.detail(1);

    expect(hasil.melewatiBatas).toBe(false);
  });

  it('melempar NotFoundException kalau Follow Up tidak ada', async () => {
    const { service } = buatService({ followUp: null });

    await expect(service.detail(1)).rejects.toThrow(NotFoundException);
  });
});
