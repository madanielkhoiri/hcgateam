import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StatusTiketHelpdesk, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AktorHelpdesk, HelpdeskService } from './helpdesk.service';
import { POHON_KATEGORI_HELPDESK } from './helpdesk.constants';

function aktor(role: UserRole, id = 9): AktorHelpdesk {
  return { id, role };
}

function tiketFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    status: StatusTiketHelpdesk.TERBUKA,
    picId: null,
    diprosesPada: null,
    level: null,
    pembuat: { id: 9 },
    ...overrides,
  };
}

function buatService(overrides: {
  tiket?: unknown;
  create?: jest.Mock;
  update?: jest.Mock;
  aggregate?: unknown;
  count?: number;
} = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const update = overrides.update ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));

  const prisma: any = {
    tiketHelpdesk: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue('tiket' in overrides ? overrides.tiket : tiketFixture()),
      count: jest.fn().mockResolvedValue(overrides.count ?? 0),
      aggregate: jest.fn().mockResolvedValue('aggregate' in overrides ? overrides.aggregate : { _max: { sequenceNumber: null } }),
      create,
      update,
    },
  };

  prisma.$transaction = jest.fn((cb: any) => cb(prisma));

  const service = new HelpdeskService(prisma as PrismaService);

  return { service, prisma, create, update };
}

const dataDasar = {
  kategori: 'Web OFA',
  subKategori: 'User Access - Web OFA',
  masalah: 'Penambahan Akses Fitur',
  deskripsi: 'Tidak bisa login ke sistem',
};

describe('HelpdeskService.kategoriTersedia', () => {
  it('mengembalikan pohon kategori lengkap', () => {
    const { service } = buatService();

    expect(service.kategoriTersedia()).toBe(POHON_KATEGORI_HELPDESK);
  });
});

describe('HelpdeskService.buat — validasi', () => {
  it('menolak kategori tidak valid', async () => {
    const { service } = buatService();

    await expect(service.buat(aktor(UserRole.KARYAWAN), { ...dataDasar, kategori: 'Salah' })).rejects.toThrow(
      'Kategori masalah tidak valid',
    );
  });

  it('menolak subKategori tidak valid untuk kategori tersebut', async () => {
    const { service } = buatService();

    await expect(
      service.buat(aktor(UserRole.KARYAWAN), { ...dataDasar, subKategori: 'Salah' }),
    ).rejects.toThrow('Sub kategori tidak valid');
  });

  it('menolak masalah tidak valid untuk sub kategori tersebut', async () => {
    const { service } = buatService();

    await expect(
      service.buat(aktor(UserRole.KARYAWAN), { ...dataDasar, masalah: 'Masalah Ngasal' }),
    ).rejects.toThrow('Masalah tidak valid');
  });

  it('menolak deskripsi kurang dari 5 karakter', async () => {
    const { service } = buatService();

    await expect(service.buat(aktor(UserRole.KARYAWAN), { ...dataDasar, deskripsi: 'abc' })).rejects.toThrow(
      'Deskripsi masalah minimal 5 karakter',
    );
  });
});

describe('HelpdeskService.buat — sukses', () => {
  it('nomorTiket dimulai dari 00001 kalau belum ada tiket sama sekali', async () => {
    const { service, create } = buatService({ aggregate: { _max: { sequenceNumber: null } } });

    await service.buat(aktor(UserRole.KARYAWAN), dataDasar);

    expect(create.mock.calls[0][0].data.sequenceNumber).toBe(1);
    expect(create.mock.calls[0][0].data.nomorTiket).toMatch(/^TCKT\/\d{2}\/\d{2}\/00001$/);
  });

  it('nomorTiket melanjutkan dari sequenceNumber tertinggi', async () => {
    const { service, create } = buatService({ aggregate: { _max: { sequenceNumber: 41 } } });

    await service.buat(aktor(UserRole.KARYAWAN), dataDasar);

    expect(create.mock.calls[0][0].data.sequenceNumber).toBe(42);
    expect(create.mock.calls[0][0].data.nomorTiket).toMatch(/00042$/);
  });

  it('menyimpan lampiran kalau ada file diunggah', async () => {
    const { service, create } = buatService();
    const file = { filename: 'abc.jpg', originalname: 'foto.jpg' } as Express.Multer.File;

    await service.buat(aktor(UserRole.KARYAWAN), dataDasar, file);

    expect(create.mock.calls[0][0].data.lampiran).toBe('/uploads/helpdesk/abc.jpg');
    expect(create.mock.calls[0][0].data.namaFileAsli).toBe('foto.jpg');
  });

  it('lampiran null kalau tidak ada file', async () => {
    const { service, create } = buatService();

    await service.buat(aktor(UserRole.KARYAWAN), dataDasar);

    expect(create.mock.calls[0][0].data.lampiran).toBeNull();
  });

  it('pembuatId diisi dari id aktor', async () => {
    const { service, create } = buatService();

    await service.buat(aktor(UserRole.KARYAWAN, 7), dataDasar);

    expect(create.mock.calls[0][0].data.pembuatId).toBe(7);
  });
});

