// ==================================================
// FILE: backend/src/travel/travel.service.ts
// FUNGSI: Jadwal Travel/shuttle — admin, self-service karyawan, dan Driver
// ==================================================

import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { Prisma, StatusTravel, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { hasilHalaman, paramHalaman } from '../common/pagination.util';
import { TravelFileService } from './travel-file.service';
import { TravelAksesService } from './travel-akses.service';
import {
  BuatDriverDto,
  BuatJadwalDto,
  RatingTravelDto,
  RescheduleJadwalDto,
  UbahDriverDto,
  UbahJadwalDto,
} from './dto/travel.dto';
import { WhatsappService } from '../whatsapp/whatsapp.service';
import { sapaanKaryawan } from '../common/sapaan.util';

/** Karyawan wajib check-in paling cepat H-2 jam sebelum waktu berangkat rencana. */
const JENDELA_CHECKIN_MS = 2 * 60 * 60 * 1000;

const formatWaktuWita = (waktu: Date) =>
  waktu.toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Makassar',
  });

/** Tanggal saja (tanpa jam) untuk baris "Jadwal" di template notifikasi WA. */
const formatTanggalWita = (waktu: Date) =>
  waktu.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Makassar',
  });

/** Jam saja (tanpa tanggal) untuk baris "Jam" di template notifikasi WA. */
const formatJamWita = (waktu: Date) =>
  waktu.toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Makassar',
  });

