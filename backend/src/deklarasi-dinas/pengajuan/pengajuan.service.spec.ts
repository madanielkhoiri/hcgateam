import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SaldoService } from '../saldo/saldo.service';
import { PengajuanService } from './pengajuan.service';

function penggunaFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, nrp: '12345', name: 'Budi', isActive: true, ...overrides };
}

function pengajuanFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    idPengguna: 1,
    nrp: '12345',
    namaPengguna: 'Budi',
    jenisPengajuan: 'UANG_OPERASIONAL',
    lokasi: null,
    statusPengajuan: 'DIAJUKAN',
    idSaldo: null,
    nomorStd: null,
    pathFileStd: null,
    pathFileRab: '/uploads/pengajuan/rab.pdf',
    pathFileBuktiTransfer: null,
    ...overrides,
  } as any;
}

function fileFixture(filename = 'a.pdf'): Express.Multer.File {
  return { filename, originalname: filename } as Express.Multer.File;
}

function buatService(overrides: {
  pengguna?: unknown;
  pengajuanDetail?: unknown;
  faList?: unknown[];
  create?: jest.Mock;
  update?: jest.Mock;
  deleteFn?: jest.Mock;
  buatSaldo?: jest.Mock;
} = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const update = overrides.update ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const deleteFn = overrides.deleteFn ?? jest.fn().mockResolvedValue({});

  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue('pengguna' in overrides ? overrides.pengguna : penggunaFixture()),
      findMany: jest.fn().mockResolvedValue(overrides.faList ?? []),
    },
    pengajuan: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue('pengajuanDetail' in overrides ? overrides.pengajuanDetail : pengajuanFixture()),
      create,
      update,
      delete: deleteFn,
    },
  } as unknown as PrismaService;

  const saldoService = {
    buatSaldo: overrides.buatSaldo ?? jest.fn().mockResolvedValue({ id: 99 }),
  } as unknown as SaldoService;

  const service = new PengajuanService(prisma, saldoService);

  return { service, prisma, saldoService, create, update, deleteFn };
}

const envAsli = process.env.FONNTE_TOKEN;
beforeEach(() => {
  delete process.env.FONNTE_TOKEN;
});
afterAll(() => {
  if (envAsli !== undefined) process.env.FONNTE_TOKEN = envAsli;
});

describe('PengajuanService.buatPengajuan — validasi', () => {
  it('menolak id_pengguna tidak valid', async () => {
    const { service } = buatService();

    await expect(
      service.buatPengajuan({ id_pengguna: '0', jenis_pengajuan: 'UANG_OPERASIONAL' } as any, undefined, fileFixture()),
    ).rejects.toThrow('Pengguna wajib dipilih');
  });

  it('menolak PERJALANAN_DINAS tanpa file STD', async () => {
    const { service } = buatService();

    await expect(
      service.buatPengajuan({ id_pengguna: '1', jenis_pengajuan: 'PERJALANAN_DINAS' } as any, undefined, fileFixture()),
    ).rejects.toThrow('File STD wajib diupload');
  });

  it('menolak tanpa file RAB', async () => {
    const { service } = buatService();

    await expect(
      service.buatPengajuan({ id_pengguna: '1', jenis_pengajuan: 'UANG_OPERASIONAL' } as any, undefined, undefined),
    ).rejects.toThrow('File RAB wajib diupload');
  });

  it('menolak PERJALANAN_DINAS tanpa nomor STD', async () => {
    const { service } = buatService();

    await expect(
      service.buatPengajuan({ id_pengguna: '1', jenis_pengajuan: 'PERJALANAN_DINAS', nomor_std: '  ' } as any, fileFixture(), fileFixture()),
    ).rejects.toThrow('Nomor STD wajib diisi');
  });

  it('menolak UANG_OPERASIONAL tanpa nomor RAB', async () => {
    const { service } = buatService();

    await expect(
      service.buatPengajuan({ id_pengguna: '1', jenis_pengajuan: 'UANG_OPERASIONAL', nomor_rab: '' } as any, undefined, fileFixture()),
    ).rejects.toThrow('Nomor RAB wajib diisi');
  });

  it('melempar NotFoundException kalau pengguna tidak ada', async () => {
    const { service } = buatService({ pengguna: null });

    await expect(
      service.buatPengajuan({ id_pengguna: '1', jenis_pengajuan: 'UANG_OPERASIONAL', nomor_rab: 'RAB-1' } as any, undefined, fileFixture()),
    ).rejects.toThrow(NotFoundException);
  });

  it('menolak akun karyawan yang tidak aktif', async () => {
    const { service } = buatService({ pengguna: penggunaFixture({ isActive: false }) });

    await expect(
      service.buatPengajuan({ id_pengguna: '1', jenis_pengajuan: 'UANG_OPERASIONAL', nomor_rab: 'RAB-1' } as any, undefined, fileFixture()),
    ).rejects.toThrow('Akun karyawan tidak aktif');
  });
});