describe('HelpdeskService.daftar — akses per role', () => {
  it('PIC (Admin/Super Admin) melihat semua tiket', async () => {
    const { service, prisma } = buatService();

    await service.daftar(aktor(UserRole.ADMIN));

    expect(prisma.tiketHelpdesk.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('karyawan biasa hanya melihat tiket miliknya sendiri', async () => {
    const { service, prisma } = buatService();

    await service.daftar(aktor(UserRole.KARYAWAN, 7));

    expect(prisma.tiketHelpdesk.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { pembuatId: 7 } }),
    );
  });

  it('mengabaikan filter status yang tidak dikenal', async () => {
    const { service, prisma } = buatService();

    await service.daftar(aktor(UserRole.ADMIN), 'STATUS_NGASAL');

    expect(prisma.tiketHelpdesk.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('menerapkan filter status yang valid', async () => {
    const { service, prisma } = buatService();

    await service.daftar(aktor(UserRole.ADMIN), 'SELESAI');

    expect(prisma.tiketHelpdesk.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { status: StatusTiketHelpdesk.SELESAI } }),
    );
  });
});

describe('HelpdeskService.ringkasan', () => {
  it('menghitung antrian (TERBUKA+DIPROSES) khusus milik akun untuk non-PIC', async () => {
    const { service, prisma } = buatService({ count: 3 });

    const hasil = await service.ringkasan(aktor(UserRole.KARYAWAN, 7));

    expect(prisma.tiketHelpdesk.count).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ pembuatId: 7 }) }),
    );
    expect(hasil).toEqual({ antrian: 3 });
  });
});

describe('HelpdeskService.detail', () => {
  it('melempar NotFoundException kalau tiket tidak ada', async () => {
    const { service } = buatService({ tiket: null });

    await expect(service.detail(1, aktor(UserRole.KARYAWAN))).rejects.toThrow(NotFoundException);
  });

  it('menolak karyawan biasa mengakses tiket milik orang lain', async () => {
    const { service } = buatService({ tiket: tiketFixture({ pembuat: { id: 999 } }) });

    await expect(service.detail(1, aktor(UserRole.KARYAWAN, 9))).rejects.toThrow(ForbiddenException);
  });

  it('mengizinkan PIC mengakses tiket siapapun', async () => {
    const { service } = buatService({ tiket: tiketFixture({ pembuat: { id: 999 } }) });

    await expect(service.detail(1, aktor(UserRole.ADMIN, 9))).resolves.toBeDefined();
  });
});

describe('HelpdeskService.proses', () => {
  it('menolak role selain PIC', async () => {
    const { service } = buatService();

    await expect(service.proses(1, aktor(UserRole.KARYAWAN))).rejects.toThrow(ForbiddenException);
  });

  it('melempar NotFoundException kalau tiket tidak ada', async () => {
    const { service } = buatService({ tiket: null });

    await expect(service.proses(1, aktor(UserRole.ADMIN))).rejects.toThrow(NotFoundException);
  });

  it('menolak proses tiket yang sudah tidak TERBUKA', async () => {
    const { service } = buatService({ tiket: tiketFixture({ status: StatusTiketHelpdesk.DIPROSES }) });

    await expect(service.proses(1, aktor(UserRole.ADMIN))).rejects.toThrow('sudah diproses sebelumnya');
  });

  it('berhasil memproses tiket TERBUKA', async () => {
    const { service, update } = buatService();

    await service.proses(1, aktor(UserRole.ADMIN, 5));

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: StatusTiketHelpdesk.DIPROSES, picId: 5 }) }),
    );
  });
});

describe('HelpdeskService.selesaikan', () => {
  it('menolak role selain PIC', async () => {
    const { service } = buatService();

    await expect(service.selesaikan(1, aktor(UserRole.KARYAWAN), { catatanPenyelesaian: 'Selesai' } as any)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('melempar NotFoundException kalau tiket tidak ada', async () => {
    const { service } = buatService({ tiket: null });

    await expect(service.selesaikan(1, aktor(UserRole.ADMIN), { catatanPenyelesaian: 'Selesai' } as any)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('menolak tiket yang sudah SELESAI', async () => {
    const { service } = buatService({ tiket: tiketFixture({ status: StatusTiketHelpdesk.SELESAI }) });

    await expect(service.selesaikan(1, aktor(UserRole.ADMIN), { catatanPenyelesaian: 'Selesai' } as any)).rejects.toThrow(
      'Tiket sudah selesai',
    );
  });

  it('mempertahankan picId & diprosesPada yang sudah ada (tidak menimpa milik pemroses asli)', async () => {
    const diprosesPadaLama = new Date('2026-01-01');
    const { service, update } = buatService({
      tiket: tiketFixture({ status: StatusTiketHelpdesk.DIPROSES, picId: 3, diprosesPada: diprosesPadaLama }),
    });

    await service.selesaikan(1, aktor(UserRole.ADMIN, 9), { catatanPenyelesaian: '  Sudah diperbaiki  ' } as any);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ picId: 3, diprosesPada: diprosesPadaLama, catatanPenyelesaian: 'Sudah diperbaiki' }) }),
    );
  });

  it('memakai aktor sebagai pic kalau tiket belum pernah diproses', async () => {
    const { service, update } = buatService({ tiket: tiketFixture({ status: StatusTiketHelpdesk.TERBUKA, picId: null }) });

    await service.selesaikan(1, aktor(UserRole.ADMIN, 9), { catatanPenyelesaian: 'Selesai' } as any);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ picId: 9 }) }),
    );
  });

  it('level fallback ke level tiket lama kalau tidak dikirim', async () => {
    const { service, update } = buatService({ tiket: tiketFixture({ level: 'TINGGI' }) });

    await service.selesaikan(1, aktor(UserRole.ADMIN), { catatanPenyelesaian: 'Selesai' } as any);

    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ level: 'TINGGI' }) }),
    );
  });
});
