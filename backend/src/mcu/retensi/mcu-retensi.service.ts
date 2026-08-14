// ==================================================
// FILE: backend/src/mcu/retensi/mcu-retensi.service.ts
// FUNGSI: Retensi dokumen medis 6 bulan sejak tanggal upload
// Referensi: Bagian 4.12 alur-workflow-mcu-periodik-v3.md
// Metadata tetap tersimpan untuk audit meski file fisik dihapus.
// ==================================================

import { Injectable, Logger } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { McuAksesService } from '../common/mcu-akses.service';
import { AktorMcu } from '../common/mcu-aktor';
import { McuFileService } from '../common/mcu-file.service';
import { hariIni, selisihHari } from '../mcu-date.util';

@Injectable()
export class McuRetensiService {
  private readonly logger = new Logger(McuRetensiService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: McuAksesService,
    private readonly berkas: McuFileService,
  ) {}

  /** Dokumen yang sudah/hampir jatuh tempo retensi. */
  async daftarDokumen(hariKeDepan = 30) {
    const batas = hariIni();
    batas.setUTCDate(batas.getUTCDate() + hariKeDepan);

    const [hasilMcu, hasilFu, rekomendasi] = await Promise.all([
      this.prisma.hasilMcu.findMany({
        where: { fileDihapusAt: null, retensiHapusAt: { lte: batas } },
        include: {
          jadwalMcu: {
            select: {
              tanggalMcu: true,
              karyawan: { select: { id: true, nik: true, nama: true } },
            },
          },
        },
        orderBy: { retensiHapusAt: 'asc' },
      }),
      this.prisma.hasilFollowUp.findMany({
        where: { fileDihapusAt: null, retensiHapusAt: { lte: batas } },
        include: {
          followUp: {
            select: {
              siklusKe: true,
              karyawan: { select: { id: true, nik: true, nama: true } },
            },
          },
        },
        orderBy: { retensiHapusAt: 'asc' },
      }),
      this.prisma.rekomendasiMcu.findMany({
        where: {
          fileDihapusAt: null,
          retensiHapusAt: { lte: batas },
          OR: [
            { filePdfRekomendasi: { not: null } },
            { suratRujukanFu: { not: null } },
          ],
        },
        include: {
          hasilMcu: {
            select: {
              jadwalMcu: {
                select: {
                  karyawan: { select: { id: true, nik: true, nama: true } },
                },
              },
            },
          },
        },
        orderBy: { retensiHapusAt: 'asc' },
      }),
    ]);

    const acuan = hariIni();

    return {
      hasilMcu: hasilMcu.map((item) => ({
        id: item.id,
        jenis: 'Hasil MCU',
        namaFileAsli: item.namaFileAsli,
        tanggalUpload: item.tanggalUpload,
        retensiHapusAt: item.retensiHapusAt,
        sisaHari: selisihHari(acuan, item.retensiHapusAt),
        karyawan: item.jadwalMcu.karyawan,
      })),
      hasilFollowUp: hasilFu.map((item) => ({
        id: item.id,
        jenis: 'Hasil Follow Up',
        namaFileAsli: item.namaFileAsli,
        tanggalUpload: item.tanggalSubmit,
        retensiHapusAt: item.retensiHapusAt,
        sisaHari: selisihHari(acuan, item.retensiHapusAt),
        karyawan: item.followUp.karyawan,
      })),
      rekomendasi: rekomendasi.map((item) => ({
        id: item.id,
        jenis: 'Rekomendasi & Surat Rujukan',
        namaFileAsli: null,
        tanggalUpload: item.tanggalSubmit,
        retensiHapusAt: item.retensiHapusAt,
        sisaHari: selisihHari(acuan, item.retensiHapusAt),
        karyawan: item.hasilMcu.jadwalMcu.karyawan,
      })),
    };
  }

  async ringkasan() {
    const acuan = hariIni();

    const [mcuJatuhTempo, fuJatuhTempo, rekomJatuhTempo, sudahDihapus] =
      await Promise.all([
        this.prisma.hasilMcu.count({
          where: { fileDihapusAt: null, retensiHapusAt: { lte: acuan } },
        }),
        this.prisma.hasilFollowUp.count({
          where: { fileDihapusAt: null, retensiHapusAt: { lte: acuan } },
        }),
        this.prisma.rekomendasiMcu.count({
          where: { fileDihapusAt: null, retensiHapusAt: { lte: acuan } },
        }),
        this.prisma.hasilMcu.count({ where: { fileDihapusAt: { not: null } } }),
      ]);

    return {
      jatuhTempoHasilMcu: mcuJatuhTempo,
      jatuhTempoHasilFollowUp: fuJatuhTempo,
      jatuhTempoRekomendasi: rekomJatuhTempo,
      totalJatuhTempo: mcuJatuhTempo + fuJatuhTempo + rekomJatuhTempo,
      hasilMcuSudahDihapus: sudahDihapus,
    };
  }

  /**
   * Hapus fisik seluruh dokumen yang sudah lewat masa retensi.
   * Metadata (status FIT/FU, tanggal, siklus) tetap utuh di History.
   */
  async jalankanPembersihan(aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, UserRole.HC);

    const acuan = hariIni();
    const sekarang = new Date();
    let fileDihapus = 0;

    const hasilMcu = await this.prisma.hasilMcu.findMany({
      where: { fileDihapusAt: null, retensiHapusAt: { lte: acuan } },
      select: { id: true, fileHasilMcu: true },
    });

    for (const item of hasilMcu) {
      if (this.berkas.hapus(item.fileHasilMcu)) {
        fileDihapus += 1;
      }

      await this.prisma.hasilMcu.update({
        where: { id: item.id },
        data: { fileDihapusAt: sekarang },
      });
    }

    const hasilFu = await this.prisma.hasilFollowUp.findMany({
      where: { fileDihapusAt: null, retensiHapusAt: { lte: acuan } },
      select: { id: true, fileHasilFu: true },
    });

    for (const item of hasilFu) {
      if (this.berkas.hapus(item.fileHasilFu)) {
        fileDihapus += 1;
      }

      await this.prisma.hasilFollowUp.update({
        where: { id: item.id },
        data: { fileDihapusAt: sekarang },
      });
    }

    const rekomendasi = await this.prisma.rekomendasiMcu.findMany({
      where: { fileDihapusAt: null, retensiHapusAt: { lte: acuan } },
      select: { id: true, filePdfRekomendasi: true, suratRujukanFu: true },
    });

    for (const item of rekomendasi) {
      fileDihapus += this.berkas.hapusBanyak([
        item.filePdfRekomendasi,
        item.suratRujukanFu,
      ]);

      await this.prisma.rekomendasiMcu.update({
        where: { id: item.id },
        data: { fileDihapusAt: sekarang },
      });
    }

    const total = hasilMcu.length + hasilFu.length + rekomendasi.length;

    this.logger.log(
      `Retensi MCU: ${total} dokumen ditandai terhapus, ${fileDihapus} file dihapus fisik`,
    );

    return {
      dokumenDiproses: total,
      fileDihapus,
      hasilMcu: hasilMcu.length,
      hasilFollowUp: hasilFu.length,
      rekomendasi: rekomendasi.length,
    };
  }
}
