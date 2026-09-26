import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StatusFollowUp, StatusRekomendasi, StatusReview, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { McuAksesService } from '../common/mcu-akses.service';
import { AktorMcu } from '../common/mcu-aktor';
import { McuFileService } from '../common/mcu-file.service';
import { McuNotifikasiService } from '../notifikasi/mcu-notifikasi.service';
import { McuRekomendasiService } from './mcu-rekomendasi.service';

function aktor(role: UserRole, id = 1): AktorMcu {
  return { id, role, username: 'test' };
}

function hasilMcuFixture(overrides: { siklusSebelumnya?: number } = {}) {
  return {
    id: 100,
    jadwalMcu: {
      karyawanId: 7,
      karyawan: { id: 7, nik: '12345', nama: 'Budi', email: 'budi@x.com', akunId: 70, departemenId: 3 },
      departemen: { id: 3, namaDepartemen: 'GA', adminAkunId: 30, adminAkun: { id: 30, email: 'a@x.com' } },
    },
    rekomendasi: overrides.siklusSebelumnya
      ? [{ siklusKe: overrides.siklusSebelumnya }]
      : [],
  };
}

function buatService(overrides: {
  hasilMcu?: unknown;
  create?: jest.Mock;
  hasilMcuUpdate?: jest.Mock;
  hasilFollowUpUpdate?: jest.Mock;
  followUpUpdate?: jest.Mock;
  followUpCreate?: jest.Mock;
  departemenFindMany?: jest.Mock;
  rekomendasiDetail?: unknown;
  rekomendasiUpdate?: jest.Mock;
  rekomendasiFindMany?: jest.Mock;
  rekomendasiCount?: jest.Mock;
} = {}) {
  const create = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 200, ...data }));
  const hasilMcuUpdate = overrides.hasilMcuUpdate ?? jest.fn().mockResolvedValue({});
  const hasilFollowUpUpdate = overrides.hasilFollowUpUpdate ?? jest.fn().mockResolvedValue({ followUpId: 5 });
  const followUpUpdate = overrides.followUpUpdate ?? jest.fn().mockResolvedValue({});
  const followUpCreate = overrides.followUpCreate ?? jest.fn().mockResolvedValue({});
  const rekomendasiUpdate = overrides.rekomendasiUpdate ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const rekomendasiFindMany = overrides.rekomendasiFindMany ?? jest.fn().mockResolvedValue([]);
  const rekomendasiCount = overrides.rekomendasiCount ?? jest.fn().mockResolvedValue(0);

  const prisma = {
    hasilMcu: {
      findUnique: jest
        .fn()
        .mockResolvedValue('hasilMcu' in overrides ? overrides.hasilMcu : hasilMcuFixture()),
    },
    rekomendasiMcu: {
      findUnique: jest.fn().mockResolvedValue(overrides.rekomendasiDetail ?? null),
      update: rekomendasiUpdate,
      findMany: rekomendasiFindMany,
      count: rekomendasiCount,
    },
    departemen: { findMany: overrides.departemenFindMany ?? jest.fn().mockResolvedValue([]) },
    $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
      callback({
        rekomendasiMcu: { create },
        hasilMcu: { update: hasilMcuUpdate },
        hasilFollowUp: { update: hasilFollowUpUpdate },
        followUp: { update: followUpUpdate, create: followUpCreate },
      }),
    ),
  } as unknown as PrismaService;

  const akses = new McuAksesService(prisma);
  const berkas = {} as unknown as McuFileService;
  const notifikasi = {
    penerimaPeran: jest.fn().mockResolvedValue([]),
    kirimBanyak: jest.fn().mockResolvedValue(undefined),
    duaKanal: jest.fn().mockReturnValue([]),
  } as unknown as McuNotifikasiService;

  const service = new McuRekomendasiService(prisma, akses, berkas, notifikasi);

  return {
    service,
    prisma,
    create,
    hasilMcuUpdate,
    hasilFollowUpUpdate,
    followUpUpdate,
    followUpCreate,
    rekomendasiUpdate,
    rekomendasiFindMany,
    rekomendasiCount,
  };
}