@Injectable()
export class TravelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly file: TravelFileService,
    private readonly akses: TravelAksesService,
    private readonly whatsapp: WhatsappService,
  ) {}

  // ==================================================
  // ADMIN — Driver
  // ==================================================

  async daftarDriver() {
    return this.prisma.driver.findMany({
      include: {
        users: { select: { id: true, name: true, username: true } },
        _count: { select: { travelJadwal: true } },
      },
      orderBy: { nama: 'asc' },
    });
  }

  async buatDriver(dto: BuatDriverDto) {
    if ((dto.username && !dto.password) || (!dto.username && dto.password)) {
      throw new BadRequestException('Username dan password akun login harus diisi bersamaan');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        const driver = await tx.driver.create({
          data: { nama: dto.nama.trim(), noTelepon: dto.noTelepon?.trim() || null },
        });

        if (dto.username && dto.password) {
          const passwordHash = await bcrypt.hash(dto.password, 12);

          await tx.user.create({
            data: {
              name: dto.nama.trim(),
              username: dto.username.trim(),
              passwordHash,
              role: UserRole.DRIVER,
              accessKeys: [],
              driverId: driver.id,
            },
          });
        }

        return tx.driver.findUnique({
          where: { id: driver.id },
          include: { users: { select: { id: true, name: true, username: true } } },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('Username sudah digunakan');
      }
      throw error;
    }
  }

  async ubahDriver(id: number, dto: UbahDriverDto) {
    const driver = await this.prisma.driver.findUnique({ where: { id } });

    if (!driver) {
      throw new NotFoundException('Driver tidak ditemukan');
    }

    return this.prisma.driver.update({
      where: { id },
      data: {
        ...(dto.nama !== undefined ? { nama: dto.nama.trim() } : {}),
        ...(dto.noTelepon !== undefined ? { noTelepon: dto.noTelepon?.trim() || null } : {}),
        ...(dto.statusAktif !== undefined ? { statusAktif: dto.statusAktif } : {}),
      },
    });
  }

  async hapusDriver(id: number) {
    const driver = await this.prisma.driver.findUnique({
      where: { id },
      include: { _count: { select: { travelJadwal: true } } },
    });

    if (!driver) {
      throw new NotFoundException('Driver tidak ditemukan');
    }

    if (driver._count.travelJadwal > 0) {
      throw new BadRequestException('Driver sudah memiliki jadwal Travel, tidak dapat dihapus');
    }

    await this.prisma.driver.delete({ where: { id } });

    return { message: 'Driver berhasil dihapus' };
  }

  // ==================================================
  // ADMIN — Jadwal Travel
  // ==================================================

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

  async dashboard() {
    const sekarang = new Date();
    const tahun = sekarang.getUTCFullYear();
    const awalTahun = new Date(Date.UTC(tahun, 0, 1));
    const akhirTahun = new Date(Date.UTC(tahun + 1, 0, 1));
    const awalBulan = new Date(Date.UTC(tahun, sekarang.getUTCMonth(), 1));
    const akhirBulan = new Date(Date.UTC(tahun, sekarang.getUTCMonth() + 1, 1));

    const [totalJadwal, jadwalBulanIni, jadwalTahunIni, statusBreakdown] = await Promise.all([
      this.prisma.travelJadwal.count(),
      this.prisma.travelJadwal.count({
        where: { waktuBerangkatRencana: { gte: awalBulan, lt: akhirBulan } },
      }),
      this.prisma.travelJadwal.findMany({
        where: { waktuBerangkatRencana: { gte: awalTahun, lt: akhirTahun } },
        select: { waktuBerangkatRencana: true },
      }),
      this.prisma.travelJadwal.groupBy({
        by: ['status'],
        _count: { _all: true },
      }),
    ]);

    const totalPerBulan = Array.from({ length: 12 }, () => 0);

    for (const row of jadwalTahunIni) {
      totalPerBulan[row.waktuBerangkatRencana.getUTCMonth()] += 1;
    }

    const totalStatus = (status: StatusTravel) =>
      statusBreakdown.find((row) => row.status === status)?._count._all ?? 0;

    return {
      totalJadwal,
      jadwalBulanIni,
      tahun,
      trenBulanan: totalPerBulan.map((total, index) => ({ bulan: index + 1, total })),
      breakdownStatus: [
        { status: StatusTravel.DIJADWALKAN, total: totalStatus(StatusTravel.DIJADWALKAN) },
        { status: StatusTravel.BERJALAN, total: totalStatus(StatusTravel.BERJALAN) },
        { status: StatusTravel.SELESAI, total: totalStatus(StatusTravel.SELESAI) },
        { status: StatusTravel.DIBATALKAN, total: totalStatus(StatusTravel.DIBATALKAN) },
      ],
    };
  }

  async daftarJadwalAdmin(filter: {
    status?: StatusTravel;
    bulan?: number;
    tahun?: number;
    halaman?: string;
    ukuranHalaman?: string;
  } = {}) {
    // Filter bulan/tahun dipindah ke sini (dulu di frontend, cuma memfilter
    // baris yang sudah termuat) supaya tetap benar walau daftarnya dipaginate.
    const tahunEfektif = filter.tahun ?? (filter.bulan ? new Date().getUTCFullYear() : undefined);
    const rentangTanggal = tahunEfektif
      ? {
          gte: new Date(Date.UTC(tahunEfektif, filter.bulan ? filter.bulan - 1 : 0, 1)),
          lt: filter.bulan
            ? new Date(Date.UTC(tahunEfektif, filter.bulan, 1))
            : new Date(Date.UTC(tahunEfektif + 1, 0, 1)),
        }
      : undefined;

    const where = {
      ...(filter.status ? { status: filter.status } : {}),
      ...(rentangTanggal ? { waktuBerangkatRencana: rentangTanggal } : {}),
    };
    const param = paramHalaman(filter.halaman, filter.ukuranHalaman);

    const [data, total] = await Promise.all([
      this.prisma.travelJadwal.findMany({
        where,
        include: {
          driver: { select: { id: true, nama: true } },
          _count: { select: { penumpang: true } },
        },
        orderBy: { waktuBerangkatRencana: 'desc' },
        skip: param.skip,
        take: param.take,
      }),
      this.prisma.travelJadwal.count({ where }),
    ]);

    return hasilHalaman(data, total, param);
  }

  private async jadwalAtauThrow(id: number) {
    const jadwal = await this.prisma.travelJadwal.findUnique({
      where: { id },
      include: {
        driver: true,
        penumpang: {
          include: {
            karyawan: {
              select: { id: true, nama: true, nik: true, departemen: { select: { namaDepartemen: true } } },
            },
          },
          orderBy: { id: 'asc' },
        },
      },
    });

    if (!jadwal) {
      throw new NotFoundException('Jadwal Travel tidak ditemukan');
    }

    return jadwal;
  }

  async detailJadwalAdmin(id: number) {
    return this.jadwalAtauThrow(id);
  }

  async buatJadwal(dto: BuatJadwalDto, aktorId: number) {
    const driver = await this.prisma.driver.findUnique({ where: { id: dto.driverId } });

    if (!driver || !driver.statusAktif) {
      throw new BadRequestException('Driver tidak ditemukan atau tidak aktif');
    }

    const waktu = new Date(dto.waktuBerangkatRencana);

    if (Number.isNaN(waktu.getTime())) {
      throw new BadRequestException('Format waktu berangkat tidak valid');
    }

    const karyawanIds = [...new Set(dto.karyawanIds)];
    const jumlahKaryawan = await this.prisma.karyawan.count({ where: { id: { in: karyawanIds } } });

    if (jumlahKaryawan !== karyawanIds.length) {
      throw new BadRequestException('Sebagian karyawan yang dipilih tidak ditemukan');
    }

    const jadwal = await this.prisma.travelJadwal.create({
      data: {
        armada: dto.armada.trim(),
        driverId: dto.driverId,
        asal: dto.asal?.trim() || null,
        tujuan: dto.tujuan.trim(),
        waktuBerangkatRencana: waktu,
        catatan: dto.catatan?.trim() || null,
        createdBy: aktorId,
        penumpang: { create: karyawanIds.map((karyawanId) => ({ karyawanId })) },
      },
    });

    await this.notifikasiPenumpangBaru(karyawanIds, dto.tujuan.trim(), waktu);

    return this.jadwalAtauThrow(jadwal.id);
  }

  /** Notifikasi WA ke akun tiap karyawan penumpang, pakai nomor dari data akunnya. */
  private async notifikasiPenumpangBaru(
    karyawanIds: number[],
    tujuan: string,
    waktu: Date,
  ) {
    if (!this.whatsapp.aktif) {
      return;
    }

    const daftarKaryawan = await this.prisma.karyawan.findMany({
      where: { id: { in: karyawanIds } },
      select: { nama: true, gender: true, noTelepon: true, akun: { select: { phoneNumber: true } } },
    });

    const tanggalText = formatTanggalWita(waktu);
    const jamText = formatJamWita(waktu);

    for (const karyawan of daftarKaryawan) {
      const nomor = karyawan.akun?.phoneNumber || karyawan.noTelepon;

      if (!nomor) {
        continue;
      }

      const pesan =
        `Halo ${sapaanKaryawan(karyawan.gender)} ${karyawan.nama} 👋\n\n` +
        `*Jadwal Travel* Anda\n\n` +
        `📍 Tujuan : ${tujuan}\n` +
        `🗓️ Jadwal : ${tanggalText}\n` +
        `🕐 Jam    : ${jamText} WITA\n\n` +
        `Mohon perhatikan jadwal berikut dan mohon konfirmasinya jika tidak sesuai, terima kasih 🙏`;

      await this.whatsapp.kirim(nomor, pesan);
    }
  }

  async ubahJadwal(id: number, dto: UbahJadwalDto) {
    const jadwal = await this.jadwalAtauThrow(id);

    if (jadwal.status !== StatusTravel.DIJADWALKAN && (dto.armada || dto.driverId || dto.waktuBerangkatRencana || dto.karyawanIds)) {
      throw new BadRequestException('Jadwal yang sudah berjalan/selesai tidak dapat diubah, kecuali dibatalkan');
    }

    if (dto.driverId !== undefined) {
      const driver = await this.prisma.driver.findUnique({ where: { id: dto.driverId } });
      if (!driver || !driver.statusAktif) {
        throw new BadRequestException('Driver tidak ditemukan atau tidak aktif');
      }
    }

    let waktu: Date | undefined;
    if (dto.waktuBerangkatRencana !== undefined) {
      waktu = new Date(dto.waktuBerangkatRencana);
      if (Number.isNaN(waktu.getTime())) {
        throw new BadRequestException('Format waktu berangkat tidak valid');
      }
    }

    if (dto.karyawanIds) {
      const karyawanIds = [...new Set(dto.karyawanIds)];
      const jumlahKaryawan = await this.prisma.karyawan.count({ where: { id: { in: karyawanIds } } });

      if (jumlahKaryawan !== karyawanIds.length) {
        throw new BadRequestException('Sebagian karyawan yang dipilih tidak ditemukan');
      }

      await this.prisma.$transaction([
        this.prisma.travelPenumpang.deleteMany({ where: { travelId: id } }),
        this.prisma.travelPenumpang.createMany({
          data: karyawanIds.map((karyawanId) => ({ travelId: id, karyawanId })),
        }),
      ]);
    }

    await this.prisma.travelJadwal.update({
      where: { id },
      data: {
        ...(dto.armada !== undefined ? { armada: dto.armada.trim() } : {}),
        ...(dto.driverId !== undefined ? { driverId: dto.driverId } : {}),
        ...(dto.asal !== undefined ? { asal: dto.asal?.trim() || null } : {}),
        ...(dto.tujuan !== undefined ? { tujuan: dto.tujuan.trim() } : {}),
        ...(waktu !== undefined ? { waktuBerangkatRencana: waktu } : {}),
        ...(dto.catatan !== undefined ? { catatan: dto.catatan?.trim() || null } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
    });

    return this.jadwalAtauThrow(id);
  }

  /**
   * Perubahan jadwal dadakan (delay, dsb.) — beda dari ubahJadwal() biasa:
   * SELALU kirim notifikasi WA khusus yang menyebutkan jadwal lama & baru
   * ke seluruh penumpang, dan alasannya ikut dicatat ke catatan jadwal.
   */
  async rescheduleJadwal(id: number, dto: RescheduleJadwalDto) {
    const jadwal = await this.jadwalAtauThrow(id);

    if (jadwal.status !== StatusTravel.DIJADWALKAN) {
      throw new BadRequestException('Jadwal yang sudah berjalan/selesai/dibatalkan tidak dapat di-reschedule');
    }

    const waktuBaru = new Date(dto.waktuBerangkatRencana);

    if (Number.isNaN(waktuBaru.getTime())) {
      throw new BadRequestException('Format waktu berangkat tidak valid');
    }

    const waktuLama = jadwal.waktuBerangkatRencana;

    await this.prisma.travelJadwal.update({
      where: { id },
      data: {
        waktuBerangkatRencana: waktuBaru,
        catatan: dto.alasan?.trim()
          ? `${jadwal.catatan ? `${jadwal.catatan}\n` : ''}Reschedule: ${dto.alasan.trim()}`
          : jadwal.catatan,
      },
    });

    await this.notifikasiReschedule(jadwal, waktuLama, waktuBaru, dto.alasan);

    return this.jadwalAtauThrow(id);
  }

  /** Notifikasi WA khusus reschedule — beda dari jadwal baru, sebut jelas jadwal lama & baru ke seluruh penumpang. */
  private async notifikasiReschedule(
    jadwal: {
      tujuan: string;
      penumpang: { karyawanId: number }[];
    },
    waktuLama: Date,
    waktuBaru: Date,
    alasan: string | undefined,
  ) {
    if (!this.whatsapp.aktif) {
      return;
    }

    const karyawanIds = jadwal.penumpang.map((p) => p.karyawanId);

    if (karyawanIds.length === 0) {
      return;
    }

    const daftarKaryawan = await this.prisma.karyawan.findMany({
      where: { id: { in: karyawanIds } },
      select: { nama: true, gender: true, noTelepon: true, akun: { select: { phoneNumber: true } } },
    });

    for (const karyawan of daftarKaryawan) {
      const nomor = karyawan.akun?.phoneNumber || karyawan.noTelepon;

      if (!nomor) {
        continue;
      }

      const pesan =
        `Halo ${sapaanKaryawan(karyawan.gender)} ${karyawan.nama} 👋\n\n` +
        `*Perubahan Jadwal Travel* Anda${alasan?.trim() ? ` (${alasan.trim()})` : ''}\n\n` +
        `📍 Tujuan     : ${jadwal.tujuan}\n` +
        `🕐 Jadwal Lama: ${formatWaktuWita(waktuLama)} WITA\n` +
        `🕐 Jadwal Baru: ${formatWaktuWita(waktuBaru)} WITA\n\n` +
        `Mohon perhatikan perubahan jadwal berikut dan mohon konfirmasinya jika tidak sesuai, terima kasih 🙏`;

      await this.whatsapp.kirim(nomor, pesan);
    }
  }

  async hapusJadwal(id: number) {
    const jadwal = await this.jadwalAtauThrow(id);

    if (jadwal.status !== StatusTravel.DIJADWALKAN) {
      throw new BadRequestException('Jadwal yang sudah berjalan/selesai tidak dapat dihapus');
    }

    await this.prisma.travelJadwal.delete({ where: { id } });

    return { message: 'Jadwal Travel berhasil dihapus' };
  }

  // ==================================================
  // SELF-SERVICE KARYAWAN
  // ==================================================

  async daftarSaya(aktorId: number) {
    const karyawan = await this.akses.karyawanDariAkun(aktorId);

    return this.prisma.travelPenumpang.findMany({
      where: { karyawanId: karyawan.id },
      include: {
        travel: { include: { driver: { select: { id: true, nama: true } } } },
      },
      orderBy: { travel: { waktuBerangkatRencana: 'desc' } },
    });
  }

  private async penumpangSayaAtauThrow(aktorId: number, travelId: number) {
    const karyawan = await this.akses.karyawanDariAkun(aktorId);
    const jadwal = await this.jadwalAtauThrow(travelId);

    const penumpang = await this.prisma.travelPenumpang.findUnique({
      where: { travelId_karyawanId: { travelId, karyawanId: karyawan.id } },
    });

    if (!penumpang) {
      throw new ForbiddenException('Anda tidak terdaftar sebagai penumpang jadwal ini');
    }

    return { karyawan, jadwal, penumpang };
  }

  async detailSaya(aktorId: number, travelId: number) {
    const { jadwal, penumpang } = await this.penumpangSayaAtauThrow(aktorId, travelId);
    return { jadwal, penumpangSaya: penumpang };
  }

  async checkin(aktorId: number, travelId: number) {
    const { jadwal, penumpang } = await this.penumpangSayaAtauThrow(aktorId, travelId);

    if (penumpang.checkInWaktu) {
      throw new BadRequestException('Anda sudah check-in untuk jadwal ini');
    }

    const sisaMs = jadwal.waktuBerangkatRencana.getTime() - Date.now();

    if (sisaMs > JENDELA_CHECKIN_MS) {
      throw new BadRequestException('Check-in baru bisa dilakukan mulai H-2 jam sebelum keberangkatan');
    }

    return this.prisma.travelPenumpang.update({
      where: { id: penumpang.id },
      data: { checkInWaktu: new Date() },
    });
  }

  async checkout(aktorId: number, travelId: number) {
    const { penumpang } = await this.penumpangSayaAtauThrow(aktorId, travelId);

    if (!penumpang.checkInWaktu) {
      throw new BadRequestException('Anda belum check-in untuk jadwal ini');
    }

    if (penumpang.checkOutWaktu) {
      throw new BadRequestException('Anda sudah check-out untuk jadwal ini');
    }

    return this.prisma.travelPenumpang.update({
      where: { id: penumpang.id },
      data: { checkOutWaktu: new Date() },
    });
  }

  async rating(aktorId: number, travelId: number, dto: RatingTravelDto) {
    const { penumpang } = await this.penumpangSayaAtauThrow(aktorId, travelId);

    if (!penumpang.checkOutWaktu) {
      throw new BadRequestException('Rating hanya dapat diisi setelah Anda check-out');
    }

    if (penumpang.ratingBintang) {
      throw new BadRequestException('Anda sudah memberi rating untuk perjalanan ini');
    }

    return this.prisma.travelPenumpang.update({
      where: { id: penumpang.id },
      data: { ratingBintang: dto.bintang, ratingUlasan: dto.ulasan?.trim() || null },
    });
  }

  // ==================================================
  // DRIVER
  // ==================================================

  async daftarTripSaya(aktorId: number) {
    const driver = await this.akses.driverDariAkun(aktorId);

    const trip = await this.prisma.travelJadwal.findMany({
      where: { driverId: driver.id },
      include: { penumpang: { select: { checkInWaktu: true } } },
      orderBy: { waktuBerangkatRencana: 'desc' },
    });

    return trip.map(({ penumpang, ...rest }) => ({
      ...rest,
      jumlahPenumpang: penumpang.length,
      jumlahCheckin: penumpang.filter((p) => p.checkInWaktu).length,
    }));
  }

  async detailTrip(aktorId: number, travelId: number) {
    const driver = await this.akses.driverDariAkun(aktorId);
    const jadwal = await this.jadwalAtauThrow(travelId);

    this.akses.wajibPemilikTrip(driver.id, jadwal.driverId);

    return jadwal;
  }

  async driverCheckin(aktorId: number, travelId: number, foto?: Express.Multer.File) {
    const driver = await this.akses.driverDariAkun(aktorId);
    const jadwal = await this.jadwalAtauThrow(travelId);

    this.akses.wajibPemilikTrip(driver.id, jadwal.driverId);

    if (jadwal.status !== StatusTravel.DIJADWALKAN) {
      throw new BadRequestException('Jadwal ini sudah check-in/selesai sebelumnya');
    }

    if (!foto) {
      throw new BadRequestException('Foto check-in wajib diunggah');
    }

    const fotoUrl = this.file.simpanFoto(foto, travelId);

    return this.prisma.travelJadwal.update({
      where: { id: travelId },
      data: { driverCheckIn: new Date(), driverCheckInFoto: fotoUrl, status: StatusTravel.BERJALAN },
    });
  }

  async driverCheckout(aktorId: number, travelId: number) {
    const driver = await this.akses.driverDariAkun(aktorId);
    const jadwal = await this.jadwalAtauThrow(travelId);

    this.akses.wajibPemilikTrip(driver.id, jadwal.driverId);

    if (!jadwal.driverCheckIn) {
      throw new BadRequestException('Anda belum check-in keberangkatan');
    }

    if (jadwal.driverCheckOut) {
      throw new BadRequestException('Jadwal ini sudah check-out sebelumnya');
    }

    const sekarang = new Date();
    const durasiMenit = Math.round((sekarang.getTime() - jadwal.driverCheckIn.getTime()) / 60000);

    return this.prisma.travelJadwal.update({
      where: { id: travelId },
      data: { driverCheckOut: sekarang, durasiMenit, status: StatusTravel.SELESAI },
    });
  }
}
