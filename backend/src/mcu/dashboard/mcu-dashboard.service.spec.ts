import { NotFoundException } from '@nestjs/common';
import { StatusRekomendasi } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { hariIni, tambahHari } from '../mcu-date.util';
import { McuDashboardService } from './mcu-dashboard.service';

function buatPrismaRingkasan(overrides: Record<string, number> = {}) {
  const nilai = (key: string, fallback: number) => overrides[key] ?? fallback;

  return {
    karyawan: {
      count: jest.fn()
        .mockResolvedValueOnce(nilai('karyawanAktif', 10))
        .mockResolvedValueOnce(nilai('jatuhTempo', 1))
        .mockResolvedValueOnce(nilai('dirumahkan', 2)),
    },
    jadwalMcu: {
      count: jest.fn()
        .mockResolvedValueOnce(nilai('jadwalDraft', 3))
        .mockResolvedValueOnce(nilai('jadwalTerkunci', 4)),
    },
    suratPengantar: { count: jest.fn().mockResolvedValue(nilai('suratDraft', 5)) },
    hasilMcu: { count: jest.fn().mockResolvedValue(nilai('hasilMenungguReview', 6)) },
    rekomendasiMcu: {
      count: jest.fn()
        .mockResolvedValueOnce(nilai('rekomendasiFit', 7))
        .mockResolvedValueOnce(nilai('rekomendasiFu', 8))
        .mockResolvedValueOnce(nilai('belumDiteruskan', 9)),
    },
    followUp: {
      count: jest.fn()
        .mockResolvedValueOnce(nilai('fuBerjalan', 11))
        .mockResolvedValueOnce(nilai('fuTerlambat', 12)),
    },
    induksiUlang: {
      count: jest.fn()
        .mockResolvedValueOnce(nilai('induksiMenunggu', 13))
        .mockResolvedValueOnce(nilai('induksiTerjadwal', 14)),
    },
  } as unknown as PrismaService;
}

describe('McuDashboardService.ringkasan', () => {
  it('mengembalikan seluruh angka kartu dashboard sesuai urutan query', async () => {
    const prisma = buatPrismaRingkasan();
    const service = new McuDashboardService(prisma);

    const hasil = await service.ringkasan();

    expect(hasil).toEqual({
      karyawanAktif: 10,
      karyawanDirumahkan: 2,
      reminderJatuhTempo: 1,
      jadwalDraft: 3,
      jadwalTerkunci: 4,
      suratMenungguKirim: 5,
      hasilMenungguReview: 6,
      rekomendasiFit: 7,
      rekomendasiFollowUp: 8,
      rekomendasiBelumDiteruskan: 9,
      followUpBerjalan: 11,
      followUpTerlambat: 12,
      induksiMenunggu: 13,
      induksiTerjadwal: 14,
    });
  });
});

