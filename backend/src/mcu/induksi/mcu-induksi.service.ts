// ==================================================
// FILE: backend/src/mcu/induksi/mcu-induksi.service.ts
// FUNGSI: Pendaftaran & pelaksanaan induksi ulang setelah FIT
// Referensi: Bagian 4.10 alur-workflow-mcu-periodik-v3.md
// Alur: Rekom FIT -> Admin Dept daftar -> SHE jadwalkan & laksanakan
//       -> set masa berlaku MCU baru.
// ==================================================

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IsDateString, IsOptional, IsString } from 'class-validator';
import {
  Prisma,
  StatusInduksiUlang,
  StatusKerja,
  StatusKesehatanDirumahkan,
  StatusRekomendasi,
  TipeNotifikasiMcu,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { McuAksesService } from '../common/mcu-akses.service';
import { AktorMcu } from '../common/mcu-aktor';
import { formatTanggalIndonesia, tanggalSaja } from '../mcu-date.util';
import { McuKaryawanService } from '../karyawan/mcu-karyawan.service';
import { McuNotifikasiService } from '../notifikasi/mcu-notifikasi.service';

// ==================================================
// DTO
// ==================================================

export class DaftarInduksiDto {
  @IsOptional()
  @IsString()
  catatan?: string;
}

export class JadwalkanInduksiDto {
  @IsDateString()
  tanggalPelaksanaan: string;

  @IsOptional()
  @IsString()
  catatan?: string;
}

export class SelesaikanInduksiDto {
  @IsOptional()
  @IsString()
  catatan?: string;
}

const INDUKSI_INCLUDE = {
  karyawan: {
    select: {
      id: true,
      nik: true,
      nama: true,
      email: true,
      akunId: true,
      statusKerja: true,
      statusKesehatanDirumahkan: true,
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
  rekomendasiPemic: {
    select: {
      id: true,
      status: true,
      tanggalSubmit: true,
      siklusKe: true,
      hasilMcu: {
        select: { jadwalMcu: { select: { id: true, tanggalMcu: true } } },
      },
    },
  },
  she: { select: { id: true, name: true } },
} satisfies Prisma.InduksiUlangInclude;

@Injectable()
export class McuInduksiService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: McuAksesService,
    private readonly karyawanService: McuKaryawanService,
    private readonly notifikasi: McuNotifikasiService,
  ) {}

  async daftar(filter: { status?: StatusInduksiUlang; karyawanId?: number }) {
    return this.prisma.induksiUlang.findMany({
      where: {
        ...(filter.status ? { status: filter.status } : {}),
        ...(filter.karyawanId ? { karyawanId: filter.karyawanId } : {}),
      },
      include: INDUKSI_INCLUDE,
      orderBy: [{ status: 'asc' }, { tanggalDaftar: 'desc' }],
    });
  }

  async detail(id: number) {
    const induksi = await this.prisma.induksiUlang.findUnique({
      where: { id },
      include: INDUKSI_INCLUDE,
    });

    if (!induksi) {
      throw new NotFoundException('Data induksi ulang tidak ditemukan');
    }

    return induksi;
  }

  /** Rekomendasi FIT yang belum didaftarkan induksi ulangnya. */
  async menungguPendaftaran() {
    return this.prisma.rekomendasiMcu.findMany({
      where: {
        status: StatusRekomendasi.FIT,
        induksiUlang: null,
      },
      include: {
        hasilMcu: {
          select: {
            jadwalMcu: {
              select: {
                id: true,
                tanggalMcu: true,
                karyawan: { select: { id: true, nik: true, nama: true } },
                departemen: { select: { id: true, namaDepartemen: true } },
              },
            },
          },
        },
      },
      orderBy: { tanggalSubmit: 'desc' },
    });
  }

  /** Admin Dept mendaftarkan induksi ulang, sistem meneruskan ke SHE. */
  async daftarkan(
    rekomendasiId: number,
    dto: DaftarInduksiDto,
    aktor: AktorMcu,
  ) {
    this.akses.wajibPeran(aktor, UserRole.ADMIN_DEPT, UserRole.HC);

    const rekomendasi = await this.prisma.rekomendasiMcu.findUnique({
      where: { id: rekomendasiId },
      include: {
        induksiUlang: true,
        hasilMcu: {
          include: {
            jadwalMcu: { include: { karyawan: true, departemen: true } },
          },
        },
      },
    });

    if (!rekomendasi) {
      throw new NotFoundException('Rekomendasi tidak ditemukan');
    }

    if (rekomendasi.status !== StatusRekomendasi.FIT) {
      throw new BadRequestException(
        'Induksi ulang hanya untuk rekomendasi berstatus FIT',
      );
    }

    if (rekomendasi.induksiUlang) {
      throw new BadRequestException(
        'Induksi ulang untuk rekomendasi ini sudah didaftarkan',
      );
    }

    const jadwal = rekomendasi.hasilMcu.jadwalMcu;

    await this.akses.wajibDepartemenSendiri(aktor, jadwal.departemenId);

    const induksi = await this.prisma.induksiUlang.create({
      data: {
        karyawanId: jadwal.karyawanId,
        rekomendasiPemicId: rekomendasi.id,
        departemenId: jadwal.departemenId,
        status: StatusInduksiUlang.MENUNGGU,
        catatan: dto.catatan?.trim() || null,
      },
      include: INDUKSI_INCLUDE,
    });

    await this.notifikasi.kirimBanyak(
      await this.notifikasi.untukPeran(UserRole.SHE, {
        tipe: TipeNotifikasiMcu.INDUKSI_ULANG,
        refTabel: 'induksi_ulang',
        refId: induksi.id,
        judul: `Pendaftaran induksi ulang: ${jadwal.karyawan.nama}`,
        pesan:
          `${jadwal.karyawan.nama} (NIK ${jadwal.karyawan.nik}, ` +
          `${jadwal.departemen.namaDepartemen}) telah dinyatakan FIT dan ` +
          'didaftarkan untuk induksi ulang K3. Mohon dijadwalkan.',
      }),
    );

    return induksi;
  }

  /** SHE menjadwalkan pelaksanaan induksi ulang. */
  async jadwalkan(id: number, dto: JadwalkanInduksiDto, aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, UserRole.SHE);

    const induksi = await this.detail(id);

    if (induksi.status === StatusInduksiUlang.SELESAI) {
      throw new BadRequestException('Induksi ulang sudah selesai');
    }

    const diperbarui = await this.prisma.induksiUlang.update({
      where: { id },
      data: {
        tanggalPelaksanaan: tanggalSaja(dto.tanggalPelaksanaan),
        status: StatusInduksiUlang.TERJADWAL,
        sheId: aktor.id,
        ...(dto.catatan !== undefined
          ? { catatan: dto.catatan?.trim() || null }
          : {}),
      },
      include: INDUKSI_INCLUDE,
    });

    const target = [
      {
        penerimaId: diperbarui.karyawan.akunId,
        penerimaEmail: diperbarui.karyawan.email,
      },
      {
        penerimaId: diperbarui.departemen.adminAkunId,
        penerimaEmail: diperbarui.departemen.adminAkun?.email ?? null,
      },
    ].filter((item) => item.penerimaId);

    await this.notifikasi.kirimBanyak(
      target.flatMap((item) =>
        this.notifikasi.duaKanal({
          tipe: TipeNotifikasiMcu.INDUKSI_ULANG,
          refTabel: 'induksi_ulang',
          refId: diperbarui.id,
          judul: 'Jadwal induksi ulang K3',
          pesan:
            'Induksi ulang K3 dijadwalkan pada ' +
            `${formatTanggalIndonesia(diperbarui.tanggalPelaksanaan)}.`,
          ...item,
        }),
      ),
    );

    return diperbarui;
  }

  /**
   * SHE menutup induksi ulang. Di titik ini masa berlaku MCU baru
   * ditetapkan dan pemicu siklus berikutnya (H-3 bulan) dihitung ulang.
   * Karyawan dirumahkan yang lolos FIT MCU (tahap 2) diaktifkan kembali.
   */
  async selesaikan(id: number, dto: SelesaikanInduksiDto, aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, UserRole.SHE);

    const induksi = await this.detail(id);

    if (induksi.status === StatusInduksiUlang.SELESAI) {
      throw new BadRequestException('Induksi ulang sudah selesai');
    }

    const tanggalMcu = induksi.rekomendasiPemic.hasilMcu.jadwalMcu.tanggalMcu;

    const diperbarui = await this.prisma.$transaction(async (tx) => {
      const hasil = await tx.induksiUlang.update({
        where: { id },
        data: {
          status: StatusInduksiUlang.SELESAI,
          selesaiAt: new Date(),
          sheId: induksi.sheId ?? aktor.id,
          ...(dto.catatan !== undefined
            ? { catatan: dto.catatan?.trim() || null }
            : {}),
        },
        include: INDUKSI_INCLUDE,
      });

      await this.karyawanService.perbaruiMasaBerlaku(
        hasil.karyawanId,
        tanggalMcu,
        tx,
      );

      // FIT MCU lengkap mengakhiri tahap 2 karyawan dirumahkan.
      if (hasil.karyawan.statusKerja === StatusKerja.DIRUMAHKAN) {
        await tx.karyawan.update({
          where: { id: hasil.karyawanId },
          data: {
            statusKerja: StatusKerja.AKTIF,
            statusKesehatanDirumahkan: null,
          },
        });
      }

      return hasil;
    });

    const target = [
      {
        penerimaId: diperbarui.karyawan.akunId,
        penerimaEmail: diperbarui.karyawan.email,
      },
      ...(await this.notifikasi.penerimaPeran(UserRole.HC)),
    ].filter((item) => item.penerimaId);

    await this.notifikasi.kirimBanyak(
      target.flatMap((item) =>
        this.notifikasi.duaKanal({
          tipe: TipeNotifikasiMcu.INDUKSI_ULANG,
          refTabel: 'induksi_ulang',
          refId: diperbarui.id,
          judul: `Induksi ulang selesai: ${diperbarui.karyawan.nama}`,
          pesan:
            'Induksi ulang K3 telah dilaksanakan. Masa berlaku MCU dan ' +
            'jadwal siklus periodik berikutnya sudah diperbarui.',
          ...item,
        }),
      ),
    );

    return diperbarui;
  }

  /**
   * Tahap 1 karyawan dirumahkan: FIT atas penyakit yang diderita.
   * Setelah ini karyawan lanjut MCU lengkap untuk tahap 2.
   */
  async tandaiFitSakit(karyawanId: number, aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, UserRole.HC, UserRole.DOKTER);

    const karyawan = await this.prisma.karyawan.findUnique({
      where: { id: karyawanId },
    });

    if (!karyawan) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    if (karyawan.statusKerja !== StatusKerja.DIRUMAHKAN) {
      throw new BadRequestException(
        'Tahap FIT dari sakit hanya berlaku untuk karyawan dirumahkan',
      );
    }

    return this.prisma.karyawan.update({
      where: { id: karyawanId },
      data: {
        statusKesehatanDirumahkan: StatusKesehatanDirumahkan.FIT_SAKIT,
      },
    });
  }
}
