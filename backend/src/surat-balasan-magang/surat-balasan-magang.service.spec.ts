import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { McuAksesService } from '../mcu/common/mcu-akses.service';
import { AktorMcu } from '../mcu/common/mcu-aktor';
import { SuratBalasanMagangPdfService } from './surat-balasan-magang-pdf.service';
import { SuratBalasanMagangService } from './surat-balasan-magang.service';

function aktor(role: UserRole): AktorMcu {
  return { id: 9, username: 'hc', role };
}

function anakMagangFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, nama: 'Budi', nrp: '12345', jurusan: 'Teknik Mesin', ...overrides };
}

function suratFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, nomor: '01/S-Out/HCGA/PPA-Adw/I/2026', baris: [], ...overrides };
}

function buatService(overrides: {
  anakMagangList?: unknown[];
  suratDetail?: unknown;
  terakhir?: unknown;
  create?: jest.Mock;
  update?: jest.Mock;
  buatFile?: jest.Mock;
} = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const update = overrides.update ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));

  const prisma: any = {
    anakMagang: {
      findMany: jest.fn().mockResolvedValue(overrides.anakMagangList ?? [anakMagangFixture()]),
    },
    suratBalasanMagang: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue('suratDetail' in overrides ? overrides.suratDetail : suratFixture()),
      findFirst: jest.fn().mockResolvedValue('terakhir' in overrides ? overrides.terakhir : null),
      create,
      update,
    },
  };

  prisma.$transaction = jest.fn((cb: any) => cb(prisma));

  const akses = new McuAksesService(prisma as PrismaService);
  const pdf = {
    buatFile: overrides.buatFile ?? jest.fn().mockResolvedValue('surat-balasan-magang/a.pdf'),
  } as unknown as SuratBalasanMagangPdfService;

  const service = new SuratBalasanMagangService(prisma as PrismaService, akses, pdf);

  return { service, prisma, create, update, pdf };
}

describe('SuratBalasanMagangService.detail', () => {
  it('melempar NotFoundException kalau surat tidak ada', async () => {
    const { service } = buatService({ suratDetail: null });

    await expect(service.detail(1)).rejects.toThrow(NotFoundException);
  });
});

describe('SuratBalasanMagangService.terbitkan', () => {
  const dtoDasar = {
    tujuanJurusan: 'Teknik Mesin',
    kotaTujuan: 'Balikpapan',
    baris: [{ anakMagangId: 1, departemenTujuan: 'HC', tanggalMulai: '2026-01-05', tanggalSelesai: '2026-02-05' }],
  };

  it('menolak role selain HC', async () => {
    const { service } = buatService();

    await expect(service.terbitkan(dtoDasar as any, aktor(UserRole.KARYAWAN))).rejects.toThrow(ForbiddenException);
  });

  it('menolak kalau sebagian anak magang tidak ditemukan', async () => {
    const { service } = buatService({ anakMagangList: [] });

    await expect(service.terbitkan(dtoDasar as any, aktor(UserRole.HC))).rejects.toThrow(
      'Sebagian anak magang yang dipilih tidak ditemukan',
    );
  });

  it('menolak kalau anak magang belum punya NRP', async () => {
    const { service } = buatService({ anakMagangList: [anakMagangFixture({ nrp: null })] });

    await expect(service.terbitkan(dtoDasar as any, aktor(UserRole.HC))).rejects.toThrow('belum memiliki NRP');
  });

  it('menolak kalau anak magang belum punya jurusan', async () => {
    const { service } = buatService({ anakMagangList: [anakMagangFixture({ jurusan: null })] });

    await expect(service.terbitkan(dtoDasar as any, aktor(UserRole.HC))).rejects.toThrow('belum memiliki jurusan');
  });

  it('menolak tanggal selesai sebelum tanggal mulai', async () => {
    const { service } = buatService();

    await expect(
      service.terbitkan(
        { ...dtoDasar, baris: [{ ...dtoDasar.baris[0], tanggalMulai: '2026-02-05', tanggalSelesai: '2026-01-05' }] } as any,
        aktor(UserRole.HC),
      ),
    ).rejects.toThrow('Tanggal selesai tidak boleh sebelum tanggal mulai');
  });

  it('nomor surat dimulai dari 01 kalau belum ada surat tahun ini', async () => {
    const { service, create } = buatService({ terakhir: null });

    await service.terbitkan(dtoDasar as any, aktor(UserRole.HC));

    expect(create.mock.calls[0][0].data.nomorUrut).toBe(1);
    expect(create.mock.calls[0][0].data.nomor).toMatch(/^01\/S-Out\/HCGA\/PPA-Adw\//);
  });

  it('nomor surat melanjutkan dari nomorUrut terakhir tahun berjalan', async () => {
    const { service, create } = buatService({ terakhir: { nomorUrut: 5 } });

    await service.terbitkan(dtoDasar as any, aktor(UserRole.HC));

    expect(create.mock.calls[0][0].data.nomorUrut).toBe(6);
  });

  it('data baris diambil dari data anak magang (nama/nrp/jurusan), bukan dari dto', async () => {
    const { service, create } = buatService({ anakMagangList: [anakMagangFixture({ nama: 'Siti', nrp: '999', jurusan: 'Teknik Sipil' })] });

    await service.terbitkan(dtoDasar as any, aktor(UserRole.HC));

    expect(create.mock.calls[0][0].data.baris.create[0]).toEqual(
      expect.objectContaining({ nama: 'Siti', nrp: '999', jurusan: 'Teknik Sipil', departemenTujuan: 'HC' }),
    );
  });

  it('memanggil cetakUlang setelah surat dibuat (menghasilkan file PDF)', async () => {
    const { service, pdf } = buatService();

    await service.terbitkan(dtoDasar as any, aktor(UserRole.HC));

    expect(pdf.buatFile).toHaveBeenCalled();
  });
});

describe('SuratBalasanMagangService.cetakUlang', () => {
  it('melempar NotFoundException kalau surat tidak ada', async () => {
    const { service } = buatService({ suratDetail: null });

    await expect(service.cetakUlang(1)).rejects.toThrow(NotFoundException);
  });

  it('berhasil generate ulang PDF dan menyimpan path filePdf', async () => {
    const { service, update, pdf } = buatService();

    await service.cetakUlang(1);

    expect(pdf.buatFile).toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: { filePdf: 'surat-balasan-magang/a.pdf' } }),
    );
  });
});
