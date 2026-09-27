import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { StatusSuratTugas, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SuratTugasDinasPdfService } from './surat-tugas-dinas-pdf.service';
import { SuratTugasDinasService } from './surat-tugas-dinas.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

function buatSurat(
  overrides: Partial<{ status: StatusSuratTugas; dibuatOlehId: number }> = {},
) {
  return {
    id: 1,
    nomor: 'STD-001',
    dibuatOlehId: overrides.dibuatOlehId ?? 20,
    status: overrides.status ?? StatusSuratTugas.MENUNGGU_SH,
  };
}

function buatSuratAsal(
  overrides: Partial<{
    tanggalMulai: Date;
    tanggalSelesai: Date;
    status: StatusSuratTugas;
  }> = {},
) {
  return {
    id: 99,
    nomor: 'STD-ASAL-001',
    denganAkomodasi: false,
    status: overrides.status ?? StatusSuratTugas.DISETUJUI,
    tujuanLokasi: 'Site Adaro',
    tanggalMulai: overrides.tanggalMulai ?? new Date('2026-01-01'),
    tanggalSelesai: overrides.tanggalSelesai ?? new Date('2026-01-03'),
    keteranganTugas: 'Training GLDP',
    karyawan: [
      {
        nrp: '111',
        nama: 'Budi dari STD',
        departemen: 'HCGA',
        jabatan: 'Admin',
      },
    ],
  };
}

function buatService(
  overrides: {
    findUnique?: jest.Mock;
    findFirst?: jest.Mock;
    findUniqueOrThrow?: jest.Mock;
    findMany?: jest.Mock;
    create?: jest.Mock;
    update?: jest.Mock;
    karyawanFindMany?: jest.Mock;
    kirimWhatsapp?: jest.Mock;
    urlPublikLampiran?: jest.Mock;
  } = {},
) {
  const findUnique = overrides.findUnique ?? jest.fn().mockResolvedValue(null);
  const findFirst = overrides.findFirst ?? jest.fn().mockResolvedValue(null);
  const findUniqueOrThrow =
    overrides.findUniqueOrThrow ?? jest.fn().mockResolvedValue(buatSurat());
  const create = overrides.create ?? jest.fn().mockResolvedValue({ id: 1 });
  const update = overrides.update ?? jest.fn().mockResolvedValue({});
  const findMany = overrides.findMany ?? jest.fn().mockResolvedValue([]);
  const karyawanFindMany =
    overrides.karyawanFindMany ?? jest.fn().mockResolvedValue([]);
  const prisma = {
    suratTugasDinas: {
      findUnique,
      findFirst,
      findUniqueOrThrow,
      findMany,
      create,
      update,
    },
    karyawan: { findMany: karyawanFindMany },
  } as unknown as PrismaService;
  const pdf = {
    buatFile: jest.fn().mockResolvedValue('surat-tugas-dinas/1.pdf'),
  } as unknown as SuratTugasDinasPdfService;
  const kirimWhatsapp =
    overrides.kirimWhatsapp ?? jest.fn().mockResolvedValue(true);
  const urlPublikLampiran =
    overrides.urlPublikLampiran ?? jest.fn().mockReturnValue(null);
  const whatsapp = {
    kirim: kirimWhatsapp,
    urlPublikLampiran,
  } as unknown as WhatsappService;
  const service = new SuratTugasDinasService(prisma, pdf, whatsapp);

  return {
    service,
    findUnique,
    findFirst,
    findUniqueOrThrow,
    findMany,
    create,
    update,
    karyawanFindMany,
    kirimWhatsapp,
    urlPublikLampiran,
    pdf,
  };
}

const SH = { id: 10, role: UserRole.SECTION_HEAD };
const PJO = { id: 11, role: UserRole.PJO };
const ADMIN = { id: 1, role: UserRole.ADMIN };
const KARYAWAN = { id: 20, role: UserRole.KARYAWAN };

const DTO_SURAT = {
  nomor: 'STD-002',
  tujuanLokasi: 'Jakarta',
  tanggalMulai: '2026-01-01',
  tanggalSelesai: '2026-01-03',
  keteranganTugas: 'Kunjungan proyek',
  karyawan: [{ nrp: '111', nama: 'Budi', departemen: 'GA', jabatan: 'Staff' }],
};

