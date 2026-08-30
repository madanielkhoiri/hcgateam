import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { AktorEprom } from '../common/eprom-aktor';
import { EpromFileService } from '../common/eprom-file.service';
import { EpromMeetingService } from './eprom-meeting.service';

function aktor(role: UserRole, overrides: Partial<AktorEprom> = {}): AktorEprom {
  return { id: 1, username: 'test', role, ...overrides };
}

function meetingFixture(overrides: Record<string, unknown> = {}) {
  return { id: 1, projectId: 1, tipeLink: 'MINGGUAN', refProgressId: 1, tanggalMeeting: new Date(), ...overrides };
}

function buatService(overrides: {
  projectAkses?: unknown;
  meeting?: unknown;
  meetingFindMany?: unknown[];
  progressMingguanDetail?: unknown;
  progressBulananDetail?: unknown;
  progressMingguanList?: unknown[];
  progressBulananList?: unknown[];
  dokumentasiFindMany?: unknown[];
  dokumentasiDetail?: unknown;
  momFindMany?: unknown[];
  momDetail?: unknown;
} = {}) {
  const meetingCreate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const meetingDelete = jest.fn().mockResolvedValue({});
  const dokumentasiCreate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const dokumentasiDelete = jest.fn().mockResolvedValue({});
  const momCreate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const momUpdate = jest.fn(({ data }) => Promise.resolve({ id: 1, ...data }));
  const momDelete = jest.fn().mockResolvedValue({});

  const prisma = {
    meeting: {
      findUnique: jest.fn().mockResolvedValue('meeting' in overrides ? overrides.meeting : meetingFixture()),
      findMany: jest.fn().mockResolvedValue(overrides.meetingFindMany ?? []),
      create: meetingCreate,
      delete: meetingDelete,
    },
    progressMingguan: {
      findUnique: jest.fn().mockResolvedValue('progressMingguanDetail' in overrides ? overrides.progressMingguanDetail : { id: 1, projectId: 1, mingguKe: 3, fileUrl: 'a.pdf' }),
      findMany: jest.fn().mockResolvedValue(overrides.progressMingguanList ?? []),
    },
    progressBulanan: {
      findUnique: jest.fn().mockResolvedValue('progressBulananDetail' in overrides ? overrides.progressBulananDetail : { id: 1, projectId: 1, bulan: '2026-01', fileUrl: 'b.pdf' }),
      findMany: jest.fn().mockResolvedValue(overrides.progressBulananList ?? []),
    },
    dokumentasiMeeting: {
      findMany: jest.fn().mockResolvedValue(overrides.dokumentasiFindMany ?? []),
      findUnique: jest.fn().mockResolvedValue('dokumentasiDetail' in overrides ? overrides.dokumentasiDetail : { id: 1, meetingId: 1, fileFoto: 'a.jpg', meeting: meetingFixture() }),
      create: dokumentasiCreate,
      delete: dokumentasiDelete,
    },
    mOM: {
      findMany: jest.fn().mockResolvedValue(overrides.momFindMany ?? []),
      findUnique: jest.fn().mockResolvedValue('momDetail' in overrides ? overrides.momDetail : { id: 1, meetingId: 1, statusClose: false, dueDate: new Date(), meeting: meetingFixture() }),
      create: momCreate,
      update: momUpdate,
      delete: momDelete,
    },
    project: {
      findUnique: jest.fn().mockResolvedValue('projectAkses' in overrides ? overrides.projectAkses : { kontrak: { vendorId: 1 } }),
    },
  } as unknown as PrismaService;

  const akses = new EpromAksesService(prisma);
  const file = {
    simpanDokumen: jest.fn().mockReturnValue('eprom/project/1/meeting/1/x.jpg'),
    hapus: jest.fn().mockReturnValue(true),
  } as unknown as EpromFileService;

  const service = new EpromMeetingService(prisma, akses, file);

  return { service, prisma, file, meetingCreate, meetingDelete, dokumentasiCreate, dokumentasiDelete, momCreate, momUpdate, momDelete };
}

