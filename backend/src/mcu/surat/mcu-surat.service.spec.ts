import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { StatusPendaftaran, StatusSuratPengantar, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { McuAksesService } from '../common/mcu-akses.service';
import { AktorMcu } from '../common/mcu-aktor';
import { McuNotifikasiService } from '../notifikasi/mcu-notifikasi.service';
import { McuSuratService } from './mcu-surat.service';

function aktor(role: UserRole, id = 1): AktorMcu {
  return { id, role, username: 'test' };
}

function jadwalFixture(id: number, overrides: Partial<{ suratPengantarId: number | null; statusPendaftaran: StatusPendaftaran }> = {}) {
  return {
    id,
    suratPengantarId: 'suratPengantarId' in overrides ? overrides.suratPengantarId : null,
    statusPendaftaran: overrides.statusPendaftaran ?? StatusPendaftaran.DRAFT,
  };
}

function suratFixture(overrides: Partial<{ status: StatusSuratPengantar }> = {}) {
  return {
    id: 1,
    nomorSurat: '01/S-Out/HCGA/PPA-Adw/I/2026',
    status: overrides.status ?? StatusSuratPengantar.DRAFT,
    klinik: { id: 5, namaKlinik: 'Klinik A', terkoneksi: false, akunId: null },
    jadwalMcu: [{ karyawan: { nik: '1', nama: 'Budi', akunId: 70, email: 'b@x.com' }, departemen: { namaDepartemen: 'GA' }, jenisPemeriksaan: 'Berkala', tanggalMcu: new Date() }],
    tanggalTerbit: new Date(),
    catatan: null,
  };
}

function buatService(overrides: {
  klinik?: unknown;
  jadwalList?: unknown[];
  suratTerakhir?: unknown;
  suratCreate?: jest.Mock;
  jadwalUpdateDalamTx?: jest.Mock;
  suratDetail?: unknown;
  suratUpdate?: jest.Mock;
} = {}) {
  const suratCreate = overrides.suratCreate ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const jadwalUpdateDalamTx = overrides.jadwalUpdateDalamTx ?? jest.fn().mockResolvedValue({});
  const suratUpdate = overrides.suratUpdate ?? jest.fn(({ data }) => Promise.resolve({ ...(suratFixture() as object), ...data }));
  const suratFindFirst = jest.fn().mockResolvedValue(overrides.suratTerakhir ?? null);

  const prisma = {
    klinik: { findUnique: jest.fn().mockResolvedValue('klinik' in overrides ? overrides.klinik : { id: 5 }) },
    jadwalMcu: {
      findMany: jest.fn().mockResolvedValue(overrides.jadwalList ?? [jadwalFixture(1), jadwalFixture(2)]),
    },
    suratPengantar: {
      findFirst: suratFindFirst,
      findUnique: jest.fn().mockResolvedValue('suratDetail' in overrides ? overrides.suratDetail : suratFixture()),
      update: suratUpdate,
    },
    $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        suratPengantar: { findFirst: suratFindFirst, create: suratCreate },
        jadwalMcu: { update: jadwalUpdateDalamTx },
      }),
    ),
  } as unknown as PrismaService;

  const akses = new McuAksesService(prisma);
  const notifikasi = {
    kirimBanyak: jest.fn().mockResolvedValue(undefined),
    duaKanal: jest.fn().mockReturnValue([]),
  } as unknown as McuNotifikasiService;

  const service = new McuSuratService(prisma, akses, notifikasi);

  return { service, suratCreate, jadwalUpdateDalamTx, suratUpdate };
}

const DTO_DASAR = {
  klinikId: 5,
  jadwal: [{ jadwalMcuId: 1, jenisPemeriksaan: 'Berkala', tanggalMcu: '2026-01-10' }],
};