describe('SuratTugasDinasService.buat', () => {
  it('menolak nomor surat yang sudah dipakai', async () => {
    const { service } = buatService({
      findUnique: jest.fn().mockResolvedValue(buatSurat()),
    });

    await expect(service.buat(DTO_SURAT as any, KARYAWAN)).rejects.toThrow(
      'Nomor surat sudah digunakan',
    );
  });

  it('menolak tanggal selesai sebelum tanggal mulai', async () => {
    const { service } = buatService();

    await expect(
      service.buat(
        {
          ...DTO_SURAT,
          tanggalMulai: '2026-01-10',
          tanggalSelesai: '2026-01-01',
        } as any,
        KARYAWAN,
      ),
    ).rejects.toThrow('Tanggal selesai tidak boleh sebelum tanggal mulai');
  });

  it('surat baru selalu mulai dari status MENUNGGU_SH', async () => {
    const create = jest.fn().mockResolvedValue({ id: 1 });
    const { service } = buatService({ create });

    await service.buat(DTO_SURAT as any, KARYAWAN);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: StatusSuratTugas.MENUNGGU_SH }),
      }),
    );
  });

  it('STD biasa tidak menyimpan data akomodasi yang ikut terkirim', async () => {
    const create = jest.fn().mockResolvedValue({ id: 1 });
    const { service } = buatService({ create });

    await service.buat(
      {
        ...DTO_SURAT,
        denganAkomodasi: false,
        penginapanHotel: 'Hotel A',
        karyawan: [
          {
            ...DTO_SURAT.karyawan[0],
            uangPerjalananNominal: 100_000,
            akomodasiNominal: 200_000,
            laundryNominal: 50_000,
          },
        ],
      } as any,
      KARYAWAN,
    );

    const data = create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      denganAkomodasi: false,
      penginapanHotel: null,
      jumlahAkomodasi: 0,
      uangPerjalananNominal: null,
      akomodasiNominal: null,
      laundryNominal: null,
    });
    expect(data.karyawan.create[0]).toMatchObject({
      uangPerjalananNominal: null,
      akomodasiNominal: null,
      laundryNominal: null,
    });
  });

  it('STD Akomodasi menyimpan rincian dan menghitung total per karyawan', async () => {
    const create = jest.fn().mockResolvedValue({ id: 1 });
    const { service } = buatService({
      create,
      findFirst: jest.fn().mockResolvedValue(buatSuratAsal()),
    });

    await service.buat(
      {
        ...DTO_SURAT,
        denganAkomodasi: true,
        suratTugasAsalId: 99,
        penginapanHotel: 'Hotel Fave',
        bantuanTransportasi: 'Travel & Tiket Pesawat',
        rutePerjalanan: 'Bandara BDJ - CGK (PP)',
        karyawan: [
          {
            ...DTO_SURAT.karyawan[0],
            uangPerjalananNominal: 100_000,
            uangPerjalananKeterangan: 'Tidak boleh tersimpan',
            akomodasiNominal: 200_000,
            akomodasiKeterangan: 'Tidak boleh tersimpan',
            laundryNominal: 50_000,
            laundryKeterangan: 'Tidak boleh tersimpan',
            frekuensiMakan: 999,
            ruteTransportasiLokal: 'Bandara - Hotel (PP)',
          },
        ],
      } as any,
      KARYAWAN,
    );

    expect(create.mock.calls[0][0].data).toMatchObject({
      denganAkomodasi: true,
      jumlahAkomodasi: 350_000,
      uangPerjalananNominal: 100_000,
      akomodasiNominal: 200_000,
      laundryNominal: 50_000,
      suratTugasAsalId: 99,
      tujuanLokasi: 'Site Adaro',
      keteranganTugas: 'Training GLDP',
      penginapanHotel: 'Hotel Fave',
      bantuanTransportasi: 'Travel & Tiket Pesawat',
      rutePerjalanan: 'Bandara BDJ - CGK (PP)',
    });
    expect(create.mock.calls[0][0].data.karyawan.create[0]).toMatchObject({
      nrp: '111',
      nama: 'Budi dari STD',
      departemen: 'HCGA',
      jabatan: 'Admin',
      uangPerjalananKeterangan: null,
      akomodasiKeterangan: null,
      laundryKeterangan: null,
      frekuensiMakan: 9,
      ruteTransportasiLokal: 'Bandara - Hotel (PP)',
    });
  });

  it('mengabaikan laundry bila perjalanan kurang dari 3 hari', async () => {
    const create = jest.fn().mockResolvedValue({ id: 1 });
    const { service } = buatService({
      create,
      findFirst: jest.fn().mockResolvedValue(
        buatSuratAsal({
          tanggalSelesai: new Date('2026-01-02'),
        }),
      ),
    });

    await service.buat(
      {
        ...DTO_SURAT,
        denganAkomodasi: true,
        suratTugasAsalId: 99,
        tanggalSelesai: '2026-01-02',
        karyawan: [
          {
            ...DTO_SURAT.karyawan[0],
            uangPerjalananNominal: 100_000,
            akomodasiNominal: 200_000,
            laundryNominal: 50_000,
            laundryKeterangan: 'Titipan tidak valid',
          },
        ],
      } as any,
      KARYAWAN,
    );

    const data = create.mock.calls[0][0].data;
    expect(data).toMatchObject({
      jumlahAkomodasi: 300_000,
      laundryNominal: null,
    });
    expect(data.karyawan.create[0]).toMatchObject({
      laundryNominal: null,
      laundryKeterangan: null,
    });
  });

  it('menolak STD Akomodasi tanpa surat tugas asal yang disetujui penuh', async () => {
    const { service } = buatService();

    await expect(
      service.buat({ ...DTO_SURAT, denganAkomodasi: true } as any, KARYAWAN),
    ).rejects.toThrow(
      'Pilih karyawan dari Surat Tugas Dinas yang sudah disetujui',
    );
  });

  it('menolak karyawan yang tidak ada pada surat tugas asal', async () => {
    const { service } = buatService({
      findFirst: jest.fn().mockResolvedValue(buatSuratAsal()),
    });

    await expect(
      service.buat(
        {
          ...DTO_SURAT,
          denganAkomodasi: true,
          suratTugasAsalId: 99,
          karyawan: [
            {
              nrp: '999',
              nama: 'Tidak Terdaftar',
              departemen: 'X',
              jabatan: 'X',
            },
          ],
        } as any,
        KARYAWAN,
      ),
    ).rejects.toThrow('tidak terdaftar pada Surat Tugas Dinas asal');
  });
});

