// ==================================================
// FILE: backend/src/pengaduan-layanan/pengaduan-layanan-akses.service.ts
// FUNGSI: Penjaga peran — rekap performa (siapa isi rating apa) hanya
// boleh dilihat Admin/Super Admin/Section Head, tidak digantung ke
// sistem accessKey biasa yang bisa di-grant bebas ke karyawan.
// ==================================================

import { ForbiddenException, Injectable } from '@nestjs/common';
import { UserRole } from '@prisma/client';

const ROLE_BOLEH_LIHAT_REKAP: UserRole[] = [
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
  UserRole.SECTION_HEAD,
];

@Injectable()
export class PengaduanLayananAksesService {
  wajibBolehLihatRekap(role: UserRole): void {
    if (!ROLE_BOLEH_LIHAT_REKAP.includes(role)) {
      throw new ForbiddenException(
        'Rekap performa hanya dapat diakses Admin/Super Admin/Section Head',
      );
    }
  }
}
