import { EpromSafetyMeetingType, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { AktorEprom } from '../common/eprom-aktor';
import { EpromFileService } from '../common/eprom-file.service';
import { EpromSafetyMeetingService } from './eprom-safety-meeting.service';

describe('EpromSafetyMeetingService', () => {
  it('menyimpan seluruh file dari satu unggahan multi-file', async () => {
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
      wajibAksesProject: jest.fn().mockResolvedValue(undefined),
    } as unknown as EpromAksesService;
    const simpanDokumen = jest
      .fn()
      .mockReturnValueOnce('eprom/project/7/safety-meeting/p5m/a.pdf')
      .mockReturnValueOnce('eprom/project/7/safety-meeting/p5m/b.jpg');
    const file = {
      simpanDokumen,
      hapus: jest.fn(),
    } as unknown as EpromFileService;
    const service = new EpromSafetyMeetingService(prisma, akses, file);
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
});
