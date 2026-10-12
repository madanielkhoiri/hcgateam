import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DatabaseSettlementService } from '../database-settlement/database-settlement.service';
import { DeklarasiService } from './deklarasi.service';

describe('DeklarasiService.ubahStatusDeklarasi — akses', () => {
  it('menolak role yang bukan Admin/Admin HC/Section Head SEBELUM menyentuh database', async () => {
    const findUnique = jest.fn();
    const prisma = { deklarasi: { findUnique } } as unknown as PrismaService;
    const databaseSettlementService = {} as unknown as DatabaseSettlementService;
    const service = new DeklarasiService(prisma, databaseSettlementService);

    await expect(
      service.ubahStatusDeklarasi(1, { status: 'DISETUJUI' } as any, { role: UserRole.KARYAWAN }),
    ).rejects.toThrow(ForbiddenException);
    expect(findUnique).not.toHaveBeenCalled();
  });
});

describe('DeklarasiService.hapusDeklarasi', () => {
  it('menghapus data terkait dan mereset penggunaan saldo menjadi nol', async () => {
    const tx = {
      databaseSettlement: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
      nota: { deleteMany: jest.fn().mockResolvedValue({ count: 2 }) },
      deklarasi: { delete: jest.fn().mockResolvedValue({}) },
      saldo: {
        findUnique: jest.fn().mockResolvedValue({
          id: 9,
          nominalTransfer: 1_000_000,
        }),
        update: jest.fn().mockResolvedValue({}),
      },
    };
    const prisma = {
      deklarasi: {
        findUnique: jest.fn().mockResolvedValue({ id: 5, idSaldo: 9 }),
      },
      nota: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    } as unknown as PrismaService;
    const service = new DeklarasiService(
      prisma,
      {} as DatabaseSettlementService,
    );

    await service.hapusDeklarasi(5, { role: UserRole.FA });

    expect(tx.databaseSettlement.deleteMany).toHaveBeenCalledWith({
      where: { idDeklarasi: 5 },
    });
    expect(tx.nota.deleteMany).toHaveBeenCalledWith({
      where: { idDeklarasi: 5 },
    });
    expect(tx.deklarasi.delete).toHaveBeenCalledWith({ where: { id: 5 } });
    expect(tx.saldo.update).toHaveBeenCalledWith({
      where: { id: 9 },
      data: expect.objectContaining({
        totalPenggunaan: 0,
        sisaSaldo: 0,
        statusSaldo: 'SELESAI',
      }),
    });
  });

  it('menolak penghapusan oleh karyawan', async () => {
    const prisma = {
      deklarasi: { findUnique: jest.fn() },
    } as unknown as PrismaService;
    const service = new DeklarasiService(
      prisma,
      {} as DatabaseSettlementService,
    );

    await expect(
      service.hapusDeklarasi(5, { role: UserRole.KARYAWAN }),
    ).rejects.toThrow(ForbiddenException);
  });
});
