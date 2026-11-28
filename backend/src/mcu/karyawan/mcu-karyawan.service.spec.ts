import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StatusKerja, StatusKesehatanDirumahkan } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { McuNotifikasiService } from '../notifikasi/mcu-notifikasi.service';
import { WhatsappService } from '../../whatsapp/whatsapp.service';
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
  whatsappAktif?: boolean;
  validasiTerdaftar?: jest.Mock;
  whatsappKirim?: jest.Mock;
  karyawanFindMany?: jest.Mock;
} = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const update = overrides.update ?? jest.fn(({ data }) => Promise.resolve({ ...(karyawanFixture() as object), ...data }));

  const prisma = {
    logNotifikasiMcu: { findFirst: jest.fn().mockResolvedValue(null) },
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
      findMany: overrides.karyawanFindMany ?? jest.fn().mockResolvedValue([]),
      create,
      update,
      delete: overrides.deleteKaryawan ?? jest.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaService;

  const notifikasi = {
    penerimaPeran: jest.fn().mockResolvedValue([]),
    penerimaAdminDept: jest.fn().mockResolvedValue([]),
    kirimBanyak: jest.fn().mockResolvedValue(undefined),
    duaKanal: jest.fn().mockReturnValue([]),
  } as unknown as McuNotifikasiService;

  const whatsapp = {
    aktif: overrides.whatsappAktif ?? true,
    validasiTerdaftar: overrides.validasiTerdaftar ?? jest.fn().mockResolvedValue(true),
    kirim: overrides.whatsappKirim ?? jest.fn().mockResolvedValue(true),
  } as unknown as WhatsappService;

  const service = new McuKaryawanService(prisma, notifikasi, whatsapp);

  return { service, create, update, whatsapp };
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

describe('McuKaryawanService.ubahDepartemen', () => {
  it('mengganti nama master dan menyamakan teks departemen akun', async () => {
    const updateDepartemen = jest.fn().mockResolvedValue({ id: 3, namaDepartemen: 'ENGINEERING' });
    const updateUser = jest.fn().mockResolvedValue({ count: 4 });
    const tx = {
      departemen: { update: updateDepartemen },
      user: { updateMany: updateUser },
    };
    const prisma = {
      departemen: { findUnique: jest.fn().mockResolvedValue({ id: 3, namaDepartemen: 'ENGINEER' }) },
      $transaction: jest.fn((callback) => callback(tx)),
    } as unknown as PrismaService;
    const service = new McuKaryawanService(
      prisma,
      {} as McuNotifikasiService,
      {} as WhatsappService,
    );

    await service.ubahDepartemen(3, { namaDepartemen: 'ENGINEERING' } as any);

    expect(updateDepartemen).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ namaDepartemen: 'ENGINEERING' }),
    }));
    expect(updateUser).toHaveBeenCalledWith({
      where: { departemen: 'ENGINEER' },
      data: { departemen: 'ENGINEERING' },
    });
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
    const whatsapp = {} as unknown as WhatsappService;
    const service = new McuKaryawanService(prisma, notifikasi, whatsapp);

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
    const whatsapp = {} as unknown as WhatsappService;
    const service = new McuKaryawanService(prisma, notifikasi, whatsapp);

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
    const whatsapp = {} as unknown as WhatsappService;
    const service = new McuKaryawanService(prisma, notifikasi, whatsapp);

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
    const whatsapp = {} as unknown as WhatsappService;
    const service = new McuKaryawanService(prisma, notifikasi, whatsapp);
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