describe('PengajuanService.buatPengajuan — sukses', () => {
  it('fallback nrp/nama dari data pengguna kalau tidak dikirim di form', async () => {
    const { service, create } = buatService({ pengguna: penggunaFixture({ nrp: '999', name: 'Siti' }) });

    await service.buatPengajuan(
      { id_pengguna: '1', jenis_pengajuan: 'UANG_OPERASIONAL', nomor_rab: 'RAB-1' } as any,
      undefined,
      fileFixture('rab.pdf'),
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ nrp: '999', namaPengguna: 'Siti', statusPengajuan: 'DIAJUKAN' }) }),
    );
  });

  it('menyimpan path file STD & RAB dan nominalTransfer awal 0', async () => {
    const { service, create } = buatService();

    await service.buatPengajuan(
      { id_pengguna: '1', jenis_pengajuan: 'PERJALANAN_DINAS', nomor_std: 'STD-1' } as any,
      fileFixture('std.pdf'),
      fileFixture('rab.pdf'),
    );

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          namaFileStd: 'std.pdf',
          pathFileStd: '/uploads/pengajuan/std.pdf',
          namaFileRab: 'rab.pdf',
          pathFileRab: '/uploads/pengajuan/rab.pdf',
          nominalTransfer: 0,
        }),
      }),
    );
  });
});

describe('PengajuanService.ambilPengajuanBerdasarkanPengguna', () => {
  it('menolak id pengguna tidak valid', async () => {
    const { service } = buatService();

    await expect(service.ambilPengajuanBerdasarkanPengguna(-1)).rejects.toThrow(BadRequestException);
  });
});

describe('PengajuanService.ambilPengajuanBerdasarkanId', () => {
  it('menolak id tidak valid', async () => {
    const { service } = buatService();

    await expect(service.ambilPengajuanBerdasarkanId(0)).rejects.toThrow(BadRequestException);
  });

  it('melempar NotFoundException kalau pengajuan tidak ada', async () => {
    const { service } = buatService({ pengajuanDetail: null });

    await expect(service.ambilPengajuanBerdasarkanId(1)).rejects.toThrow(NotFoundException);
  });
});

describe('PengajuanService.updateStatusPengajuan', () => {
  it('menolak tanpa status_pengajuan', async () => {
    const { service } = buatService();

    await expect(service.updateStatusPengajuan(1, {} as any)).rejects.toThrow('Status pengajuan wajib dipilih');
  });

  it('menolak ubah pengajuan yang sudah SELESAI', async () => {
    const { service } = buatService({ pengajuanDetail: pengajuanFixture({ statusPengajuan: 'SELESAI' }) });

    await expect(service.updateStatusPengajuan(1, { status_pengajuan: 'DITOLAK' } as any)).rejects.toThrow(
      'sudah selesai tidak dapat diubah',
    );
  });

  it('menolak ubah pengajuan MENUNGGU_TRANSFER ke status lain', async () => {
    const { service } = buatService({ pengajuanDetail: pengajuanFixture({ statusPengajuan: 'MENUNGGU_TRANSFER' }) });

    await expect(service.updateStatusPengajuan(1, { status_pengajuan: 'DITOLAK' } as any)).rejects.toThrow(
      'sudah menunggu transfer tidak dapat diubah',
    );
  });

  it('DITOLAK wajib mengisi catatan_admin', async () => {
    const { service } = buatService();

    await expect(service.updateStatusPengajuan(1, { status_pengajuan: 'DITOLAK' } as any)).rejects.toThrow(
      'Alasan penolakan wajib diisi',
    );
  });

  it('MENUNGGU_TRANSFER hanya boleh dari status DIAJUKAN', async () => {
    const { service } = buatService({ pengajuanDetail: pengajuanFixture({ statusPengajuan: 'DITOLAK' }) });

    await expect(service.updateStatusPengajuan(1, { status_pengajuan: 'MENUNGGU_TRANSFER' } as any)).rejects.toThrow(
      'Hanya pengajuan berstatus Diajukan',
    );
  });

  it('MENUNGGU_TRANSFER memberi catatan default kalau tidak diisi', async () => {
    const { service, update } = buatService();

    await service.updateStatusPengajuan(1, { status_pengajuan: 'MENUNGGU_TRANSFER' } as any);

    expect(update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { statusPengajuan: 'MENUNGGU_TRANSFER', catatanAdmin: 'Pengajuan disetujui oleh FA dan menunggu proses transfer.' },
    });
  });

  it('DITOLAK berhasil dengan catatan ter-trim', async () => {
    const { service, update } = buatService();

    await service.updateStatusPengajuan(1, { status_pengajuan: 'DITOLAK', catatan_admin: '  Data kurang  ' } as any);

    expect(update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { statusPengajuan: 'DITOLAK', catatanAdmin: 'Data kurang' },
    });
  });
});

