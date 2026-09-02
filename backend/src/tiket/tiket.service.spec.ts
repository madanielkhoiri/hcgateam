import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TiketFileService } from './tiket-file.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { TiketService } from './tiket.service';

function karyawanFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, nama: 'Budi', nik: '12345', noTelepon: null, akunId: null, akun: null, ...overrides };
}

function tiketFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    karyawanId: 1,
    tanggalMulai: new Date('2026-01-05T00:00:00.000Z'),
    tanggalSelesai: new Date('2026-01-10T00:00:00.000Z'),
    keterangan: null,
    karyawan: karyawanFixture(),
    files: [{ fileUrl: 'tiket/karyawan-1/a.pdf', namaFile: 'a.pdf' }],
    ...overrides,
  };
}

function buatService(overrides: {
  karyawan?: unknown;
  karyawanByAkunId?: unknown;
  akun?: unknown;
  karyawanByNik?: unknown;
  tiket?: unknown;
  create?: jest.Mock;
  deleteFn?: jest.Mock;
  update?: jest.Mock;
  updateTiket?: jest.Mock;
  whatsappAktif?: boolean;
} = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const deleteFn = overrides.deleteFn ?? jest.fn().mockResolvedValue({});
  const update = overrides.update ?? jest.fn(({ data, where }) => Promise.resolve({ id: where.id, ...data }));
  const updateTiket =
    overrides.updateTiket ?? jest.fn(({ data, where }) => Promise.resolve({ id: where.id, ...data }));

  const prisma = {
    karyawan: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockImplementation(({ where }: any) => {
        if (where.akunId !== undefined) {
          return Promise.resolve('karyawanByAkunId' in overrides ? overrides.karyawanByAkunId : null);
        }
        if (where.nik !== undefined) {
          return Promise.resolve('karyawanByNik' in overrides ? overrides.karyawanByNik : null);
        }
        return Promise.resolve('karyawan' in overrides ? overrides.karyawan : karyawanFixture());
      }),
      update,
    },
    user: {
      findUnique: jest.fn().mockResolvedValue('akun' in overrides ? overrides.akun : { nrp: '12345', username: 'budi' }),
    },
    transportTiket: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue('tiket' in overrides ? overrides.tiket : tiketFixture()),
      create,
      delete: deleteFn,
      update: updateTiket,
    },
  } as unknown as PrismaService;

  const file = {
    simpan: jest.fn((f: any) => ({ fileUrl: `tiket/karyawan-1/${f.originalname}`, namaFile: f.originalname })),
    hapus: jest.fn(),
  } as unknown as TiketFileService;

  const whatsapp = {
    aktif: overrides.whatsappAktif ?? false,
    kirim: jest.fn().mockResolvedValue(true),
    urlPublikLampiran: jest.fn().mockReturnValue(null),
  } as unknown as WhatsappService;

  const service = new TiketService(prisma, file, whatsapp);

  return { service, prisma, file, whatsapp, create, deleteFn, update, updateTiket };
}

const dtoDasar = { karyawanId: 1, tanggalMulai: '2026-01-05', tanggalSelesai: '2026-01-10', keterangan: '  Cuti tahunan  ' };
const fileFixture = { originalname: 'a.pdf' } as Express.Multer.File;

