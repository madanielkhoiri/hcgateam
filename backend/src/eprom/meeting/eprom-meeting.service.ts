// ==================================================
// FILE: backend/src/eprom/meeting/eprom-meeting.service.ts
// FUNGSI: Meeting, Dokumentasi Meeting, MOM (Project Area - Meeting Progress)
// Referensi: alur-workflow-tender-kontrak-project-area.md bagian 5.3
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { TipeLinkMeeting } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { EpromFileService } from '../common/eprom-file.service';
import { AktorEprom } from '../common/eprom-aktor';

export class BuatMeetingDto {
  @Type(() => Number)
  @IsInt()
  projectId: number;

  @IsIn(['MINGGUAN', 'BULANAN'])
  tipeLink: TipeLinkMeeting;

  @Type(() => Number)
  @IsInt()
  refProgressId: number;

  @IsDateString()
  tanggalMeeting: string;
}

export class BuatMomDto {
  @IsString()
  @IsNotEmpty()
  pica: string;

  @IsDateString()
  dueDate: string;

  @IsString()
  @IsNotEmpty()
  pic: string;
}

/** Selisih hari kalender penuh (a - b), tidak dibulatkan ke arah manapun selain floor. */
function selisihHari(a: Date, b: Date): number {
  const msPerHari = 24 * 60 * 60 * 1000;
  const aTengahMalam = Date.UTC(a.getUTCFullYear(), a.getUTCMonth(), a.getUTCDate());
  const bTengahMalam = Date.UTC(b.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate());
  return Math.floor((aTengahMalam - bTengahMalam) / msPerHari);
}

