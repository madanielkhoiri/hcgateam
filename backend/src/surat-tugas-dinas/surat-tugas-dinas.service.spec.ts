import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StatusSuratTugas, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SuratTugasDinasPdfService } from './surat-tugas-dinas-pdf.service';
import { SuratTugasDinasService } from './surat-tugas-dinas.service';

function buatSurat(overrides: Partial<{ status: StatusSuratTugas; dibuatOlehId: number }> = {}) {
  return {
    id: 1,
    nomor: 'STD-001',
    dibuatOlehId: overrides.dibuatOlehId ?? 20,
    status: overrides.status ?? StatusSuratTugas.MENUNGGU_SH,
  };
}

function buatService(overrides: {
  findUnique?: jest.Mock;
  findUniqueOrThrow?: jest.Mock;
  create?: jest.Mock;
  update?: jest.Mock;
} = {}) {
  const findUnique = overrides.findUnique ?? jest.fn().mockResolvedValue(null);
  const findUniqueOrThrow = overrides.findUniqueOrThrow ?? jest.fn().mockResolvedValue(buatSurat());
  const create = overrides.create ?? jest.fn().mockResolvedValue({ id: 1 });
  const update = overrides.update ?? jest.fn().mockResolvedValue({});
  const prisma = {
    suratTugasDinas: { findUnique, findUniqueOrThrow, create, update },
  } as unknown as PrismaService;
  const pdf = { buatFile: jest.fn().mockResolvedValue('surat-tugas-dinas/1.pdf') } as unknown as SuratTugasDinasPdfService;
  const service = new SuratTugasDinasService(prisma, pdf);

  return { service, findUnique, findUniqueOrThrow, create, update, pdf };
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
    const { service } = buatService({ findUnique: jest.fn().mockResolvedValue(buatSurat()) });

    await expect(service.buat(DTO_SURAT as any, KARYAWAN)).rejects.toThrow('Nomor surat sudah digunakan');
  });

  it('menolak tanggal selesai sebelum tanggal mulai', async () => {
    const { service } = buatService();

    await expect(
      service.buat({ ...DTO_SURAT, tanggalMulai: '2026-01-10', tanggalSelesai: '2026-01-01' } as any, KARYAWAN),
    ).rejects.toThrow('Tanggal selesai tidak boleh sebelum tanggal mulai');
  });

  it('surat baru selalu mulai dari status MENUNGGU_SH', async () => {
    const create = jest.fn().mockResolvedValue({ id: 1 });
    const { service } = buatService({ create });

    await service.buat(DTO_SURAT as any, KARYAWAN);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: StatusSuratTugas.MENUNGGU_SH }) }),
    );
  });
});

describe('SuratTugasDinasService.setujui — alur SH -> PJO', () => {
  it('SH menyetujui tahap MENUNGGU_SH -> pindah ke MENUNGGU_PJO', async () => {
    const findUnique = jest.fn().mockResolvedValue(buatSurat({ status: StatusSuratTugas.MENUNGGU_SH }));
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
    const findUnique = jest.fn().mockResolvedValue(buatSurat({ status: StatusSuratTugas.MENUNGGU_SH }));
    const { service } = buatService({ findUnique });

    await expect(service.setujui(1, PJO)).rejects.toThrow(ForbiddenException);
  });

  it('PJO menyetujui tahap MENUNGGU_PJO -> status akhir DISETUJUI', async () => {
    const findUnique = jest.fn().mockResolvedValue(buatSurat({ status: StatusSuratTugas.MENUNGGU_PJO }));
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

  it('menolak SH menyetujui tahap MENUNGGU_PJO (bukan tahapnya)', async () => {
    const findUnique = jest.fn().mockResolvedValue(buatSurat({ status: StatusSuratTugas.MENUNGGU_PJO }));
    const { service } = buatService({ findUnique });

    await expect(service.setujui(1, SH)).rejects.toThrow(ForbiddenException);
  });

  it('Admin/Super Admin boleh menyetujui tahap apa pun', async () => {
    const findUnique = jest.fn().mockResolvedValue(buatSurat({ status: StatusSuratTugas.MENUNGGU_SH }));
    const update = jest.fn().mockResolvedValue({});
    const { service } = buatService({ findUnique, update });

    await service.setujui(1, ADMIN);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ disetujuiShOlehId: 1 }) }),
    );
  });

  it('karyawan biasa tidak boleh menyetujui', async () => {
    const findUnique = jest.fn().mockResolvedValue(buatSurat({ status: StatusSuratTugas.MENUNGGU_SH }));
    const { service } = buatService({ findUnique });

    await expect(service.setujui(1, KARYAWAN)).rejects.toThrow(ForbiddenException);
  });

  it('menolak approve ulang surat yang sudah DISETUJUI', async () => {
    const findUnique = jest.fn().mockResolvedValue(buatSurat({ status: StatusSuratTugas.DISETUJUI }));
    const { service } = buatService({ findUnique });

    await expect(service.setujui(1, ADMIN)).rejects.toThrow('Surat sudah diproses sebelumnya');
  });

  it('melempar NotFoundException kalau surat tidak ada', async () => {
    const { service } = buatService({ findUnique: jest.fn().mockResolvedValue(null) });

    await expect(service.setujui(1, ADMIN)).rejects.toThrow(NotFoundException);
  });
});