describe('McuRekomendasiService.submit', () => {
  it('menolak role selain Dokter', async () => {
    const { service } = buatService();

    await expect(
      service.submit(100, { status: StatusRekomendasi.FIT } as any, aktor(UserRole.HC)),
    ).rejects.toThrow(ForbiddenException);
  });

  it('melempar NotFoundException kalau hasil MCU tidak ada', async () => {
    const { service } = buatService({ hasilMcu: null });

    await expect(
      service.submit(100, { status: StatusRekomendasi.FIT } as any, aktor(UserRole.DOKTER)),
    ).rejects.toThrow(NotFoundException);
  });

  it('menolak status FOLLOW_UP tanpa surat rujukan FU', async () => {
    const { service } = buatService();

    await expect(
      service.submit(100, { status: StatusRekomendasi.FOLLOW_UP } as any, aktor(UserRole.DOKTER)),
    ).rejects.toThrow('Surat rujukan FU wajib diterbitkan Dokter');
  });

  it('rekomendasi FIT: siklusKe mulai dari 1 kalau belum pernah ada rekomendasi', async () => {
    const { service, create } = buatService({ hasilMcu: hasilMcuFixture() });

    await service.submit(100, { status: StatusRekomendasi.FIT } as any, aktor(UserRole.DOKTER, 9));

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ siklusKe: 1, dokterId: 9 }) }),
    );
  });

  it('siklusKe lanjut dari rekomendasi sebelumnya (mis. sebelumnya 2 -> jadi 3)', async () => {
    const { service, create } = buatService({ hasilMcu: hasilMcuFixture({ siklusSebelumnya: 2 }) });

    await service.submit(100, { status: StatusRekomendasi.FIT } as any, aktor(UserRole.DOKTER));

    expect(create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ siklusKe: 3 }) }));
  });

  it('rekomendasi FIT menandai hasilMcu SELESAI dan TIDAK membuat record Follow Up baru', async () => {
    const { service, hasilMcuUpdate, followUpCreate } = buatService();

    await service.submit(100, { status: StatusRekomendasi.FIT } as any, aktor(UserRole.DOKTER));

    expect(hasilMcuUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: { statusReview: StatusReview.SELESAI } }),
    );
    expect(followUpCreate).not.toHaveBeenCalled();
  });

  it('rekomendasi FOLLOW_UP membuat record Follow Up baru berstatus MENUNGGU_TANGGAL', async () => {
    const { service, followUpCreate } = buatService();

    await service.submit(
      100,
      { status: StatusRekomendasi.FOLLOW_UP, suratRujukanFu: 'mcu/rujukan/1.pdf', penyakit: 'Hipertensi' } as any,
      aktor(UserRole.DOKTER),
    );

    expect(followUpCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ karyawanId: 7, status: StatusFollowUp.MENUNGGU_TANGGAL }),
      }),
    );
  });

  it('review ulang FU dengan hasil FIT menutup (SELESAI) siklus Follow Up asalnya', async () => {
    const { service, followUpUpdate } = buatService();

    await service.submit(
      100,
      { status: StatusRekomendasi.FIT, hasilFollowUpAsalId: 55 } as any,
      aktor(UserRole.DOKTER),
    );

    expect(followUpUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 5 },
        data: expect.objectContaining({ status: StatusFollowUp.SELESAI }),
      }),
    );
  });
});

describe('McuRekomendasiService — nama penyakit rekomendasi Follow Up', () => {
  const fu = { status: StatusRekomendasi.FOLLOW_UP, suratRujukanFu: 'mcu/rujukan/1.pdf' };

  it('menolak rekomendasi FOLLOW_UP tanpa nama penyakit', async () => {
    const { service, create } = buatService();

    await expect(service.submit(100, fu as any, aktor(UserRole.DOKTER))).rejects.toThrow(
      'Nama penyakit wajib diisi Dokter',
    );
    expect(create).not.toHaveBeenCalled();
  });

  it('menolak nama penyakit yang hanya spasi', async () => {
    const { service } = buatService();

    await expect(
      service.submit(100, { ...fu, penyakit: '   ' } as any, aktor(UserRole.DOKTER)),
    ).rejects.toThrow(BadRequestException);
  });

  it('menyimpan nama penyakit dengan spasi berlebih dirapikan', async () => {
    const { service, create } = buatService();

    await service.submit(100, { ...fu, penyakit: '  Diabetes   Melitus , Hipertensi ' } as any, aktor(UserRole.DOKTER));

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ penyakit: 'Diabetes Melitus , Hipertensi' }),
      }),
    );
  });

  it('rekomendasi FIT tidak menyimpan penyakit walau ada yang terkirim', async () => {
    const { service, create } = buatService();

    await service.submit(100, { status: StatusRekomendasi.FIT, penyakit: 'Hipertensi' } as any, aktor(UserRole.DOKTER));

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ penyakit: null }) }),
    );
  });

  it('detailAdmin(): HC dan Dokter melihat penyakit, Admin Dept tidak', async () => {
    const detail = {
      id: 1,
      status: StatusRekomendasi.FOLLOW_UP,
      penyakit: 'Hipertensi',
      hasilMcu: { jadwalMcu: { karyawanId: 7 } },
    };

    for (const peran of [UserRole.HC, UserRole.DOKTER]) {
      const { service } = buatService({ rekomendasiDetail: detail });
      await expect(service.detailAdmin(1, aktor(peran))).resolves.toMatchObject({ penyakit: 'Hipertensi' });
    }

    const { service } = buatService({ rekomendasiDetail: detail });
    await expect(service.detailAdmin(1, aktor(UserRole.ADMIN_DEPT))).resolves.toMatchObject({ penyakit: null });
  });

  it('daftar(): penyakit disembunyikan dari Admin Dept tetapi tampil untuk HC', async () => {
    const baris = () => [{ id: 1, status: StatusRekomendasi.FOLLOW_UP, penyakit: 'Hipertensi' }];

    const hc = buatService({ rekomendasiFindMany: jest.fn().mockResolvedValue(baris()) });
    expect((await hc.service.daftar({}, aktor(UserRole.HC))).data[0].penyakit).toBe('Hipertensi');

    const dept = buatService({ rekomendasiFindMany: jest.fn().mockResolvedValue(baris()) });
    expect((await dept.service.daftar({}, aktor(UserRole.ADMIN_DEPT))).data[0].penyakit).toBeNull();
  });
});

