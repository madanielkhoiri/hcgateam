// ==================================================
// FILE: backend/src/eprom/progress/eprom-progress.service.ts
// FUNGSI: Inspeksi Area Pekerjaan, Inspeksi Peralatan, Progress Harian/Mingguan/Bulanan,
// TTA, KTA (Project Area - Konstruksi, sub-modul upload murni tanpa approve/reject)
// Referensi: alur-workflow-tender-kontrak-project-area.md bagian 3.3, 3.4, 5.2.2-5.2.8
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { EpromFileService } from '../common/eprom-file.service';
import { EpromReportPdfService } from '../reports/eprom-report-pdf.service';
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
  @Type(() => Number)
  @IsInt()
  @Min(1)
  mingguKe?: number;
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

function jumlahMingguProyek(tanggalMulai: Date, tanggalSelesai: Date): number {
  const selisihHari = Math.floor(
    (Date.UTC(tanggalSelesai.getUTCFullYear(), tanggalSelesai.getUTCMonth(), tanggalSelesai.getUTCDate()) -
      Date.UTC(tanggalMulai.getUTCFullYear(), tanggalMulai.getUTCMonth(), tanggalMulai.getUTCDate())) /
      86400000,
  );
  return Math.max(1, Math.ceil((selisihHari + 1) / 7));
}

/** Kompatibilitas data lama: "LAPORAN WEEK 17" berarti Week 17. */
function nomorWeekLaporan(namaPekerjaan: string, mingguKe: number): number {
  const cocok = namaPekerjaan.trim().match(/^laporan\s+week\s+(\d+)$/i);
  return cocok ? Number(cocok[1]) : mingguKe;
}

