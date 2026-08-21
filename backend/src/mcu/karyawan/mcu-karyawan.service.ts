// ==================================================
// FILE: backend/src/mcu/karyawan/mcu-karyawan.service.ts
// FUNGSI: Master karyawan/departemen + reminder H-3 bulan
// Referensi: Bagian 4.1 & 4.11 alur-workflow-mcu-periodik-v3.md
// ==================================================

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  StatusKerja,
  StatusKesehatanDirumahkan,
  TipeNotifikasiMcu,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BULAN_MASA_BERLAKU_MCU,
  BULAN_REMINDER_SEBELUM_EXPIRED,
} from '../mcu.constants';
import {
  formatTanggalIndonesia,
  hariIni,
  kurangBulan,
  selisihHari,
  tambahBulan,
  tanggalSaja,
} from '../mcu-date.util';
import { McuNotifikasiService } from '../notifikasi/mcu-notifikasi.service';
import {
  BuatDepartemenDto,
  BuatKaryawanDto,
  UbahDepartemenDto,
  UbahKaryawanDto,
  UbahStatusKerjaDto,
} from './dto/mcu-karyawan.dto';

const KARYAWAN_INCLUDE = {
  departemen: {
    select: {
      id: true,
      namaDepartemen: true,
      adminAkunId: true,
      adminAkun: { select: { id: true, name: true, email: true } },
    },
  },
  akun: { select: { id: true, name: true, username: true, email: true } },
} satisfies Prisma.KaryawanInclude;

