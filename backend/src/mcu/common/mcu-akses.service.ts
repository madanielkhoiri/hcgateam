// ==================================================
// FILE: backend/src/mcu/common/mcu-akses.service.ts
// FUNGSI: Penjaga hak akses berdasarkan role akun (satu akun = satu role)
// Referensi: Bagian 2 & 6 alur-workflow-mcu-periodik-v3.md
// ==================================================

import { ForbiddenException, Injectable } from '@nestjs/common';
import { TipePengunggah, UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AktorMcu } from './mcu-aktor';

/** Admin portal otomatis punya akses penuh ke seluruh peran MCU. */
const ROLE_PORTAL_SUPER: UserRole[] = [UserRole.ADMIN, UserRole.SUPER_ADMIN];

/** Enam kategori akun MCU sesuai Bagian 2 dokumen alur (di luar admin portal). */
const ROLE_MCU: UserRole[] = [
  UserRole.KARYAWAN,
  UserRole.ADMIN_DEPT,
  UserRole.HC,
  UserRole.DOKTER,

  
  UserRole.SHE,
  UserRole.KLINIK,
];

export const LABEL_PERAN: Partial<Record<UserRole, string>> = {
  KARYAWAN: 'Karyawan',
  ADMIN_DEPT: 'Admin Dept',
  HC: 'HC',
  DOKTER: 'Dokter',
  SHE: 'SHE (K3)',
  KLINIK: 'Klinik Provider',
};

@Injectable()
export class McuAksesService {
  constructor(private readonly prisma: PrismaService) {}

  private superAdmin(aktor: AktorMcu): boolean {
    return ROLE_PORTAL_SUPER.includes(aktor.role);
  }

  /**
   * Role efektif akun ini pada alur MCU. Admin portal dianggap memegang
   * seluruh peran MCU sekaligus; akun lain persis satu role (kolom role).
   */
  peranAktor(aktor: AktorMcu): UserRole[] {
    if (this.superAdmin(aktor)) {
      return ROLE_MCU;
    }

    return [aktor.role];
  }

  punyaPeran(aktor: AktorMcu, ...peran: UserRole[]): boolean {
    const dimiliki = this.peranAktor(aktor);
    return peran.some((item) => dimiliki.includes(item));
  }

  /** Lempar 403 bila role akun bukan salah satu role yang diminta. */
  wajibPeran(aktor: AktorMcu, ...peran: UserRole[]): void {
    if (this.punyaPeran(aktor, ...peran)) {
      return;
    }

    const label = peran.map((item) => LABEL_PERAN[item] ?? item).join(' / ');

    throw new ForbiddenException(
      `Aksi ini hanya dapat dilakukan oleh akun ${label}`,
    );
  }

  /** Profil karyawan yang tertaut ke akun (untuk role Karyawan). */
  async karyawanDariAkun(aktor: AktorMcu) {
    return this.prisma.karyawan.findUnique({
      where: { akunId: aktor.id },
      include: { departemen: true },
    });
  }

  /** Klinik yang tertaut ke akun (untuk role Klinik terkoneksi). */
  async klinikDariAkun(aktor: AktorMcu) {
    return this.prisma.klinik.findFirst({
      where: { akunId: aktor.id, statusAktif: true },
    });
  }

  /** Departemen yang di-handle satu akun Admin Dept. */
  async departemenDariAkun(aktor: AktorMcu) {
    return this.prisma.departemen.findMany({
      where: { adminAkunId: aktor.id, aktif: true },
      select: { id: true, namaDepartemen: true },
    });
  }

  /**
   * Admin Dept hanya boleh menyentuh data departemennya sendiri.
   * HC dan admin portal bebas lintas departemen.
   */
  async wajibDepartemenSendiri(
    aktor: AktorMcu,
    departemenId: number,
  ): Promise<void> {
    if (this.punyaPeran(aktor, UserRole.HC)) {
      return;
    }

    const departemen = await this.departemenDariAkun(aktor);

    if (!departemen.some((item) => item.id === departemenId)) {
      throw new ForbiddenException(
        'Akun Admin Dept hanya dapat mengelola departemennya sendiri',
      );
    }
  }

  /** Menentukan label pengunggah file berdasarkan role aktor. */
  tipePengunggah(aktor: AktorMcu): TipePengunggah {
    const peran = this.peranAktor(aktor);

    if (peran.includes(UserRole.HC)) {
      return TipePengunggah.HC;
    }

    if (peran.includes(UserRole.KLINIK)) {
      return TipePengunggah.KLINIK_TERKONEKSI;
    }

    if (peran.includes(UserRole.ADMIN_DEPT)) {
      return TipePengunggah.ADMIN_DEPT;
    }

    return TipePengunggah.KARYAWAN;
  }

  /**
   * File hasil MCU/FU mentah hanya boleh dibuka HC dan Dokter (Bagian 6).
   */
  wajibBolehLihatFileMedis(aktor: AktorMcu): void {
    this.wajibPeran(aktor, UserRole.HC, UserRole.DOKTER);
  }
}
