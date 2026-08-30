import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { OrderPackMealService } from './order-pack-meal.service';

function aktor(role: UserRole, id = 9): { id: number; username: string; role: UserRole } {
  return { id, username: 'test', role };
}

function orderFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, createdBy: 9, approvedFormPath: 'uploads/order-pack-meal/lama.pdf', ...overrides };
}

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('err', { code, clientVersion: '5' } as any);
}

function buatService(overrides: {
  order?: unknown;
  latest?: unknown;
  create?: jest.Mock;
  update?: jest.Mock;
  deleteFn?: jest.Mock;
  transactionImpl?: (cb: any) => Promise<unknown>;
} = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const update = overrides.update ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const deleteFn = overrides.deleteFn ?? jest.fn().mockResolvedValue({});
  const itemDeleteMany = jest.fn().mockResolvedValue({});

  const prisma: any = {
    packMealOrder: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue('order' in overrides ? overrides.order : orderFixture()),
      findFirst: jest.fn().mockResolvedValue('latest' in overrides ? overrides.latest : null),
      create,
      update,
      delete: deleteFn,
    },
    packMealOrderItem: {
      deleteMany: itemDeleteMany,
    },
  };

  prisma.$transaction = overrides.transactionImpl ?? jest.fn((cb: any) => cb(prisma));

  const service = new OrderPackMealService(prisma as PrismaService);

  return { service, prisma, create, update, deleteFn, itemDeleteMany };
}

const itemsJsonValid = JSON.stringify([{ orderType: 'Nasi Ayam', quantity: 10 }]);

describe('OrderPackMealService.create — parseItems', () => {
  const dtoDasar = { items: itemsJsonValid, neededDate: '2026-01-05', deliveryLocation: 'Site A' };

  it('menolak JSON items yang tidak valid', async () => {
    const { service } = buatService();

    await expect(service.create({ ...dtoDasar, items: 'bukan-json' } as any, 'path', aktor(UserRole.KARYAWAN))).rejects.toThrow(
      'Format baris jenis order tidak valid',
    );
  });

  it('menolak array kosong', async () => {
    const { service } = buatService();

    await expect(service.create({ ...dtoDasar, items: '[]' } as any, 'path', aktor(UserRole.KARYAWAN))).rejects.toThrow(
      'Minimal satu baris jenis order wajib diisi',
    );
  });

  it('menolak lebih dari 50 baris', async () => {
    const { service } = buatService();
    const banyak = JSON.stringify(Array.from({ length: 51 }, () => ({ orderType: 'Nasi', quantity: 1 })));

    await expect(service.create({ ...dtoDasar, items: banyak } as any, 'path', aktor(UserRole.KARYAWAN))).rejects.toThrow(
      'Maksimal 50 baris jenis order',
    );
  });

  it('menolak orderType kurang dari 2 karakter', async () => {
    const { service } = buatService();
    const items = JSON.stringify([{ orderType: 'A', quantity: 1 }]);

    await expect(service.create({ ...dtoDasar, items } as any, 'path', aktor(UserRole.KARYAWAN))).rejects.toThrow(
      'wajib diisi',
    );
  });

  it('menolak quantity <= 0 atau bukan integer', async () => {
    const { service } = buatService();
    const items = JSON.stringify([{ orderType: 'Nasi Ayam', quantity: 0 }]);

    await expect(service.create({ ...dtoDasar, items } as any, 'path', aktor(UserRole.KARYAWAN))).rejects.toThrow(
      'wajib lebih dari 0',
    );
  });

  it('menolak quantity lebih dari 100.000', async () => {
    const { service } = buatService();
    const items = JSON.stringify([{ orderType: 'Nasi Ayam', quantity: 100_001 }]);

    await expect(service.create({ ...dtoDasar, items } as any, 'path', aktor(UserRole.KARYAWAN))).rejects.toThrow(
      'terlalu besar',
    );
  });
});

