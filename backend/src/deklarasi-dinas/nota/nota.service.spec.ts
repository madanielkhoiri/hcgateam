import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { SaldoService } from '../saldo/saldo.service';
import { OcrSpaceService } from './ocr-space.service';
import { NotaService } from './nota.service';

describe('NotaService.ubahStatusNota — akses', () => {
  it('menolak role yang bukan Admin/Admin HC/Section Head SEBELUM menyentuh database', async () => {
    const findUnique = jest.fn();
    const prisma = { nota: { findUnique } } as unknown as PrismaService;
    const saldoService = {} as unknown as SaldoService;
    const ocrSpaceService = {} as unknown as OcrSpaceService;
    const service = new NotaService(prisma, saldoService, ocrSpaceService);

    await expect(
      service.ubahStatusNota(1, 'DIVERIFIKASI', undefined, { role: UserRole.KARYAWAN }),
    ).rejects.toThrow(ForbiddenException);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