describe('EpromMeetingService.daftarMeeting', () => {
  it('menolak Vendor bukan pemilik project', async () => {
    const { service } = buatService({ projectAkses: { kontrak: { vendorId: 999 } } });

    await expect(service.daftarMeeting(aktor(UserRole.VENDOR, { vendorId: 1 }), 1)).rejects.toThrow(
      ForbiddenException,
    );
  });

  it('melengkapi progressLabel & progressFileUrl dari data mingguan', async () => {
    const { service, prisma } = buatService({
      meetingFindMany: [meetingFixture({ tipeLink: 'MINGGUAN', refProgressId: 1 })],
    });
    (prisma.progressMingguan.findMany as jest.Mock).mockResolvedValue([{ id: 1, mingguKe: 3, fileUrl: 'a.pdf' }]);

    const [hasil] = await service.daftarMeeting(aktor(UserRole.OWNER), 1);

    expect(hasil.progressLabel).toBe('Minggu ke-3');
    expect(hasil.progressFileUrl).toBe('a.pdf');
  });

  it('melengkapi progressLabel dari data bulanan', async () => {
    const { service, prisma } = buatService({
      meetingFindMany: [meetingFixture({ tipeLink: 'BULANAN', refProgressId: 5 })],
    });
    (prisma.progressBulanan.findMany as jest.Mock).mockResolvedValue([{ id: 5, bulan: '2026-01', fileUrl: 'b.pdf' }]);

    const [hasil] = await service.daftarMeeting(aktor(UserRole.OWNER), 1);

    expect(hasil.progressLabel).toBe('2026-01');
  });

  it('progressLabel null kalau refProgressId null', async () => {
    const { service } = buatService({
      meetingFindMany: [meetingFixture({ refProgressId: null })],
    });

    const [hasil] = await service.daftarMeeting(aktor(UserRole.OWNER), 1);

    expect(hasil.progressLabel).toBeNull();
    expect(hasil.progressFileUrl).toBeNull();
  });
});

describe('EpromMeetingService.buatMeeting', () => {
  it('menolak kalau data progress mingguan tidak ditemukan pada project ini', async () => {
    const { service } = buatService({ progressMingguanDetail: null });

    await expect(
      service.buatMeeting(aktor(UserRole.OWNER), { projectId: 1, tipeLink: 'MINGGUAN', refProgressId: 1, tanggalMeeting: '2026-01-05' } as any),
    ).rejects.toThrow('tidak ditemukan pada project ini');
  });

  it('menolak kalau progress milik project lain', async () => {
    const { service } = buatService({ progressMingguanDetail: { id: 1, projectId: 999 } });

    await expect(
      service.buatMeeting(aktor(UserRole.OWNER), { projectId: 1, tipeLink: 'MINGGUAN', refProgressId: 1, tanggalMeeting: '2026-01-05' } as any),
    ).rejects.toThrow('tidak ditemukan pada project ini');
  });

  it('berhasil membuat meeting terkait progress bulanan', async () => {
    const { service, meetingCreate } = buatService({ progressBulananDetail: { id: 1, projectId: 1 } });

    await service.buatMeeting(aktor(UserRole.OWNER), { projectId: 1, tipeLink: 'BULANAN', refProgressId: 1, tanggalMeeting: '2026-01-05' } as any);

    expect(meetingCreate).toHaveBeenCalledWith({
      data: { projectId: 1, tipeLink: 'BULANAN', refProgressId: 1, tanggalMeeting: new Date('2026-01-05') },
    });
  });
});