describe('PengajuanService.uploadBuktiTransfer', () => {
  it('menolak tanpa file bukti transfer', async () => {
    const { service } = buatService({ pengajuanDetail: pengajuanFixture({ statusPengajuan: 'MENUNGGU_TRANSFER' }) });

    await expect(service.uploadBuktiTransfer(1, undefined, { nominal_transfer: 1000 })).rejects.toThrow(
      'Bukti transfer wajib diupload',
    );
  });

  it('menolak kalau status bukan MENUNGGU_TRANSFER', async () => {
    const { service } = buatService({ pengajuanDetail: pengajuanFixture({ statusPengajuan: 'DIAJUKAN' }) });

    await expect(service.uploadBuktiTransfer(1, fileFixture(), { nominal_transfer: 1000 })).rejects.toThrow(
      'hanya dapat diupload ketika status pengajuan Menunggu Transfer',
    );
  });

  it('menolak kalau sudah punya idSaldo', async () => {
    const { service } = buatService({
      pengajuanDetail: pengajuanFixture({ statusPengajuan: 'MENUNGGU_TRANSFER', idSaldo: 5 }),
    });

    await expect(service.uploadBuktiTransfer(1, fileFixture(), { nominal_transfer: 1000 })).rejects.toThrow(
      'sudah memiliki saldo transfer',
    );
  });

  it('menolak nominal transfer <= 0 atau bukan angka', async () => {
    const { service } = buatService({ pengajuanDetail: pengajuanFixture({ statusPengajuan: 'MENUNGGU_TRANSFER' }) });

    await expect(service.uploadBuktiTransfer(1, fileFixture(), { nominal_transfer: 0 })).rejects.toThrow(
      'Nominal transfer wajib lebih dari 0',
    );
  });

  it('berhasil: memanggil saldoService.buatSaldo lalu update pengajuan jadi SELESAI', async () => {
    const { service, saldoService, update } = buatService({
      pengajuanDetail: pengajuanFixture({ statusPengajuan: 'MENUNGGU_TRANSFER' }),
    });

    await service.uploadBuktiTransfer(1, fileFixture('bukti.jpg'), { nominal_transfer: 50000, tanggal_transfer: '2026-01-05' });

    expect(saldoService.buatSaldo).toHaveBeenCalledWith(
      expect.objectContaining({ id_pengguna: 1, nominal_transfer: 50000 }),
    );
    expect(update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ statusPengajuan: 'SELESAI', idSaldo: 99, nominalTransfer: 50000 }),
    });
  });
});

describe('PengajuanService.hapusPengajuan', () => {
  it('menolak hapus pengajuan berstatus MENUNGGU_TRANSFER', async () => {
    const { service } = buatService({ pengajuanDetail: pengajuanFixture({ statusPengajuan: 'MENUNGGU_TRANSFER' }) });

    await expect(service.hapusPengajuan(1)).rejects.toThrow('sudah masuk proses transfer tidak dapat dihapus');
  });

  it('menolak hapus pengajuan berstatus SELESAI', async () => {
    const { service } = buatService({ pengajuanDetail: pengajuanFixture({ statusPengajuan: 'SELESAI' }) });

    await expect(service.hapusPengajuan(1)).rejects.toThrow('sudah masuk proses transfer tidak dapat dihapus');
  });

  it('berhasil menghapus pengajuan berstatus DIAJUKAN', async () => {
    const { service, deleteFn } = buatService({ pengajuanDetail: pengajuanFixture({ statusPengajuan: 'DIAJUKAN' }) });

    const hasil = await service.hapusPengajuan(1);

    expect(deleteFn).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});
