// ==================================================
// FILE: backend/src/pengaduan-layanan/pengaduan-layanan-akses.service.ts
// FUNGSI: Penjaga peran — rekap performa (siapa isi rating apa) hanya
// boleh dilihat Admin/Super Admin/Section Head/Elektrik/Korlap, tidak
// digantung ke sistem accessKey biasa yang bisa di-grant bebas ke karyawan.
// ==================================================

import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

const ROLE_BOLEH_LIHAT_REKAP: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.SECTION_HEAD,
];
const ROLE_BOLEH_LIHAT_ADUAN: UserRole[] = [
  ...ROLE_BOLEH_LIHAT_REKAP,
  UserRole.KORLAP,
  UserRole.ELEKTRIK,
];

const PESAN_TOLAK = 'Rekap performa hanya dapat diakses Admin, Section Head, dan Admin HC';

@Injectable()
export class PengaduanLayananAksesService {
  wajibBolehLihatRekap(role: UserRole): void {
    if (!ROLE_BOLEH_LIHAT_REKAP.includes(role)) {
      throw new ForbiddenException(PESAN_TOLAK);
    }
  }

  wajibBolehLihatDaftar(role: UserRole): void {
    if (!ROLE_BOLEH_LIHAT_ADUAN.includes(role)) {
      throw new ForbiddenException('Daftar aduan layanan hanya dapat diakses Admin, Admin HC, Section Head, Korlap, dan Elektrik');
    }
  }

  /** Approve/Hold/Reject pengaduan — peran sama dengan yang boleh lihat rekap. */
  wajibBolehKelolaStatus(role: UserRole): void {
    if (!ROLE_BOLEH_LIHAT_REKAP.includes(role)) {
      throw new ForbiddenException(PESAN_TOLAK);
    }
  }
}
