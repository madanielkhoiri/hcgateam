// ==================================================
// FILE: backend/src/mcu/hasil/mcu-hasil.service.ts
// FUNGSI: Upload & pengelolaan hasil MCU mentah
// Referensi: Bagian 4.4 & 4.12 alur-workflow-mcu-periodik-v3.md
// File mentah hanya dapat diakses HC & Dokter.
// ==================================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  StatusPendaftaran,
  StatusReview,
  TipeNotifikasiMcu,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { McuAksesService } from '../common/mcu-akses.service';
import { AktorMcu } from '../common/mcu-aktor';
import { McuFileService } from '../common/mcu-file.service';
import { BULAN_RETENSI_DOKUMEN } from '../mcu.constants';
import { hariIni, tambahBulan } from '../mcu-date.util';
import { McuNotifikasiService } from '../notifikasi/mcu-notifikasi.service';

const HASIL_INCLUDE = {
  jadwalMcu: {
    include: {
      karyawan: {
        select: { id: true, nik: true, nama: true, akunId: true, email: true },
      },
      departemen: { select: { id: true, namaDepartemen: true } },
      klinik: { select: { id: true, namaKlinik: true, terkoneksi: true } },
    },
  },
  diunggahOleh: { select: { id: true, name: true } },
  rekomendasi: {
    select: {
      id: true,
      status: true,
      tanggalSubmit: true,
      siklusKe: true,
      dokter: { select: { id: true, name: true } },
    },
    orderBy: { tanggalSubmit: 'desc' },
  },
} satisfies Prisma.HasilMcuInclude;

@Injectable()
export class McuHasilService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: McuAksesService,
    private readonly berkas: McuFileService,
    private readonly notifikasi: McuNotifikasiService,
  ) {}

  /** Daftar hasil MCU; metadata boleh dilihat HC, Dokter, dan Admin Dept. */
  async daftar(filter: { statusReview?: StatusReview; karyawanId?: number }) {
    return this.prisma.hasilMcu.findMany({
      where: {
        ...(filter.statusReview ? { statusReview: filter.statusReview } : {}),
        ...(filter.karyawanId
          ? { jadwalMcu: { karyawanId: filter.karyawanId } }
          : {}),
      },
      include: HASIL_INCLUDE,
      orderBy: { tanggalUpload: 'desc' },
    });
  }

  /** Jadwal yang sudah terlaksana tetapi hasilnya belum diupload. */
  async jadwalMenungguHasil() {
    return this.prisma.jadwalMcu.findMany({
      where: {
        hasilMcu: null,
        statusPendaftaran: {
          in: [StatusPendaftaran.DRAFT, StatusPendaftaran.TERKUNCI],
        },
        tanggalMcu: { lte: hariIni() },
      },
      include: {
        karyawan: { select: { id: true, nik: true, nama: true } },
        departemen: { select: { id: true, namaDepartemen: true } },
        klinik: { select: { id: true, namaKlinik: true, terkoneksi: true } },
      },
      orderBy: { tanggalMcu: 'asc' },
    });
  }

  async detail(id: number) {
    const hasil = await this.prisma.hasilMcu.findUnique({
      where: { id },
      include: HASIL_INCLUDE,
    });

    if (!hasil) {
      throw new NotFoundException('Hasil MCU tidak ditemukan');
    }

    return hasil;
  }

  /**
   * Upload hasil MCU oleh Klinik terkoneksi atau HC.
   * Retensi file dihitung 6 bulan sejak tanggal upload.
   */
  async unggah(jadwalId: number, file: Express.Multer.File, aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, UserRole.HC, UserRole.KLINIK);

    const jadwal = await this.prisma.jadwalMcu.findUnique({
      where: { id: jadwalId },
      include: { karyawan: true, klinik: true, hasilMcu: true },
    });

    if (!jadwal) {
      throw new NotFoundException('Jadwal MCU tidak ditemukan');
    }

    if (jadwal.hasilMcu) {
      throw new BadRequestException(
        'Hasil MCU untuk jadwal ini sudah diupload',
      );
    }

    if (jadwal.statusPendaftaran === StatusPendaftaran.DIBATALKAN) {
      throw new BadRequestException('Jadwal MCU sudah dibatalkan');
    }

    // Klinik hanya boleh mengupload hasil untuk jadwal miliknya sendiri.
    const peran = this.akses.peranAktor(aktor);

    if (!peran.includes(UserRole.HC) && peran.includes(UserRole.KLINIK)) {
      const klinik = await this.akses.klinikDariAkun(aktor);

      if (!klinik || klinik.id !== jadwal.klinikId) {
        throw new ForbiddenException(
          'Klinik hanya dapat mengupload hasil MCU miliknya sendiri',
        );
      }
    }

    const path = this.berkas.simpan(file, 'hasil-mcu');
    const tanggalUpload = new Date();

    const hasil = await this.prisma.$transaction(async (tx) => {
      const dibuat = await tx.hasilMcu.create({
        data: {
          jadwalMcuId: jadwal.id,
          tanggalUpload,
          diunggahOlehId: aktor.id,
          tipePengunggah: this.akses.tipePengunggah(aktor),
          fileHasilMcu: path,
          namaFileAsli: file.originalname ?? null,
          statusReview: StatusReview.MENUNGGU,
          retensiHapusAt: tambahBulan(tanggalUpload, BULAN_RETENSI_DOKUMEN),
        },
        include: HASIL_INCLUDE,
      });

      await tx.jadwalMcu.update({
        where: { id: jadwal.id },
        data: { statusPendaftaran: StatusPendaftaran.SELESAI },
      });

      return dibuat;
    });

    // Dokter menerima notifikasi untuk mulai review.
    await this.notifikasi.kirimBanyak(
      await this.notifikasi.untukPeran(UserRole.DOKTER, {
        tipe: TipeNotifikasiMcu.JADWAL_MCU,
        refTabel: 'hasil_mcu',
        refId: hasil.id,
        judul: `Hasil MCU siap direview: ${jadwal.karyawan.nama}`,
        pesan:
          `Hasil MCU atas nama ${jadwal.karyawan.nama} (NIK ${jadwal.karyawan.nik}) ` +
          'telah diupload dan menunggu review Dokter.',
      }),
    );

    return hasil;
  }

  /** Buka file mentah - dibatasi untuk HC dan Dokter. */
  async pathFile(id: number, aktor: AktorMcu) {
    this.akses.wajibBolehLihatFileMedis(aktor);

    const hasil = await this.detail(id);

    if (hasil.fileDihapusAt) {
      throw new NotFoundException(
        'File sudah dihapus sesuai kebijakan retensi 6 bulan',
      );
    }

    return this.berkas.resolveAbsolut(hasil.fileHasilMcu);
  }

  /** Dokter menandai hasil sedang direview. */
  async tandaiDireview(id: number, aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, UserRole.DOKTER, UserRole.HC);

    await this.detail(id);

    return this.prisma.hasilMcu.update({
      where: { id },
      data: { statusReview: StatusReview.DIREVIEW },
      include: HASIL_INCLUDE,
    });
  }
}