describe('McuKaryawanService.cekStatusWa', () => {
  it('melempar NotFoundException kalau karyawan tidak ada', async () => {
    const { service } = buatService({ karyawan: null });

    await expect(service.cekStatusWa(7)).rejects.toThrow('Karyawan tidak ditemukan');
  });

  it('menolak kalau karyawan belum punya nomor telepon', async () => {
    const { service } = buatService({ karyawan: karyawanFixture() as any });

    await expect(service.cekStatusWa(7)).rejects.toThrow('belum punya nomor telepon');
  });

  it('menganggap tidak terdaftar (false) kalau validasiTerdaftar gagal dipastikan (null)', async () => {
    const { service } = buatService({
      karyawan: { ...karyawanFixture(), noTelepon: '0812' } as any,
      validasiTerdaftar: jest.fn().mockResolvedValue(null),
    });

    const hasil = await service.cekStatusWa(7);

    expect(hasil.waTerdaftar).toBe(false);
  });

  it('berhasil menyimpan waTerdaftar true & waDicekPada saat nomor terdaftar', async () => {
    const update = jest.fn(({ data }: any) => Promise.resolve({ id: 7, ...data }));
    const { service, whatsapp } = buatService({
      karyawan: { ...karyawanFixture(), noTelepon: '0812' } as any,
      update,
      validasiTerdaftar: jest.fn().mockResolvedValue(true),
    });

    const hasil = await service.cekStatusWa(7);

    expect(whatsapp.validasiTerdaftar).toHaveBeenCalledWith('0812');
    expect(hasil.waTerdaftar).toBe(true);
    expect(hasil.waDicekPada).toBeInstanceOf(Date);
  });

  it('menyimpan waTerdaftar false saat nomor tidak terdaftar', async () => {
    const { service } = buatService({
      karyawan: { ...karyawanFixture(), noTelepon: '0812' } as any,
      validasiTerdaftar: jest.fn().mockResolvedValue(false),
    });

    const hasil = await service.cekStatusWa(7);

    expect(hasil.waTerdaftar).toBe(false);
  });
});

describe('McuKaryawanService.jalankanReminderJatuhTempo', () => {
  const karyawanJatuhTempo = {
    ...karyawanFixture({ tanggalMcuExpired: tambahBulan(hariIni(), 3) as any }),
    tanggalMcuExpired: tambahBulan(hariIni(), 3),
    noTelepon: '0812',
    gender: null,
  };

  it('tidak kirim WA ataupun notifikasi kalau tidak ada karyawan jatuh tempo', async () => {
    const { service, whatsapp } = buatService({ karyawanFindMany: jest.fn().mockResolvedValue([]) });

    const hasil = await service.jalankanReminderJatuhTempo();

    expect(hasil).toEqual({ dikirim: 0, karyawan: 0 });
    expect(whatsapp.kirim).not.toHaveBeenCalled();
  });

  it('kirim WA reminder H-3 bulan langsung ke karyawan yang punya nomor telepon', async () => {
    const { service, whatsapp } = buatService({
      karyawanFindMany: jest.fn().mockResolvedValue([karyawanJatuhTempo]),
    });

    const hasil = await service.jalankanReminderJatuhTempo();

    expect(hasil.karyawan).toBe(1);
    expect(whatsapp.kirim).toHaveBeenCalledWith(
      '0812',
      expect.stringContaining('Reminder MCU Periodik'),
      undefined,
      'HC',
    );
  });

  it('tidak kirim WA kalau karyawan tidak punya nomor telepon', async () => {
    const { service, whatsapp } = buatService({
      karyawanFindMany: jest.fn().mockResolvedValue([{ ...karyawanJatuhTempo, noTelepon: null }]),
    });

    await service.jalankanReminderJatuhTempo();

    expect(whatsapp.kirim).not.toHaveBeenCalled();
  });

  it('tidak kirim WA kalau whatsapp tidak aktif', async () => {
    const { service, whatsapp } = buatService({
      karyawanFindMany: jest.fn().mockResolvedValue([karyawanJatuhTempo]),
      whatsappAktif: false,
    });

    await service.jalankanReminderJatuhTempo();

    expect(whatsapp.kirim).not.toHaveBeenCalled();
  });
});

