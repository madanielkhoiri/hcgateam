// ==================================================
// FILE: backend/src/tiket/tiket.service.ts
// FUNGSI: Kirim tiket cuti (admin GA) & riwayat cuti karyawan (self-service)
// ==================================================

import { JenisTiket } from '@prisma/client';
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TiketFileService } from './tiket-file.service';
import { BuatTiketDto, RescheduleTiketDto } from './dto/tiket.dto';
import { WhatsappService } from '../whatsapp/whatsapp.service';

const formatTanggal = (tanggal: Date) =>
  tanggal.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });

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

    const perluBerangkat = dto.jenisTiket !== JenisTiket.PULANG_SAJA;
    const perluPulang = dto.jenisTiket !== JenisTiket.BERANGKAT_SAJA;

    if (perluBerangkat && (!dto.tanggalMulai || !dto.jamMulai)) {
      throw new BadRequestException('Tanggal & jam keberangkatan wajib diisi');
    }

    if (perluPulang && (!dto.tanggalSelesai || !dto.jamSelesai)) {
      throw new BadRequestException('Tanggal & jam kepulangan wajib diisi');
    }

    const mulai = perluBerangkat ? new Date(`${dto.tanggalMulai}T00:00:00.000Z`) : null;
    const selesai = perluPulang ? new Date(`${dto.tanggalSelesai}T00:00:00.000Z`) : null;

    if ((mulai && Number.isNaN(mulai.getTime())) || (selesai && Number.isNaN(selesai.getTime()))) {
      throw new BadRequestException('Format tanggal tidak valid');
    }

    if (mulai && selesai && selesai < mulai) {
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
          jenisTiket: dto.jenisTiket,
          tanggalMulai: mulai,
          jamMulai: perluBerangkat ? dto.jamMulai ?? null : null,
          tanggalSelesai: selesai,
          jamSelesai: perluPulang ? dto.jamSelesai ?? null : null,
          keterangan: dto.keterangan?.trim() || null,
          createdBy: aktorId,
          files: { create: disimpan },
        },
        include: { karyawan: true, files: true },
      });

      await this.notifikasiTiketBaru(karyawan, tiket);

      return tiket;
    } catch (error) {
      disimpan.forEach((item) => this.file.hapus(item.fileUrl));
      throw error;
    }
  }

  /** Notifikasi WA ke akun karyawan penerima tiket, pakai nomor dari data akunnya. */
  private async notifikasiTiketBaru(
    karyawan: { nama: string; noTelepon: string | null; akun: { phoneNumber: string | null } | null },
    tiket: {
      jenisTiket: JenisTiket;
      tanggalMulai: Date | null;
      jamMulai: string | null;
      tanggalSelesai: Date | null;
      jamSelesai: string | null;
    },
  ) {
    if (!this.whatsapp.aktif) {
      return;
    }

    const nomor = karyawan.akun?.phoneNumber || karyawan.noTelepon;

    if (!nomor) {
      return;
    }

    const bagian: string[] = [];

    if (tiket.tanggalMulai && tiket.jamMulai) {
      bagian.push(`Berangkat ${formatTanggal(tiket.tanggalMulai)} pukul ${tiket.jamMulai} WITA`);
    }

    if (tiket.tanggalSelesai && tiket.jamSelesai) {
      bagian.push(`Pulang ${formatTanggal(tiket.tanggalSelesai)} pukul ${tiket.jamSelesai} WITA`);
    }

    const keteranganMenyusul =
      tiket.jenisTiket !== JenisTiket.PULANG_PERGI ? ' Jadwal satu arah lagi menyusul dikonfirmasi kemudian.' : '';

    const pesan =
      `Halo ${karyawan.nama}, ada tiket dinas baru untuk Anda: ${bagian.join(', ')}.${keteranganMenyusul} ` +
      `Silakan download filenya di Portal HCGA TEAM ya.`;

    await this.whatsapp.kirim(nomor, pesan);
  }

  /**
   * Perubahan jadwal dadakan dari penerbangan (delay, cuaca buruk, dsb.) —
   * BUKAN hapus-lalu-buat-ulang seperti sebelumnya (itu bikin karyawan
   * dapat 2 notifikasi WA yang membingungkan, tanpa keterangan apa yang
   * berubah). Tanggal lama tetap tercatat di histori lewat pesan WA,
   * file lama TIDAK dihapus (file baru cuma ditambahkan) supaya jejak
   * tiket asli tetap ada untuk audit.
   */
  async reschedule(id: number, dto: RescheduleTiketDto, fileBaru: Express.Multer.File | undefined) {
    const tiket = await this.prisma.transportTiket.findUnique({
      where: { id },
      include: {
        karyawan: { include: { akun: { select: { phoneNumber: true } } } },
        files: true,
      },
    });

    if (!tiket) {
      throw new NotFoundException('Tiket tidak ditemukan');
    }

    const ubahBerangkat = Boolean(dto.tanggalMulai || dto.jamMulai);
    const ubahPulang = Boolean(dto.tanggalSelesai || dto.jamSelesai);

    if (!ubahBerangkat && !ubahPulang) {
      throw new BadRequestException('Isi minimal jadwal keberangkatan atau kepulangan yang berubah');
    }

    if (ubahBerangkat && (!dto.tanggalMulai || !dto.jamMulai)) {
      throw new BadRequestException('Tanggal & jam keberangkatan baru wajib diisi bersamaan');
    }

    if (ubahPulang && (!dto.tanggalSelesai || !dto.jamSelesai)) {
      throw new BadRequestException('Tanggal & jam kepulangan baru wajib diisi bersamaan');
    }

    const mulaiBaru = ubahBerangkat ? new Date(`${dto.tanggalMulai}T00:00:00.000Z`) : tiket.tanggalMulai;
    const selesaiBaru = ubahPulang ? new Date(`${dto.tanggalSelesai}T00:00:00.000Z`) : tiket.tanggalSelesai;

    if (ubahBerangkat && Number.isNaN(mulaiBaru!.getTime())) {
      throw new BadRequestException('Format tanggal keberangkatan tidak valid');
    }

    if (ubahPulang && Number.isNaN(selesaiBaru!.getTime())) {
      throw new BadRequestException('Format tanggal kepulangan tidak valid');
    }

    if (mulaiBaru && selesaiBaru && selesaiBaru < mulaiBaru) {
      throw new BadRequestException('Tanggal kepulangan tidak boleh sebelum tanggal keberangkatan');
    }

    const mulaiLama = tiket.tanggalMulai;
    const jamMulaiLama = tiket.jamMulai;
    const selesaiLama = tiket.tanggalSelesai;
    const jamSelesaiLama = tiket.jamSelesai;

    const jamMulaiBaru = ubahBerangkat ? dto.jamMulai! : tiket.jamMulai;
    const jamSelesaiBaru = ubahPulang ? dto.jamSelesai! : tiket.jamSelesai;

    const jenisBaru: JenisTiket =
      mulaiBaru && jamMulaiBaru && selesaiBaru && jamSelesaiBaru
        ? JenisTiket.PULANG_PERGI
        : mulaiBaru && jamMulaiBaru
          ? JenisTiket.BERANGKAT_SAJA
          : JenisTiket.PULANG_SAJA;

    const fileTersimpan = fileBaru ? this.file.simpan(fileBaru, tiket.karyawanId) : null;

    try {
      const hasil = await this.prisma.transportTiket.update({
        where: { id },
        data: {
          jenisTiket: jenisBaru,
          tanggalMulai: mulaiBaru,
          jamMulai: jamMulaiBaru,
          tanggalSelesai: selesaiBaru,
          jamSelesai: jamSelesaiBaru,
          keterangan: dto.alasan?.trim()
            ? `${tiket.keterangan ? `${tiket.keterangan}\n` : ''}Reschedule: ${dto.alasan.trim()}`
            : tiket.keterangan,
          ...(fileTersimpan ? { files: { create: fileTersimpan } } : {}),
        },
        include: { karyawan: true, files: true },
      });

      // Lampiran WA: file baru kalau ada, kalau tidak pakai file pertama yang sudah ada.
      const fileUntukLampiran = fileTersimpan ?? tiket.files[0] ?? null;

      await this.notifikasiReschedule(
        tiket.karyawan,
        {
          ubahBerangkat,
          ubahPulang,
          mulaiLama,
          jamMulaiLama,
          selesaiLama,
          jamSelesaiLama,
          mulaiBaru,
          jamMulaiBaru,
          selesaiBaru,
          jamSelesaiBaru,
        },
        dto.alasan,
        fileUntukLampiran,
      );

      return hasil;
    } catch (error) {
      if (fileTersimpan) {
        this.file.hapus(fileTersimpan.fileUrl);
      }
      throw error;
    }
  }

  /** Notifikasi WA khusus reschedule — beda dari tiket baru, sebut jelas jadwal lama & baru (atau konfirmasi baru) + lampirkan e-tiket terbaru. */
  private async notifikasiReschedule(
    karyawan: { nama: string; noTelepon: string | null; akun: { phoneNumber: string | null } | null },
    perubahan: {
      ubahBerangkat: boolean;
      ubahPulang: boolean;
      mulaiLama: Date | null;
      jamMulaiLama: string | null;
      selesaiLama: Date | null;
      jamSelesaiLama: string | null;
      mulaiBaru: Date | null;
      jamMulaiBaru: string | null;
      selesaiBaru: Date | null;
      jamSelesaiBaru: string | null;
    },
    alasan: string | undefined,
    fileLampiran: { fileUrl: string; namaFile: string } | null,
  ) {
    if (!this.whatsapp.aktif) {
      return;
    }

    const nomor = karyawan.akun?.phoneNumber || karyawan.noTelepon;

    if (!nomor) {
      return;
    }

    const barisPerubahan = (
      lama: Date | null,
      jamLama: string | null,
      baru: Date | null,
      jamBaru: string | null,
      label: string,
    ): string | null => {
      if (!baru || !jamBaru) return null;

      if (lama && jamLama) {
        return `Jadwal ${label} berubah: dari ${formatTanggal(lama)} pukul ${jamLama} WITA menjadi ${formatTanggal(baru)} pukul ${jamBaru} WITA`;
      }

      return `Jadwal ${label} sudah dikonfirmasi: ${formatTanggal(baru)} pukul ${jamBaru} WITA`;
    };

    const bagian = [
      perubahan.ubahBerangkat
        ? barisPerubahan(perubahan.mulaiLama, perubahan.jamMulaiLama, perubahan.mulaiBaru, perubahan.jamMulaiBaru, 'KEBERANGKATAN')
        : null,
      perubahan.ubahPulang
        ? barisPerubahan(perubahan.selesaiLama, perubahan.jamSelesaiLama, perubahan.selesaiBaru, perubahan.jamSelesaiBaru, 'KEPULANGAN')
        : null,
    ].filter((item): item is string => Boolean(item));

    const pesan =
      `Halo ${karyawan.nama}, ada perubahan jadwal tiket dinas Anda` +
      `${alasan?.trim() ? ` (${alasan.trim()})` : ''}. ` +
      `${bagian.join('. ')}. Mohon perhatikan perubahan ini.`;

    const urlLampiran = fileLampiran ? this.whatsapp.urlPublikLampiran(fileLampiran.fileUrl) : null;

    await this.whatsapp.kirim(
      nomor,
      urlLampiran ? pesan : `${pesan} Silakan cek e-tiket terbaru di Portal HCGA TEAM.`,
      urlLampiran && fileLampiran ? { url: urlLampiran, namaFile: fileLampiran.namaFile } : undefined,
    );
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
