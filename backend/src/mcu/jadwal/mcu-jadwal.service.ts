// ==================================================
// FILE: backend/src/mcu/jadwal/mcu-jadwal.service.ts
// FUNGSI: Penjadwalan MCU, lock H-3 hari, override HC
// Referensi: Bagian 4.0, 4.2 & 4.9 alur-workflow-mcu-periodik-v3.md
// ==================================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PartialType } from '@nestjs/mapped-types';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  JenisMcu,
  Prisma,
  StatusKerja,
  StatusPendaftaran,
  TipeNotifikasiMcu,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { McuAksesService } from '../common/mcu-akses.service';
import { AktorMcu } from '../common/mcu-aktor';
import { HARI_LOCK_PENDAFTARAN } from '../mcu.constants';
import {
  formatTanggalIndonesia,
  hariIni,
  selisihHari,
  tanggalSaja,
} from '../mcu-date.util';
import { McuNotifikasiService } from '../notifikasi/mcu-notifikasi.service';

// ==================================================
// DTO
// ==================================================

export class BuatJadwalMcuDto {
  @IsInt()
  karyawanId: number;

  @IsDateString()
  tanggalMcu: string;

  @IsOptional()
  @IsEnum(JenisMcu)
  jenisMcu?: JenisMcu;

  @IsOptional()
  @IsInt()
  klinikId?: number;

  @IsOptional()
  @IsString()
  catatan?: string;
}

export class BuatJadwalBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BuatJadwalMcuDto)
  jadwal: BuatJadwalMcuDto[];
}

export class UbahJadwalMcuDto extends PartialType(BuatJadwalMcuDto) {
  /** Wajib diisi HC saat mengubah jadwal yang sudah terkunci. */
  @IsOptional()
  @IsString()
  alasanPerubahanHc?: string;
}

export class BatalkanJadwalDto {
  @IsString()
  @IsNotEmpty()
  alasanPerubahanHc: string;
}

const JADWAL_INCLUDE = {
  karyawan: {
    select: {
      id: true,
      nik: true,
      nama: true,
      email: true,
      jabatan: true,
      statusKerja: true,
      tanggalMcuExpired: true,
      akunId: true,
    },
  },
  departemen: {
    select: {
      id: true,
      namaDepartemen: true,
      adminAkunId: true,
      adminAkun: { select: { id: true, email: true } },
    },
  },
  klinik: {
    select: { id: true, namaKlinik: true, terkoneksi: true, akunId: true },
  },
  suratPengantar: {
    select: {
      id: true,
      nomorSurat: true,
      status: true,
      tanggalTerbit: true,
      filePdf: true,
    },
  },
  hasilMcu: {
    select: { id: true, tanggalUpload: true, statusReview: true },
  },
  dibuatOleh: { select: { id: true, name: true } },
  diubahOlehHc: { select: { id: true, name: true } },
} satisfies Prisma.JadwalMcuInclude;

