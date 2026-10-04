// ==================================================
// FILE: backend/src/eprom/progress/eprom-progress.service.ts
// FUNGSI: Inspeksi Area Pekerjaan, Inspeksi Peralatan, Progress Harian/Mingguan/Bulanan,
// TTA, KTA (Project Area - Konstruksi, sub-modul upload murni tanpa approve/reject)
// Referensi: alur-workflow-tender-kontrak-project-area.md bagian 3.3, 3.4, 5.2.2-5.2.8
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { EpromFileService } from '../common/eprom-file.service';
import { AktorEprom } from '../common/eprom-aktor';

export type StatusDeviasi = 'ON_TRACK' | 'WASPADA' | 'TERLAMBAT';

/** Ambang batas status: >=0 aman, -5..0 waspada, <-5 terlambat. */
function statusDeviasi(deviasi: number): StatusDeviasi {
  if (deviasi >= 0) return 'ON_TRACK';
  if (deviasi >= -5) return 'WASPADA';
  return 'TERLAMBAT';
}

export class BuatProgressDto {
  @IsOptional()
  @IsString()
  tanggal?: string;
  @IsOptional()
  @IsString()
  namaPekerjaan?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  planned?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  actual?: number;
}

export const TIPE_PROGRESS = [
  'inspeksi-area',
  'inspeksi-peralatan',
  'progress-harian',
  'progress-mingguan',
  'progress-bulanan',
  'tta',
  'kta',
] as const;

export type TipeProgress = (typeof TIPE_PROGRESS)[number];

const LABEL_TIPE: Record<TipeProgress, string> = {
  'inspeksi-area': 'Inspeksi Area Pekerjaan',
  'inspeksi-peralatan': 'Inspeksi Peralatan',
  'progress-harian': 'Progress Harian',
  'progress-mingguan': 'Progress Mingguan',
  'progress-bulanan': 'Progress Bulanan',
  tta: 'Tindakan Tidak Aman (TTA)',
  kta: 'Kondisi Tidak Aman (KTA)',
};

type JamWITA = { buka: string; tutup: string } | null;

/** Batas waktu upload zona WITA ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â di luar jam ini, upload dikunci (bagian 3.3). */
const JAM_WITA: Record<TipeProgress, JamWITA> = {
  'inspeksi-area': { buka: '08:00', tutup: '12:00' },
  'inspeksi-peralatan': { buka: '08:00', tutup: '10:00' },
  'progress-harian': { buka: '08:00', tutup: '22:00' },
  'progress-mingguan': { buka: '08:00', tutup: '22:00' },
  'progress-bulanan': { buka: '08:00', tutup: '22:00' },
  tta: null,
  kta: null,
};

const FIELD_URUT: Record<TipeProgress, string> = {
  'inspeksi-area': 'uploadedAt',
  'inspeksi-peralatan': 'uploadedAt',
  'progress-harian': 'uploadedAt',
  'progress-mingguan': 'uploadedAt',
  'progress-bulanan': 'uploadedAt',
  tta: 'tanggalUpload',
  kta: 'tanggalUpload',
};

/**
 * "now" digeser +8 jam lalu dibaca dengan getUTC*, supaya hasilnya selalu
 * jam dinding WITA terlepas dari timezone server yang menjalankan proses ini.
 */
function sekarangWITA(): Date {
  return new Date(Date.now() + 8 * 60 * 60 * 1000);
}

function dalamJamWITA(jam: JamWITA): boolean {
  if (!jam) {
    return true;
  }

  const now = sekarangWITA();
  const menitSekarang = now.getUTCHours() * 60 + now.getUTCMinutes();
  const [bukaH, bukaM] = jam.buka.split(':').map(Number);
  const [tutupH, tutupM] = jam.tutup.split(':').map(Number);

  return menitSekarang >= bukaH * 60 + bukaM && menitSekarang < tutupH * 60 + tutupM;
}

