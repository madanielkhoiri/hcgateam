import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DailyActivityStatus, DailyApprovalDecision, DailyApprovalStatus, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DailyActivityImagesService } from './daily-activity-images.service';
import { DailyActivitiesService } from './daily-activities.service';

function aktivitasFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    status: DailyActivityStatus.ON_PROGRESS,
    approvalStatus: DailyApprovalStatus.NONE,
    currentProgress: 50,
    startDate: new Date('2026-01-01'),
    lastProgressDate: new Date('2026-01-05'),
    profilePhotoPath: 'uploads/daily-activities/profiles/a.webp',
    preActivityPhotoPaths: ['uploads/daily-activities/pre-activities/a.webp'],
    ...overrides,
  };
}

function buatService(overrides: {
  activity?: unknown;
  activityDetail?: unknown;
  create?: jest.Mock;
  update?: jest.Mock;
  deleteFn?: jest.Mock;
} = {}) {
  const dailyActivityCreate = overrides.create ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const dailyActivityUpdate = overrides.update ?? jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const dailyActivityDelete = overrides.deleteFn ?? jest.fn().mockResolvedValue({});
  const progressCreate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const progressUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
  const approvalCreate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));

  const prisma: any = {
    dailyActivity: {
      findUnique: jest.fn().mockResolvedValue('activity' in overrides ? overrides.activity : aktivitasFixture()),
      findMany: jest.fn().mockResolvedValue([]),
      create: dailyActivityCreate,
      update: dailyActivityUpdate,
      delete: dailyActivityDelete,
    },
    dailyActivityProgress: {
      create: progressCreate,
      updateMany: progressUpdateMany,
    },
    dailyActivityApproval: {
      create: approvalCreate,
    },
  };

  if ('activityDetail' in overrides) {
    let callCount = 0;
    prisma.dailyActivity.findUnique = jest.fn().mockImplementation(() => {
      callCount += 1;
      return Promise.resolve(callCount === 1 ? ('activity' in overrides ? overrides.activity : aktivitasFixture()) : overrides.activityDetail);
    });
  }

  prisma.$transaction = jest.fn((cb: any) => cb(prisma));

  const imagesService = {
    deleteMany: jest.fn(),
  } as unknown as DailyActivityImagesService;

  const service = new DailyActivitiesService(prisma as PrismaService, imagesService);

  return { service, prisma, imagesService, dailyActivityCreate, dailyActivityUpdate, dailyActivityDelete, progressCreate, progressUpdateMany, approvalCreate };
}

const actorKaryawan = { id: 9, username: 'budi', role: UserRole.KARYAWAN };
const actorSectionHead = { id: 5, username: 'sh', role: UserRole.SECTION_HEAD };

describe('DailyActivitiesService.findOne', () => {
  it('melempar NotFoundException kalau data tidak ada', async () => {
    const { service } = buatService({ activity: null });

    await expect(service.findOne(1)).rejects.toThrow(NotFoundException);
  });
});

describe('DailyActivitiesService.create', () => {
  const dtoDasar = { activityType: 'PROJECT', startDate: '2026-01-05', workName: 'Galian', location: 'Site A', pic: 'Budi', initialProgress: 0, profilePhotoPath: 'a.webp', preActivityPhotoPaths: ['b.webp'] };

  it('menolak tanpa foto profil lokasi', async () => {
    const { service } = buatService();

    await expect(service.create({ ...dtoDasar, profilePhotoPath: '' } as any, actorKaryawan)).rejects.toThrow(
      'Satu foto lokasi sebelum dikerjakan wajib diunggah',
    );
  });

  it('menolak tanpa foto pre-activity', async () => {
    const { service } = buatService();

    await expect(service.create({ ...dtoDasar, preActivityPhotoPaths: [] } as any, actorKaryawan)).rejects.toThrow(
      'Foto Pre-Activity wajib diunggah',
    );
  });

  it('status OPEN kalau initialProgress 0', async () => {
    const { service, dailyActivityCreate } = buatService();

    await service.create(dtoDasar as any, actorKaryawan);

    expect(dailyActivityCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: DailyActivityStatus.OPEN }) }),
    );
  });

  it('status ON_PROGRESS kalau initialProgress > 0', async () => {
    const { service, dailyActivityCreate } = buatService();

    await service.create({ ...dtoDasar, initialProgress: 20 } as any, actorKaryawan);

    expect(dailyActivityCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: DailyActivityStatus.ON_PROGRESS }) }),
    );
  });

  it('membuat entri progress awal dengan catatan default kalau tidak diisi', async () => {
    const { service, progressCreate } = buatService();

    await service.create(dtoDasar as any, actorKaryawan);

    expect(progressCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ notes: 'Pembuatan awal Daily Activity', previousProgress: 0 }) }),
    );
  });
});