@Injectable()
export class McuKaryawanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifikasi: McuNotifikasiService,
  ) {}

  // ==================================================
  // DEPARTEMEN
  // ==================================================

  async daftarDepartemen() {
    return this.prisma.departemen.findMany({
      include: {
        adminAkun: { select: { id: true, name: true, email: true } },
        _count: { select: { karyawan: true } },
      },
      orderBy: { namaDepartemen: 'asc' },
    });
  }

  async buatDepartemen(dto: BuatDepartemenDto) {
    const nama = dto.namaDepartemen.trim();

    const duplikat = await this.prisma.departemen.findUnique({
      where: { namaDepartemen: nama },
    });

    if (duplikat) {
      throw new BadRequestException('Nama departemen sudah terdaftar');
    }

    return this.prisma.departemen.create({
      data: {
        namaDepartemen: nama,
        adminAkunId: dto.adminAkunId ?? null,
        aktif: dto.aktif ?? true,
      },
    });
  }

  async ubahDepartemen(id: number, dto: UbahDepartemenDto) {
    await this.cariDepartemen(id);

    return this.prisma.departemen.update({
      where: { id },
      data: {
        ...(dto.namaDepartemen !== undefined
          ? { namaDepartemen: dto.namaDepartemen.trim() }
          : {}),
        ...(dto.adminAkunId !== undefined
          ? { adminAkunId: dto.adminAkunId }
          : {}),
        ...(dto.aktif !== undefined ? { aktif: dto.aktif } : {}),
      },
    });
  }

  async hapusDepartemen(id: number) {
    const departemen = await this.prisma.departemen.findUnique({
      where: { id },
      include: { _count: { select: { karyawan: true } } },
    });

    if (!departemen) {
      throw new NotFoundException('Departemen tidak ditemukan');
    }

    if (departemen._count.karyawan > 0) {
      throw new BadRequestException(
        'Departemen masih memiliki karyawan dan tidak dapat dihapus',
      );
    }

    await this.prisma.departemen.delete({ where: { id } });

    return { message: 'Departemen berhasil dihapus' };
  }

  private async cariDepartemen(id: number) {
    const departemen = await this.prisma.departemen.findUnique({
      where: { id },
    });

    if (!departemen) {
      throw new NotFoundException('Departemen tidak ditemukan');
    }

    return departemen;
  }

  // ==================================================
  // KARYAWAN
  // ==================================================

  async daftarKaryawan(filter: {
    departemenId?: number;
    statusKerja?: StatusKerja;
    cari?: string;
  }) {
    const daftar = await this.prisma.karyawan.findMany({
      where: {
        ...(filter.departemenId ? { departemenId: filter.departemenId } : {}),
        ...(filter.statusKerja ? { statusKerja: filter.statusKerja } : {}),
        ...(filter.cari
          ? {
              OR: [
                { nama: { contains: filter.cari, mode: 'insensitive' } },
                { nik: { contains: filter.cari, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: KARYAWAN_INCLUDE,
      orderBy: [{ departemenId: 'asc' }, { nama: 'asc' }],
    });

    return daftar.map((karyawan) => this.lengkapiStatusMcu(karyawan));
  }

  async detailKaryawan(id: number) {
    const karyawan = await this.prisma.karyawan.findUnique({
      where: { id },
      include: KARYAWAN_INCLUDE,
    });

    if (!karyawan) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    return this.lengkapiStatusMcu(karyawan);
  }

  async buatKaryawan(dto: BuatKaryawanDto) {
    await this.cariDepartemen(dto.departemenId);

    const nik = dto.nik.trim();

    const duplikat = await this.prisma.karyawan.findUnique({ where: { nik } });

    if (duplikat) {
      throw new BadRequestException(`NIK ${nik} sudah terdaftar`);
    }

    const tanggalMcuExpired = dto.tanggalMcuExpired
      ? tanggalSaja(dto.tanggalMcuExpired)
      : null;

    return this.prisma.karyawan.create({
      data: {
        nik,
        nama: dto.nama.trim(),
        departemenId: dto.departemenId,
        jabatan: dto.jabatan?.trim() || null,
        email: dto.email?.trim() || null,
        noTelepon: dto.noTelepon?.trim() || null,
        tanggalLahir: dto.tanggalLahir ? tanggalSaja(dto.tanggalLahir) : null,
        tanggalMcuTerakhir: dto.tanggalMcuTerakhir
          ? tanggalSaja(dto.tanggalMcuTerakhir)
          : null,
        tanggalMcuExpired,
        tanggalMcuBerikutnya: tanggalMcuExpired
          ? kurangBulan(tanggalMcuExpired, BULAN_REMINDER_SEBELUM_EXPIRED)
          : null,
        statusKerja: dto.statusKerja ?? StatusKerja.AKTIF,
        statusKesehatanDirumahkan: dto.statusKesehatanDirumahkan ?? null,
        akunId: dto.akunId ?? null,
      },
      include: KARYAWAN_INCLUDE,
    });
  }

  async ubahKaryawan(id: number, dto: UbahKaryawanDto) {
    const karyawan = await this.prisma.karyawan.findUnique({ where: { id } });

    if (!karyawan) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    if (dto.departemenId !== undefined) {
      await this.cariDepartemen(dto.departemenId);
    }

    if (dto.nik !== undefined && dto.nik.trim() !== karyawan.nik) {
      const duplikat = await this.prisma.karyawan.findUnique({
        where: { nik: dto.nik.trim() },
      });

      if (duplikat) {
        throw new BadRequestException(`NIK ${dto.nik} sudah terdaftar`);
      }
    }

    const tanggalMcuExpired =
      dto.tanggalMcuExpired !== undefined
        ? dto.tanggalMcuExpired
          ? tanggalSaja(dto.tanggalMcuExpired)
          : null
        : undefined;

    return this.prisma.karyawan.update({
      where: { id },
      data: {
        ...(dto.nik !== undefined ? { nik: dto.nik.trim() } : {}),
        ...(dto.nama !== undefined ? { nama: dto.nama.trim() } : {}),
        ...(dto.departemenId !== undefined
          ? { departemenId: dto.departemenId }
          : {}),
        ...(dto.jabatan !== undefined
          ? { jabatan: dto.jabatan?.trim() || null }
          : {}),
        ...(dto.email !== undefined
          ? { email: dto.email?.trim() || null }
          : {}),
        ...(dto.noTelepon !== undefined
          ? { noTelepon: dto.noTelepon?.trim() || null }
          : {}),
        ...(dto.tanggalLahir !== undefined
          ? {
              tanggalLahir: dto.tanggalLahir
                ? tanggalSaja(dto.tanggalLahir)
                : null,
            }
          : {}),
        ...(dto.tanggalMcuTerakhir !== undefined
          ? {
              tanggalMcuTerakhir: dto.tanggalMcuTerakhir
                ? tanggalSaja(dto.tanggalMcuTerakhir)
                : null,
            }
          : {}),
        ...(tanggalMcuExpired !== undefined
          ? {
              tanggalMcuExpired,
              tanggalMcuBerikutnya: tanggalMcuExpired
                ? kurangBulan(tanggalMcuExpired, BULAN_REMINDER_SEBELUM_EXPIRED)
                : null,
            }
          : {}),
        ...(dto.statusKerja !== undefined
          ? { statusKerja: dto.statusKerja }
          : {}),
        ...(dto.statusKesehatanDirumahkan !== undefined
          ? { statusKesehatanDirumahkan: dto.statusKesehatanDirumahkan }
          : {}),
        ...(dto.akunId !== undefined ? { akunId: dto.akunId } : {}),
      },
      include: KARYAWAN_INCLUDE,
    });
  }

  async hapusKaryawan(id: number) {
    const karyawan = await this.prisma.karyawan.findUnique({
      where: { id },
      include: { _count: { select: { jadwalMcu: true } } },
    });

    if (!karyawan) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    if (karyawan._count.jadwalMcu > 0) {
      throw new BadRequestException(
        'Karyawan sudah memiliki riwayat MCU dan tidak dapat dihapus',
      );
    }

    await this.prisma.karyawan.delete({ where: { id } });

    return { message: 'Karyawan berhasil dihapus' };
  }

  /**
   * Alur karyawan dirumahkan (Bagian 4.11):
   * FIT dari sakit (tahap 1) -> MCU lengkap -> FIT MCU (tahap 2) -> aktif.
   */
  async ubahStatusKerja(id: number, dto: UbahStatusKerjaDto) {
    const karyawan = await this.prisma.karyawan.findUnique({ where: { id } });

    if (!karyawan) {
      throw new NotFoundException('Karyawan tidak ditemukan');
    }

    if (
      dto.statusKerja === StatusKerja.DIRUMAHKAN &&
      !dto.statusKesehatanDirumahkan
    ) {
      throw new BadRequestException(
        'Status kesehatan wajib diisi untuk karyawan dirumahkan',
      );
    }

    if (
      dto.statusKerja === StatusKerja.AKTIF &&
      karyawan.statusKerja === StatusKerja.DIRUMAHKAN &&
      karyawan.statusKesehatanDirumahkan !== StatusKesehatanDirumahkan.FIT_SAKIT
    ) {
      throw new BadRequestException(
        'Karyawan dirumahkan harus FIT dari sakit (tahap 1) sebelum diaktifkan kembali',
      );
    }

    return this.prisma.karyawan.update({
      where: { id },
      data: {
        statusKerja: dto.statusKerja,
        statusKesehatanDirumahkan:
          dto.statusKerja === StatusKerja.DIRUMAHKAN
            ? (dto.statusKesehatanDirumahkan ?? null)
            : null,
      },
      include: KARYAWAN_INCLUDE,
    });
  }

  // ==================================================
  // REMINDER H-3 BULAN (Bagian 4.1)
  // ==================================================

  /**
   * Karyawan yang sudah menyentuh tanggal_mcu_berikutnya dan belum punya
   * jadwal MCU berjalan. Karyawan dirumahkan/resign dikecualikan.
   */
  async karyawanJatuhTempo(hariKeDepan = 0) {
    const batas = tambahBulan(hariIni(), 0);
    batas.setUTCDate(batas.getUTCDate() + hariKeDepan);

    const daftar = await this.prisma.karyawan.findMany({
      where: {
        statusKerja: StatusKerja.AKTIF,
        tanggalMcuBerikutnya: { not: null, lte: batas },
        jadwalMcu: {
          none: {
            statusPendaftaran: { in: ['DRAFT', 'TERKUNCI'] },
          },
        },
      },
      include: KARYAWAN_INCLUDE,
      orderBy: { tanggalMcuBerikutnya: 'asc' },
    });

    return daftar.map((karyawan) => this.lengkapiStatusMcu(karyawan));
  }

  /**
   * Kirim reminder ke Admin Dept masing-masing karyawan, tembusan HC.
   * Dijalankan manual dari halaman HC atau oleh penjadwal harian.
   */
  async jalankanReminderJatuhTempo() {
    const daftar = await this.karyawanJatuhTempo();

    if (!daftar.length) {
      return { dikirim: 0, karyawan: 0 };
    }

    const tembusanHc = await this.notifikasi.penerimaPeran(UserRole.HC);
    let dikirim = 0;

    for (const karyawan of daftar) {
      const judul = `Reminder MCU periodik: ${karyawan.nama}`;
      const pesan =
        `MCU ${karyawan.nama} (NIK ${karyawan.nik}, ${karyawan.departemen.namaDepartemen}) ` +
        `akan expired pada ${formatTanggalIndonesia(karyawan.tanggalMcuExpired)}. ` +
        'Mohon Admin Dept menentukan tanggal pelaksanaan MCU dan klinik tujuan.';

      const target = [
        {
          penerimaId: karyawan.departemen.adminAkunId,
          penerimaEmail: karyawan.departemen.adminAkun?.email ?? null,
        },
        ...tembusanHc,
      ].filter((item) => item.penerimaId);

      const payload = target.flatMap((item) =>
        this.notifikasi.duaKanal({
          tipe: TipeNotifikasiMcu.REMINDER_H3_BULAN,
          refTabel: 'karyawan',
          refId: karyawan.id,
          judul,
          pesan,
          penerimaId: item.penerimaId,
          penerimaEmail: item.penerimaEmail,
        }),
      );

      await this.notifikasi.kirimBanyak(payload);
      dikirim += payload.length;
    }

    return { dikirim, karyawan: daftar.length };
  }

  /**
   * Set masa berlaku MCU baru setelah karyawan dinyatakan FIT,
   * sekaligus menghitung ulang pemicu siklus berikutnya.
   */
  async perbaruiMasaBerlaku(
    karyawanId: number,
    tanggalMcu: Date,
    tx?: Prisma.TransactionClient,
  ) {
    const klien = tx ?? this.prisma;
    const expired = tambahBulan(tanggalMcu, BULAN_MASA_BERLAKU_MCU);

    return klien.karyawan.update({
      where: { id: karyawanId },
      data: {
        tanggalMcuTerakhir: tanggalSaja(tanggalMcu),
        tanggalMcuExpired: expired,
        tanggalMcuBerikutnya: kurangBulan(
          expired,
          BULAN_REMINDER_SEBELUM_EXPIRED,
        ),
      },
    });
  }

  /** Tambahkan penanda jatuh tempo agar tabel di web mudah dibaca. */
  private lengkapiStatusMcu<
    T extends {
      tanggalMcuExpired: Date | null;
      tanggalMcuBerikutnya: Date | null;
      statusKerja: StatusKerja;
    },
  >(karyawan: T) {
    const acuan = hariIni();

    const sisaHariExpired = karyawan.tanggalMcuExpired
      ? selisihHari(acuan, karyawan.tanggalMcuExpired)
      : null;

    const sisaHariReminder = karyawan.tanggalMcuBerikutnya
      ? selisihHari(acuan, karyawan.tanggalMcuBerikutnya)
      : null;

    return {
      ...karyawan,
      sisaHariExpired,
      sisaHariReminder,
      sudahJatuhTempo:
        karyawan.statusKerja === StatusKerja.AKTIF &&
        sisaHariReminder !== null &&
        sisaHariReminder <= 0,
      mcuKedaluwarsa: sisaHariExpired !== null && sisaHariExpired < 0,
    };
  }
}