describe('OrderPackMealService.create — sukses & penomoran', () => {
  const dtoDasar = { items: itemsJsonValid, neededDate: '2026-01-05', deliveryLocation: '  Site A  ' };

  it('sequenceNumber dimulai dari 1 kalau belum ada order hari ini', async () => {
    const { service, create } = buatService({ latest: null });

    await service.create(dtoDasar as any, 'path.pdf', aktor(UserRole.KARYAWAN));

    expect(create.mock.calls[0][0].data.sequenceNumber).toBe(1);
    expect(create.mock.calls[0][0].data.orderNumber).toMatch(/^ADD-\d{8}-001$/);
  });

  it('sequenceNumber melanjutkan dari order terakhir hari ini', async () => {
    const { service, create } = buatService({ latest: { sequenceNumber: 4 } });

    await service.create(dtoDasar as any, 'path.pdf', aktor(UserRole.KARYAWAN));

    expect(create.mock.calls[0][0].data.sequenceNumber).toBe(5);
  });

  it('totalPacks dijumlahkan dari seluruh baris item', async () => {
    const items = JSON.stringify([{ orderType: 'Nasi Ayam', quantity: 10 }, { orderType: 'Nasi Ikan', quantity: 5 }]);
    const { service, create } = buatService();

    await service.create({ ...dtoDasar, items } as any, 'path.pdf', aktor(UserRole.KARYAWAN));

    expect(create.mock.calls[0][0].data.totalPacks).toBe(15);
  });

  it('deliveryLocation di-trim', async () => {
    const { service, create } = buatService();

    await service.create(dtoDasar as any, 'path.pdf', aktor(UserRole.KARYAWAN));

    expect(create.mock.calls[0][0].data.deliveryLocation).toBe('Site A');
  });

  it('mengulang transaksi kalau gagal karena konflik serialisasi (P2034), berhasil di percobaan berikutnya', async () => {
    let percobaan = 0;
    const transactionImpl = jest.fn(async (cb: any) => {
      percobaan += 1;
      if (percobaan < 3) {
        throw prismaError('P2034');
      }
      return cb({
        packMealOrder: { findFirst: jest.fn().mockResolvedValue(null), create: jest.fn(({ data }: any) => Promise.resolve({ id: 1, ...data })) },
      });
    });
    const { service } = buatService({ transactionImpl });

    await service.create(dtoDasar as any, 'path.pdf', aktor(UserRole.KARYAWAN));

    expect(percobaan).toBe(3);
  });

  it('menyerah setelah 4 percobaan gagal dan menghapus file yang sudah terunggah', async () => {
    const direktoriUji = mkdtempSync(join(tmpdir(), 'opm-'));
    const cwdAwal = process.cwd();
    mkdirSync(join(direktoriUji, 'uploads', 'order-pack-meal'), { recursive: true });
    const filePath = join(direktoriUji, 'uploads', 'order-pack-meal', 'form.pdf');
    writeFileSync(filePath, 'x');
    process.chdir(direktoriUji);

    try {
      const transactionImpl = jest.fn().mockRejectedValue(prismaError('P2034'));
      const { service } = buatService({ transactionImpl });

      await expect(
        service.create(dtoDasar as any, 'uploads/order-pack-meal/form.pdf', aktor(UserRole.KARYAWAN)),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);

      expect(existsSync(filePath)).toBe(false);
      expect(transactionImpl).toHaveBeenCalledTimes(4);
    } finally {
      process.chdir(cwdAwal);
      rmSync(direktoriUji, { recursive: true, force: true });
    }
  });

  it('menghapus file terunggah kalau error tidak retryable (langsung gagal)', async () => {
    const direktoriUji = mkdtempSync(join(tmpdir(), 'opm-'));
    const cwdAwal = process.cwd();
    mkdirSync(join(direktoriUji, 'uploads', 'order-pack-meal'), { recursive: true });
    const filePath = join(direktoriUji, 'uploads', 'order-pack-meal', 'form.pdf');
    writeFileSync(filePath, 'x');
    process.chdir(direktoriUji);

    try {
      const transactionImpl = jest.fn().mockRejectedValue(new Error('DB down'));
      const { service } = buatService({ transactionImpl });

      await expect(
        service.create(dtoDasar as any, 'uploads/order-pack-meal/form.pdf', aktor(UserRole.KARYAWAN)),
      ).rejects.toThrow('DB down');

      expect(existsSync(filePath)).toBe(false);
      expect(transactionImpl).toHaveBeenCalledTimes(1);
    } finally {
      process.chdir(cwdAwal);
      rmSync(direktoriUji, { recursive: true, force: true });
    }
  });
});