describe('TiketService.kirim', () => {
  it('melempar NotFoundException kalau karyawan tidak ada', async () => {
    const { service } = buatService({ karyawan: null });

    await expect(service.kirim(dtoDasar as any, [fileFixture], 9)).rejects.toThrow(NotFoundException);
  });

  it('menolak format tanggal tidak valid', async () => {
    const { service } = buatService();

    await expect(
      service.kirim({ ...dtoDasar, tanggalMulai: 'bukan-tanggal' } as any, [fileFixture], 9),
    ).rejects.toThrow('Format tanggal tidak valid');
  });

  it('menolak tanggal selesai sebelum tanggal mulai', async () => {
    const { service } = buatService();

    await expect(
      service.kirim({ ...dtoDasar, tanggalMulai: '2026-01-10', tanggalSelesai: '2026-01-05' } as any, [fileFixture], 9),
    ).rejects.toThrow('tidak boleh sebelum tanggal mulai');
  });

  it('menolak tanpa file', async () => {
    const { service } = buatService();

    await expect(service.kirim(dtoDasar as any, [], 9)).rejects.toThrow('Minimal 1 file tiket wajib diunggah');
  });

  it('berhasil mengirim tiket dan menyimpan file', async () => {
    const { service, create } = buatService();

    await service.kirim(dtoDasar as any, [fileFixture], 9);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ karyawanId: 1, keterangan: 'Cuti tahunan', createdBy: 9 }),
      }),
    );
  });

  it('menghapus file yang sudah tersimpan kalau pembuatan record gagal', async () => {
    const create = jest.fn().mockRejectedValue(new Error('DB error'));
    const { service, file } = buatService({ create });

    await expect(service.kirim(dtoDasar as any, [fileFixture], 9)).rejects.toThrow('DB error');

    expect(file.hapus).toHaveBeenCalledWith('tiket/karyawan-1/a.pdf');
  });

  it('tidak mengirim notifikasi WA kalau whatsapp tidak aktif', async () => {
    const { service, whatsapp } = buatService({ whatsappAktif: false });

    await service.kirim(dtoDasar as any, [fileFixture], 9);

    expect(whatsapp.kirim).not.toHaveBeenCalled();
  });

  it('mengirim notifikasi WA ke nomor akun karyawan kalau whatsapp aktif', async () => {
    const { service, whatsapp } = buatService({
      whatsappAktif: true,
      karyawan: karyawanFixture({ akun: { phoneNumber: '0812' } }),
    });

    await service.kirim(dtoDasar as any, [fileFixture], 9);

    expect(whatsapp.kirim).toHaveBeenCalledWith('0812', expect.stringContaining('Budi'));
  });
});

