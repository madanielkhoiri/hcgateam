import { ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { McuAksesService } from '../common/mcu-akses.service';
import { AktorMcu } from '../common/mcu-aktor';
import { McuFileService } from '../common/mcu-file.service';
import { McuRetensiService } from './mcu-retensi.service';

function aktor(role: UserRole, id = 1): AktorMcu {
  return { id, role, username: 'test' };
}

function buatService(overrides: {
  hasilMcuList?: unknown[];
  hasilFuList?: unknown[];
  rekomendasiList?: unknown[];
  berkasHapus?: jest.Mock;
} = {}) {
  const hasilMcuList = overrides.hasilMcuList ?? [{ id: 1, fileHasilMcu: 'mcu/hasil-mcu/a.pdf' }];
  const hasilFuList = overrides.hasilFuList ?? [];
  const rekomendasiList = overrides.rekomendasiList ?? [];

  const hasilMcuUpdate = jest.fn().mockResolvedValue({});
  const hasilFuUpdate = jest.fn().mockResolvedValue({});
  const rekomendasiUpdate = jest.fn().mockResolvedValue({});

  const prisma = {
    hasilMcu: {
      findMany: jest.fn().mockResolvedValue(hasilMcuList),
      update: hasilMcuUpdate,
      count: jest.fn().mockResolvedValue(0),
    },
    hasilFollowUp: {
      findMany: jest.fn().mockResolvedValue(hasilFuList),
      update: hasilFuUpdate,
      count: jest.fn().mockResolvedValue(0),
    },
    rekomendasiMcu: {
      findMany: jest.fn().mockResolvedValue(rekomendasiList),
      update: rekomendasiUpdate,
      count: jest.fn().mockResolvedValue(0),
    },
  } as unknown as PrismaService;

  const akses = new McuAksesService(prisma);
  const berkas = {
    hapus: overrides.berkasHapus ?? jest.fn().mockReturnValue(true),
    hapusBanyak: jest.fn().mockReturnValue(2),
  } as unknown as McuFileService;

  const service = new McuRetensiService(prisma, akses, berkas);

  return { service, prisma, hasilMcuUpdate, hasilFuUpdate, rekomendasiUpdate, berkas };
}

describe('McuRetensiService.jalankanPembersihan', () => {
  it('menolak role selain HC', async () => {
    const { service } = buatService();

    await expect(service.jalankanPembersihan(aktor(UserRole.ADMIN_DEPT))).rejects.toThrow(ForbiddenException);
  });

  it('menandai fileDihapusAt untuk setiap hasil MCU yang lewat retensi', async () => {
    const { service, hasilMcuUpdate } = buatService({
      hasilMcuList: [{ id: 1, fileHasilMcu: 'mcu/hasil-mcu/a.pdf' }, { id: 2, fileHasilMcu: 'mcu/hasil-mcu/b.pdf' }],
    });

    await service.jalankanPembersihan(aktor(UserRole.HC));

    expect(hasilMcuUpdate).toHaveBeenCalledTimes(2);
    expect(hasilMcuUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: { fileDihapusAt: expect.any(Date) } }),
    );
  });

  it('menghitung fileDihapus hanya dari file yang BENAR-BENAR terhapus fisik', async () => {
    const berkasHapus = jest.fn().mockReturnValueOnce(true).mockReturnValueOnce(false);
    const { service } = buatService({
      hasilMcuList: [{ id: 1, fileHasilMcu: 'a.pdf' }, { id: 2, fileHasilMcu: 'sudah-hilang.pdf' }],
      berkasHapus,
    });

    const hasil = await service.jalankanPembersihan(aktor(UserRole.HC));

    expect(hasil.fileDihapus).toBe(1);
    expect(hasil.dokumenDiproses).toBe(2);
  });

  it('menjumlahkan dokumenDiproses dari ketiga kategori (hasilMcu + hasilFollowUp + rekomendasi)', async () => {
    const { service } = buatService({
      hasilMcuList: [{ id: 1, fileHasilMcu: 'a.pdf' }],
      hasilFuList: [{ id: 2, fileHasilFu: 'b.pdf' }],
      rekomendasiList: [{ id: 3, filePdfRekomendasi: 'c.pdf', suratRujukanFu: null }],
    });

    const hasil = await service.jalankanPembersihan(aktor(UserRole.HC));

    expect(hasil.dokumenDiproses).toBe(3);
    expect(hasil.hasilMcu).toBe(1);
    expect(hasil.hasilFollowUp).toBe(1);
    expect(hasil.rekomendasi).toBe(1);
  });
});

describe('McuRetensiService.ringkasan', () => {
  it('totalJatuhTempo adalah jumlah dari 3 kategori jatuh tempo', async () => {
    const prisma = {
      hasilMcu: { count: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(5) },
      hasilFollowUp: { count: jest.fn().mockResolvedValue(3) },
      rekomendasiMcu: { count: jest.fn().mockResolvedValue(1) },
    } as unknown as PrismaService;
    const akses = new McuAksesService(prisma);
    const berkas = {} as unknown as McuFileService;
    const service = new McuRetensiService(prisma, akses, berkas);

    const hasil = await service.ringkasan();

    expect(hasil.totalJatuhTempo).toBe(2 + 3 + 1);
    expect(hasil.hasilMcuSudahDihapus).toBe(5);
  });
});
