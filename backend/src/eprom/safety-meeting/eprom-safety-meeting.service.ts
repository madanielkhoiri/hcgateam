import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt } from 'class-validator';
import { EpromSafetyMeetingType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { AktorEprom } from '../common/eprom-aktor';
import { EpromFileService } from '../common/eprom-file.service';

export const TIPE_SAFETY_MEETING = [
  'p5m',
  'safety-talk',
  'fatigue-test',
] as const;

export type TipeSafetyMeeting = (typeof TIPE_SAFETY_MEETING)[number];

const TIPE_DATABASE: Record<TipeSafetyMeeting, EpromSafetyMeetingType> = {
  p5m: EpromSafetyMeetingType.P5M,
  'safety-talk': EpromSafetyMeetingType.SAFETY_TALK,
  'fatigue-test': EpromSafetyMeetingType.FATIGUE_TEST,
};

const LABEL_TIPE: Record<TipeSafetyMeeting, string> = {
  p5m: 'P5M',
  'safety-talk': 'Safety Talk',
  'fatigue-test': 'Fatigue Test',
};

export class UploadSafetyMeetingDto {
  @Type(() => Number)
  @IsInt()
  projectId: number;
}

@Injectable()
export class EpromSafetyMeetingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: EpromAksesService,
    private readonly file: EpromFileService,
  ) {}

  validasiTipe(tipe: string): TipeSafetyMeeting {
    if (!TIPE_SAFETY_MEETING.includes(tipe as TipeSafetyMeeting)) {
      throw new BadRequestException('Tipe Safety Meeting tidak valid');
    }
    return tipe as TipeSafetyMeeting;
  }

  async daftar(aktor: AktorEprom, tipe: TipeSafetyMeeting, projectId: number) {
    await this.akses.wajibAksesProject(aktor, projectId);

    return this.prisma.epromSafetyMeetingFile.findMany({
      where: { projectId, tipe: TIPE_DATABASE[tipe] },
      include: { uploadedBy: { select: { id: true, name: true } } },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async unggah(
    aktor: AktorEprom,
    tipe: TipeSafetyMeeting,
    projectId: number,
    files: Express.Multer.File[] = [],
  ) {
    await this.akses.wajibAksesProject(aktor, projectId);

    if (files.length === 0) {
      throw new BadRequestException('Pilih minimal satu file');
    }

    const tersimpan: { fileUrl: string; originalFileName: string }[] = [];
    try {
      for (const upload of files) {
        tersimpan.push({
          fileUrl: this.file.simpanDokumen(
            upload,
            `project/${projectId}/safety-meeting/${tipe}`,
          ),
          originalFileName: upload.originalname,
        });
      }

      return await this.prisma.$transaction(
        tersimpan.map((item) =>
          this.prisma.epromSafetyMeetingFile.create({
            data: {
              projectId,
              tipe: TIPE_DATABASE[tipe],
              fileUrl: item.fileUrl,
              originalFileName: item.originalFileName,
              uploadedById: aktor.id,
            },
            include: { uploadedBy: { select: { id: true, name: true } } },
          }),
        ),
      );
    } catch (error) {
      tersimpan.forEach((item) => this.file.hapus(item.fileUrl));
      throw error;
    }
  }

  async hapus(aktor: AktorEprom, tipe: TipeSafetyMeeting, id: number) {
    const item = await this.prisma.epromSafetyMeetingFile.findUnique({
      where: { id },
    });
    if (!item || item.tipe !== TIPE_DATABASE[tipe]) {
      throw new NotFoundException(`${LABEL_TIPE[tipe]} tidak ditemukan`);
    }

    await this.akses.wajibAksesProject(aktor, item.projectId);
    await this.prisma.epromSafetyMeetingFile.delete({ where: { id } });
    this.file.hapus(item.fileUrl);

    return { message: 'File berhasil dihapus' };
  }
}
