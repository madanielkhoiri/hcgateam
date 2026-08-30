import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StatusKerja, StatusKesehatanDirumahkan } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { McuNotifikasiService } from '../notifikasi/mcu-notifikasi.service';
import { hariIni, tambahBulan, tambahHari } from '../mcu-date.util';
import { McuKaryawanService } from './mcu-karyawan.service';

function karyawanFixture(overrides: Partial<{
  nik: string;
  statusKerja: StatusKerja;
  statusKesehatanDirumahkan: StatusKesehatanDirumahkan | null;
  tanggalMcuExpired: Date | null;
  tanggalMcuBerikutnya: Date | null;
}> = {}) {
  return {
    id: 7,
    nik: overrides.nik ?? '12345',
    nama: 'Budi',
    departemenId: 3,
    statusKerja: overrides.statusKerja ?? StatusKerja.AKTIF,
    statusKesehatanDirumahkan: overrides.statusKesehatanDirumahkan ?? null,
    tanggalMcuExpired: 'tanggalMcuExpired' in overrides ? overrides.tanggalMcuExpired : null,
    tanggalMcuBerikutnya: 'tanggalMcuBerikutnya' in overrides ? overrides.tanggalMcuBerikutnya : null,
    departemen: { id: 3, namaDepartemen: 'GA', adminAkunId: 30, adminAkun: { id: 30, email: 'a@x.com' } },
  };
}

function buatService(overrides: {
  departemen?: unknown;
  karyawan?: unknown;
  karyawanDuplikat?: unknown;
  departemenDuplikat?: unknown;
  create?: jest.Mock;
  update?: jest.Mock;
  deleteDepartemen?: jest.Mock;
  deleteKaryawan?: jest.Mock;
} = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const update = overrides.update ?? jest.fn(({ data }) => Promise.resolve({ ...(karyawanFixture() as object), ...data }));

  const prisma = {
    departemen: {
      findUnique: jest.fn().mockResolvedValue('departemenDuplikat' in overrides ? overrides.departemenDuplikat : ('departemen' in overrides ? overrides.departemen : { id: 3 })),
      create,
      delete: overrides.deleteDepartemen ?? jest.fn().mockResolvedValue({}),
    },
    karyawan: {
      findUnique: jest.fn().mockImplementation(({ where }: any) => {
        if (where.nik !== undefined) {
          return Promise.resolve('karyawanDuplikat' in overrides ? overrides.karyawanDuplikat : null);
        }
        return Promise.resolve('karyawan' in overrides ? overrides.karyawan : karyawanFixture());
      }),
      create,
      update,
      delete: overrides.deleteKaryawan ?? jest.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaService;

  const notifikasi = {
    penerimaPeran: jest.fn().mockResolvedValue([]),
    kirimBanyak: jest.fn().mockResolvedValue(undefined),
    duaKanal: jest.fn().mockReturnValue([]),
  } as unknown as McuNotifikasiService;

  const service = new McuKaryawanService(prisma, notifikasi);

  return { service, create, update };
}

describe('McuKaryawanService.buatDepartemen', () => {
  it('menolak nama departemen yang sudah terdaftar', async () => {
    const { service } = buatService({ departemenDuplikat: { id: 9, namaDepartemen: 'GA' } });

    await expect(service.buatDepartemen({ namaDepartemen: 'GA' } as any)).rejects.toThrow(
      'Nama departemen sudah terdaftar',
    );
  });

  it('berhasil membuat departemen baru', async () => {
    const { service, create } = buatService({ departemenDuplikat: null });

    await service.buatDepartemen({ namaDepartemen: 'HC' } as any);

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ namaDepartemen: 'HC' }) }));
  });
});

describe('McuKaryawanService.hapusDepartemen', () => {
  it('menolak hapus departemen yang masih punya karyawan', async () => {
    const prisma = {
      departemen: {
        findUnique: jest.fn().mockResolvedValue({ id: 1, _count: { karyawan: 2 } }),
      },
    } as unknown as PrismaService;
    const notifikasi = {} as unknown as McuNotifikasiService;
    const service = new McuKaryawanService(prisma, notifikasi);

    await expect(service.hapusDepartemen(1)).rejects.toThrow(
      'Departemen masih memiliki karyawan dan tidak dapat dihapus',
    );
  });

  it('berhasil menghapus departemen kosong', async () => {
    const deleteDepartemen = jest.fn().mockResolvedValue({});
    const prisma = {
      departemen: {
        findUnique: jest.fn().mockResolvedValue({ id: 1, _count: { karyawan: 0 } }),
        delete: deleteDepartemen,
      },
    } as unknown as PrismaService;
    const notifikasi = {} as unknown as McuNotifikasiService;
    const service = new McuKaryawanService(prisma, notifikasi);

    const hasil = await service.hapusDepartemen(1);

    expect(deleteDepartemen).toHaveBeenCalled();
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});

describe('McuKaryawanService.buatKaryawan', () => {
  it('menolak NIK yang sudah terdaftar', async () => {
    const { service } = buatService({ karyawanDuplikat: karyawanFixture() });

    await expect(
      service.buatKaryawan({ nik: '12345', nama: 'Budi', departemenId: 3 } as any),
    ).rejects.toThrow('NIK 12345 sudah terdaftar');
  });

  it('menghitung tanggalMcuBerikutnya = tanggalMcuExpired dikurangi 3 bulan', async () => {
    const { service, create } = buatService();
    const expired = tambahBulan(hariIni(), 12);

    await service.buatKaryawan({
      nik: '99999',
      nama: 'Siti',
      departemenId: 3,
      tanggalMcuExpired: expired.toISOString().slice(0, 10),
    } as any);

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ tanggalMcuBerikutnya: tambahBulan(expired, -3) }),
      }),
    );
  });
});