describe('SuratTugasDinasService.pilihanAkomodasi', () => {
  it('meratakan karyawan dari STD final beserta keterangan tugasnya', async () => {
    const findMany = jest.fn().mockResolvedValue([buatSuratAsal()]);
    const { service } = buatService({ findMany });

    await expect(service.pilihanAkomodasi('budi')).resolves.toEqual([
      expect.objectContaining({
        suratTugasId: 99,
        nrp: '111',
        nama: 'Budi dari STD',
        keteranganTugas: 'Training GLDP',
      }),
    ]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: StatusSuratTugas.DISETUJUI,
          denganAkomodasi: false,
        }),
      }),
    );
  });
});

describe('SuratTugasDinasService.setujui — alur SH -> PJO', () => {
  it('SH menyetujui tahap MENUNGGU_SH -> pindah ke MENUNGGU_PJO', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue(buatSurat({ status: StatusSuratTugas.MENUNGGU_SH }));
    const update = jest.fn().mockResolvedValue({});
    const { service } = buatService({ findUnique, update });

    await service.setujui(1, SH);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: StatusSuratTugas.MENUNGGU_PJO,
          disetujuiShOlehId: 10,
        }),
      }),
    );
  });

  it('menolak PJO menyetujui tahap MENUNGGU_SH (bukan tahapnya)', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue(buatSurat({ status: StatusSuratTugas.MENUNGGU_SH }));
    const { service } = buatService({ findUnique });

    await expect(service.setujui(1, PJO)).rejects.toThrow(ForbiddenException);
  });

  it('PJO menyetujui tahap MENUNGGU_PJO -> status akhir DISETUJUI', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue(buatSurat({ status: StatusSuratTugas.MENUNGGU_PJO }));
    const update = jest.fn().mockResolvedValue({});
    const { service } = buatService({ findUnique, update });

    await service.setujui(1, PJO);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: StatusSuratTugas.DISETUJUI,
          disetujuiPjoOlehId: 11,
        }),
      }),
    );
  });

  it('mengirim WA ke karyawan setelah persetujuan PJO selesai', async () => {
    const suratFinal = {
      ...buatSurat({ status: StatusSuratTugas.DISETUJUI }),
      nomor: 'STD-001',
      tujuanLokasi: 'Jakarta',
      tanggalMulai: new Date('2026-01-01'),
      tanggalSelesai: new Date('2026-01-03'),
      keteranganTugas: 'Pelatihan',
      filePdf: 'surat-tugas-dinas/std-001.pdf',
      karyawan: [
        {
          nrp: '111',
          nama: 'Budi',
        },
      ],
    };
    const findUnique = jest
      .fn()
      .mockResolvedValue(buatSurat({ status: StatusSuratTugas.MENUNGGU_PJO }));
    const update = jest
      .fn()
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(suratFinal);
    const kirimWhatsapp = jest.fn().mockResolvedValue(true);
    const { service } = buatService({
      findUnique,
      update,
      karyawanFindMany: jest.fn().mockResolvedValue([
        {
          nik: '111',
          nama: 'Budi',
          gender: null,
          noTelepon: '08123456789',
          akun: null,
        },
      ]),
      kirimWhatsapp,
      urlPublikLampiran: jest
        .fn()
        .mockReturnValue('https://example.test/std-001.pdf'),
    });

    await service.setujui(1, PJO);

    expect(kirimWhatsapp).toHaveBeenCalledWith(
      '08123456789',
      expect.stringContaining('telah mendapatkan persetujuan lengkap'),
      expect.objectContaining({
        url: 'https://example.test/std-001.pdf',
      }),
      'HC',
    );
  });

  it('menolak SH menyetujui tahap MENUNGGU_PJO (bukan tahapnya)', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue(buatSurat({ status: StatusSuratTugas.MENUNGGU_PJO }));
    const { service } = buatService({ findUnique });

    await expect(service.setujui(1, SH)).rejects.toThrow(ForbiddenException);
  });

  it('Admin/Super Admin boleh menyetujui tahap apa pun', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue(buatSurat({ status: StatusSuratTugas.MENUNGGU_SH }));
    const update = jest.fn().mockResolvedValue({});
    const { service } = buatService({ findUnique, update });

    await service.setujui(1, ADMIN);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ disetujuiShOlehId: 1 }),
      }),
    );
  });

  it('karyawan biasa tidak boleh menyetujui', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue(buatSurat({ status: StatusSuratTugas.MENUNGGU_SH }));
    const { service } = buatService({ findUnique });

    await expect(service.setujui(1, KARYAWAN)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('menolak approve ulang surat yang sudah DISETUJUI', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue(buatSurat({ status: StatusSuratTugas.DISETUJUI }));
    const { service } = buatService({ findUnique });

    await expect(service.setujui(1, ADMIN)).rejects.toThrow(
      'Surat sudah diproses sebelumnya',
    );
  });

  it('melempar NotFoundException kalau surat tidak ada', async () => {
    const { service } = buatService({
      findUnique: jest.fn().mockResolvedValue(null),
    });

    await expect(service.setujui(1, ADMIN)).rejects.toThrow(NotFoundException);
  });
});

