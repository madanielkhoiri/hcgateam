import { BadRequestException, NotFoundException } from '@nestjs/common';
import { StatusChecklistKip, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../audit/audit-log.service';
import { KipAksesService } from './kip-akses.service';
import { KipFileService } from './kip-file.service';
import { KipService } from './kip.service';

const FOTO = { buffer: Buffer.from('x'), size: 1, originalname: 'a.jpg' } as Express.Multer.File;

const AKTOR = { id: 1, username: 'test', nama: 'Test User', nrp: '00000' };
const AKTOR9 = { id: 9, username: 'budi', nama: 'Budi', nrp: '99999' };

function buatService(overrides: {
  findUniqueBaris?: unknown;
  findUniqueGps?: unknown;
  update?: jest.Mock;
  kipFindUnique?: unknown;
  kipCreate?: jest.Mock;
  kipUpdate?: jest.Mock;
  kipDelete?: jest.Mock;
}) {
  const update =
    overrides.update ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const prisma = {
    kipChecklistBulan: {
      findUnique: jest.fn().mockResolvedValue(overrides.findUniqueBaris ?? null),
      update,
    },
    kipLokasiGps: {
      findUnique: jest.fn().mockResolvedValue(overrides.findUniqueGps ?? null),
    },
    kip: {
      findUnique: jest.fn().mockResolvedValue(overrides.kipFindUnique ?? null),
      create: overrides.kipCreate ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data })),
      update: overrides.kipUpdate ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data })),
      delete: overrides.kipDelete ?? jest.fn().mockResolvedValue(undefined),
    },
  } as unknown as PrismaService;
  const file = {
    simpanFoto: jest.fn().mockReturnValue('kip/1/3/bukti.jpg'),
  } as unknown as KipFileService;
  const auditLog = { catat: jest.fn().mockResolvedValue(undefined) } as unknown as AuditLogService;
  const service = new KipService(prisma, new KipAksesService(), file, auditLog);

  return { service, prisma, file, update, auditLog };
}

const DTO_KIP = {
  noKip: 'KIP-001',
  jenisPeralatan: 'Stop Kontak',
  departemen: 'HCGA',
  tahun: 2026,
  lokasi: 'Office' as any,
  parameterChecklist: ['Kondisi baik'],
};

function baris(overrides: Partial<{ status: StatusChecklistKip; parameterChecklist: string[]; lokasi: string }> = {}) {
  return {
    id: 42,
    status: overrides.status ?? StatusChecklistKip.BELUM,
    kip: {
      lokasi: overrides.lokasi ?? 'Office',
      parameterChecklist: overrides.parameterChecklist ?? ['A', 'B'],
    },
  };
}

