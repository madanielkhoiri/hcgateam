// ==================================================
// FILE: backend/src/tiket/tiket.service.ts
// FUNGSI: Kirim tiket cuti (admin GA) & riwayat cuti karyawan (self-service)
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TiketFileService } from './tiket-file.service';
import { BuatTiketDto } from './dto/tiket.dto';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Injectable()
export class TiketService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly file: TiketFileService,
    private readonly whatsapp: WhatsappService,
  ) {}

  /** Daftar ringkas karyawan aktif untuk dropdown pencarian di form admin. */
  async karyawanRingkas(search?: string) {
    return this.prisma.karyawan.findMany({
      where: {
        statusKerja: 'AKTIF',
        ...(search?.trim()
          ? {
              OR: [
                { nama: { contains: search.trim(), mode: 'insensitive' } },
                { nik: { contains: search.trim(), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        nama: true,
        nik: true,
        departemen: { select: { namaDepartemen: true } },
      },
      orderBy: { nama: 'asc' },
      take: 20,
    });
  }

  async daftarAdmin() {
    return this.prisma.transportTiket.findMany({
      include: {
        karyawan: {
          select: { id: true, nama: true, nik: true, departemen: { select: { namaDepartemen: true } } },
        },
        pengirim: { select: { id: true, name: true } },
        files: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async kirim(dto: BuatTiketDto, files: Express.Multer.File[] = [], aktorId: number) {
    const karyawan = await this.prisma.karyawan.findUnique({
      where: { id: dto.karyawanId },
      include: { akun: { select: { phoneNumber: true } } },
    });

    if (!karyawan) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    const mulai = new Date(`${dto.tanggalMulai}T00:00:00.000Z`);
    const selesai = new Date(`${dto.tanggalSelesai}T00:00:00.000Z`);

    if (Number.isNaN(mulai.getTime()) || Number.isNaN(selesai.getTime())) {
      throw new BadRequestException('Format tanggal tidak valid');
    }

    if (selesai < mulai) {
      throw new BadRequestException('Tanggal selesai cuti tidak boleh sebelum tanggal mulai');
    }

    if (files.length === 0) {
      throw new BadRequestException('Minimal 1 file tiket wajib diunggah');
    }

    const disimpan = files.map((f) => this.file.simpan(f, karyawan.id));

    try {
      const tiket = await this.prisma.transportTiket.create({
        data: {
          karyawanId: karyawan.id,
          tanggalMulai: mulai,
          tanggalSelesai: selesai,
          keterangan: dto.keterangan?.trim() || null,
          createdBy: aktorId,
          files: { create: disimpan },
        },
        include: { karyawan: true, files: true },
      });

      await this.notifikasiTiketBaru(karyawan, mulai, selesai);

      return tiket;
    } catch (error) {
      disimpan.forEach((item) => this.file.hapus(item.fileUrl));
      throw error;
    }
  }

  /** Notifikasi WA ke akun karyawan penerima tiket, pakai nomor dari data akunnya. */
  private async notifikasiTiketBaru(
    karyawan: { nama: string; noTelepon: string | null; akun: { phoneNumber: string | null } | null },
    mulai: Date,
    selesai: Date,
  ) {
    if (!this.whatsapp.aktif) {
      return;
    }

    const nomor = karyawan.akun?.phoneNumber || karyawan.noTelepon;

    if (!nomor) {
      return;
    }

    const formatTanggal = (tanggal: Date) =>
      tanggal.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

    const pesan =
      `Halo ${karyawan.nama}, ada tiket cuti baru untuk Anda periode ${formatTanggal(mulai)} - ${formatTanggal(selesai)}. ` +
      `Silakan download filenya di Portal HCGA TEAM ya.`;

    await this.whatsapp.kirim(nomor, pesan);
  }

  async hapus(id: number) {
    const tiket = await this.prisma.transportTiket.findUnique({
      where: { id },
      include: { files: true },
    });

    if (!tiket) {
      throw new NotFoundException('Tiket tidak ditemukan');
    }

    await this.prisma.transportTiket.delete({ where: { id } });
    tiket.files.forEach((f) => this.file.hapus(f.fileUrl));

    return { message: 'Tiket berhasil dihapus' };
  }

  /**
   * Resolve Karyawan milik akun ini. Kalau belum pernah ditautkan, coba
   * otomatis tautkan lewat username akun (dipakai sebagai NRP/NIK di
   * sistem ini) yang cocok dengan NIK Karyawan — supaya karyawan tidak
   * perlu ketik ulang NRP-nya secara manual kalau datanya sudah cocok.
   */
  private async karyawanSayaOtomatis(aktorId: number) {
    const tertaut = await this.prisma.karyawan.findUnique({ where: { akunId: aktorId } });

    if (tertaut) {
      return tertaut;
    }

    const akun = await this.prisma.user.findUnique({
      where: { id: aktorId },
      select: { nrp: true, username: true },
    });

    const kandidatNik = akun?.nrp?.trim() || akun?.username?.trim();

    if (!kandidatNik) {
      return null;
    }

    const karyawan = await this.prisma.karyawan.findUnique({ where: { nik: kandidatNik } });

    if (!karyawan || karyawan.akunId) {
      return null;
    }

    return this.prisma.karyawan.update({ where: { id: karyawan.id }, data: { akunId: aktorId } });
  }

  /** Riwayat cuti milik karyawan yang sedang login (resolve lewat Karyawan.akunId). */
  async daftarSaya(aktorId: number) {
    const karyawan = await this.karyawanSayaOtomatis(aktorId);

    if (!karyawan) {
      return [];
    }

    return this.prisma.transportTiket.findMany({
      where: { karyawanId: karyawan.id },
      include: { files: true },
      orderBy: { tanggalMulai: 'desc' },
    });
  }

  /**
   * Data Karyawan yang tertaut ke akun ini (auto-tautkan dulu bila cocok),
   * atau null bila memang belum ada NIK yang cocok dengan akun ini.
   */
  async profilSaya(aktorId: number) {
    const karyawan = await this.karyawanSayaOtomatis(aktorId);

    if (!karyawan) {
      return null;
    }

    return this.prisma.karyawan.findUnique({
      where: { id: karyawan.id },
      select: { id: true, nik: true, nama: true, departemen: { select: { namaDepartemen: true } } },
    });
  }

  /**
   * Karyawan menautkan akun login-nya sendiri ke satu row Karyawan HC lewat
   * NIK (sekali saja, saat akunnya belum tertaut ke Karyawan manapun) —
   * dipakai self-service Tiket & Travel karena belum ada halaman admin
   * manapun yang bisa menautkan Karyawan.akunId.
   */
  async tautkanNik(aktorId: number, nikMentah: string) {
    const nik = nikMentah.trim();

    if (!nik) {
      throw new BadRequestException('NRP wajib diisi');
    }

    const sudahTertaut = await this.prisma.karyawan.findUnique({ where: { akunId: aktorId } });

    if (sudahTertaut) {
      throw new BadRequestException('Akun ini sudah tertaut ke data Karyawan');
    }

    const karyawan = await this.prisma.karyawan.findUnique({ where: { nik } });

    if (!karyawan) {
      throw new NotFoundException('NRP tidak ditemukan di database Karyawan');
    }

    if (karyawan.akunId) {
      throw new BadRequestException('NRP ini sudah ditautkan ke akun lain');
    }

    return this.prisma.karyawan.update({
      where: { id: karyawan.id },
      data: { akunId: aktorId },
      select: { id: true, nik: true, nama: true, departemen: { select: { namaDepartemen: true } } },
    });
  }
}