describe('SuratTugasDinasService.tolak', () => {
  it('SH bisa menolak di tahap MENUNGGU_SH dengan alasan', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue(buatSurat({ status: StatusSuratTugas.MENUNGGU_SH }));
    const update = jest.fn().mockResolvedValue({});
    const { service } = buatService({ findUnique, update });

    await service.tolak(1, { alasan: 'Dokumen tidak lengkap' } as any, SH);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: StatusSuratTugas.DITOLAK,
          alasanTolak: 'Dokumen tidak lengkap',
        }),
      }),
    );
  });

  it('menolak (ForbiddenException) kalau yang menolak bukan role tahap itu', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue(buatSurat({ status: StatusSuratTugas.MENUNGGU_PJO }));
    const { service } = buatService({ findUnique });

    await expect(service.tolak(1, { alasan: 'x' } as any, SH)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('tidak bisa menolak surat yang sudah final (DISETUJUI/DITOLAK)', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue(buatSurat({ status: StatusSuratTugas.DITOLAK }));
    const { service } = buatService({ findUnique });

    await expect(
      service.tolak(1, { alasan: 'x' } as any, ADMIN),
    ).rejects.toThrow('Surat sudah diproses sebelumnya');
  });
});

describe('SuratTugasDinasService.daftar & detail — visibilitas', () => {
  it('karyawan biasa cuma melihat surat buatannya sendiri', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      suratTugasDinas: { findMany, count },
    } as unknown as PrismaService;
    const pdf = {} as unknown as SuratTugasDinasPdfService;
    const whatsapp = {} as unknown as WhatsappService;
    const service = new SuratTugasDinasService(prisma, pdf, whatsapp);

    await service.daftar(KARYAWAN);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ dibuatOlehId: 20 }),
      }),
    );
  });

  it('Section Head/PJO/Admin melihat SEMUA surat, bukan cuma buatan sendiri', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      suratTugasDinas: { findMany, count },
    } as unknown as PrismaService;
    const pdf = {} as unknown as SuratTugasDinasPdfService;
    const whatsapp = {} as unknown as WhatsappService;
    const service = new SuratTugasDinasService(prisma, pdf, whatsapp);

    await service.daftar(SH);

    const where = findMany.mock.calls[0][0].where;
    expect(where).not.toHaveProperty('dibuatOlehId');
  });

  it('detail menolak karyawan lain yang bukan pembuat & bukan penyetuju', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue(buatSurat({ dibuatOlehId: 99 }));
    const { service } = buatService({ findUnique });

    await expect(service.detail(1, KARYAWAN)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('detail mengizinkan pembuat sendiri melihat suratnya', async () => {
    const findUnique = jest
      .fn()
      .mockResolvedValue(buatSurat({ dibuatOlehId: 20 }));
    const { service } = buatService({ findUnique });

    await expect(service.detail(1, KARYAWAN)).resolves.toMatchObject({
      dibuatOlehId: 20,
    });
  });
});