@Injectable()
export class McuJadwalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: McuAksesService,
    private readonly notifikasi: McuNotifikasiService,
  ) {}

  // ==================================================
  // BACA
  // ==================================================

  async daftar(filter: {
    status?: StatusPendaftaran;
    jenisMcu?: JenisMcu;
    departemenId?: number;
    karyawanId?: number;
    dariTanggal?: string;
    sampaiTanggal?: string;
  }) {
    const daftar = await this.prisma.jadwalMcu.findMany({
      where: {
        ...(filter.status ? { statusPendaftaran: filter.status } : {}),
        ...(filter.jenisMcu ? { jenisMcu: filter.jenisMcu } : {}),
        ...(filter.departemenId ? { departemenId: filter.departemenId } : {}),
        ...(filter.karyawanId ? { karyawanId: filter.karyawanId } : {}),
        ...(filter.dariTanggal || filter.sampaiTanggal
          ? {
              tanggalMcu: {
                ...(filter.dariTanggal
                  ? { gte: tanggalSaja(filter.dariTanggal) }
                  : {}),
                ...(filter.sampaiTanggal
                  ? { lte: tanggalSaja(filter.sampaiTanggal) }
                  : {}),
              },
            }
          : {}),
      },
      include: JADWAL_INCLUDE,
      orderBy: [{ tanggalMcu: 'desc' }, { id: 'desc' }],
    });

    return daftar.map((jadwal) => this.lengkapiStatusLock(jadwal));
  }

  async detail(id: number) {
    const jadwal = await this.prisma.jadwalMcu.findUnique({
      where: { id },
      include: JADWAL_INCLUDE,
    });

    if (!jadwal) {
      throw new NotFoundException('Jadwal MCU tidak ditemukan');
    }

    return this.lengkapiStatusLock(jadwal);
  }

  // ==================================================
  // TULIS
  // ==================================================

  /** Admin Dept menentukan jadwal, lalu submit ke karyawan. */
  async buat(dto: BuatJadwalMcuDto, aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, UserRole.ADMIN_DEPT, UserRole.HC);

    const karyawan = await this.prisma.karyawan.findUnique({
      where: { id: dto.karyawanId },
      include: { departemen: true },
    });

    if (!karyawan) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    await this.akses.wajibDepartemenSendiri(aktor, karyawan.departemenId);

    if (karyawan.statusKerja === StatusKerja.RESIGN) {
      throw new BadRequestException(
        'Karyawan berstatus resign tidak dapat dijadwalkan MCU',
      );
    }

    const tanggalMcu = tanggalSaja(dto.tanggalMcu);

    this.pastikanBatasPendaftaran(tanggalMcu);

    const jadwalBerjalan = await this.prisma.jadwalMcu.findFirst({
      where: {
        karyawanId: dto.karyawanId,
        statusPendaftaran: {
          in: [StatusPendaftaran.DRAFT, StatusPendaftaran.TERKUNCI],
        },
      },
    });

    if (jadwalBerjalan) {
      throw new BadRequestException(
        `${karyawan.nama} masih memiliki jadwal MCU berjalan pada ${formatTanggalIndonesia(jadwalBerjalan.tanggalMcu)}`,
      );
    }

    if (dto.klinikId) {
      await this.pastikanKlinikAktif(dto.klinikId);
    }

    const jadwal = await this.prisma.jadwalMcu.create({
      data: {
        karyawanId: karyawan.id,
        departemenId: karyawan.departemenId,
        tanggalMcu,
        jenisMcu: dto.jenisMcu ?? JenisMcu.BERKALA,
        klinikId: dto.klinikId ?? null,
        statusPendaftaran: StatusPendaftaran.DRAFT,
        tanggalLock: this.hitungTanggalLock(tanggalMcu),
        catatan: dto.catatan?.trim() || null,
        dibuatOlehId: aktor.id,
      },
      include: JADWAL_INCLUDE,
    });

    await this.notifikasiJadwalBaru(jadwal);

    return this.lengkapiStatusLock(jadwal);
  }

  /** Pendaftaran massal satu departemen dalam sekali submit. */
  async buatBatch(dto: BuatJadwalBatchDto, aktor: AktorMcu) {
    const berhasil: unknown[] = [];
    const gagal: Array<{ karyawanId: number; alasan: string }> = [];

    for (const item of dto.jadwal) {
      try {
        berhasil.push(await this.buat(item, aktor));
      } catch (error) {
        gagal.push({
          karyawanId: item.karyawanId,
          alasan:
            error instanceof Error ? error.message : 'Gagal membuat jadwal',
        });
      }
    }

    return { berhasil, gagal, totalBerhasil: berhasil.length };
  }

  /**
   * Sebelum terkunci: Admin Dept pemilik departemen boleh mengubah.
   * Sesudah terkunci: hanya HC (Keputusan #9), tercatat di diubah_oleh_hc.
   */
  async ubah(id: number, dto: UbahJadwalMcuDto, aktor: AktorMcu) {
    const jadwal = await this.prisma.jadwalMcu.findUnique({ where: { id } });

    if (!jadwal) {
      throw new NotFoundException('Jadwal MCU tidak ditemukan');
    }

    if (jadwal.statusPendaftaran === StatusPendaftaran.SELESAI) {
      throw new BadRequestException(
        'Jadwal yang sudah selesai tidak dapat diubah',
      );
    }

    const terkunci = this.sudahTerkunci(jadwal);
    const olehHc = this.akses.punyaPeran(aktor, UserRole.HC);

    if (terkunci && !olehHc) {
      throw new ForbiddenException(
        'Jadwal sudah terkunci (H-3 hari). Hanya akun HC yang dapat mengubah.',
      );
    }

    if (!terkunci) {
      this.akses.wajibPeran(aktor, UserRole.ADMIN_DEPT, UserRole.HC);
      await this.akses.wajibDepartemenSendiri(aktor, jadwal.departemenId);
    }

    const tanggalMcu = dto.tanggalMcu
      ? tanggalSaja(dto.tanggalMcu)
      : jadwal.tanggalMcu;

    if (dto.tanggalMcu && !olehHc) {
      this.pastikanBatasPendaftaran(tanggalMcu);
    }

    if (dto.klinikId) {
      await this.pastikanKlinikAktif(dto.klinikId);
    }

    const diperbarui = await this.prisma.jadwalMcu.update({
      where: { id },
      data: {
        ...(dto.tanggalMcu
          ? {
              tanggalMcu,
              tanggalLock: this.hitungTanggalLock(tanggalMcu),
              statusPendaftaran: this.statusMenurutTanggal(tanggalMcu),
            }
          : {}),
        ...(dto.jenisMcu !== undefined ? { jenisMcu: dto.jenisMcu } : {}),
        ...(dto.klinikId !== undefined ? { klinikId: dto.klinikId } : {}),
        ...(dto.catatan !== undefined
          ? { catatan: dto.catatan?.trim() || null }
          : {}),
        ...(terkunci && olehHc
          ? {
              diubahOlehHcId: aktor.id,
              diubahOlehHcAt: new Date(),
              alasanPerubahanHc: dto.alasanPerubahanHc?.trim() || null,
            }
          : {}),
      },
      include: JADWAL_INCLUDE,
    });

    if (dto.tanggalMcu) {
      await this.notifikasiJadwalBaru(diperbarui, true);
    }

    return this.lengkapiStatusLock(diperbarui);
  }

  /** Pembatalan jadwal terkunci hanya boleh oleh HC. */
  async batalkan(id: number, dto: BatalkanJadwalDto, aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, UserRole.HC);

    const jadwal = await this.prisma.jadwalMcu.findUnique({ where: { id } });

    if (!jadwal) {
      throw new NotFoundException('Jadwal MCU tidak ditemukan');
    }

    if (jadwal.statusPendaftaran === StatusPendaftaran.SELESAI) {
      throw new BadRequestException(
        'Jadwal yang sudah selesai tidak dapat dibatalkan',
      );
    }

    return this.prisma.jadwalMcu.update({
      where: { id },
      data: {
        statusPendaftaran: StatusPendaftaran.DIBATALKAN,
        dibatalkanAt: new Date(),
        diubahOlehHcId: aktor.id,
        diubahOlehHcAt: new Date(),
        alasanPerubahanHc: dto.alasanPerubahanHc.trim(),
      },
      include: JADWAL_INCLUDE,
    });
  }

  /**
   * Kunci seluruh jadwal yang sudah melewati tanggal lock.
   * Dipanggil dari halaman HC atau penjadwal harian.
   */
  async kunciJadwalJatuhTempo() {
    const hasil = await this.prisma.jadwalMcu.updateMany({
      where: {
        statusPendaftaran: StatusPendaftaran.DRAFT,
        tanggalLock: { lte: hariIni() },
      },
      data: { statusPendaftaran: StatusPendaftaran.TERKUNCI },
    });

    return { terkunci: hasil.count };
  }

  // ==================================================
  // UTILITAS
  // ==================================================

  private hitungTanggalLock(tanggalMcu: Date): Date {
    const lock = tanggalSaja(tanggalMcu);
    lock.setUTCDate(lock.getUTCDate() - HARI_LOCK_PENDAFTARAN);
    return lock;
  }

  /** Pendaftaran final minimal H-3 hari sebelum pelaksanaan. */
  private pastikanBatasPendaftaran(tanggalMcu: Date): void {
    const sisaHari = selisihHari(hariIni(), tanggalMcu);

    if (sisaHari < HARI_LOCK_PENDAFTARAN) {
      throw new BadRequestException(
        `Pendaftaran MCU paling lambat H-${HARI_LOCK_PENDAFTARAN} hari sebelum pelaksanaan`,
      );
    }
  }

  private statusMenurutTanggal(tanggalMcu: Date): StatusPendaftaran {
    return selisihHari(hariIni(), tanggalMcu) <= HARI_LOCK_PENDAFTARAN
      ? StatusPendaftaran.TERKUNCI
      : StatusPendaftaran.DRAFT;
  }

  private sudahTerkunci(jadwal: {
    statusPendaftaran: StatusPendaftaran;
    tanggalLock: Date;
  }): boolean {
    if (jadwal.statusPendaftaran === StatusPendaftaran.TERKUNCI) {
      return true;
    }

    return selisihHari(hariIni(), jadwal.tanggalLock) <= 0;
  }

  private async pastikanKlinikAktif(klinikId: number) {
    const klinik = await this.prisma.klinik.findUnique({
      where: { id: klinikId },
    });

    if (!klinik) {
      throw new NotFoundException('Klinik tidak ditemukan');
    }

    if (!klinik.statusAktif) {
      throw new BadRequestException('Klinik sedang tidak aktif');
    }

    return klinik;
  }

  private lengkapiStatusLock<
    T extends {
      tanggalMcu: Date;
      tanggalLock: Date;
      statusPendaftaran: StatusPendaftaran;
    },
  >(jadwal: T) {
    return {
      ...jadwal,
      terkunci: this.sudahTerkunci(jadwal),
      sisaHariLock: selisihHari(hariIni(), jadwal.tanggalLock),
      sisaHariPelaksanaan: selisihHari(hariIni(), jadwal.tanggalMcu),
    };
  }

  /** Notifikasi jadwal ke Karyawan, dengan tembusan HC. */
  private async notifikasiJadwalBaru(
    jadwal: Prisma.JadwalMcuGetPayload<{ include: typeof JADWAL_INCLUDE }>,
    perubahan = false,
  ) {
    const judul = perubahan
      ? `Perubahan jadwal MCU ${jadwal.karyawan.nama}`
      : `Jadwal MCU ${jadwal.karyawan.nama}`;

    const pesan =
      `MCU ${jadwal.jenisMcu.toLowerCase()} dijadwalkan pada ` +
      `${formatTanggalIndonesia(jadwal.tanggalMcu)}` +
      `${jadwal.klinik ? ` di ${jadwal.klinik.namaKlinik}` : ''}. ` +
      `Pendaftaran terkunci pada ${formatTanggalIndonesia(jadwal.tanggalLock)}.`;

    const isi = {
      tipe: TipeNotifikasiMcu.JADWAL_MCU,
      refTabel: 'jadwal_mcu',
      refId: jadwal.id,
      judul,
      pesan,
    };

    const target = [
      {
        penerimaId: jadwal.karyawan.akunId,
        penerimaEmail: jadwal.karyawan.email,
      },
      ...(await this.notifikasi.penerimaPeran(UserRole.HC)),
    ].filter((item) => item.penerimaId);

    await this.notifikasi.kirimBanyak(
      target.flatMap((item) => this.notifikasi.duaKanal({ ...isi, ...item })),
    );
  }
}
