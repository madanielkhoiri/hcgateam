import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SaldoService } from './saldo.service';

describe('SaldoService.ubahStatusBuktiPengembalian — akses', () => {
  it('menolak role yang bukan Admin/Admin HC/Section Head SEBELUM menyentuh database', async () => {
    const findUnique = jest.fn();
    const prisma = { saldo: { findUnique } } as unknown as PrismaService;
    const service = new SaldoService(prisma);

    await expect(
      service.ubahStatusBuktiPengembalian(1, 'DISETUJUI', undefined, { role: UserRole.KARYAWAN }),
    ).rejects.toThrow(ForbiddenException);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