describe('DailyActivitiesService.edit', () => {
  it('melempar NotFoundException kalau data tidak ada', async () => {
    const { service } = buatService({ activity: null });

    await expect(service.edit(1, {} as any)).rejects.toThrow(NotFoundException);
  });

  it('menolak edit pekerjaan yang sudah CLOSE', async () => {
    const { service } = buatService({ activity: aktivitasFixture({ status: DailyActivityStatus.CLOSE }) });

    await expect(service.edit(1, { workName: 'X' } as any)).rejects.toThrow('sudah CLOSE tidak dapat diedit');
  });

  it('hanya mengubah field yang eksplisit dikirim', async () => {
    const { service, dailyActivityUpdate } = buatService();

    await service.edit(1, { workName: '  Baru  ' } as any);

    expect(dailyActivityUpdate).toHaveBeenCalledWith({ where: { id: 1 }, data: { workName: 'Baru' } });
  });
});

describe('DailyActivitiesService.addProgress', () => {
  const dtoDasar = { addedProgress: 20, progressDate: '2026-01-10', pic: 'Budi', preActivityPhotoPaths: ['a.webp'] };

  it('menolak kalau status CLOSE', async () => {
    const { service } = buatService({ activity: aktivitasFixture({ status: DailyActivityStatus.CLOSE }) });

    await expect(service.addProgress(1, dtoDasar as any, ['x.webp'], actorKaryawan)).rejects.toThrow(
      'sudah CLOSE dan tidak dapat diperbarui',
    );
  });

  it('menolak kalau status WAITING_APPROVAL', async () => {
    const { service } = buatService({ activity: aktivitasFixture({ status: DailyActivityStatus.WAITING_APPROVAL }) });

    await expect(service.addProgress(1, dtoDasar as any, ['x.webp'], actorKaryawan)).rejects.toThrow(
      'sedang menunggu approval',
    );
  });

  it('menolak tanpa foto pre-activity hari ini', async () => {
    const { service } = buatService();

    await expect(
      service.addProgress(1, { ...dtoDasar, preActivityPhotoPaths: [] } as any, ['x.webp'], actorKaryawan),
    ).rejects.toThrow('Foto Pre-Activity hari ini wajib diunggah');
  });

  it('menolak tanpa foto progress', async () => {
    const { service } = buatService();

    await expect(service.addProgress(1, dtoDasar as any, [], actorKaryawan)).rejects.toThrow(
      'Foto progress wajib diunggah',
    );
  });

  it('menolak kalau total progress melebihi 100%', async () => {
    const { service } = buatService({ activity: aktivitasFixture({ currentProgress: 90 }) });

    await expect(service.addProgress(1, { ...dtoDasar, addedProgress: 20 } as any, ['x.webp'], actorKaryawan)).rejects.toThrow(
      'Progress maksimal 100%',
    );
  });

  it('menolak tanggal update lebih awal dari tanggal dibuat', async () => {
    const { service } = buatService({ activity: aktivitasFixture({ startDate: new Date('2026-02-01'), lastProgressDate: null }) });

    await expect(service.addProgress(1, dtoDasar as any, ['x.webp'], actorKaryawan)).rejects.toThrow(
      'tidak boleh lebih awal dari tanggal dibuat',
    );
  });

  it('menolak tanggal update lebih awal dari update terakhir', async () => {
    const { service } = buatService({ activity: aktivitasFixture({ lastProgressDate: new Date('2026-02-01') }) });

    await expect(service.addProgress(1, dtoDasar as any, ['x.webp'], actorKaryawan)).rejects.toThrow(
      'tidak boleh lebih awal dari update terakhir',
    );
  });

  it('berhasil menambah progress dan mengembalikan status ke ON_PROGRESS', async () => {
    const { service, dailyActivityUpdate } = buatService();

    await service.addProgress(1, dtoDasar as any, ['x.webp'], actorKaryawan);

    expect(dailyActivityUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ currentProgress: 70, status: DailyActivityStatus.ON_PROGRESS }) }),
    );
  });

  it('approvalStatus REJECTED direset jadi NONE saat progress baru ditambahkan', async () => {
    const { service, dailyActivityUpdate } = buatService({
      activity: aktivitasFixture({ approvalStatus: DailyApprovalStatus.REJECTED }),
    });

    await service.addProgress(1, dtoDasar as any, ['x.webp'], actorKaryawan);

    expect(dailyActivityUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ approvalStatus: DailyApprovalStatus.NONE }) }),
    );
  });
});

