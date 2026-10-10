import { EpromSafetyMeetingType, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { AktorEprom } from '../common/eprom-aktor';
import { EpromFileService } from '../common/eprom-file.service';
import { EpromSafetyMeetingService } from './eprom-safety-meeting.service';

describe('EpromSafetyMeetingService', () => {
  afterEach(() => jest.useRealTimers());

  it('menyimpan seluruh file dari satu unggahan multi-file', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-08T01:00:00.000Z'));
    type CreateInput = {
      data: {
        projectId: number;
        tipe: EpromSafetyMeetingType;
        fileUrl: string;
        originalFileName: string;
        uploadedById: number;
      };
      include: unknown;
    };
    let id = 0;
    const create = jest.fn(({ data }: CreateInput) =>
      Promise.resolve({ id: ++id, ...data }),
    );
    const prisma = {
      epromSafetyMeetingFile: { create },
      $transaction: jest.fn((operations: Promise<unknown>[]) =>
        Promise.all(operations),
      ),
    } as unknown as PrismaService;
    const akses = {
      wajibAksesMenuProject: jest.fn().mockResolvedValue(undefined),
      isOwner: jest.fn().mockReturnValue(false),
    } as unknown as EpromAksesService;
    const simpanDokumen = jest
      .fn()
      .mockReturnValueOnce('eprom/project/7/safety-meeting/p5m/a.pdf')
      .mockReturnValueOnce('eprom/project/7/safety-meeting/p5m/b.jpg');
    const file = {
      simpanDokumen,
      hapus: jest.fn(),
    } as unknown as EpromFileService;
    const service = new EpromSafetyMeetingService(prisma, akses, file, {} as any);
    const aktor: AktorEprom = {
      id: 9,
      username: 'vendor',
      role: UserRole.VENDOR,
      vendorId: 3,
    };
    const files = [
      { originalname: 'laporan-p5m.pdf' },
      { originalname: 'foto-p5m.jpg' },
    ] as Express.Multer.File[];

    const hasil = await service.unggah(aktor, 'p5m', 7, files);

    expect(hasil).toHaveLength(2);
    expect(create).toHaveBeenCalledTimes(2);
    expect(create.mock.calls[0]?.[0].data).toMatchObject({
      projectId: 7,
      tipe: EpromSafetyMeetingType.P5M,
      originalFileName: 'laporan-p5m.pdf',
      uploadedById: 9,
    });
    expect(simpanDokumen).toHaveBeenCalledTimes(2);
  });

  it('menolak unggahan P5M Vendor mulai pukul 10.00 WITA', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-08T02:00:00.000Z'));
    const prisma = {} as PrismaService;
    const akses = {
      wajibAksesMenuProject: jest.fn().mockResolvedValue(undefined),
      isOwner: jest.fn().mockReturnValue(false),
    } as unknown as EpromAksesService;
    const file = { simpanDokumen: jest.fn(), hapus: jest.fn() } as unknown as EpromFileService;
    const service = new EpromSafetyMeetingService(prisma, akses, file, {} as any);
    const aktor = { id: 9, username: 'vendor', role: UserRole.VENDOR, vendorId: 3 };

    await expect(
      service.unggah(aktor, 'p5m', 7, [{ originalname: 'p5m.pdf' }] as Express.Multer.File[]),
    ).rejects.toThrow('Batas unggah P5M adalah pukul 10.00 WITA');
    expect(file.simpanDokumen).not.toHaveBeenCalled();
  });

  it('Owner/Admin tetap dapat mengunggah P5M setelah pukul 10.00 WITA', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-08T02:01:00.000Z'));
    const create = jest.fn().mockResolvedValue({ id: 1 });
    const prisma = {
      epromSafetyMeetingFile: { create },
      $transaction: jest.fn((operations: Promise<unknown>[]) => Promise.all(operations)),
    } as unknown as PrismaService;
    const akses = {
      wajibAksesMenuProject: jest.fn().mockResolvedValue(undefined),
      isOwner: jest.fn().mockReturnValue(true),
    } as unknown as EpromAksesService;
    const file = {
      simpanDokumen: jest.fn().mockReturnValue('eprom/project/7/safety-meeting/p5m/a.pdf'),
      hapus: jest.fn(),
    } as unknown as EpromFileService;
    const service = new EpromSafetyMeetingService(prisma, akses, file, {} as any);
    const aktor = { id: 1, username: 'owner', role: UserRole.ADMIN };

    await expect(
      service.unggah(aktor, 'p5m', 7, [{ originalname: 'p5m.pdf' }] as Express.Multer.File[]),
    ).resolves.toHaveLength(1);
    expect(create).toHaveBeenCalledTimes(1);
  });
});