describe('McuKaryawanService.karyawanSisaSatuBulan / jalankanReminderSisaSatuBulan', () => {
  it('karyawanSisaSatuBulan meneruskan hasil query dengan status MCU terlengkapi', async () => {
    const karyawanFindMany = jest.fn().mockResolvedValue([
      { ...karyawanFixture(), tanggalMcuExpired: tambahBulan(hariIni(), 1), noTelepon: '0812', gender: null },
    ]);
    const { service } = buatService({ karyawanFindMany });

    const hasil = await service.karyawanSisaSatuBulan();

    expect(karyawanFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tanggalMcuExpired: expect.objectContaining({ not: null }),
        }),
      }),
    );
    expect(hasil).toHaveLength(1);
  });

  it('jalankanReminderSisaSatuBulan kirim WA nada mendesak ke tiap karyawan yang belum terjadwal', async () => {
    const karyawanFindMany = jest.fn().mockResolvedValue([
      { ...karyawanFixture(), tanggalMcuExpired: tambahBulan(hariIni(), 1), noTelepon: '0812', gender: null },
    ]);
    const { service, whatsapp } = buatService({ karyawanFindMany });

    const hasil = await service.jalankanReminderSisaSatuBulan();

    expect(hasil).toEqual({ dikirim: 1, karyawan: 1 });
    expect(whatsapp.kirim).toHaveBeenCalledWith(
      '0812',
      expect.stringContaining('belum ada jadwal'),
      undefined,
      'HC',
    );
  });

  it('tidak menghitung dikirim kalau karyawan tidak punya nomor telepon', async () => {
    const karyawanFindMany = jest.fn().mockResolvedValue([
      { ...karyawanFixture(), tanggalMcuExpired: tambahBulan(hariIni(), 1), noTelepon: null, gender: null },
    ]);
    const { service } = buatService({ karyawanFindMany });

    const hasil = await service.jalankanReminderSisaSatuBulan();

    expect(hasil).toEqual({ dikirim: 0, karyawan: 1 });
  });
});

describe('McuKaryawanService.importMasterExcel — NRP sama diperbarui, tidak dobel', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const XLSX = require('xlsx') as typeof import('xlsx');
  function excel(rows: unknown[][]) {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'PPA ADW');
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }) as Buffer;
  }

  it('memperbarui no HP & email karyawan lama, menambah NRP baru, melewati baris dobel', async () => {
    const karyawanUpdate = jest.fn();
    const karyawanCreate = jest.fn();
    const userUpdate = jest.fn();
    const tx = {
      departemen: { upsert: jest.fn(({ where }) => ({ id: where.namaDepartemen === 'HCGA' ? 2 : 9 })) },
      karyawan: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1, nik: '100', nama: 'Andi', gender: null, departemenId: 2, jabatan: 'Staff', email: 'lama@x.com', noTelepon: '0811', statusKerja: StatusKerja.AKTIF, akunId: 50 },
          { id: 2, nik: '200', nama: 'Bela', gender: null, departemenId: 2, jabatan: 'Staff', email: 'b@x.com', noTelepon: '0822', statusKerja: StatusKerja.AKTIF, akunId: null },
        ]),
        update: karyawanUpdate,
        create: karyawanCreate,
      },
      user: { findFirst: jest.fn().mockResolvedValue(null), update: userUpdate, create: jest.fn().mockResolvedValue({ id: 77 }) },
    };
    const prisma = { $transaction: jest.fn((cb) => cb(tx)) } as unknown as PrismaService;
    const service = new McuKaryawanService(prisma, {} as McuNotifikasiService, {} as WhatsappService);

    const hasil = await service.importMasterExcel(excel([
      ['NRP', 'NAMA', 'DEPT.', 'JABATAN', 'EMAIL', 'NO HP', 'STATUS'],
      ['100', 'Andi', 'HCGA', 'Staff', 'baru@x.com', '0899', ''],
      ['200', 'Bela', 'HCGA', 'Staff', '', '', ''],
      ['300', 'Cici', 'HCGA', 'Staff', 'c@x.com', '0833', ''],
      ['100', 'Andi', 'HCGA', 'Staff', 'lain@x.com', '0800', ''],
    ]));

    expect(hasil).toMatchObject({ inserted: 1, updated: 1, unchanged: 1, skipped: 1 });
    expect(karyawanUpdate).toHaveBeenCalledTimes(1);
    expect(karyawanUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { email: 'baru@x.com', noTelepon: '0899', waTerdaftar: null, waDicekPada: null },
    });
    expect(userUpdate).toHaveBeenCalledWith({ where: { id: 50 }, data: { email: 'baru@x.com', phoneNumber: '0899' } });
    expect(karyawanCreate).toHaveBeenCalledTimes(1);
    expect(karyawanCreate.mock.calls[0][0].data.nik).toBe('300');
  });
});