describe('OrderPackMealService.findAll — akses per role', () => {
  it('staff (Admin/Group Leader/Section Head) melihat semua order', async () => {
    const { service, prisma } = buatService();

    await service.findAll(aktor(UserRole.SECTION_HEAD));

    expect(prisma.packMealOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: {} }),
    );
  });

  it('karyawan biasa hanya melihat order miliknya sendiri', async () => {
    const { service, prisma } = buatService();

    await service.findAll(aktor(UserRole.KARYAWAN, 7));

    expect(prisma.packMealOrder.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { createdBy: 7 } }),
    );
  });
});

describe('OrderPackMealService.findOne — akses per role', () => {
  it('melempar NotFoundException kalau order tidak ada', async () => {
    const { service } = buatService({ order: null });

    await expect(service.findOne(1, aktor(UserRole.KARYAWAN))).rejects.toThrow(NotFoundException);
  });

  it('menolak karyawan biasa mengakses order milik orang lain', async () => {
    const { service } = buatService({ order: orderFixture({ createdBy: 999 }) });

    await expect(service.findOne(1, aktor(UserRole.KARYAWAN, 9))).rejects.toThrow(ForbiddenException);
  });

  it('mengizinkan staff mengakses order siapapun', async () => {
    const { service } = buatService({ order: orderFixture({ createdBy: 999 }) });

    await expect(service.findOne(1, aktor(UserRole.SECTION_HEAD, 9))).resolves.toBeDefined();
  });

  it('mengizinkan pemilik mengakses order miliknya sendiri', async () => {
    const { service } = buatService({ order: orderFixture({ createdBy: 9 }) });

    await expect(service.findOne(1, aktor(UserRole.KARYAWAN, 9))).resolves.toBeDefined();
  });
});

describe('OrderPackMealService.update', () => {
  it('mengganti seluruh item kalau dto.items dikirim', async () => {
    const { service, itemDeleteMany, update } = buatService();

    await service.update(1, { items: itemsJsonValid } as any, undefined, aktor(UserRole.KARYAWAN, 9));

    expect(itemDeleteMany).toHaveBeenCalledWith({ where: { orderId: 1 } });
    expect(update.mock.calls[0][0].data.items.create).toHaveLength(1);
  });

  it('tidak menyentuh item kalau dto.items tidak dikirim', async () => {
    const { service, itemDeleteMany } = buatService();

    await service.update(1, { deliveryLocation: 'Baru' } as any, undefined, aktor(UserRole.KARYAWAN, 9));

    expect(itemDeleteMany).not.toHaveBeenCalled();
  });

  it('menghapus file lama kalau ada file baru yang berbeda dari yang lama', async () => {
    const direktoriUji = mkdtempSync(join(tmpdir(), 'opm-update-'));
    const cwdAwal = process.cwd();
    mkdirSync(join(direktoriUji, 'uploads', 'order-pack-meal'), { recursive: true });
    const filePathLama = join(direktoriUji, 'uploads', 'order-pack-meal', 'lama.pdf');
    writeFileSync(filePathLama, 'x');
    process.chdir(direktoriUji);

    try {
      const { service } = buatService({ order: orderFixture({ approvedFormPath: 'uploads/order-pack-meal/lama.pdf' }) });

      await service.update(1, {} as any, 'uploads/order-pack-meal/baru.pdf', aktor(UserRole.KARYAWAN, 9));

      expect(existsSync(filePathLama)).toBe(false);
    } finally {
      process.chdir(cwdAwal);
      rmSync(direktoriUji, { recursive: true, force: true });
    }
  });

  it('menghapus file baru yang terlanjur diunggah kalau transaksi update gagal', async () => {
    const direktoriUji = mkdtempSync(join(tmpdir(), 'opm-update-fail-'));
    const cwdAwal = process.cwd();
    mkdirSync(join(direktoriUji, 'uploads', 'order-pack-meal'), { recursive: true });
    const filePathBaru = join(direktoriUji, 'uploads', 'order-pack-meal', 'baru.pdf');
    writeFileSync(filePathBaru, 'x');
    process.chdir(direktoriUji);

    try {
      const transactionImpl = jest.fn().mockRejectedValue(new Error('DB error'));
      const { service } = buatService({ transactionImpl });

      await expect(
        service.update(1, {} as any, 'uploads/order-pack-meal/baru.pdf', aktor(UserRole.KARYAWAN, 9)),
      ).rejects.toThrow('DB error');

      expect(existsSync(filePathBaru)).toBe(false);
    } finally {
      process.chdir(cwdAwal);
      rmSync(direktoriUji, { recursive: true, force: true });
    }
  });
});

