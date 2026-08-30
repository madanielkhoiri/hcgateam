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
