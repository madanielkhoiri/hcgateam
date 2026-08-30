import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { McuAksesService } from '../mcu/common/mcu-akses.service';
import { AktorMcu } from '../mcu/common/mcu-aktor';
import { SuratPenolakanMagangPdfService } from './surat-penolakan-magang-pdf.service';
import { SuratPenolakanMagangService } from './surat-penolakan-magang.service';

function aktor(role: UserRole): AktorMcu {
  return { id: 9, username: 'hc', role };
}

function anakMagangFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, nama: 'Budi', ...overrides };
}

function suratFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, nomor: '01/S-Out/HCGA/PPA-Adw/I/2026', ...overrides };
}

function buatService(overrides: {
  anakMagang?: unknown;
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
      findUnique: jest.fn().mockResolvedValue('anakMagang' in overrides ? overrides.anakMagang : anakMagangFixture()),
    },
    suratPenolakanMagang: {
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
    buatFile: overrides.buatFile ?? jest.fn().mockResolvedValue('surat-penolakan-magang/a.pdf'),
  } as unknown as SuratPenolakanMagangPdfService;

  const service = new SuratPenolakanMagangService(prisma as PrismaService, akses, pdf);

  return { service, prisma, create, update, pdf };
}

describe('SuratPenolakanMagangService.detail', () => {
  it('melempar NotFoundException kalau surat tidak ada', async () => {
    const { service } = buatService({ suratDetail: null });

    await expect(service.detail(1)).rejects.toThrow(NotFoundException);
  });
});

describe('SuratPenolakanMagangService.terbitkan', () => {
  const dtoDasar = { anakMagangId: 1, sapaan: 'Saudara', alasanPenolakan: '  Kuota penuh  ' };

  it('menolak role selain HC', async () => {
    const { service } = buatService();

    await expect(service.terbitkan(dtoDasar as any, aktor(UserRole.KARYAWAN))).rejects.toThrow(ForbiddenException);
  });

  it('melempar NotFoundException kalau anak magang tidak ada', async () => {
    const { service } = buatService({ anakMagang: null });

    await expect(service.terbitkan(dtoDasar as any, aktor(UserRole.HC))).rejects.toThrow(
      'Data anak magang tidak ditemukan',
    );
  });

  it('nomor surat dimulai dari 01 kalau belum ada surat tahun ini', async () => {
    const { service, create } = buatService({ terakhir: null });

    await service.terbitkan(dtoDasar as any, aktor(UserRole.HC));

    expect(create.mock.calls[0][0].data.nomorUrut).toBe(1);
    expect(create.mock.calls[0][0].data.nomor).toMatch(/^01\/S-Out\/HCGA\/PPA-Adw\//);
  });

  it('nomor surat melanjutkan dari nomorUrut terakhir tahun berjalan', async () => {
    const { service, create } = buatService({ terakhir: { nomorUrut: 7 } });

    await service.terbitkan(dtoDasar as any, aktor(UserRole.HC));

    expect(create.mock.calls[0][0].data.nomorUrut).toBe(8);
  });

  it('nama diambil dari data anak magang, alasanPenolakan ter-trim', async () => {
    const { service, create } = buatService({ anakMagang: anakMagangFixture({ nama: 'Siti' }) });

    await service.terbitkan(dtoDasar as any, aktor(UserRole.HC));

    expect(create.mock.calls[0][0].data).toEqual(
      expect.objectContaining({ nama: 'Siti', alasanPenolakan: 'Kuota penuh', anakMagangId: 1, dibuatOlehId: 9 }),
    );
  });

  it('memanggil cetakUlang setelah surat dibuat (menghasilkan file PDF)', async () => {
    const { service, pdf } = buatService();

    await service.terbitkan(dtoDasar as any, aktor(UserRole.HC));

    expect(pdf.buatFile).toHaveBeenCalled();
  });
});

describe('SuratPenolakanMagangService.cetakUlang', () => {
  it('melempar NotFoundException kalau surat tidak ada', async () => {
    const { service } = buatService({ suratDetail: null });

    await expect(service.cetakUlang(1)).rejects.toThrow(NotFoundException);
  });

  it('berhasil generate ulang PDF dan menyimpan path filePdf', async () => {
    const { service, update, pdf } = buatService();

    await service.cetakUlang(1);

    expect(pdf.buatFile).toHaveBeenCalled();
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: { filePdf: 'surat-penolakan-magang/a.pdf' } }),
    );
  });
});