@Injectable()
export class EpromProgressService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: EpromAksesService,
    private readonly file: EpromFileService,
    private readonly reportPdf: EpromReportPdfService,
  ) {}

  async buatForm(
    aktor: AktorEprom,
    tipe: TipeProgress,
    projectId: number,
    formDataRaw: string,
    files: Express.Multer.File[] = [],
  ) {
    if (!['inspeksi-area', 'progress-harian', 'tta', 'kta'].includes(tipe)) {
      throw new BadRequestException('Form terstruktur tidak tersedia untuk tipe ini');
    }
    await this.akses.wajibAksesProject(aktor, projectId);
    this.wajibDalamJamUpload(aktor, tipe);
    let formData: any;
    try { formData = JSON.parse(formDataRaw); } catch { throw new BadRequestException('Data form tidak valid'); }
    if (tipe === 'progress-harian') {
      const dokumentasi = Array.isArray(formData.dokumentasi) ? formData.dokumentasi : [];
      const timWajib = ['Tim Sipil', 'Tim Baja', 'Tim MEP', 'Tim Arsitektur'];
      if (dokumentasi.length !== files.length) {
        throw new BadRequestException('Setiap dokumentasi Daily Report wajib memiliki satu foto');
      }
      for (const tim of timWajib) {
        const jumlah = dokumentasi.filter((item: any) => item?.tim === tim).length;
        if (jumlah > 10) {
          throw new BadRequestException(`${tim} maksimal memiliki 10 foto`);
        }
      }
      if (dokumentasi.some((item: any) => !timWajib.includes(item?.tim))) {
        throw new BadRequestException('Tim dokumentasi Daily Report tidak valid');
      }
    }
    if ((tipe === 'tta' || tipe === 'kta') && (!formData?.tanggalWaktu || !formData?.lokasi || !formData?.kategori || !formData?.temuan || !formData?.uraian || !formData?.risiko)) {
      throw new BadRequestException('Tanggal, lokasi, kategori, temuan, uraian, dan tingkat risiko wajib diisi');
    }
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { namaProject: true, kontrak: { select: { vendor: { select: { namaVendor: true } } } } },
    });
    if (!project) throw new NotFoundException('Project tidak ditemukan');
    const formSafety = tipe === 'tta' || tipe === 'kta';
    const fileUrls = formSafety
      ? files.map((item) => this.file.simpanDokumen(item, `project/${projectId}/progress/${tipe}`))
      : [];
    const pdf = formSafety
      ? null
      : tipe === 'progress-harian'
        ? await this.reportPdf.daily(formData, project, files)
        : await this.reportPdf.inspection(formData, project);
    const fileUrl = formSafety
      ? fileUrls[0] ?? null
      : this.file.simpanBuffer(
          pdf!,
          `${tipe}-${formData.tanggal || Date.now()}.pdf`,
          `project/${projectId}/progress/${tipe}`,
        );
    try {
      const dataForm = formSafety ? { ...formData, fileUrls } : formData;
      const data: Record<string, unknown> = { projectId, fileUrl, formData: dataForm };
      if (tipe === 'progress-harian') {
        data.uploadedAt = new Date();
        const tanggal = new Date(`${formData.tanggal}T12:00:00.000Z`);
        if (Number.isNaN(tanggal.getTime())) throw new BadRequestException('Tanggal laporan tidak valid');
        data.tanggal = tanggal;
      } else if (tipe === 'inspeksi-area') {
        data.uploadedAt = new Date();
      } else {
        const tanggal = new Date(formData.tanggalWaktu);
        if (Number.isNaN(tanggal.getTime())) throw new BadRequestException('Tanggal observasi tidak valid');
        data.tanggalUpload = tanggal;
        data.bulan = bulanDariTanggalWITA(tanggal);
      }
      return await this.delegate(tipe).create({ data });
    } catch (error) {
      fileUrls.forEach((path) => this.file.hapus(path));
      if (!formSafety && fileUrl) this.file.hapus(fileUrl);
      throw error;
    }
  }

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
    const vendor = this.akses.isVendor(aktor);
    const dalamJadwal = dalamJamWITA(jam);

    return {
      dibatasi: jam !== null,
      bukaSekarang: !vendor || dalamJadwal,
      dalamJadwal,
      bebasSebagaiOwner: owner && jam !== null && !dalamJadwal,
      jamBuka: jam?.buka ?? null,
      jamTutup: jam?.tutup ?? null,
    };
  }

  private wajibDalamJamUpload(aktor: AktorEprom, tipe: TipeProgress): void {
    const jam = JAM_WITA[tipe];
    if (this.akses.isVendor(aktor) && jam && !dalamJamWITA(jam)) {
      throw new BadRequestException(
        `Upload ${LABEL_TIPE[tipe]} untuk Vendor hanya dibuka pukul ${jam.buka}-${jam.tutup} WITA`,
      );
    }
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

    return items.map((item: { namaPekerjaan: string; mingguKe: number; planned: number | string; actual: number | string }) => {
      const deviasi = Math.round((Number(item.actual) - Number(item.planned)) * 100) / 100;
      return { ...item, mingguKe: nomorWeekLaporan(item.namaPekerjaan, item.mingguKe), deviasi, status: statusDeviasi(deviasi) };
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
    this.wajibDalamJamUpload(aktor, tipe);

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

    const tanggalDipilih = dto.tanggal ? new Date(`${dto.tanggal}T12:00:00.000Z`) : new Date();
    if (Number.isNaN(tanggalDipilih.getTime())) throw new BadRequestException('Tanggal upload tidak valid');

    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: { kontrak: { select: { tanggalMulai: true, tanggalSelesai: true } } },
    });
    if (!project?.kontrak?.tanggalMulai) {
      throw new BadRequestException('Tanggal mulai project belum tersedia');
    }

    if (tipe === 'progress-mingguan') {
      if (!project.kontrak.tanggalSelesai) {
        throw new BadRequestException('Tanggal selesai project belum tersedia');
      }
      if (dto.mingguKe === undefined) {
        throw new BadRequestException('Week laporan wajib dipilih');
      }
      const totalMinggu = jumlahMingguProyek(project.kontrak.tanggalMulai, project.kontrak.tanggalSelesai);
      if (dto.mingguKe > totalMinggu) {
        throw new BadRequestException(`Week laporan harus antara 1 sampai ${totalMinggu}`);
      }
    }

    const fileUrl = file
      ? this.file.simpanDokumen(file, `project/${projectId}/progress/${tipe}`)
      : null;

    const dataEkstra: Record<string, unknown> = {};
    // Waktu penilaian selalu memakai waktu unggah aktual. Tanggal laporan yang
    // dipilih pengguna disimpan pada field periodenya masing-masing.
    if (tipe !== 'tta' && tipe !== 'kta') dataEkstra.uploadedAt = new Date();
    if (tipe === 'progress-harian') {
      dataEkstra.tanggal = tanggalDipilih;
    } else if (tipe === 'progress-mingguan') {
      dataEkstra.namaPekerjaan = dto.namaPekerjaan!.trim();
      dataEkstra.mingguKe = dto.mingguKe;
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
    const formData = item.formData as { fileUrls?: unknown } | null | undefined;
    if (Array.isArray(formData?.fileUrls)) {
      formData.fileUrls
        .filter((path): path is string => typeof path === 'string' && path !== item.fileUrl)
        .forEach((path) => this.file.hapus(path));
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
    this.wajibDalamJamUpload(aktor, tipe);
    if (tipe === 'progress-mingguan') {
      if (!dto.namaPekerjaan?.trim()) throw new BadRequestException('Nama Pekerjaan wajib diisi');
      if (dto.planned === undefined || dto.actual === undefined) {
        throw new BadRequestException('Planned dan Actual wajib diisi');
      }
      if (dto.mingguKe === undefined) throw new BadRequestException('Week laporan wajib dipilih');

      const project = await this.prisma.project.findUnique({
        where: { id: item.projectId },
        select: { kontrak: { select: { tanggalMulai: true, tanggalSelesai: true } } },
      });
      if (!project?.kontrak?.tanggalMulai || !project.kontrak.tanggalSelesai) {
        throw new BadRequestException('Periode project belum lengkap');
      }
      const totalMinggu = jumlahMingguProyek(project.kontrak.tanggalMulai, project.kontrak.tanggalSelesai);
      if (dto.mingguKe > totalMinggu) {
        throw new BadRequestException(`Week laporan harus antara 1 sampai ${totalMinggu}`);
      }
    }
    const data: Record<string, unknown> = {};
    if (dto.tanggal) {
      const tanggalDipilih = new Date(`${dto.tanggal}T12:00:00.000Z`);
      if (Number.isNaN(tanggalDipilih.getTime())) throw new BadRequestException('Tanggal upload tidak valid');
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
      data.mingguKe = dto.mingguKe;
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

    if (baris.length === 0) {
      return null;
    }
    // Format "LAPORAN WEEK n" adalah snapshot kumulatif project.
    if (baris.every((b) => /^laporan\s+week\s+/i.test(b.namaPekerjaan))) {
      return Math.round(Number(baris[0].actual) * 10) / 10;
    }
    const terbaruPerPekerjaan = new Map<string, number>();
    for (const b of baris) if (!terbaruPerPekerjaan.has(b.namaPekerjaan)) terbaruPerPekerjaan.set(b.namaPekerjaan, Number(b.actual));
    return Math.round([...terbaruPerPekerjaan.values()].reduce((a, b) => a + b, 0) * 10) / 10;
  }

  /** Kurva-S per Week project. Semua project selalu mulai dari Week 1. */
  async trendMingguan(projectId: number) {
    const baris = await this.prisma.progressMingguan.findMany({
      where: { projectId },
      orderBy: [{ mingguKe: 'asc' }, { id: 'asc' }],
      select: { id: true, mingguKe: true, namaPekerjaan: true, planned: true, actual: true },
    });

    const perWeek = new Map<number, (typeof baris)[number]>();
    for (const item of baris) {
      perWeek.set(nomorWeekLaporan(item.namaPekerjaan, item.mingguKe), item);
    }
    return [...perWeek.entries()].sort(([a], [b]) => a - b).map(([week, snapshot]) => {
      const planned = Number(snapshot?.planned ?? 0);
      const actual = Number(snapshot?.actual ?? 0);
      return { bulan: `Week ${week}`, planned: Math.round(planned * 10) / 10, actual: Math.round(actual * 10) / 10, deviasi: Math.round((actual - planned) * 10) / 10 };
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
      const deviasi = Math.round((Number(item.actual) - Number(item.planned)) * 100) / 100;
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