describe('SuratTugasDinasService.tolak', () => {
  it('SH bisa menolak di tahap MENUNGGU_SH dengan alasan', async () => {
    const findUnique = jest.fn().mockResolvedValue(buatSurat({ status: StatusSuratTugas.MENUNGGU_SH }));
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
    const findUnique = jest.fn().mockResolvedValue(buatSurat({ status: StatusSuratTugas.MENUNGGU_PJO }));
    const { service } = buatService({ findUnique });

    await expect(service.tolak(1, { alasan: 'x' } as any, SH)).rejects.toThrow(ForbiddenException);
  });

  it('tidak bisa menolak surat yang sudah final (DISETUJUI/DITOLAK)', async () => {
    const findUnique = jest.fn().mockResolvedValue(buatSurat({ status: StatusSuratTugas.DITOLAK }));
    const { service } = buatService({ findUnique });

    await expect(service.tolak(1, { alasan: 'x' } as any, ADMIN)).rejects.toThrow(
      'Surat sudah diproses sebelumnya',
    );
  });
});

describe('SuratTugasDinasService.daftar & detail — visibilitas', () => {
  it('karyawan biasa cuma melihat surat buatannya sendiri', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { suratTugasDinas: { findMany } } as unknown as PrismaService;
    const pdf = {} as unknown as SuratTugasDinasPdfService;
    const service = new SuratTugasDinasService(prisma, pdf);

    await service.daftar(KARYAWAN);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ dibuatOlehId: 20 }) }),
    );
  });

  it('Section Head/PJO/Admin melihat SEMUA surat, bukan cuma buatan sendiri', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const prisma = { suratTugasDinas: { findMany } } as unknown as PrismaService;
    const pdf = {} as unknown as SuratTugasDinasPdfService;
    const service = new SuratTugasDinasService(prisma, pdf);

    await service.daftar(SH);

    const where = findMany.mock.calls[0][0].where;
    expect(where).not.toHaveProperty('dibuatOlehId');
  });

  it('detail menolak karyawan lain yang bukan pembuat & bukan penyetuju', async () => {
    const findUnique = jest.fn().mockResolvedValue(buatSurat({ dibuatOlehId: 99 }));
    const { service } = buatService({ findUnique });

    await expect(service.detail(1, KARYAWAN)).rejects.toThrow(ForbiddenException);
  });

  it('detail mengizinkan pembuat sendiri melihat suratnya', async () => {
    const findUnique = jest.fn().mockResolvedValue(buatSurat({ dibuatOlehId: 20 }));
    const { service } = buatService({ findUnique });

    await expect(service.detail(1, KARYAWAN)).resolves.toMatchObject({ dibuatOlehId: 20 });
  });
});
