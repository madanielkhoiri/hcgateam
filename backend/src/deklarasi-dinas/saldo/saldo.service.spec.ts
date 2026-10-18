import { BadRequestException, ForbiddenException } from '@nestjs/common';
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

describe('SaldoService.buatSaldo - mencegah saldo aktif ganda', () => {
  it('menolak saldo baru jika saldo aktif belum selesai dideklarasikan', async () => {
    const prisma = {
      saldo: { findFirst: jest.fn().mockResolvedValue({ id: 8 }) },
      deklarasi: { findFirst: jest.fn().mockResolvedValue({ id: 9, status: 'DRAFT' }) },
    } as unknown as PrismaService;
    const service = new SaldoService(prisma);

    await expect(service.buatSaldo({
      id_pengguna: 10,
      nominal_transfer: 100000,
      jenis_saldo: 'PERJALANAN_DINAS',
      tanggal_transfer: '2026-10-18',
    } as any)).rejects.toThrow(BadRequestException);
  });
});