describe('McuRekomendasiService.teruskanKeKaryawan', () => {
  function rekomendasiFixture(overrides: Partial<{ diteruskanKeKaryawanAt: Date | null }> = {}) {
    return {
      id: 1,
      status: StatusRekomendasi.FIT,
      diteruskanKeDeptAt: null,
      diteruskanKeKaryawanAt: overrides.diteruskanKeKaryawanAt ?? null,
      hasilMcu: {
        jadwalMcu: {
          karyawanId: 7,
          karyawan: { id: 7, departemenId: 3, akunId: 70, email: 'budi@x.com' },
        },
      },
    };
  }

  it('menolak role selain Admin Dept/HC', async () => {
    const { service } = buatService({ rekomendasiDetail: rekomendasiFixture() });

    await expect(service.teruskanKeKaryawan(1, aktor(UserRole.DOKTER))).rejects.toThrow(ForbiddenException);
  });

  it('Admin Dept ditolak kalau karyawan itu bukan dari departemen yang dia pegang', async () => {
    const { service } = buatService({
      rekomendasiDetail: rekomendasiFixture(),
      departemenFindMany: jest.fn().mockResolvedValue([{ id: 99, namaDepartemen: 'Lain' }]),
    });

    await expect(service.teruskanKeKaryawan(1, aktor(UserRole.ADMIN_DEPT))).rejects.toThrow(ForbiddenException);
  });

  it('menolak meneruskan ulang rekomendasi yang sudah pernah diteruskan', async () => {
    const { service } = buatService({
      rekomendasiDetail: rekomendasiFixture({ diteruskanKeKaryawanAt: new Date() }),
    });

    await expect(service.teruskanKeKaryawan(1, aktor(UserRole.HC))).rejects.toThrow(
      'Rekomendasi ini sudah diteruskan ke karyawan',
    );
  });

  it('HC berhasil meneruskan rekomendasi yang belum pernah diteruskan', async () => {
    const { service, rekomendasiUpdate } = buatService({ rekomendasiDetail: rekomendasiFixture() });

    await service.teruskanKeKaryawan(1, aktor(UserRole.HC, 5));

    expect(rekomendasiUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ diteruskanOlehId: 5, diteruskanKeKaryawanAt: expect.any(Date) }),
      }),
    );
  });
});

describe('McuRekomendasiService — Karyawan tidak boleh lihat daftar/antrean/detail administratif', () => {
  it('daftar() menolak Karyawan', async () => {
    const { service } = buatService();

    await expect(service.daftar({}, aktor(UserRole.KARYAWAN))).rejects.toThrow(ForbiddenException);
  });

  it('antreanReview() menolak Karyawan', async () => {
    const { service } = buatService();

    await expect(service.antreanReview(aktor(UserRole.KARYAWAN))).rejects.toThrow(ForbiddenException);
  });

  it('detailAdmin() menolak Karyawan', async () => {
    const { service } = buatService();

    await expect(service.detailAdmin(1, aktor(UserRole.KARYAWAN))).rejects.toThrow(ForbiddenException);
  });

  it('detailAdmin() tetap boleh diakses HC', async () => {
    const { service } = buatService({
      rekomendasiDetail: {
        id: 1,
        status: StatusRekomendasi.FIT,
        hasilMcu: { jadwalMcu: { karyawanId: 7 } },
      },
    });

    await expect(service.detailAdmin(1, aktor(UserRole.HC))).resolves.toBeDefined();
  });
});

describe('McuRekomendasiService.daftar — pencarian nama/NIK karyawan', () => {
  it('tanpa filter cari, where tidak menyertakan hasilMcu', async () => {
    const { service, rekomendasiFindMany } = buatService();

    await service.daftar({}, aktor(UserRole.HC));

    const panggilan = rekomendasiFindMany.mock.calls[0][0];
    expect(panggilan.where.hasilMcu).toBeUndefined();
  });

  it('menerapkan pencarian nama/NIK karyawan (case-insensitive)', async () => {
    const { service, rekomendasiFindMany } = buatService();

    await service.daftar({ cari: 'budi' }, aktor(UserRole.HC));

    expect(rekomendasiFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          hasilMcu: {
            jadwalMcu: {
              karyawan: {
                OR: [
                  { nama: { contains: 'budi', mode: 'insensitive' } },
                  { nik: { contains: 'budi', mode: 'insensitive' } },
                ],
              },
            },
          },
        }),
      }),
    );
  });

  it('menggabungkan filter status dan cari sekaligus', async () => {
    const { service, rekomendasiFindMany } = buatService();

    await service.daftar({ status: StatusRekomendasi.FIT, cari: 'budi' }, aktor(UserRole.HC));

    expect(rekomendasiFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          status: StatusRekomendasi.FIT,
          hasilMcu: expect.any(Object),
        }),
      }),
    );
  });
});