describe('KipService.ceklis', () => {
  it('menolak role yang bukan Elektrik/Admin/Super Admin', async () => {
    const { service } = buatService({});

    await expect(
      service.ceklis(UserRole.KARYAWAN, AKTOR, 1, 3, FOTO, [true, true]),
    ).rejects.toThrow('Ceklis KIP hanya boleh dilakukan oleh Tim Elektrik atau Admin');
  });

  it.each([0, 13])('menolak bulan di luar rentang 1-12 (bulan=%i)', async (bulan) => {
    const { service } = buatService({});

    await expect(
      service.ceklis(UserRole.ELEKTRIK, AKTOR, 1, bulan, FOTO, [true, true]),
    ).rejects.toThrow(BadRequestException);
  });

  it('menolak kalau foto tidak diunggah', async () => {
    const { service } = buatService({});

    await expect(
      service.ceklis(UserRole.ELEKTRIK, AKTOR, 1, 3, undefined, [true, true]),
    ).rejects.toThrow('Foto dokumentasi bukti inspeksi wajib diunggah');
  });

  it('melempar NotFoundException kalau baris checklist bulan itu tidak ada', async () => {
    const { service } = buatService({ findUniqueBaris: null });

    await expect(
      service.ceklis(UserRole.ELEKTRIK, AKTOR, 1, 3, FOTO, [true, true]),
    ).rejects.toThrow(NotFoundException);
  });

  it('menolak kalau jumlah jawaban checklist tidak sama dengan parameter milik KIP itu', async () => {
    const { service } = buatService({
      findUniqueBaris: baris({ parameterChecklist: ['A', 'B', 'C'] }),
    });

    await expect(
      service.ceklis(UserRole.ELEKTRIK, AKTOR, 1, 3, FOTO, [true, true]),
    ).rejects.toThrow('Checklist parameter inspeksi wajib diisi lengkap');
  });

  it('menolak kalau bulan itu sudah pernah diceklis', async () => {
    const { service } = buatService({
      findUniqueBaris: baris({ status: StatusChecklistKip.SUDAH }),
    });

    await expect(
      service.ceklis(UserRole.ELEKTRIK, AKTOR, 1, 3, FOTO, [true, true]),
    ).rejects.toThrow('Bulan ini sudah diceklis sebelumnya');
  });

  it('menolak kalau lokasi punya GPS acuan tapi pengirim tidak kirim lokasi', async () => {
    const { service } = buatService({
      findUniqueBaris: baris(),
      findUniqueGps: { lokasi: 'Office', latitude: -6.2, longitude: 106.8 },
    });

    await expect(
      service.ceklis(UserRole.ELEKTRIK, AKTOR, 1, 3, FOTO, [true, true]),
    ).rejects.toThrow('Lokasi GPS Anda tidak terdeteksi');
  });

  it('menolak kalau jarak dari titik GPS acuan lebih dari 10 meter', async () => {
    const { service } = buatService({
      findUniqueBaris: baris(),
      findUniqueGps: { lokasi: 'Office', latitude: -6.2, longitude: 106.8 },
    });

    await expect(
      service.ceklis(UserRole.ELEKTRIK, AKTOR, 1, 3, FOTO, [true, true], {
        latitude: -6.201, // ~111 m dari titik acuan, jauh di atas radius 10 m
        longitude: 106.8,
      }),
    ).rejects.toThrow('Ceklis hanya bisa dilakukan di lokasi peralatan');
  });

  it('berhasil ceklis kalau berada persis di titik GPS acuan, dan mencatat audit log KIP_CEKLIS', async () => {
    const { service, file, update, auditLog } = buatService({
      findUniqueBaris: baris(),
      findUniqueGps: { lokasi: 'Office', latitude: -6.2, longitude: 106.8 },
    });

    const hasil = await service.ceklis(UserRole.ELEKTRIK, AKTOR9, 1, 3, FOTO, [true, false], {
      latitude: -6.2,
      longitude: 106.8,
    });

    expect(file.simpanFoto).toHaveBeenCalledWith(FOTO, 1, 3);
    expect(update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: expect.objectContaining({
        status: StatusChecklistKip.SUDAH,
        diperiksaOleh: 9,
        fotoBukti: 'kip/1/3/bukti.jpg',
        parameterCeklis: [
          { label: 'A', checked: true },
          { label: 'B', checked: false },
        ],
      }),
    });
    expect(hasil).toMatchObject({ status: StatusChecklistKip.SUDAH });
    expect(auditLog.catat).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 9,
        actorUsername: 'budi',
        actorName: 'Budi',
        actorNrp: '99999',
        aksi: 'KIP_CEKLIS',
        entitas: 'Kip',
        entitasId: 1,
      }),
    );
  });

  it('berhasil ceklis tanpa validasi GPS kalau lokasi belum punya titik acuan', async () => {
    const { service, file } = buatService({
      findUniqueBaris: baris(),
      findUniqueGps: null,
    });

    await service.ceklis(UserRole.ELEKTRIK, AKTOR9, 1, 3, FOTO, [true, true]);

    expect(file.simpanFoto).toHaveBeenCalled();
  });
});

describe('KipService.buatKip', () => {
  it('mencatat audit log KIP_DIBUAT setelah berhasil dibuat', async () => {
    const { service, auditLog } = buatService({});

    const hasil = await service.buatKip(DTO_KIP, AKTOR9);

    expect(hasil).toMatchObject({ noKip: 'KIP-001' });
    expect(auditLog.catat).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 9,
        actorUsername: 'budi',
        actorName: 'Budi',
        actorNrp: '99999',
        aksi: 'KIP_DIBUAT',
        entitas: 'Kip',
      }),
    );
  });
});

describe('KipService.ubahKip', () => {
  it('melempar NotFoundException kalau KIP tidak ada', async () => {
    const { service } = buatService({ kipFindUnique: null });

    await expect(service.ubahKip(1, DTO_KIP, AKTOR9)).rejects.toThrow(NotFoundException);
  });

  it('mencatat audit log KIP_DIUBAH dengan data sebelum & sesudah', async () => {
    const { service, auditLog } = buatService({
      kipFindUnique: { id: 1, noKip: 'LAMA', jenisPeralatan: 'AC', lokasi: 'Office' },
    });

    await service.ubahKip(1, DTO_KIP, AKTOR9);

    expect(auditLog.catat).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 9,
        actorUsername: 'budi',
        actorName: 'Budi',
        actorNrp: '99999',
        aksi: 'KIP_DIUBAH',
        entitas: 'Kip',
        entitasId: 1,
        detail: expect.objectContaining({
          sebelum: expect.objectContaining({ noKip: 'LAMA' }),
          sesudah: expect.objectContaining({ noKip: 'KIP-001' }),
        }),
      }),
    );
  });
});

describe('KipService.hapusKip', () => {
  it('melempar NotFoundException kalau KIP tidak ada', async () => {
    const { service } = buatService({ kipFindUnique: null });

    await expect(service.hapusKip(1, AKTOR9)).rejects.toThrow(NotFoundException);
  });

  it('mencatat audit log KIP_DIHAPUS setelah berhasil dihapus', async () => {
    const { service, auditLog } = buatService({
      kipFindUnique: { id: 1, noKip: 'KIP-001', jenisPeralatan: 'AC', lokasi: 'Office' },
    });

    await service.hapusKip(1, AKTOR9);

    expect(auditLog.catat).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: 9,
        actorUsername: 'budi',
        actorName: 'Budi',
        actorNrp: '99999',
        aksi: 'KIP_DIHAPUS',
        entitas: 'Kip',
        entitasId: 1,
      }),
    );
  });
});
