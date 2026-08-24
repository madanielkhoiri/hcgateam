// ==================================================
// FILE: backend/src/travel/travel-akses.service.ts
// FUNGSI: Resolve profil Karyawan/Driver dari akun yang sedang login
// ==================================================

import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TravelAksesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolve Karyawan milik akun ini. Kalau belum pernah ditautkan, coba
   * otomatis tautkan lewat username akun (dipakai sebagai NRP/NIK di
   * sistem ini) yang cocok dengan NIK Karyawan — sama seperti
   * TiketService.karyawanSayaOtomatis, supaya karyawan tidak perlu ketik
   * ulang NRP-nya secara manual kalau datanya sudah cocok.
   */
  async karyawanDariAkun(aktorId: number) {
    const tertaut = await this.prisma.karyawan.findUnique({ where: { akunId: aktorId } });

    if (tertaut) {
      return tertaut;
    }

    const akun = await this.prisma.user.findUnique({
      where: { id: aktorId },
      select: { nrp: true, username: true },
    });

    const kandidatNik = akun?.nrp?.trim() || akun?.username?.trim();
    const karyawan = kandidatNik
      ? await this.prisma.karyawan.findUnique({ where: { nik: kandidatNik } })
      : null;

    if (!karyawan || karyawan.akunId) {
      throw new NotFoundException('Akun ini tidak tertaut ke data Karyawan');
    }

    return this.prisma.karyawan.update({ where: { id: karyawan.id }, data: { akunId: aktorId } });
  }

  async driverDariAkun(aktorId: number) {
    const driver = await this.prisma.driver.findFirst({
      where: { users: { some: { id: aktorId } } },
    });

    if (!driver) {
      throw new NotFoundException('Akun ini tidak tertaut ke profil Driver');
    }

    return driver;
  }

  wajibPemilikTrip(driverIdAktor: number, travelDriverId: number): void {
    if (driverIdAktor !== travelDriverId) {
      throw new ForbiddenException('Jadwal travel ini bukan milik Anda');
    }
  }
}