describe('EpromMeetingService.hapusMeeting', () => {
  it('melempar NotFoundException kalau meeting tidak ada', async () => {
    const { service } = buatService({ meeting: null });

    await expect(service.hapusMeeting(aktor(UserRole.OWNER), 1)).rejects.toThrow(NotFoundException);
  });

  it('menghapus meeting beserta foto dokumentasi fisiknya', async () => {
    const { service, meetingDelete, file } = buatService({
      dokumentasiFindMany: [{ fileFoto: 'a.jpg' }, { fileFoto: null }],
    });

    const hasil = await service.hapusMeeting(aktor(UserRole.OWNER), 1);

    expect(meetingDelete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(file.hapus).toHaveBeenCalledTimes(1);
    expect(file.hapus).toHaveBeenCalledWith('a.jpg');
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});

describe('EpromMeetingService.unggahDokumentasi', () => {
  it('menolak tanpa file', async () => {
    const { service } = buatService();

    await expect(service.unggahDokumentasi(aktor(UserRole.OWNER), 1)).rejects.toThrow('File wajib diunggah');
  });

  it('berhasil unggah dokumentasi', async () => {
    const { service, dokumentasiCreate } = buatService();
    const dummyFile = { originalname: 'a.jpg' } as Express.Multer.File;

    await service.unggahDokumentasi(aktor(UserRole.OWNER), 1, dummyFile);

    expect(dokumentasiCreate).toHaveBeenCalledWith({ data: { meetingId: 1, fileFoto: 'eprom/project/1/meeting/1/x.jpg' } });
  });
});

describe('EpromMeetingService.hapusDokumentasi', () => {
  it('melempar NotFoundException kalau dokumentasi tidak ada', async () => {
    const { service } = buatService({ dokumentasiDetail: null });

    await expect(service.hapusDokumentasi(aktor(UserRole.OWNER), 1)).rejects.toThrow(NotFoundException);
  });

  it('berhasil hapus dokumentasi dan file fisiknya', async () => {
    const { service, dokumentasiDelete, file } = buatService();

    await service.hapusDokumentasi(aktor(UserRole.OWNER), 1);

    expect(dokumentasiDelete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(file.hapus).toHaveBeenCalledWith('a.jpg');
  });
});

describe('EpromMeetingService.daftarMom', () => {
  it('hariTerlambatLive dihitung live kalau belum ditutup', async () => {
    const sekarang = new Date();
    jest.useFakeTimers().setSystemTime(sekarang);
    const dueDateLalu = new Date(sekarang.getTime() - 3 * 24 * 60 * 60 * 1000);
    const { service } = buatService({
      momFindMany: [{ id: 1, statusClose: false, hariTerlambat: null, dueDate: dueDateLalu }],
    });

    const [hasil] = await service.daftarMom(aktor(UserRole.OWNER), 1);

    expect(hasil.hariTerlambatLive).toBe(3);
    jest.useRealTimers();
  });

  it('hariTerlambatLive memakai angka beku kalau sudah ditutup', async () => {
    const { service } = buatService({
      momFindMany: [{ id: 1, statusClose: true, hariTerlambat: 7, dueDate: new Date() }],
    });

    const [hasil] = await service.daftarMom(aktor(UserRole.OWNER), 1);

    expect(hasil.hariTerlambatLive).toBe(7);
  });
});

describe('EpromMeetingService.closeMom', () => {
  it('melempar NotFoundException kalau MOM tidak ada', async () => {
    const { service } = buatService({ momDetail: null });

    await expect(service.closeMom(aktor(UserRole.OWNER), 1)).rejects.toThrow(NotFoundException);
  });

  it('menolak menutup MOM yang sudah ditutup', async () => {
    const { service } = buatService({ momDetail: { id: 1, meetingId: 1, statusClose: true, dueDate: new Date(), meeting: meetingFixture() } });

    await expect(service.closeMom(aktor(UserRole.OWNER), 1)).rejects.toThrow('sudah ditutup sebelumnya');
  });

  it('menolak tanpa foto bukti', async () => {
    const { service } = buatService();

    await expect(service.closeMom(aktor(UserRole.OWNER), 1)).rejects.toThrow('Foto bukti wajib diunggah');
  });

  it('berhasil menutup MOM dan membekukan hariTerlambat', async () => {
    const sekarang = new Date('2026-01-10T00:00:00Z');
    jest.useFakeTimers().setSystemTime(sekarang);
    const dueDate = new Date('2026-01-05T00:00:00Z');
    const { service, momUpdate } = buatService({
      momDetail: { id: 1, meetingId: 1, statusClose: false, dueDate, meeting: meetingFixture() },
    });
    const dummyFile = { originalname: 'bukti.jpg' } as Express.Multer.File;

    await service.closeMom(aktor(UserRole.OWNER), 1, dummyFile);

    expect(momUpdate).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ statusClose: true, hariTerlambat: 5 }),
    });
    jest.useRealTimers();
  });
});

describe('EpromMeetingService.hapusMom', () => {
  it('menolak hapus MOM yang sudah ditutup', async () => {
    const { service } = buatService({ momDetail: { id: 1, meetingId: 1, statusClose: true, dueDate: new Date(), meeting: meetingFixture() } });

    await expect(service.hapusMom(aktor(UserRole.OWNER), 1)).rejects.toThrow('sudah ditutup tidak dapat dihapus');
  });

  it('berhasil hapus MOM yang belum ditutup', async () => {
    const { service, momDelete } = buatService();

    const hasil = await service.hapusMom(aktor(UserRole.OWNER), 1);

    expect(momDelete).toHaveBeenCalledWith({ where: { id: 1 } });
    expect(hasil.message).toMatch(/berhasil dihapus/);
  });
});
