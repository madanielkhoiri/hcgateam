// ==================================================
// FILE: backend/src/mcu/follow-up/mcu-follow-up.service.ts
// FUNGSI: Siklus Follow Up sampai FIT tanpa dead-end
// Referensi: Bagian 4.7 alur-workflow-mcu-periodik-v3.md
// Aturan: biaya selalu mandiri, batas waktu manual oleh HC,
// maksimal 2 bulan setelah MCU ulang, dan bila terlewat HC
// me-reminder Admin Dept untuk penjadwalan FU ulang.
// ==================================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IsDateString, IsInt, IsOptional, IsString } from 'class-validator';
import {
  Prisma,
  StatusFollowUp,
  StatusReview,
  TipeNotifikasiMcu,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { McuAksesService } from '../common/mcu-akses.service';
import { AktorMcu } from '../common/mcu-aktor';
import { McuFileService } from '../common/mcu-file.service';
import { BULAN_MAKS_SIKLUS_FU, BULAN_RETENSI_DOKUMEN } from '../mcu.constants';
import {
  formatTanggalIndonesia,
  hariIni,
  selisihHari,
  tambahBulan,
  tanggalSaja,
} from '../mcu-date.util';
import { McuNotifikasiService } from '../notifikasi/mcu-notifikasi.service';

// ==================================================
// DTO
// ==================================================

export class TetapkanBatasFuDto {
  @IsDateString()
  batasWaktuFu: string;

  @IsOptional()
  @IsInt()
  klinikId?: number;
}

export class PilihTanggalFuDto {
  @IsDateString()
  tanggalPilihanKaryawan: string;

  @IsOptional()
  @IsInt()
  klinikId?: number;
}

export class ReminderFuDto {
  @IsOptional()
  @IsString()
  catatan?: string;
}

const FU_INCLUDE = {
  karyawan: {
    select: {
      id: true,
      nik: true,
      nama: true,
      email: true,
      akunId: true,
      departemenId: true,
      departemen: {
        select: {
          id: true,
          namaDepartemen: true,
          adminAkunId: true,
          adminAkun: { select: { id: true, email: true } },
        },
      },
    },
  },
  rekomendasi: {
    select: {
      id: true,
      status: true,
      siklusKe: true,
      tanggalSubmit: true,
      suratRujukanFu: true,
      nomorSuratRujukan: true,
      catatanMedisTerbatas: true,
      hasilMcu: {
        select: {
          id: true,
          jadwalMcu: { select: { id: true, tanggalMcu: true, jenisMcu: true } },
        },
      },
    },
  },
  klinik: { select: { id: true, namaKlinik: true, terkoneksi: true } },
  ditetapkanOleh: { select: { id: true, name: true } },
  hasilFollowUp: {
    select: {
      id: true,
      tanggalSubmit: true,
      statusReview: true,
      tipePengunggah: true,
      namaFileAsli: true,
      rekomendasiBaru: { select: { id: true, status: true } },
    },
    orderBy: { tanggalSubmit: 'desc' },
  },
} satisfies Prisma.FollowUpInclude;

@Injectable()
export class McuFollowUpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: McuAksesService,
    private readonly berkas: McuFileService,
    private readonly notifikasi: McuNotifikasiService,
  ) {}

  async daftar(filter: {
    status?: StatusFollowUp;
    karyawanId?: number;
    terlambat?: boolean;
  }) {
    const daftar = await this.prisma.followUp.findMany({
      where: {
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.karyawanId ? { karyawanId: filter.karyawanId } : {}),
        ...(filter.terlambat
          ? {
              batasWaktuFu: { not: null, lt: hariIni() },
              status: {
                notIn: [StatusFollowUp.SELESAI, StatusFollowUp.TERLAKSANA],
              },
            }
          : {}),
      },
      include: FU_INCLUDE,
      orderBy: [{ batasWaktuFu: 'asc' }, { id: 'desc' }],
    });

    return daftar.map((item) => this.lengkapiStatusBatas(item));
  }

  async detail(id: number) {
    const followUp = await this.prisma.followUp.findUnique({
      where: { id },
      include: FU_INCLUDE,
    });

    if (!followUp) {
      throw new NotFoundException('Data Follow Up tidak ditemukan');
    }

    return this.lengkapiStatusBatas(followUp);
  }

  /** Follow Up milik akun karyawan yang sedang login. */
  async followUpSaya(aktor: AktorMcu) {
    const karyawan = await this.akses.karyawanDariAkun(aktor);

    if (!karyawan) {
      throw new NotFoundException(
        'Akun ini belum tertaut ke data karyawan manapun',
      );
    }

    return this.daftar({ karyawanId: karyawan.id });
  }

  /**
   * HC menetapkan batas waktu FU secara manual per kasus.
   * Batas dijaga maksimal 2 bulan setelah tanggal MCU ulang.
   */
  async tetapkanBatas(id: number, dto: TetapkanBatasFuDto, aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, UserRole.HC);

    const followUp = await this.detail(id);
    const batas = tanggalSaja(dto.batasWaktuFu);
    const tanggalMcu = followUp.rekomendasi.hasilMcu.jadwalMcu.tanggalMcu;
    const batasMaksimal = tambahBulan(tanggalMcu, BULAN_MAKS_SIKLUS_FU);

    if (selisihHari(batas, batasMaksimal) < 0) {
      throw new BadRequestException(
        `Batas waktu FU maksimal ${formatTanggalIndonesia(batasMaksimal)} ` +
          `(${BULAN_MAKS_SIKLUS_FU} bulan setelah MCU ulang)`,
      );
    }

    if (selisihHari(hariIni(), batas) < 0) {
      throw new BadRequestException(
        'Batas waktu FU tidak boleh lebih awal dari hari ini',
      );
    }

    const diperbarui = await this.prisma.followUp.update({
      where: { id },
      data: {
        batasWaktuFu: batas,
        ditetapkanOlehHcId: aktor.id,
        ditetapkanAt: new Date(),
        ...(dto.klinikId !== undefined ? { klinikId: dto.klinikId } : {}),
        ...(followUp.status === StatusFollowUp.TERLAMBAT_RESCHEDULE
          ? { status: StatusFollowUp.MENUNGGU_TANGGAL }
          : {}),
      },
      include: FU_INCLUDE,
    });

    await this.notifikasi.kirimBanyak(
      this.notifikasi.duaKanal({
        tipe: TipeNotifikasiMcu.PILIHAN_TANGGAL_FU,
        refTabel: 'follow_up',
        refId: diperbarui.id,
        judul: 'Batas waktu Follow Up telah ditetapkan',
        pesan:
          `HC menetapkan batas waktu Follow Up sampai ${formatTanggalIndonesia(batas)}. ` +
          'Silakan pilih tanggal pelaksanaan FU. Seluruh biaya FU ditanggung mandiri.',
        penerimaId: diperbarui.karyawan.akunId,
        penerimaEmail: diperbarui.karyawan.email,
      }),
    );

    return this.lengkapiStatusBatas(diperbarui);
  }

  /** Karyawan memilih tanggal FU dalam batas yang ditetapkan HC. */
  async pilihTanggal(id: number, dto: PilihTanggalFuDto, aktor: AktorMcu) {
    const followUp = await this.detail(id);
    const peran = this.akses.peranAktor(aktor);
    const petugas: UserRole[] = [UserRole.HC, UserRole.ADMIN_DEPT];
    const olehPetugas = peran.some((item) => petugas.includes(item));

    if (!olehPetugas) {
      const karyawan = await this.akses.karyawanDariAkun(aktor);

      if (karyawan?.id !== followUp.karyawanId) {
        throw new ForbiddenException(
          'Anda hanya dapat memilih tanggal Follow Up milik sendiri',
        );
      }
    }

    if (!followUp.batasWaktuFu) {
      throw new BadRequestException(
        'HC belum menetapkan batas waktu Follow Up untuk kasus ini',
      );
    }

    const pilihan = tanggalSaja(dto.tanggalPilihanKaryawan);

    if (selisihHari(hariIni(), pilihan) < 0) {
      throw new BadRequestException(
        'Tanggal Follow Up tidak boleh di masa lalu',
      );
    }

    if (selisihHari(pilihan, followUp.batasWaktuFu) < 0) {
      throw new BadRequestException(
        `Tanggal Follow Up melewati batas ${formatTanggalIndonesia(followUp.batasWaktuFu)}`,
      );
    }

    const diperbarui = await this.prisma.followUp.update({
      where: { id },
      data: {
        tanggalPilihanKaryawan: pilihan,
        status: StatusFollowUp.TERJADWAL,
        ...(dto.klinikId !== undefined ? { klinikId: dto.klinikId } : {}),
      },
      include: FU_INCLUDE,
    });

    const target = [
      ...(await this.notifikasi.penerimaPeran(UserRole.HC)),
      {
        penerimaId: diperbarui.karyawan.departemen.adminAkunId,
        penerimaEmail: diperbarui.karyawan.departemen.adminAkun?.email ?? null,
      },
    ].filter((item) => item.penerimaId);

    await this.notifikasi.kirimBanyak(
      target.flatMap((item) =>
        this.notifikasi.duaKanal({
          tipe: TipeNotifikasiMcu.PILIHAN_TANGGAL_FU,
          refTabel: 'follow_up',
          refId: diperbarui.id,
          judul: `Tanggal FU dipilih: ${diperbarui.karyawan.nama}`,
          pesan:
            `${diperbarui.karyawan.nama} memilih tanggal Follow Up pada ` +
            `${formatTanggalIndonesia(pilihan)}.`,
          ...item,
        }),
      ),
    );

    return this.lengkapiStatusBatas(diperbarui);
  }

  /**
   * Upload hasil FU oleh karyawan, klinik terkoneksi, HC, atau Admin Dept.
   * Hasil masuk antrean review ulang Dokter untuk melanjutkan loop.
   */
  async unggahHasil(id: number, file: Express.Multer.File, aktor: AktorMcu) {
    const followUp = await this.detail(id);
    const peran = this.akses.peranAktor(aktor);
    const petugas: UserRole[] = [
      UserRole.HC,
      UserRole.ADMIN_DEPT,
      UserRole.KLINIK,
    ];
    const olehPetugas = peran.some((item) => petugas.includes(item));

    if (!olehPetugas) {
      const karyawan = await this.akses.karyawanDariAkun(aktor);

      if (karyawan?.id !== followUp.karyawanId) {
        throw new ForbiddenException(
          'Anda hanya dapat mengupload hasil Follow Up milik sendiri',
        );
      }
    }

    if (followUp.status === StatusFollowUp.SELESAI) {
      throw new BadRequestException('Follow Up ini sudah ditutup');
    }

    const path = this.berkas.simpan(file, 'hasil-follow-up');
    const tanggalSubmit = new Date();

    const hasil = await this.prisma.$transaction(async (tx) => {
      const dibuat = await tx.hasilFollowUp.create({
        data: {
          followUpId: followUp.id,
          tanggalSubmit,
          diunggahOlehId: aktor.id,
          tipePengunggah: this.akses.tipePengunggah(aktor),
          fileHasilFu: path,
          namaFileAsli: file.originalname ?? null,
          statusReview: StatusReview.MENUNGGU,
          retensiHapusAt: tambahBulan(tanggalSubmit, BULAN_RETENSI_DOKUMEN),
        },
      });

      await tx.followUp.update({
        where: { id: followUp.id },
        data: { status: StatusFollowUp.TERLAKSANA },
      });

      return dibuat;
    });

    const target = [
      ...(await this.notifikasi.penerimaPeran(UserRole.HC)),
      ...(await this.notifikasi.penerimaPeran(UserRole.DOKTER)),
    ].filter((item) => item.penerimaId);

    await this.notifikasi.kirimBanyak(
      target.flatMap((item) =>
        this.notifikasi.duaKanal({
          tipe: TipeNotifikasiMcu.HASIL_FU,
          refTabel: 'hasil_follow_up',
          refId: hasil.id,
          judul: `Hasil Follow Up masuk: ${followUp.karyawan.nama}`,
          pesan:
            `Hasil Follow Up siklus ke-${followUp.siklusKe} atas nama ` +
            `${followUp.karyawan.nama} menunggu review ulang Dokter.`,
          ...item,
        }),
      ),
    );

    return hasil;
  }

  /** File hasil FU mentah hanya untuk HC & Dokter. */
  async pathFileHasil(hasilId: number, aktor: AktorMcu) {
    this.akses.wajibBolehLihatFileMedis(aktor);

    const hasil = await this.prisma.hasilFollowUp.findUnique({
      where: { id: hasilId },
    });

    if (!hasil) {
      throw new NotFoundException('Hasil Follow Up tidak ditemukan');
    }

    if (hasil.fileDihapusAt) {
      throw new NotFoundException(
        'File sudah dihapus sesuai kebijakan retensi 6 bulan',
      );
    }

    return this.berkas.resolveAbsolut(hasil.fileHasilFu);
  }

  /** Antrean hasil FU yang menunggu review ulang Dokter. */
  async antreanReviewUlang() {
    return this.prisma.hasilFollowUp.findMany({
      where: {
        statusReview: { in: [StatusReview.MENUNGGU, StatusReview.DIREVIEW] },
      },
      include: {
        followUp: {
          include: {
            karyawan: { select: { id: true, nik: true, nama: true } },
            rekomendasi: {
              select: {
                id: true,
                siklusKe: true,
                hasilMcuId: true,
                catatanMedisTerbatas: true,
              },
            },
          },
        },
      },
      orderBy: { tanggalSubmit: 'asc' },
    });
  }

  /**
   * Tandai FU terlewat batas dan reminder Admin Dept untuk penjadwalan ulang.
   * Inilah pengaman "loop FU -> FIT tanpa dead-end" (Keputusan R1).
   */
  async reminderFuTerlambat(id: number, dto: ReminderFuDto, aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, UserRole.HC);

    const followUp = await this.detail(id);

    if (followUp.status === StatusFollowUp.SELESAI) {
      throw new BadRequestException('Follow Up ini sudah ditutup');
    }

    const diperbarui = await this.prisma.followUp.update({
      where: { id },
      data: {
        status: StatusFollowUp.TERLAMBAT_RESCHEDULE,
        jumlahReminderHc: { increment: 1 },
        reminderTerakhirAt: new Date(),
      },
      include: FU_INCLUDE,
    });

    const target = [
      {
        penerimaId: diperbarui.karyawan.departemen.adminAkunId,
        penerimaEmail: diperbarui.karyawan.departemen.adminAkun?.email ?? null,
      },
      {
        penerimaId: diperbarui.karyawan.akunId,
        penerimaEmail: diperbarui.karyawan.email,
      },
    ].filter((item) => item.penerimaId);

    await this.notifikasi.kirimBanyak(
      target.flatMap((item) =>
        this.notifikasi.duaKanal({
          tipe: TipeNotifikasiMcu.REMINDER_FU_ULANG,
          refTabel: 'follow_up',
          refId: diperbarui.id,
          judul: `Follow Up terlambat: ${diperbarui.karyawan.nama}`,
          pesan:
            `Batas waktu Follow Up ${formatTanggalIndonesia(diperbarui.batasWaktuFu)} ` +
            'terlewat tanpa penutupan. Mohon Admin Dept menjadwalkan Follow Up ulang. ' +
            `Reminder ke-${diperbarui.jumlahReminderHc}.` +
            (dto.catatan ? ` Catatan HC: ${dto.catatan.trim()}` : ''),
          ...item,
        }),
      ),
    );

    return this.lengkapiStatusBatas(diperbarui);
  }

  /** Tandai seluruh FU yang lewat batas sekaligus. */
  async tandaiSeluruhFuTerlambat(aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, UserRole.HC);

    const terlambat = await this.prisma.followUp.findMany({
      where: {
        batasWaktuFu: { not: null, lt: hariIni() },
        status: {
          in: [StatusFollowUp.MENUNGGU_TANGGAL, StatusFollowUp.TERJADWAL],
        },
      },
      select: { id: true },
    });

    for (const item of terlambat) {
      await this.reminderFuTerlambat(item.id, {}, aktor);
    }

    return { diproses: terlambat.length };
  }

  /** FU ditutup saat rekomendasi ulang menyatakan FIT. */
  async tutup(id: number, tx?: Prisma.TransactionClient) {
    const klien = tx ?? this.prisma;

    return klien.followUp.update({
      where: { id },
      data: { status: StatusFollowUp.SELESAI, ditutupAt: new Date() },
    });
  }

  private lengkapiStatusBatas<
    T extends { batasWaktuFu: Date | null; status: StatusFollowUp },
  >(followUp: T) {
    const sisaHariBatas = followUp.batasWaktuFu
      ? selisihHari(hariIni(), followUp.batasWaktuFu)
      : null;

    return {
      ...followUp,
      sisaHariBatas,
      melewatiBatas:
        sisaHariBatas !== null &&
        sisaHariBatas < 0 &&
        followUp.status !== StatusFollowUp.SELESAI,
    };
  }
}