function tanggalHariIniWITA(): Date {
  const now = sekarangWITA();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function bulanIniWITA(): string {
  return bulanDariTanggalWITA(new Date());
}

/** Format "YYYY-MM" (WITA) dari tanggal manapun ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â dipakai untuk mengelompokkan tren per bulan. */
function bulanDariTanggalWITA(tanggal: Date): string {
  const wita = new Date(tanggal.getTime() + 8 * 60 * 60 * 1000);
  return `${wita.getUTCFullYear()}-${String(wita.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Nomor minggu ISO-8601 dari tanggal WITA hari ini. */
function mingguIniWITA(): number {
  const tanggal = tanggalHariIniWITA();
  const hariSenin0 = (tanggal.getUTCDay() + 6) % 7;
  tanggal.setUTCDate(tanggal.getUTCDate() - hariSenin0 + 3);

  const kamisPertama = new Date(Date.UTC(tanggal.getUTCFullYear(), 0, 4));
  const hariKamisPertama = (kamisPertama.getUTCDay() + 6) % 7;
  kamisPertama.setUTCDate(kamisPertama.getUTCDate() - hariKamisPertama + 3);

  return 1 + Math.round((tanggal.getTime() - kamisPertama.getTime()) / (7 * 86400000));
}

@Injectable()
export class EpromProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: EpromAksesService,
    private readonly file: EpromFileService,
  ) {}

  validasiTipe(tipe: string): TipeProgress {
    if (!TIPE_PROGRESS.includes(tipe as TipeProgress)) {
      throw new BadRequestException('Tipe Progress tidak valid');
    }

    return tipe as TipeProgress;
  }

  /**
   * Dispatcher generik ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â di-tipe `any` dengan sengaja, sama seperti
   * EpromEngineerService/EpromKonstruksiService (7 delegate model berbeda).
   */
  private delegate(tipe: TipeProgress): any {
    switch (tipe) {
      case 'inspeksi-area':
        return this.prisma.inspeksiAreaPekerjaan;
      case 'inspeksi-peralatan':
        return this.prisma.inspeksiPeralatan;
      case 'progress-harian':
        return this.prisma.progressHarian;
      case 'progress-mingguan':
        return this.prisma.progressMingguan;
      case 'progress-bulanan':
        return this.prisma.progressBulanan;
      case 'tta':
        return this.prisma.tTA;
      case 'kta':
        return this.prisma.kTA;
    }
  }

  /**
   * Info jam buka/tutup WITA untuk tombol upload di frontend.
   * Owner/admin utama bebas jam ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â batasan hanya berlaku untuk Vendor.
   */
  jamUpload(aktor: AktorEprom, tipe: TipeProgress) {
    const jam = JAM_WITA[tipe];
    const owner = this.akses.isOwner(aktor);

    return {
      dibatasi: jam !== null,
      bukaSekarang: owner || dalamJamWITA(jam),
      bebasSebagaiOwner: owner && jam !== null && !dalamJamWITA(jam),
      jamBuka: jam?.buka ?? null,
      jamTutup: jam?.tutup ?? null,
    };
  }

  async daftar(aktor: AktorEprom, tipe: TipeProgress, projectId: number) {
    await this.akses.wajibAksesProject(aktor, projectId);

    const items = await this.delegate(tipe).findMany({
      where: { projectId },
      orderBy: { [FIELD_URUT[tipe]]: 'desc' },
    });

    if (tipe !== 'progress-mingguan') {
      return items;
    }

    return items.map((item: { planned: number | string; actual: number | string }) => {
      const deviasi = Number(item.actual) - Number(item.planned);
      return { ...item, deviasi, status: statusDeviasi(deviasi) };
    });
  }

  async buat(
    aktor: AktorEprom,
    tipe: TipeProgress,
    projectId: number,
    dto: BuatProgressDto,
    file?: Express.Multer.File,
  ) {
    await this.akses.wajibAksesProject(aktor, projectId);

    if (tipe === 'progress-mingguan') {
      if (!dto.namaPekerjaan?.trim()) {
        throw new BadRequestException('Nama Pekerjaan wajib diisi');
      }
      if (dto.planned === undefined || dto.actual === undefined) {
        throw new BadRequestException('Planned dan Actual wajib diisi');
      }
    } else if (!file) {
      throw new BadRequestException('File wajib diunggah');
    }

    const jam = JAM_WITA[tipe];
    if (!this.akses.isOwner(aktor) && !dalamJamWITA(jam)) {
      throw new BadRequestException(
        `Upload ${LABEL_TIPE[tipe]} hanya dibuka pukul ${jam!.buka}-${jam!.tutup} WITA`,
      );
    }

    const tanggalDipilih = dto.tanggal ? new Date(`${dto.tanggal}T12:00:00.000Z`) : new Date();
    if (Number.isNaN(tanggalDipilih.getTime())) throw new BadRequestException('Tanggal upload tidak valid');

    const fileUrl = file
      ? this.file.simpanDokumen(file, `project/${projectId}/progress/${tipe}`)
      : null;

    const dataEkstra: Record<string, unknown> = {};
    if (tipe !== 'tta' && tipe !== 'kta') dataEkstra.uploadedAt = tanggalDipilih;
    if (tipe === 'progress-harian') {
      dataEkstra.tanggal = tanggalDipilih;
    } else if (tipe === 'progress-mingguan') {
      dataEkstra.mingguKe = mingguIniWITA();
      dataEkstra.namaPekerjaan = dto.namaPekerjaan!.trim();
      dataEkstra.planned = dto.planned;
      dataEkstra.actual = dto.actual;
    } else if (tipe === 'progress-bulanan' || tipe === 'tta' || tipe === 'kta') {
      dataEkstra.bulan = dto.tanggal ? dto.tanggal.slice(0, 7) : bulanIniWITA();
      if (tipe === 'tta' || tipe === 'kta') dataEkstra.tanggalUpload = tanggalDipilih;
    }

    return this.delegate(tipe).create({
      data: { projectId, fileUrl, ...dataEkstra },
    });
  }

  async hapus(aktor: AktorEprom, tipe: TipeProgress, id: number) {
    const item = await this.delegate(tipe).findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException(`${LABEL_TIPE[tipe]} tidak ditemukan`);
    }

    await this.akses.wajibAksesProject(aktor, item.projectId);
    await this.delegate(tipe).delete({ where: { id } });

    if (item.fileUrl) {
      this.file.hapus(item.fileUrl);
    }

    return { message: 'Item berhasil dihapus' };
  }

  async ubah(
    aktor: AktorEprom,
    tipe: TipeProgress,
    id: number,
    dto: BuatProgressDto,
    file?: Express.Multer.File,
  ) {
    const item = await this.delegate(tipe).findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`${LABEL_TIPE[tipe]} tidak ditemukan`);
    await this.akses.wajibAksesProject(aktor, item.projectId);
    if (tipe === 'progress-mingguan') {
      if (!dto.namaPekerjaan?.trim()) throw new BadRequestException('Nama Pekerjaan wajib diisi');
      if (dto.planned === undefined || dto.actual === undefined) {
        throw new BadRequestException('Planned dan Actual wajib diisi');
      }
    }
    const data: Record<string, unknown> = {};
    if (dto.tanggal) {
      const tanggalDipilih = new Date(`${dto.tanggal}T12:00:00.000Z`);
      if (Number.isNaN(tanggalDipilih.getTime())) throw new BadRequestException('Tanggal upload tidak valid');
      if (tipe !== 'tta' && tipe !== 'kta') data.uploadedAt = tanggalDipilih;
      if (tipe === 'progress-harian') data.tanggal = tanggalDipilih;
      if (tipe === 'progress-bulanan') data.bulan = dto.tanggal.slice(0, 7);
      if (tipe === 'tta' || tipe === 'kta') data.tanggalUpload = tanggalDipilih;
    }
    if (file) {
      data.fileUrl = this.file.simpanDokumen(file, `project/${item.projectId}/progress/${tipe}`);
      if (item.fileUrl) this.file.hapus(item.fileUrl);
    }
    if (tipe === 'progress-mingguan') {
      data.namaPekerjaan = dto.namaPekerjaan!.trim();
      data.planned = dto.planned;
      data.actual = dto.actual;
    }
    return this.delegate(tipe).update({ where: { id }, data });
  }

  /**
   * Progress Fisik project = jumlah (bukan rata-rata) Actual% terbaru dari
   * tiap nama Pekerjaan (baris terbaru per nama dipilih berdasarkan
   * minggu_ke, lalu id). Planned/Actual per pekerjaan sudah merupakan bobot
   * kontribusinya ke total project (kurva-S), jadi cukup dijumlahkan ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â
   * pekerjaan baru yang baru mulai (kecil) TIDAK menurunkan total, hanya
   * menambah. Dipakai baik oleh tab Progress Mingguan maupun Dashboard utama.
   */
  async progresFisikProject(projectId: number): Promise<number | null> {
    const baris = await this.prisma.progressMingguan.findMany({
      where: { projectId },
      orderBy: [{ mingguKe: 'desc' }, { id: 'desc' }],
      select: { namaPekerjaan: true, actual: true },
    });

    const terbaruPerPekerjaan = new Map<string, number>();
    for (const b of baris) {
      if (!terbaruPerPekerjaan.has(b.namaPekerjaan)) {
        terbaruPerPekerjaan.set(b.namaPekerjaan, Number(b.actual));
      }
    }

    if (terbaruPerPekerjaan.size === 0) {
      return null;
    }

    const totalActual = [...terbaruPerPekerjaan.values()].reduce((a, b) => a + b, 0);
    return Math.round(totalActual * 10) / 10;
  }

  /** Kurva-S mingguan: planned dan actual kumulatif per tanggal upload. */
  async trendMingguan(projectId: number) {
    const baris = await this.prisma.progressMingguan.findMany({
      where: { projectId },
      orderBy: [{ uploadedAt: 'asc' }, { mingguKe: 'asc' }, { id: 'asc' }],
      select: { uploadedAt: true, namaPekerjaan: true, planned: true, actual: true },
    });

    const urut = baris.slice().sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime());
    const tanggal = [...new Set(urut.map((b) => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(b.uploadedAt)))].sort();
    return tanggal.map((hari) => {
      const terbaru = new Map<string, { planned: number; actual: number }>();
      for (const b of urut) { const t = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar' }).format(b.uploadedAt); if (t > hari) break; terbaru.set(b.namaPekerjaan, { planned: Number(b.planned), actual: Number(b.actual) }); }
      const planned = [...terbaru.values()].reduce((sum, b) => sum + b.planned, 0);
      const actual = [...terbaru.values()].reduce((sum, b) => sum + b.actual, 0);
      return { bulan: hari, planned: Math.round(planned * 10) / 10, actual: Math.round(actual * 10) / 10, deviasi: Math.round((actual - planned) * 10) / 10 };
    });
  }

  /**
   * Baris Planned/Actual/Deviasi terbaru per nama Pekerjaan (bukan seluruh histori)
   * ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â dipakai widget "Progress Mingguan" per-project di Dashboard.
   */
  async progresMingguanTerbaru(aktor: AktorEprom, projectId: number) {
    await this.akses.wajibAksesProject(aktor, projectId);

    const baris = await this.prisma.progressMingguan.findMany({
      where: { projectId },
      orderBy: [{ mingguKe: 'desc' }, { id: 'desc' }],
    });

    const terbaruPerPekerjaan = new Map<string, (typeof baris)[number]>();
    for (const b of baris) {
      if (!terbaruPerPekerjaan.has(b.namaPekerjaan)) {
        terbaruPerPekerjaan.set(b.namaPekerjaan, b);
      }
    }

    return [...terbaruPerPekerjaan.values()].map((item) => {
      const deviasi = Number(item.actual) - Number(item.planned);
      return { ...item, deviasi, status: statusDeviasi(deviasi) };
    });
  }

  /** Persen performa bulan berjalan untuk TTA/KTA ÃƒÂ¢Ã¢â€šÂ¬Ã¢â‚¬Â target 8 upload/bulan (bagian 3.4). */
  async performaBulanIni(aktor: AktorEprom, tipe: 'tta' | 'kta', projectId: number) {
    await this.akses.wajibAksesProject(aktor, projectId);

    const bulan = bulanIniWITA();
    const jumlah = await this.delegate(tipe).count({ where: { projectId, bulan } });
    const persen = Math.min(100, Math.round((jumlah / 8) * 1000) / 10);

    return { bulan, jumlah, target: 8, persen };
  }
}