describe('McuSuratService.terbitkan — validasi', () => {
  it('menolak role selain HC', async () => {
    const { service } = buatService();

    await expect(service.terbitkan(DTO_DASAR as any, aktor(UserRole.ADMIN_DEPT))).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('melempar NotFoundException kalau klinik tidak ada', async () => {
    const { service } = buatService({ klinik: null });

    await expect(service.terbitkan(DTO_DASAR as any, aktor(UserRole.HC))).rejects.toThrow(NotFoundException);
  });

  it('menolak kalau sebagian jadwal MCU yang dipilih tidak ditemukan', async () => {
    const { service } = buatService({ jadwalList: [jadwalFixture(1)] });

    await expect(
      service.terbitkan(
        { ...DTO_DASAR, jadwal: [...DTO_DASAR.jadwal, { jadwalMcuId: 2, jenisPemeriksaan: 'Berkala', tanggalMcu: '2026-01-10' }] } as any,
        aktor(UserRole.HC),
      ),
    ).rejects.toThrow('Sebagian Jadwal MCU yang dipilih tidak ditemukan');
  });

  it('menolak jadwal yang sudah punya surat pengantar', async () => {
    const { service } = buatService({ jadwalList: [jadwalFixture(1, { suratPengantarId: 99 })] });

    await expect(service.terbitkan(DTO_DASAR as any, aktor(UserRole.HC))).rejects.toThrow(
      /sudah memiliki surat pengantar/,
    );
  });

  it('menolak jadwal yang sudah dibatalkan', async () => {
    const { service } = buatService({
      jadwalList: [jadwalFixture(1, { statusPendaftaran: StatusPendaftaran.DIBATALKAN })],
    });

    await expect(service.terbitkan(DTO_DASAR as any, aktor(UserRole.HC))).rejects.toThrow(/sudah dibatalkan/);
  });
});

describe('McuSuratService.terbitkan — nomor surat otomatis', () => {
  let cwdAwal: string;
  let direktoriUji: string;

  beforeEach(() => {
    cwdAwal = process.cwd();
    direktoriUji = mkdtempSync(join(tmpdir(), 'mcu-surat-'));
    process.chdir(direktoriUji);
  });

  afterEach(() => {
    process.chdir(cwdAwal);
    rmSync(direktoriUji, { recursive: true, force: true });
  });

  it('nomorUrut mulai dari 1 kalau belum ada surat tahun ini', async () => {
    const { service, suratCreate } = buatService({ jadwalList: [jadwalFixture(1)], suratTerakhir: null });

    await service.terbitkan(DTO_DASAR as any, aktor(UserRole.HC, 3));

    expect(suratCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ nomorUrut: 1, diterbitkanId: 3 }) }),
    );
  });

  it('nomorUrut lanjut dari surat terakhir tahun yang sama (mis. 5 -> 6)', async () => {
    const { service, suratCreate } = buatService({
      jadwalList: [jadwalFixture(1)],
      suratTerakhir: { nomorUrut: 5 },
    });

    await service.terbitkan(DTO_DASAR as any, aktor(UserRole.HC));

    expect(suratCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ nomorUrut: 6 }) }));
  });
});

describe('McuSuratService.kirim', () => {
  it('menolak role selain HC', async () => {
    const { service } = buatService();

    await expect(service.kirim(1, aktor(UserRole.ADMIN_DEPT))).rejects.toThrow(ForbiddenException);
  });

  it('menolak kirim surat yang sudah TERKIRIM', async () => {
    const { service } = buatService({ suratDetail: suratFixture({ status: StatusSuratPengantar.TERKIRIM }) });

    await expect(service.kirim(1, aktor(UserRole.HC))).rejects.toThrow('Surat pengantar sudah terkirim');
  });

  it('berhasil mengirim surat DRAFT -> status TERKIRIM', async () => {
    const { service, suratUpdate } = buatService({ suratDetail: suratFixture({ status: StatusSuratPengantar.DRAFT }) });

    await service.kirim(1, aktor(UserRole.HC));

    expect(suratUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: StatusSuratPengantar.TERKIRIM }) }),
    );
  });
});