describe('McuDashboardService.durasiProses', () => {
  function jadwalFixture(overrides: {
    createdAt?: Date;
    tanggalMcu?: Date;
    tanggalTerbit?: Date | null;
    tanggalUpload?: Date | null;
    rekomendasi?: unknown[];
  } = {}) {
    return {
      id: 1,
      karyawan: { id: 1, nik: '1', nama: 'Budi' },
      departemen: { namaDepartemen: 'GA' },
      tanggalMcu: overrides.tanggalMcu ?? hariIni(),
      jenisMcu: 'BERKALA',
      createdAt: overrides.createdAt ?? hariIni(),
      suratPengantar: 'tanggalTerbit' in overrides ? { tanggalTerbit: overrides.tanggalTerbit } : null,
      hasilMcu: overrides.rekomendasi === undefined && overrides.tanggalUpload === undefined
        ? null
        : { tanggalUpload: overrides.tanggalUpload ?? null, rekomendasi: overrides.rekomendasi ?? [] },
    };
  }

  it('durasi null kalau tahap belum terjadi (belum ada surat pengantar)', async () => {
    const findMany = jest.fn().mockResolvedValue([jadwalFixture()]);
    const prisma = { jadwalMcu: { findMany } } as unknown as PrismaService;
    const service = new McuDashboardService(prisma);

    const [hasil] = await service.durasiProses();

    expect(hasil.pendaftaranKeSurat).toBeNull();
    expect(hasil.jumlahSiklus).toBe(0);
    expect(hasil.statusAkhir).toBeNull();
  });

  it('menghitung durasi antar tahap dalam hari dengan benar', async () => {
    const createdAt = hariIni();
    const tanggalTerbit = tambahHari(createdAt, 4);
    const tanggalMcu = hariIni();
    const tanggalUpload = tambahHari(tanggalMcu, 2);
    const tanggalSubmitRekom = tambahHari(tanggalUpload, 1);

    const findMany = jest.fn().mockResolvedValue([
      jadwalFixture({
        createdAt,
        tanggalTerbit,
        tanggalMcu,
        tanggalUpload,
        rekomendasi: [
          {
            status: StatusRekomendasi.FIT,
            tanggalSubmit: tanggalSubmitRekom,
            diteruskanKeKaryawanAt: null,
            followUp: null,
            induksiUlang: null,
          },
        ],
      }),
    ]);
    const prisma = { jadwalMcu: { findMany } } as unknown as PrismaService;
    const service = new McuDashboardService(prisma);

    const [hasil] = await service.durasiProses();

    expect(hasil.pendaftaranKeSurat).toBe(4);
    expect(hasil.pelaksanaanKeUpload).toBe(2);
    expect(hasil.uploadKeRekomendasi).toBe(1);
    expect(hasil.jumlahSiklus).toBe(1);
    expect(hasil.statusAkhir).toBe(StatusRekomendasi.FIT);
  });

  it('statusAkhir mengambil siklus TERAKHIR kalau ada lebih dari satu rekomendasi (FU lalu FIT)', async () => {
    const findMany = jest.fn().mockResolvedValue([
      jadwalFixture({
        rekomendasi: [
          { status: StatusRekomendasi.FOLLOW_UP, tanggalSubmit: hariIni(), diteruskanKeKaryawanAt: null, followUp: null, induksiUlang: null },
          { status: StatusRekomendasi.FIT, tanggalSubmit: tambahHari(hariIni(), 30), diteruskanKeKaryawanAt: null, followUp: null, induksiUlang: null },
        ],
      }),
    ]);
    const prisma = { jadwalMcu: { findMany } } as unknown as PrismaService;
    const service = new McuDashboardService(prisma);

    const [hasil] = await service.durasiProses();

    expect(hasil.jumlahSiklus).toBe(2);
    expect(hasil.statusAkhir).toBe(StatusRekomendasi.FIT);
  });
});

describe('McuDashboardService.historyKaryawan', () => {
  it('melempar NotFoundException kalau karyawan tidak ada', async () => {
    const findUnique = jest.fn().mockResolvedValue(null);
    const prisma = { karyawan: { findUnique } } as unknown as PrismaService;
    const service = new McuDashboardService(prisma);

    await expect(service.historyKaryawan(1)).rejects.toThrow(NotFoundException);
  });

  it('menghitung statistik dari seluruh rekomendasi di semua jadwal MCU', async () => {
    const karyawan = {
      id: 1,
      nik: '1',
      nama: 'Budi',
      jabatan: 'Staff',
      departemen: { id: 1, namaDepartemen: 'GA' },
      statusKerja: 'AKTIF',
      statusKesehatanDirumahkan: null,
      tanggalMcuTerakhir: null,
      tanggalMcuExpired: null,
      tanggalMcuBerikutnya: null,
      jadwalMcu: [
        { hasilMcu: { rekomendasi: [{ status: StatusRekomendasi.FOLLOW_UP }, { status: StatusRekomendasi.FIT }] } },
        { hasilMcu: { rekomendasi: [{ status: StatusRekomendasi.FIT }] } },
        { hasilMcu: null },
      ],
    };
    const findUnique = jest.fn().mockResolvedValue(karyawan);
    const prisma = { karyawan: { findUnique } } as unknown as PrismaService;
    const service = new McuDashboardService(prisma);

    const hasil = await service.historyKaryawan(1);

    expect(hasil.statistik).toEqual({
      totalJadwal: 3,
      totalRekomendasi: 3,
      totalSiklusFollowUp: 1,
      totalFit: 2,
    });
  });
});
