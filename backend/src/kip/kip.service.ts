// ==================================================
// FILE: backend/src/kip/kip.service.ts
// FUNGSI: Kartu Inspeksi Peralatan — admin, scan publik, dan ceklis bulanan
// Lokasi (6 pilihan tetap) berperan langsung sebagai "barcode" — tidak ada
// tabel Barcode terpisah, satu form KIP sudah cukup untuk semuanya.
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LokasiHousekeepingIndoor, Prisma, StatusChecklistKip, UserRole } from '@prisma/client';
import * as QRCode from 'qrcode';
import { PrismaService } from '../prisma/prisma.service';
import { KipAksesService } from './kip-akses.service';
import { BuatKipDto, LOKASI_HOUSEKEEPING_INDOOR, SimpanGpsLokasiDto } from './dto/kip.dto';

/** Radius toleransi jarak dari titik GPS acuan lokasi (meter) — akurasi GPS ponsel di dalam gedung cukup longgar. */
const RADIUS_TOLERANSI_METER = 200;

/** Jarak antar dua titik GPS pakai formula Haversine (meter). */
function jarakMeter(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const KIP_INCLUDE = {
  checklist: {
    orderBy: { bulan: 'asc' as const },
    include: { pemeriksa: { select: { id: true, name: true } } },
  },
} satisfies Prisma.KipInclude;

@Injectable()
export class KipService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: KipAksesService,
  ) {}

  private validasiLokasi(kode: string): LokasiHousekeepingIndoor {
    if (!LOKASI_HOUSEKEEPING_INDOOR.includes(kode as LokasiHousekeepingIndoor)) {
      throw new NotFoundException('Lokasi tidak dikenali');
    }

    return kode as LokasiHousekeepingIndoor;
  }

  // ==================================================
  // ADMIN — KIP
  // ==================================================

  async daftarKip(lokasi?: string, tahun?: number) {
    return this.prisma.kip.findMany({
      where: {
        ...(lokasi ? { lokasi: this.validasiLokasi(lokasi) } : {}),
        ...(tahun ? { tahun } : {}),
      },
      include: KIP_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async buatKip(dto: BuatKipDto, aktorId: number) {
    try {
      return await this.prisma.kip.create({
        data: {
          noKip: dto.noKip.trim(),
          jenisPeralatan: dto.jenisPeralatan.trim(),
          departemen: dto.departemen.trim(),
          tahun: dto.tahun,
          lokasi: dto.lokasi,
          createdBy: aktorId,
          checklist: {
            createMany: {
              data: Array.from({ length: 12 }, (_, i) => ({ bulan: i + 1 })),
            },
          },
        },
        include: KIP_INCLUDE,
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new BadRequestException('No. KIP sudah terdaftar');
      }
      throw error;
    }
  }

  async hapusKip(id: number) {
    const kip = await this.prisma.kip.findUnique({ where: { id } });

    if (!kip) {
      throw new NotFoundException('KIP tidak ditemukan');
    }

    await this.prisma.kip.delete({ where: { id } });

    return { message: 'KIP berhasil dihapus' };
  }

  /** SVG QR code untuk dicetak/ditempel di lokasi — isinya URL tujuan yang dikirim frontend. */
  async qrSvg(lokasi: string, target: string): Promise<string> {
    this.validasiLokasi(lokasi);

    return QRCode.toString(target, { type: 'svg', margin: 1, width: 400 });
  }

  /** Simpan/perbarui titik GPS acuan satu lokasi — diisi admin sekali saat cetak barcode di lokasi tsb. */
  async simpanGpsLokasi(lokasi: string, dto: SimpanGpsLokasiDto) {
    const lok = this.validasiLokasi(lokasi);

    return this.prisma.kipLokasiGps.upsert({
      where: { lokasi: lok },
      update: { latitude: dto.latitude, longitude: dto.longitude },
      create: { lokasi: lok, latitude: dto.latitude, longitude: dto.longitude },
    });
  }

  async gpsLokasi(lokasi: string) {
    const lok = this.validasiLokasi(lokasi);
    return this.prisma.kipLokasiGps.findUnique({ where: { lokasi: lok } });
  }

  // ==================================================
  // PUBLIK — scan lokasi
  // ==================================================

  async statusByKode(kode: string) {
    const lokasi = this.validasiLokasi(kode.trim());

    const [kip, gps] = await Promise.all([
      this.prisma.kip.findMany({
        where: { lokasi },
        include: KIP_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.kipLokasiGps.findUnique({ where: { lokasi } }),
    ]);

    return { lokasi, kip, gps };
  }

  // ==================================================
  // CEKLIS BULANAN (Tim Elektrik / Admin)
  // ==================================================

  async ceklis(
    role: UserRole,
    aktorId: number,
    kipId: number,
    bulan: number,
    lokasiSekarang?: { latitude: number; longitude: number },
  ) {
    this.akses.wajibElektrik(role);

    if (bulan < 1 || bulan > 12) {
      throw new BadRequestException('Bulan tidak valid');
    }

    const baris = await this.prisma.kipChecklistBulan.findUnique({
      where: { kipId_bulan: { kipId, bulan } },
      include: { kip: { select: { lokasi: true } } },
    });

    if (!baris) {
      throw new NotFoundException('Checklist bulan ini tidak ditemukan');
    }

    if (baris.status === StatusChecklistKip.SUDAH) {
      throw new BadRequestException('Bulan ini sudah diceklis sebelumnya');
    }

    const gps = await this.prisma.kipLokasiGps.findUnique({
      where: { lokasi: baris.kip.lokasi },
    });

    // Lokasi sudah punya titik GPS acuan — wajib berada di sana untuk ceklis.
    if (gps) {
      if (!lokasiSekarang) {
        throw new BadRequestException(
          'Lokasi GPS Anda tidak terdeteksi. Aktifkan akses lokasi lalu coba lagi.',
        );
      }

      const jarak = jarakMeter(
        gps.latitude,
        gps.longitude,
        lokasiSekarang.latitude,
        lokasiSekarang.longitude,
      );

      if (jarak > RADIUS_TOLERANSI_METER) {
        throw new BadRequestException(
          `Anda berada ${Math.round(jarak)} m dari lokasi. Ceklis hanya bisa dilakukan di lokasi peralatan.`,
        );
      }
    }

    return this.prisma.kipChecklistBulan.update({
      where: { id: baris.id },
      data: {
        status: StatusChecklistKip.SUDAH,
        diperiksaOleh: aktorId,
        tanggalPeriksa: new Date(),
      },
    });
  }
}