describe('TiketService.reschedule', () => {
  const dtoReschedule = { tanggalMulai: '2026-02-01', tanggalSelesai: '2026-02-03', alasan: 'Cuaca buruk' };

  it('melempar NotFoundException kalau tiket tidak ada', async () => {
    const { service } = buatService({ tiket: null });

    await expect(service.reschedule(1, dtoReschedule, undefined)).rejects.toThrow(NotFoundException);
  });

  it('menolak format tanggal tidak valid', async () => {
    const { service } = buatService();

    await expect(
      service.reschedule(1, { ...dtoReschedule, tanggalMulai: 'ngaco' }, undefined),
    ).rejects.toThrow('Format tanggal tidak valid');
  });

  it('menolak tanggal selesai sebelum tanggal mulai', async () => {
    const { service } = buatService();

    await expect(
      service.reschedule(1, { ...dtoReschedule, tanggalMulai: '2026-02-10', tanggalSelesai: '2026-02-05' }, undefined),
    ).rejects.toThrow('tidak boleh sebelum tanggal mulai');
  });

  it('update tanggal dan menambah catatan alasan ke keterangan existing', async () => {
    const { service, updateTiket } = buatService({ tiket: tiketFixture({ keterangan: 'Cuti tahunan' }) });

    await service.reschedule(1, dtoReschedule, undefined);

    expect(updateTiket).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 1 },
        data: expect.objectContaining({
          tanggalMulai: new Date('2026-02-01T00:00:00.000Z'),
          tanggalSelesai: new Date('2026-02-03T00:00:00.000Z'),
          keterangan: 'Cuti tahunan\nReschedule: Cuaca buruk',
        }),
      }),
    );
  });

  it('tanpa alasan, keterangan lama tidak berubah', async () => {
    const { service, updateTiket } = buatService({ tiket: tiketFixture({ keterangan: 'Cuti tahunan' }) });

    await service.reschedule(1, { tanggalMulai: '2026-02-01', tanggalSelesai: '2026-02-03' }, undefined);

    expect(updateTiket.mock.calls[0][0].data.keterangan).toBe('Cuti tahunan');
  });

  it('file baru disimpan dan ditambahkan (bukan menggantikan file lama)', async () => {
    const { service, file, updateTiket } = buatService();

    await service.reschedule(1, dtoReschedule, fileFixture);

    expect(file.simpan).toHaveBeenCalledWith(fileFixture, 1);
    expect(updateTiket.mock.calls[0][0].data.files).toEqual({
      create: { fileUrl: 'tiket/karyawan-1/a.pdf', namaFile: 'a.pdf' },
    });
  });

  it('menghapus file baru yang sudah tersimpan kalau update gagal', async () => {
    const updateTiket = jest.fn().mockRejectedValue(new Error('DB error'));
    const { service, file } = buatService({ updateTiket });

    await expect(service.reschedule(1, dtoReschedule, fileFixture)).rejects.toThrow('DB error');

    expect(file.hapus).toHaveBeenCalledWith('tiket/karyawan-1/a.pdf');
  });

  it('tidak mengirim notifikasi WA kalau whatsapp tidak aktif', async () => {
    const { service, whatsapp } = buatService({ whatsappAktif: false });

    await service.reschedule(1, dtoReschedule, undefined);

    expect(whatsapp.kirim).not.toHaveBeenCalled();
  });

  it('mengirim notifikasi WA menyebut jadwal lama, baru, dan alasan', async () => {
    const { service, whatsapp } = buatService({
      whatsappAktif: true,
      tiket: tiketFixture({ karyawan: karyawanFixture({ akun: { phoneNumber: '0812' } }) }),
    });

    await service.reschedule(1, dtoReschedule, undefined);

    expect(whatsapp.kirim).toHaveBeenCalledWith(
      '0812',
      expect.stringContaining('Cuaca buruk'),
      undefined,
    );
    const pesan = (whatsapp.kirim as jest.Mock).mock.calls[0][1] as string;
    expect(pesan).toMatch(/05 Januari 2026 - 10 Januari 2026/);
    expect(pesan).toMatch(/01 Februari 2026 - 03 Februari 2026/);
  });

  it('menyertakan lampiran WA kalau BACKEND_PUBLIC_URL tersedia (pakai file baru)', async () => {
    const { service, whatsapp } = buatService({
      whatsappAktif: true,
      tiket: tiketFixture({ karyawan: karyawanFixture({ akun: { phoneNumber: '0812' } }) }),
    });
    (whatsapp.urlPublikLampiran as jest.Mock).mockReturnValue(
      'https://portal.contoh.test/api/uploads/tiket/karyawan-1/a.pdf',
    );

    await service.reschedule(1, dtoReschedule, fileFixture);

    expect(whatsapp.kirim).toHaveBeenCalledWith(
      '0812',
      expect.any(String),
      { url: 'https://portal.contoh.test/api/uploads/tiket/karyawan-1/a.pdf', namaFile: 'a.pdf' },
    );
  });

  it('fallback ke file pertama existing untuk lampiran kalau tidak ada file baru diunggah', async () => {
    const { service, whatsapp } = buatService({
      whatsappAktif: true,
      tiket: tiketFixture({ karyawan: karyawanFixture({ akun: { phoneNumber: '0812' } }) }),
    });
    (whatsapp.urlPublikLampiran as jest.Mock).mockReturnValue(
      'https://portal.contoh.test/api/uploads/tiket/karyawan-1/a.pdf',
    );

    await service.reschedule(1, dtoReschedule, undefined);

    expect(whatsapp.urlPublikLampiran).toHaveBeenCalledWith('tiket/karyawan-1/a.pdf');
  });
});

