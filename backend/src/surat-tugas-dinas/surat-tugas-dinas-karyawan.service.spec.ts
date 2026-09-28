import { ForbiddenException } from '@nestjs/common';
import { StatusSuratTugas, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SuratTugasDinasAdvancePdfService } from './surat-tugas-dinas-advance-pdf.service';
import { SuratTugasDinasKaryawanService } from './surat-tugas-dinas-karyawan.service';

const surat = {
  id: 10,
  nomor: 'STD-AK-001',
  denganAkomodasi: true,
  status: StatusSuratTugas.DISETUJUI,
  tujuanLokasi: 'Jakarta',
  tanggalMulai: new Date('2026-09-01'),
  tanggalSelesai: new Date('2026-09-03'),
  keteranganTugas: 'Pelatihan',
  filePdf: 'surat-tugas-dinas/akomodasi.pdf',
  disetujuiPjoPada: new Date('2026-08-30'),
  suratTugasAsal: {
    id: 9,
    nomor: 'STD-001',
    filePdf: 'surat-tugas-dinas/std.pdf',
  },
};

const baris = {
  id: 20,
  nrp: '123',
  nama: 'Budi',
  uangPerjalananNominal: 300_000,
  akomodasiNominal: 200_000,
  laundryNominal: 50_000,
  advanceDikonfirmasiPada: null,
  advancePembuatNama: null,
  advanceShNama: null,
  advanceShJabatan: null,
  advanceFilePdf: null,
  suratTugas: surat,
};

function buatService(overrides: Record<string, jest.Mock> = {}) {
  const findMany = overrides.findMany ?? jest.fn().mockResolvedValue([baris]);
  const findUniqueBaris =
    overrides.findUniqueBaris ?? jest.fn().mockResolvedValue(baris);
  const update =
    overrides.update ??
    jest
      .fn()
      .mockImplementation(({ data }) => Promise.resolve({ ...baris, ...data }));
  const userFindUnique =
    overrides.userFindUnique ??
    jest.fn().mockResolvedValue({
      name: 'Budi Akun',
      nrp: '123',
      profilKaryawan: { nik: '123' },
    });
  const userFindFirst =
    overrides.userFindFirst ??
    jest.fn().mockResolvedValue({
      id: 7,
      name: 'SH HCGA',
      role: UserRole.SECTION_HEAD,
      isActive: true,
    });
  const karyawanFindUnique =
    overrides.karyawanFindUnique ??
    jest.fn().mockResolvedValue({
      nik: '123',
      departemen: { namaDepartemen: 'HCGA', adminAkun: null },
    });
  const prisma = {
    suratTugasKaryawan: { findMany, findUnique: findUniqueBaris, update },
    user: { findUnique: userFindUnique, findFirst: userFindFirst },
    karyawan: { findUnique: karyawanFindUnique },
  } as unknown as PrismaService;
  const buatFile = jest
    .fn()
    .mockResolvedValue('surat-tugas-dinas/advance/berita-acara-20.pdf');
  const pdf = { buatFile } as unknown as SuratTugasDinasAdvancePdfService;
  const service = new SuratTugasDinasKaryawanService(prisma, pdf);
  return { service, findMany, update, buatFile, userFindFirst };
}

describe('SuratTugasDinasKaryawanService', () => {
  it('hanya mengambil STD biasa final milik NRP akun', async () => {
    const { service, findMany } = buatService();

    const hasil = await service.daftar({ id: 1, nrp: '123' });

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          nrp: { in: ['123'] },
          suratTugas: expect.objectContaining({
            denganAkomodasi: false,
            status: StatusSuratTugas.DISETUJUI,
          }),
        }),
      }),
    );
    expect(hasil[0].nominalAdvance).toBe(550_000);
  });

  it('menolak konfirmasi STD milik NRP lain', async () => {
    const { service } = buatService({
      userFindUnique: jest.fn().mockResolvedValue({
        name: 'Orang Lain',
        nrp: '999',
        profilKaryawan: null,
      }),
    });

    await expect(
      service.konfirmasiAdvance(20, { id: 2, nrp: '999' }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('membuat berita acara dengan total per karyawan dan SH departemennya', async () => {
    const { service, buatFile, update, userFindFirst } = buatService();

    await service.konfirmasiAdvance(20, { id: 1, nrp: '123' });

    expect(userFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          role: UserRole.SECTION_HEAD,
          departemen: { equals: 'HCGA', mode: 'insensitive' },
        }),
      }),
    );
    expect(buatFile).toHaveBeenCalledWith(
      expect.objectContaining({
        nominalAdvance: 550_000,
        tanggalBerakhir: new Date('2026-09-03'),
        pembuatNama: 'Budi Akun',
        shNama: 'SH HCGA',
        shJabatan: 'SH HCGA',
      }),
    );
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          advanceDikonfirmasiOlehId: 1,
          advancePembuatNama: 'Budi Akun',
          advanceShNama: 'SH HCGA',
          advanceFilePdf: 'surat-tugas-dinas/advance/berita-acara-20.pdf',
        }),
      }),
    );
  });
});