describe('DailyActivitiesService.requestClose', () => {
  it('menolak kalau sudah CLOSE', async () => {
    const { service } = buatService({ activity: aktivitasFixture({ status: DailyActivityStatus.CLOSE }) });

    await expect(service.requestClose(1, actorKaryawan)).rejects.toThrow('sudah CLOSE');
  });

  it('menolak kalau sudah menunggu approval', async () => {
    const { service } = buatService({ activity: aktivitasFixture({ status: DailyActivityStatus.WAITING_APPROVAL }) });

    await expect(service.requestClose(1, actorKaryawan)).rejects.toThrow('sudah menunggu approval');
  });

  it('menolak kalau progress belum 100%', async () => {
    const { service } = buatService({ activity: aktivitasFixture({ currentProgress: 90 }) });

    await expect(service.requestClose(1, actorKaryawan)).rejects.toThrow('hanya dapat dilakukan saat progress 100%');
  });

  it('berhasil mengajukan close saat progress 100%', async () => {
    const { service, dailyActivityUpdate } = buatService({ activity: aktivitasFixture({ currentProgress: 100 }) });

    await service.requestClose(1, actorKaryawan);

    expect(dailyActivityUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: DailyActivityStatus.WAITING_APPROVAL, approvalStatus: DailyApprovalStatus.PENDING }) }),
    );
  });
});

describe('DailyActivitiesService.approve', () => {
  it('menolak role selain Section Head/Group Leader/Admin', async () => {
    const { service } = buatService();

    await expect(service.approve(1, actorKaryawan)).rejects.toThrow(ForbiddenException);
  });

  it('menolak kalau bukan sedang menunggu approval', async () => {
    const { service } = buatService({ activity: aktivitasFixture({ status: DailyActivityStatus.ON_PROGRESS }) });

    await expect(service.approve(1, actorSectionHead)).rejects.toThrow('tidak sedang menunggu approval');
  });

  it('berhasil approve: status CLOSE, approvalStatus APPROVED', async () => {
    const { service, dailyActivityUpdate, approvalCreate } = buatService({
      activity: aktivitasFixture({ status: DailyActivityStatus.WAITING_APPROVAL, approvalStatus: DailyApprovalStatus.PENDING }),
    });

    await service.approve(1, actorSectionHead);

    expect(approvalCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ decision: DailyApprovalDecision.APPROVED }) }),
    );
    expect(dailyActivityUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: DailyActivityStatus.CLOSE, approvalStatus: DailyApprovalStatus.APPROVED }) }),
    );
  });
});

describe('DailyActivitiesService.reject', () => {
  it('menolak role selain approver', async () => {
    const { service } = buatService();

    await expect(service.reject(1, 'alasan', actorKaryawan)).rejects.toThrow(ForbiddenException);
  });

  it('menolak kalau bukan sedang menunggu approval', async () => {
    const { service } = buatService({ activity: aktivitasFixture({ status: DailyActivityStatus.ON_PROGRESS }) });

    await expect(service.reject(1, 'alasan', actorSectionHead)).rejects.toThrow('tidak sedang menunggu approval');
  });

  it('menolak tanpa komentar', async () => {
    const { service } = buatService({
      activity: aktivitasFixture({ status: DailyActivityStatus.WAITING_APPROVAL, approvalStatus: DailyApprovalStatus.PENDING }),
    });

    await expect(service.reject(1, '   ', actorSectionHead)).rejects.toThrow('Komentar reject wajib diisi');
  });

  it('berhasil reject: status kembali ON_PROGRESS, closeRequestedAt/closedAt direset null', async () => {
    const { service, dailyActivityUpdate } = buatService({
      activity: aktivitasFixture({ status: DailyActivityStatus.WAITING_APPROVAL, approvalStatus: DailyApprovalStatus.PENDING }),
    });

    await service.reject(1, 'Data kurang lengkap', actorSectionHead);

    expect(dailyActivityUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: DailyActivityStatus.ON_PROGRESS, approvalStatus: DailyApprovalStatus.REJECTED, closeRequestedAt: null, closedAt: null }),
      }),
    );
  });
});

describe('DailyActivitiesService.remove', () => {
  it('melempar NotFoundException kalau data tidak ada', async () => {
    const { service } = buatService({ activity: null });

    await expect(service.remove(1)).rejects.toThrow(NotFoundException);
  });

  it('menolak hapus pekerjaan yang sudah CLOSE', async () => {
    const { service } = buatService({ activity: aktivitasFixture({ status: DailyActivityStatus.CLOSE }) });

    await expect(service.remove(1)).rejects.toThrow('sudah CLOSE tidak dapat dihapus');
  });

  it('berhasil hapus dan menghapus seluruh foto terkait (profil + pre-activity + progress)', async () => {
    const { service, dailyActivityDelete, imagesService } = buatService({
      activityDetail: {
        profilePhotoPath: 'a.webp',
        preActivityPhotoPaths: ['b.webp'],
        progressHistories: [{ photoPaths: ['c.webp', 'd.webp'] }],
      },
    });

    const hasil = await service.remove(1);

    expect(dailyActivityDelete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(imagesService.deleteMany).toHaveBeenCalledWith(['a.webp', 'b.webp', 'c.webp', 'd.webp']);
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});