describe('TiketService.hapus', () => {
  it('melempar NotFoundException kalau tiket tidak ada', async () => {
    const { service } = buatService({ tiket: null });

    await expect(service.hapus(1)).rejects.toThrow(NotFoundException);
  });

  it('berhasil menghapus tiket dan file terkait', async () => {
    const { service, deleteFn, file } = buatService();

    const hasil = await service.hapus(1);

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(file.hapus).toHaveBeenCalledWith('tiket/karyawan-1/a.pdf');
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});

describe('TiketService.daftarSaya (via karyawanSayaOtomatis)', () => {
  it('mengembalikan array kosong kalau akun tidak bisa ditautkan ke Karyawan manapun', async () => {
    const { service } = buatService({ karyawanByAkunId: null, akun: { nrp: null, username: null } });

    const hasil = await service.daftarSaya(9);

    expect(hasil).toEqual([]);
  });

  it('mengembalikan riwayat kalau sudah tertaut', async () => {
    const { service, prisma } = buatService({ karyawanByAkunId: karyawanFixture() });
    (prisma.transportTiket.findMany as jest.Mock).mockResolvedValue([tiketFixture()]);

    const hasil = await service.daftarSaya(9);

    expect(hasil).toEqual([tiketFixture()]);
  });

  it('auto-tautkan lewat NIK dari nrp akun kalau belum tertaut', async () => {
    const { service, update } = buatService({
      karyawanByAkunId: null,
      akun: { nrp: '12345', username: 'lain' },
      karyawanByNik: karyawanFixture({ id: 2, akunId: null }),
    });

    await service.daftarSaya(9);

    expect(update).toHaveBeenCalledWith({ where: { id: 2 }, data: { akunId: 9 } });
  });

  it('tidak auto-tautkan kalau NIK yang cocok sudah dipakai akun lain', async () => {
    const { service, update } = buatService({
      karyawanByAkunId: null,
      karyawanByNik: karyawanFixture({ id: 2, akunId: 999 }),
    });

    const hasil = await service.daftarSaya(9);

    expect(update).not.toHaveBeenCalled();
    expect(hasil).toEqual([]);
  });
});

describe('TiketService.profilSaya', () => {
  it('mengembalikan null kalau tidak bisa ditautkan', async () => {
    const { service } = buatService({ karyawanByAkunId: null, akun: { nrp: null, username: null } });

    await expect(service.profilSaya(9)).resolves.toBeNull();
  });
});

describe('TiketService.tautkanNik', () => {
  it('menolak NIK kosong', async () => {
    const { service } = buatService();

    await expect(service.tautkanNik(9, '   ')).rejects.toThrow('NRP wajib diisi');
  });

  it('menolak kalau akun sudah tertaut ke Karyawan lain', async () => {
    const { service } = buatService({ karyawanByAkunId: karyawanFixture() });

    await expect(service.tautkanNik(9, '99999')).rejects.toThrow('sudah tertaut ke data Karyawan');
  });

  it('melempar NotFoundException kalau NIK tidak ditemukan', async () => {
    const { service } = buatService({ karyawanByAkunId: null, karyawanByNik: null });

    await expect(service.tautkanNik(9, '99999')).rejects.toThrow(NotFoundException);
  });

  it('menolak kalau NIK sudah ditautkan ke akun lain', async () => {
    const { service } = buatService({ karyawanByAkunId: null, karyawanByNik: karyawanFixture({ akunId: 999 }) });

    await expect(service.tautkanNik(9, '12345')).rejects.toThrow('sudah ditautkan ke akun lain');
  });

  it('berhasil menautkan akun ke Karyawan lewat NIK', async () => {
    const { service, update } = buatService({ karyawanByAkunId: null, karyawanByNik: karyawanFixture({ id: 2, akunId: null }) });

    await service.tautkanNik(9, '12345');

    expect(update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 2 }, data: { akunId: 9 } }));
  });
});
