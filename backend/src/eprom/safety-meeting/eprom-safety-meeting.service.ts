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
  'dokpro',
  'izin-kerja-khusus',
] as const;

export type TipeSafetyMeeting = (typeof TIPE_SAFETY_MEETING)[number];

const TIPE_DATABASE: Record<TipeSafetyMeeting, EpromSafetyMeetingType> = {
  p5m: EpromSafetyMeetingType.P5M,
  'safety-talk': EpromSafetyMeetingType.SAFETY_TALK,
  'fatigue-test': EpromSafetyMeetingType.FATIGUE_TEST,
  dokpro: EpromSafetyMeetingType.DOKPRO,
  'izin-kerja-khusus': EpromSafetyMeetingType.IZIN_KERJA_KHUSUS,
};

const LABEL_TIPE: Record<TipeSafetyMeeting, string> = {
  p5m: 'P5M',
  'safety-talk': 'Safety Talk',
  'fatigue-test': 'Fatigue Test',
  dokpro: 'Dokpro',
  'izin-kerja-khusus': 'Izin Kerja Khusus',
};

const BATAS_UPLOAD_P5M_MENIT_WITA = 10 * 60;

/** P5M Vendor dapat diunggah sampai sebelum pukul 10.00 WITA. */
function lewatBatasUploadP5m(): boolean {
  const wita = new Date(Date.now() + 8 * 60 * 60 * 1000);
  return wita.getUTCHours() * 60 + wita.getUTCMinutes() >= BATAS_UPLOAD_P5M_MENIT_WITA;
}

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
    await this.akses.wajibAksesMenuProject(aktor, projectId, tipe);

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
    await this.akses.wajibAksesMenuProject(aktor, projectId, tipe);

    if (tipe === 'p5m' && lewatBatasUploadP5m()) {
      throw new BadRequestException(
        'Batas unggah P5M adalah pukul 10.00 WITA',
      );
    }

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

    await this.akses.wajibAksesMenuProject(aktor, item.projectId, tipe);
    await this.prisma.epromSafetyMeetingFile.delete({ where: { id } });
    this.file.hapus(item.fileUrl);

    return { message: 'File berhasil dihapus' };
  }
}