describe('McuKaryawanService.ubahKaryawan', () => {
  it('melempar NotFoundException kalau karyawan tidak ada', async () => {
    const { service } = buatService({ karyawan: null });

    await expect(service.ubahKaryawan(7, {} as any)).rejects.toThrow(NotFoundException);
  });

  it('menolak ganti NIK ke NIK yang sudah dipakai karyawan lain', async () => {
    const { service } = buatService({ karyawanDuplikat: { id: 999, nik: '55555' } });

    await expect(service.ubahKaryawan(7, { nik: '55555' } as any)).rejects.toThrow(
      'NIK 55555 sudah terdaftar',
    );
  });

  it('mengizinkan "ganti" NIK ke nilai yang sama (bukan duplikat)', async () => {
    const { service, update } = buatService({ karyawan: karyawanFixture({ nik: '12345' }) });

    await expect(service.ubahKaryawan(7, { nik: '12345' } as any)).resolves.toBeDefined();
    expect(update).toHaveBeenCalled();
  });
});

describe('McuKaryawanService.hapusKaryawan', () => {
  it('menolak hapus karyawan yang sudah punya riwayat jadwal MCU', async () => {
    const prisma = {
      karyawan: {
        findUnique: jest.fn().mockResolvedValue({ id: 7, _count: { jadwalMcu: 3 } }),
      },
    } as unknown as PrismaService;
    const notifikasi = {} as unknown as McuNotifikasiService;
    const service = new McuKaryawanService(prisma, notifikasi);

    await expect(service.hapusKaryawan(7)).rejects.toThrow(
      'Karyawan sudah memiliki riwayat MCU dan tidak dapat dihapus',
    );
  });
});

describe('McuKaryawanService.ubahStatusKerja', () => {
  it('menolak DIRUMAHKAN tanpa statusKesehatanDirumahkan', async () => {
    const { service } = buatService();

    await expect(
      service.ubahStatusKerja(7, { statusKerja: StatusKerja.DIRUMAHKAN } as any),
    ).rejects.toThrow('Status kesehatan wajib diisi untuk karyawan dirumahkan');
  });

  it('menolak mengaktifkan kembali karyawan dirumahkan yang belum FIT_SAKIT', async () => {
    const { service } = buatService({
      karyawan: karyawanFixture({
        statusKerja: StatusKerja.DIRUMAHKAN,
        statusKesehatanDirumahkan: StatusKesehatanDirumahkan.SAKIT,
      }),
    });

    await expect(service.ubahStatusKerja(7, { statusKerja: StatusKerja.AKTIF } as any)).rejects.toThrow(
      'Karyawan dirumahkan harus FIT dari sakit (tahap 1) sebelum diaktifkan kembali',
    );
  });

  it('mengizinkan aktivasi kembali kalau sudah FIT_SAKIT', async () => {
    const { service, update } = buatService({
      karyawan: karyawanFixture({
        statusKerja: StatusKerja.DIRUMAHKAN,
        statusKesehatanDirumahkan: StatusKesehatanDirumahkan.FIT_SAKIT,
      }),
    });

    await service.ubahStatusKerja(7, { statusKerja: StatusKerja.AKTIF } as any);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ statusKerja: StatusKerja.AKTIF }) }),
    );
  });
});

describe('McuKaryawanService.perbaruiMasaBerlaku', () => {
  it('menghitung expired = tanggalMcu + 12 bulan, dan reminder = expired - 3 bulan', async () => {
    const update = jest.fn().mockResolvedValue({});
    const prisma = { karyawan: { update } } as unknown as PrismaService;
    const notifikasi = {} as unknown as McuNotifikasiService;
    const service = new McuKaryawanService(prisma, notifikasi);
    const tanggalMcu = hariIni();

    await service.perbaruiMasaBerlaku(7, tanggalMcu);

    const expired = tambahBulan(tanggalMcu, 12);
    expect(update).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        tanggalMcuTerakhir: tanggalMcu,
        tanggalMcuExpired: expired,
        tanggalMcuBerikutnya: tambahBulan(expired, -3),
      },
    });
  });
});

describe('McuKaryawanService.detailKaryawan — status jatuh tempo', () => {
  it('sudahJatuhTempo true untuk karyawan AKTIF yang tanggalMcuBerikutnya sudah lewat', async () => {
    const { service } = buatService({
      karyawan: karyawanFixture({
        statusKerja: StatusKerja.AKTIF,
        tanggalMcuBerikutnya: tambahHari(hariIni(), -1),
      }),
    });

    const hasil = await service.detailKaryawan(7);

    expect(hasil.sudahJatuhTempo).toBe(true);
  });

  it('sudahJatuhTempo false untuk karyawan yang tidak AKTIF walau tanggal sudah lewat', async () => {
    const { service } = buatService({
      karyawan: karyawanFixture({
        statusKerja: StatusKerja.RESIGN,
        tanggalMcuBerikutnya: tambahHari(hariIni(), -1),
      }),
    });

    const hasil = await service.detailKaryawan(7);

    expect(hasil.sudahJatuhTempo).toBe(false);
  });

  it('mcuKedaluwarsa true kalau tanggalMcuExpired sudah lewat', async () => {
    const { service } = buatService({
      karyawan: karyawanFixture({ tanggalMcuExpired: tambahHari(hariIni(), -5) }),
    });

    const hasil = await service.detailKaryawan(7);

    expect(hasil.mcuKedaluwarsa).toBe(true);
  });
});