describe('SuratTugasDinasService.daftar — pencarian (cari)', () => {
  it('tanpa filter cari kalau tidak diberikan', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      suratTugasDinas: { findMany, count },
    } as unknown as PrismaService;
    const pdf = {} as unknown as SuratTugasDinasPdfService;
    const whatsapp = {} as unknown as WhatsappService;
    const service = new SuratTugasDinasService(prisma, pdf, whatsapp);

    await service.daftar(SH);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('menerapkan pencarian nomor/tujuan lokasi/nama & nrp karyawan (case-insensitive)', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      suratTugasDinas: { findMany, count },
    } as unknown as PrismaService;
    const pdf = {} as unknown as SuratTugasDinasPdfService;
    const whatsapp = {} as unknown as WhatsappService;
    const service = new SuratTugasDinasService(prisma, pdf, whatsapp);

    await service.daftar(
      SH,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      'budi',
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            { nomor: { contains: 'budi', mode: 'insensitive' } },
            { tujuanLokasi: { contains: 'budi', mode: 'insensitive' } },
            {
              karyawan: {
                some: {
                  OR: [
                    { nama: { contains: 'budi', mode: 'insensitive' } },
                    { nrp: { contains: 'budi', mode: 'insensitive' } },
                  ],
                },
              },
            },
          ],
        },
      }),
    );
  });

  it('menggabungkan filter status dan cari sekaligus', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const count = jest.fn().mockResolvedValue(0);
    const prisma = {
      suratTugasDinas: { findMany, count },
    } as unknown as PrismaService;
    const pdf = {} as unknown as SuratTugasDinasPdfService;
    const whatsapp = {} as unknown as WhatsappService;
    const service = new SuratTugasDinasService(prisma, pdf, whatsapp);

    await service.daftar(
      SH,
      StatusSuratTugas.MENUNGGU_SH,
      undefined,
      undefined,
      undefined,
      undefined,
      'budi',
    );

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: StatusSuratTugas.MENUNGGU_SH,
          OR: expect.any(Array),
        }),
      }),
    );
  });
});
