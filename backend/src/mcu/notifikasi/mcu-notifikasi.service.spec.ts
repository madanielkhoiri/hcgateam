import { KanalNotifikasi, StatusKirimNotifikasi, TipeNotifikasiMcu, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { McuNotifikasiService } from './mcu-notifikasi.service';

const ISI_DASAR = {
  tipe: TipeNotifikasiMcu.JADWAL_MCU,
  refTabel: 'jadwal_mcu',
  refId: 1,
  judul: 'Judul',
  pesan: 'Pesan',
};

describe('McuNotifikasiService.duaKanal', () => {
  const service = new McuNotifikasiService({} as unknown as PrismaService);

  it('menghasilkan 2 entri (IN_APP + EMAIL_OUTLOOK) kalau penerimaEmail ada', () => {
    const hasil = service.duaKanal({ ...ISI_DASAR, penerimaId: 1, penerimaEmail: 'a@x.com' });

    expect(hasil).toHaveLength(2);
    expect(hasil.map((h) => h.kanal)).toEqual([KanalNotifikasi.IN_APP, KanalNotifikasi.EMAIL_OUTLOOK]);
  });

  it('menghasilkan 1 entri (IN_APP saja) kalau penerimaEmail kosong', () => {
    const hasil = service.duaKanal({ ...ISI_DASAR, penerimaId: 1, penerimaEmail: null });

    expect(hasil).toHaveLength(1);
    expect(hasil[0].kanal).toBe(KanalNotifikasi.IN_APP);
  });
});

describe('McuNotifikasiService.kirim', () => {
  it('kanal IN_APP (default) langsung berstatus TERKIRIM dengan waktuKirim terisi', async () => {
    const create = jest.fn().mockResolvedValue({});
    const prisma = { logNotifikasiMcu: { create } } as unknown as PrismaService;
    const service = new McuNotifikasiService(prisma);

    await service.kirim({ ...ISI_DASAR, penerimaId: 1 });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          statusKirim: StatusKirimNotifikasi.TERKIRIM,
          waktuKirim: expect.any(Date),
        }),
      }),
    );
  });

  it('kanal EMAIL_OUTLOOK berstatus MENUNGGU tanpa waktuKirim (menunggu worker SMTP)', async () => {
    const create = jest.fn().mockResolvedValue({});
    const prisma = { logNotifikasiMcu: { create } } as unknown as PrismaService;
    const service = new McuNotifikasiService(prisma);

    await service.kirim({ ...ISI_DASAR, penerimaId: 1, kanal: KanalNotifikasi.EMAIL_OUTLOOK });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ statusKirim: StatusKirimNotifikasi.MENUNGGU, waktuKirim: null }),
      }),
    );
  });
});

describe('McuNotifikasiService.penerimaPeran', () => {
  it('memetakan akun aktif dengan role tertentu jadi target notifikasi', async () => {
    const findMany = jest.fn().mockResolvedValue([{ id: 1, email: 'a@x.com' }, { id: 2, email: null }]);
    const prisma = { user: { findMany } } as unknown as PrismaService;
    const service = new McuNotifikasiService(prisma);

    const hasil = await service.penerimaPeran(UserRole.HC);

    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { role: UserRole.HC, isActive: true } }));
    expect(hasil).toEqual([
      { penerimaId: 1, penerimaEmail: 'a@x.com' },
      { penerimaId: 2, penerimaEmail: null },
    ]);
  });
});

describe('McuNotifikasiService.tandaiDibaca', () => {
  it('hanya menandai notifikasi milik penerima yang benar', async () => {
    const updateMany = jest.fn().mockResolvedValue({ count: 1 });
    const prisma = { logNotifikasiMcu: { updateMany } } as unknown as PrismaService;
    const service = new McuNotifikasiService(prisma);

    const hasil = await service.tandaiDibaca(10, 5);

    expect(updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10, penerimaId: 5 } }),
    );
    expect(hasil).toEqual({ diperbarui: 1 });
  });
});
