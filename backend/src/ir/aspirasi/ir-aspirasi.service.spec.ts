import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TipeAspirasiPertanyaan, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AktorIr } from '../common/ir-aktor';
import { IrAspirasiService } from './ir-aspirasi.service';

function aktor(overrides: Partial<AktorIr> = {}): AktorIr {
  return { id: 1, nama: 'Budi', nrp: '12345', role: UserRole.KARYAWAN, ...overrides };
}

function pertanyaanFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    teks: 'Bagaimana suasana kerja?',
    tipe: TipeAspirasiPertanyaan.PILIHAN_GANDA,
    aktif: true,
    opsi: [{ id: 10 }, { id: 11 }],
    ...overrides,
  };
}

function buatService(overrides: {
  pertanyaanList?: unknown[];
  pertanyaanDetail?: unknown;
  pertanyaanJawab?: unknown;
  create?: jest.Mock;
  update?: jest.Mock;
  deleteFn?: jest.Mock;
  upsert?: jest.Mock;
  opsiDeleteMany?: jest.Mock;
  opsiCreateMany?: jest.Mock;
} = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const update = overrides.update ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const deleteFn = overrides.deleteFn ?? jest.fn().mockResolvedValue({});
  const upsert = overrides.upsert ?? jest.fn(({ create: c, update: u }) => Promise.resolve({ id: 1, ...c, ...u }));
  const opsiDeleteMany = overrides.opsiDeleteMany ?? jest.fn().mockResolvedValue({});
  const opsiCreateMany = overrides.opsiCreateMany ?? jest.fn().mockResolvedValue({});

  const prisma = {
    aspirasiPertanyaan: {
      findMany: jest.fn().mockResolvedValue(overrides.pertanyaanList ?? []),
      findUnique: jest.fn().mockImplementation(() =>
        Promise.resolve('pertanyaanJawab' in overrides ? overrides.pertanyaanJawab : ('pertanyaanDetail' in overrides ? overrides.pertanyaanDetail : pertanyaanFixture())),
      ),
      create,
      update,
      delete: deleteFn,
    },
    aspirasiOpsi: {
      deleteMany: opsiDeleteMany,
      createMany: opsiCreateMany,
    },
    aspirasiJawaban: {
      upsert,
    },
  } as unknown as PrismaService;

  const service = new IrAspirasiService(prisma);

  return { service, prisma, create, update, deleteFn, upsert, opsiDeleteMany, opsiCreateMany };
}

describe('IrAspirasiService.daftarUntukDiisi', () => {
  it('jawabanSaya diambil dari jawaban[0] milik aktor, null kalau belum menjawab', async () => {
    const { service, prisma } = buatService();
    (prisma.aspirasiPertanyaan.findMany as jest.Mock).mockResolvedValue([
      { id: 1, teks: 'Q1', tipe: 'ESSAY', opsi: [], jawaban: [{ id: 100, jawabanTeks: 'Baik' }] },
      { id: 2, teks: 'Q2', tipe: 'ESSAY', opsi: [], jawaban: [] },
    ]);

    const hasil = await service.daftarUntukDiisi(aktor());

    expect(hasil[0].jawabanSaya).toEqual({ id: 100, jawabanTeks: 'Baik' });
    expect(hasil[1].jawabanSaya).toBeNull();
  });
});

describe('IrAspirasiService.buatPertanyaan', () => {
  it('membuat opsi hanya untuk tipe PILIHAN_GANDA', async () => {
    const { service, create } = buatService();

    await service.buatPertanyaan(
      { teks: 'Q1', tipe: TipeAspirasiPertanyaan.PILIHAN_GANDA, opsi: ['Setuju', 'Tidak Setuju'] } as any,
      aktor(),
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          opsi: { create: [{ teks: 'Setuju', urutan: 0 }, { teks: 'Tidak Setuju', urutan: 1 }] },
        }),
      }),
    );
  });

  it('tidak membuat opsi untuk tipe ESSAY', async () => {
    const { service, create } = buatService();

    await service.buatPertanyaan({ teks: 'Q1', tipe: TipeAspirasiPertanyaan.ESSAY } as any, aktor());

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ opsi: undefined }) }));
  });
});