describe('OrderPackMealService.remove', () => {
  it('melempar NotFoundException kalau order tidak ada', async () => {
    const { service } = buatService({ order: null });

    await expect(service.remove(1, aktor(UserRole.KARYAWAN))).rejects.toThrow(NotFoundException);
  });

  it('menolak karyawan biasa menghapus order milik orang lain', async () => {
    const { service } = buatService({ order: orderFixture({ createdBy: 999 }) });

    await expect(service.remove(1, aktor(UserRole.KARYAWAN, 9))).rejects.toThrow(ForbiddenException);
  });

  it('berhasil menghapus order dan file terkait', async () => {
    const direktoriUji = mkdtempSync(join(tmpdir(), 'opm-remove-'));
    const cwdAwal = process.cwd();
    mkdirSync(join(direktoriUji, 'uploads', 'order-pack-meal'), { recursive: true });
    const filePath = join(direktoriUji, 'uploads', 'order-pack-meal', 'form.pdf');
    writeFileSync(filePath, 'x');
    process.chdir(direktoriUji);

    try {
      const { service, deleteFn } = buatService({
        order: orderFixture({ createdBy: 9, approvedFormPath: 'uploads/order-pack-meal/form.pdf' }),
      });

      const hasil = await service.remove(1, aktor(UserRole.KARYAWAN, 9));

      expect(deleteFn).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(existsSync(filePath)).toBe(false);
      expect(hasil.message).toMatch(/berhasil dihapus/);
    } finally {
      process.chdir(cwdAwal);
      rmSync(direktoriUji, { recursive: true, force: true });
    }
  });
});

describe('OrderPackMealService — deleteUploadedFile (path traversal safety)', () => {
  it('mengabaikan path di luar folder uploads/order-pack-meal', async () => {
    const direktoriUji = mkdtempSync(join(tmpdir(), 'opm-traversal-'));
    const cwdAwal = process.cwd();
    mkdirSync(join(direktoriUji, 'uploads', 'lain'), { recursive: true });
    const filePath = join(direktoriUji, 'uploads', 'lain', 'rahasia.txt');
    writeFileSync(filePath, 'x');
    process.chdir(direktoriUji);

    try {
      const { service } = buatService({ order: orderFixture({ approvedFormPath: 'uploads/lain/rahasia.txt' }) });

      await service.remove(1, aktor(UserRole.KARYAWAN, 9));

      expect(existsSync(filePath)).toBe(true);
    } finally {
      process.chdir(cwdAwal);
      rmSync(direktoriUji, { recursive: true, force: true });
    }
  });
});