@Injectable()
export class EpromMeetingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: EpromAksesService,
    private readonly file: EpromFileService,
  ) {}

  // ---------------- Meeting ----------------

  async daftarMeeting(aktor: AktorEprom, projectId: number) {
    await this.akses.wajibAksesProject(aktor, projectId);

    const daftar = await this.prisma.meeting.findMany({
      where: { projectId },
      include: { _count: { select: { dokumentasi: true, mom: true } } },
      orderBy: { createdAt: 'desc' },
    });

    const idMingguan = daftar
      .filter((m) => m.tipeLink === 'MINGGUAN' && m.refProgressId !== null)
      .map((m) => m.refProgressId!);
    const idBulanan = daftar
      .filter((m) => m.tipeLink === 'BULANAN' && m.refProgressId !== null)
      .map((m) => m.refProgressId!);

    const [mingguan, bulanan] = await Promise.all([
      this.prisma.progressMingguan.findMany({ where: { id: { in: idMingguan } } }),
      this.prisma.progressBulanan.findMany({ where: { id: { in: idBulanan } } }),
    ]);

    const petaMingguan = new Map(mingguan.map((m) => [m.id, m]));
    const petaBulanan = new Map(bulanan.map((b) => [b.id, b]));

    return daftar.map((m) => {
      const sumber =
        m.refProgressId === null
          ? null
          : m.tipeLink === 'MINGGUAN'
            ? petaMingguan.get(m.refProgressId)
            : petaBulanan.get(m.refProgressId);

      return {
        ...m,
        progressLabel: !sumber
          ? null
          : m.tipeLink === 'MINGGUAN'
            ? `Minggu ke-${(sumber as { mingguKe: number }).mingguKe}`
            : (sumber as { bulan: string }).bulan,
        progressFileUrl: sumber?.fileUrl ?? null,
      };
    });
  }

  async sumberProgress(aktor: AktorEprom, projectId: number, tipeLink: TipeLinkMeeting) {
    await this.akses.wajibAksesProject(aktor, projectId);

    if (tipeLink === 'MINGGUAN') {
      return this.prisma.progressMingguan.findMany({
        where: { projectId },
        orderBy: { mingguKe: 'desc' },
      });
    }

    return this.prisma.progressBulanan.findMany({
      where: { projectId },
      orderBy: { bulan: 'desc' },
    });
  }

  async buatMeeting(aktor: AktorEprom, dto: BuatMeetingDto) {
    await this.akses.wajibAksesProject(aktor, dto.projectId);

    const progress =
      dto.tipeLink === 'MINGGUAN'
        ? await this.prisma.progressMingguan.findUnique({ where: { id: dto.refProgressId } })
        : await this.prisma.progressBulanan.findUnique({ where: { id: dto.refProgressId } });

    if (!progress || progress.projectId !== dto.projectId) {
      throw new BadRequestException('Data Progress yang dipilih tidak ditemukan pada project ini');
    }

    return this.prisma.meeting.create({
      data: {
        projectId: dto.projectId,
        tipeLink: dto.tipeLink,
        refProgressId: dto.refProgressId,
        tanggalMeeting: new Date(dto.tanggalMeeting),
      },
    });
  }

  async hapusMeeting(aktor: AktorEprom, id: number) {
    const meeting = await this.meetingAtauThrow(id);
    await this.akses.wajibAksesProject(aktor, meeting.projectId);

    const dokumentasi = await this.prisma.dokumentasiMeeting.findMany({ where: { meetingId: id } });

    await this.prisma.meeting.delete({ where: { id } });

    for (const d of dokumentasi) {
      if (d.fileFoto) this.file.hapus(d.fileFoto);
    }

    return { message: 'Meeting berhasil dihapus' };
  }

  // ---------------- Dokumentasi Meeting ----------------

  async daftarDokumentasi(aktor: AktorEprom, meetingId: number) {
    const meeting = await this.meetingAtauThrow(meetingId);
    await this.akses.wajibAksesProject(aktor, meeting.projectId);

    return this.prisma.dokumentasiMeeting.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async unggahDokumentasi(aktor: AktorEprom, meetingId: number, file?: Express.Multer.File) {
    const meeting = await this.meetingAtauThrow(meetingId);
    await this.akses.wajibAksesProject(aktor, meeting.projectId);

    if (!file) {
      throw new BadRequestException('File wajib diunggah');
    }

    const fileFoto = this.file.simpanDokumen(file, `project/${meeting.projectId}/meeting/${meetingId}/dokumentasi`);

    return this.prisma.dokumentasiMeeting.create({ data: { meetingId, fileFoto } });
  }

  async hapusDokumentasi(aktor: AktorEprom, id: number) {
    const dokumentasi = await this.prisma.dokumentasiMeeting.findUnique({
      where: { id },
      include: { meeting: true },
    });

    if (!dokumentasi) {
      throw new NotFoundException('Dokumentasi tidak ditemukan');
    }

    await this.akses.wajibAksesProject(aktor, dokumentasi.meeting.projectId);
    await this.prisma.dokumentasiMeeting.delete({ where: { id } });

    if (dokumentasi.fileFoto) {
      this.file.hapus(dokumentasi.fileFoto);
    }

    return { message: 'Dokumentasi berhasil dihapus' };
  }

  // ---------------- MOM ----------------

  async daftarMom(aktor: AktorEprom, meetingId: number) {
    const meeting = await this.meetingAtauThrow(meetingId);
    await this.akses.wajibAksesProject(aktor, meeting.projectId);

    const daftar = await this.prisma.mOM.findMany({
      where: { meetingId },
      orderBy: { createdAt: 'desc' },
    });

    const sekarang = new Date();

    return daftar.map((item) => ({
      ...item,
      hariTerlambatLive: item.statusClose ? item.hariTerlambat : selisihHari(sekarang, item.dueDate),
    }));
  }

  async buatMom(aktor: AktorEprom, meetingId: number, dto: BuatMomDto) {
    const meeting = await this.meetingAtauThrow(meetingId);
    await this.akses.wajibAksesProject(aktor, meeting.projectId);

    return this.prisma.mOM.create({
      data: {
        meetingId,
        pica: dto.pica.trim(),
        dueDate: new Date(dto.dueDate),
        pic: dto.pic.trim(),
      },
    });
  }

  /** Menutup MOM (wajib upload foto bukti) dan membekukan angka keterlambatan saat itu. */
  async closeMom(aktor: AktorEprom, id: number, file?: Express.Multer.File) {
    const mom = await this.prisma.mOM.findUnique({ where: { id }, include: { meeting: true } });

    if (!mom) {
      throw new NotFoundException('MOM tidak ditemukan');
    }

    await this.akses.wajibAksesProject(aktor, mom.meeting.projectId);

    if (mom.statusClose) {
      throw new BadRequestException('MOM ini sudah ditutup sebelumnya');
    }

    if (!file) {
      throw new BadRequestException('Foto bukti wajib diunggah untuk menutup MOM');
    }

    const fileFotoClose = this.file.simpanDokumen(
      file,
      `project/${mom.meeting.projectId}/meeting/${mom.meetingId}/mom-close`,
    );
    const sekarang = new Date();

    return this.prisma.mOM.update({
      where: { id },
      data: {
        statusClose: true,
        tglClose: sekarang,
        fileFotoClose,
        hariTerlambat: selisihHari(sekarang, mom.dueDate),
      },
    });
  }

  async hapusMom(aktor: AktorEprom, id: number) {
    const mom = await this.prisma.mOM.findUnique({ where: { id }, include: { meeting: true } });

    if (!mom) {
      throw new NotFoundException('MOM tidak ditemukan');
    }

    await this.akses.wajibAksesProject(aktor, mom.meeting.projectId);

    if (mom.statusClose) {
      throw new BadRequestException('MOM yang sudah ditutup tidak dapat dihapus');
    }

    await this.prisma.mOM.delete({ where: { id } });

    return { message: 'MOM berhasil dihapus' };
  }

  private async meetingAtauThrow(id: number) {
    const meeting = await this.prisma.meeting.findUnique({ where: { id } });

    if (!meeting) {
      throw new NotFoundException('Meeting tidak ditemukan');
    }

    return meeting;
  }
}