describe('IrAspirasiService.ubahPertanyaan', () => {
  it('melempar NotFoundException kalau pertanyaan tidak ada', async () => {
    const { service } = buatService({ pertanyaanDetail: null });

    await expect(service.ubahPertanyaan(1, {} as any)).rejects.toThrow(NotFoundException);
  });

  it('mengganti seluruh opsi kalau dikirim untuk tipe PILIHAN_GANDA', async () => {
    const { service, opsiDeleteMany, opsiCreateMany } = buatService({
      pertanyaanDetail: pertanyaanFixture({ tipe: TipeAspirasiPertanyaan.PILIHAN_GANDA }),
    });

    await service.ubahPertanyaan(1, { opsi: ['A', 'B'] } as any);

    expect(opsiDeleteMany).toHaveBeenCalledWith({ where: { pertanyaanId: 1 } });
    expect(opsiCreateMany).toHaveBeenCalledWith({
      data: [{ pertanyaanId: 1, teks: 'A', urutan: 0 }, { pertanyaanId: 1, teks: 'B', urutan: 1 }],
    });
  });

  it('tidak mengganti opsi kalau tipe pertanyaan ESSAY', async () => {
    const { service, opsiDeleteMany } = buatService({
      pertanyaanDetail: pertanyaanFixture({ tipe: TipeAspirasiPertanyaan.ESSAY }),
    });

    await service.ubahPertanyaan(1, { opsi: ['A', 'B'] } as any);

    expect(opsiDeleteMany).not.toHaveBeenCalled();
  });

  it('hanya mengubah field yang dikirim', async () => {
    const { service, update } = buatService();

    await service.ubahPertanyaan(1, { aktif: false } as any);

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { aktif: false } }));
  });
});

describe('IrAspirasiService.hapusPertanyaan', () => {
  it('melempar NotFoundException kalau pertanyaan tidak ada', async () => {
    const { service } = buatService({ pertanyaanDetail: null });

    await expect(service.hapusPertanyaan(1)).rejects.toThrow(NotFoundException);
  });

  it('berhasil menghapus pertanyaan', async () => {
    const { service, deleteFn } = buatService();

    const hasil = await service.hapusPertanyaan(1);

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});

describe('IrAspirasiService.jawab', () => {
  it('melempar NotFoundException kalau pertanyaan tidak ada', async () => {
    const { service } = buatService({ pertanyaanJawab: null });

    await expect(service.jawab(1, { opsiId: 10 } as any, aktor())).rejects.toThrow(NotFoundException);
  });

  it('melempar NotFoundException kalau pertanyaan sudah tidak aktif', async () => {
    const { service } = buatService({ pertanyaanJawab: pertanyaanFixture({ aktif: false }) });

    await expect(service.jawab(1, { opsiId: 10 } as any, aktor())).rejects.toThrow(NotFoundException);
  });

  it('PILIHAN_GANDA menolak opsiId yang tidak ada dalam daftar opsi pertanyaan', async () => {
    const { service } = buatService({ pertanyaanJawab: pertanyaanFixture() });

    await expect(service.jawab(1, { opsiId: 999 } as any, aktor())).rejects.toThrow('Pilihan jawaban tidak valid');
  });

  it('ESSAY menolak jawaban kosong', async () => {
    const { service } = buatService({ pertanyaanJawab: pertanyaanFixture({ tipe: TipeAspirasiPertanyaan.ESSAY }) });

    await expect(service.jawab(1, { jawabanTeks: '   ' } as any, aktor())).rejects.toThrow('Jawaban essay wajib diisi');
  });

  it('PILIHAN_GANDA berhasil upsert dengan opsiId, jawabanTeks null', async () => {
    const { service, upsert } = buatService({ pertanyaanJawab: pertanyaanFixture() });

    await service.jawab(1, { opsiId: 10 } as any, aktor({ nama: 'Siti', nrp: '999' }));

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { pertanyaanId_userId: { pertanyaanId: 1, userId: 1 } },
        create: expect.objectContaining({ namaPenjawab: 'Siti', nrpPenjawab: '999', opsiId: 10, jawabanTeks: null }),
      }),
    );
  });

  it('ESSAY berhasil upsert dengan jawabanTeks ter-trim, opsiId null', async () => {
    const { service, upsert } = buatService({ pertanyaanJawab: pertanyaanFixture({ tipe: TipeAspirasiPertanyaan.ESSAY, opsi: [] }) });

    await service.jawab(1, { jawabanTeks: '  Cukup baik  ' } as any, aktor());

    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ create: expect.objectContaining({ opsiId: null, jawabanTeks: 'Cukup baik' }) }),
    );
  });
});

describe('IrAspirasiService.rekapJawaban', () => {
  it('melempar NotFoundException kalau pertanyaan tidak ada', async () => {
    const { service } = buatService({ pertanyaanDetail: null });

    await expect(service.rekapJawaban(1)).rejects.toThrow(NotFoundException);
  });

  it('mengembalikan detail pertanyaan dengan jawabannya', async () => {
    const { service } = buatService({ pertanyaanDetail: pertanyaanFixture({ jawaban: [{ id: 1 }] }) });

    const hasil = await service.rekapJawaban(1);

    expect(hasil.jawaban).toEqual([{ id: 1 }]);
  });
});
