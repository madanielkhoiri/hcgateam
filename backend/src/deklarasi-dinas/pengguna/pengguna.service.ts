import { Injectable, NotFoundException } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// <--- fitur service manajemen pengguna --->
// Pembuatan/ubah akun sudah ditangani oleh Manajemen Akun (HC) via
// Database Karyawan; modul ini kini hanya menyediakan lookup read-only
// untuk halaman Laporan & Pengajuan Deklarasi Dinas.
@Injectable()
export class PenggunaService {
  constructor(private readonly prisma: PrismaService) {}

  private formatHasilPengguna(pengguna: User) {
    return {
      id: pengguna.id,
      nrp: pengguna.nrp,
      nama: pengguna.name,
      email: pengguna.email,
      nomor_telepon: pengguna.phoneNumber,
      role: pengguna.role,
      aktif: pengguna.isActive,
      kode_tiket: pengguna.ticketCode,
      dibuat_pada: pengguna.createdAt,
      diperbarui_pada: pengguna.updatedAt,
    };
  }

  async ambilSemuaPengguna() {
    const daftarPengguna = await this.prisma.user.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    return daftarPengguna.map((pengguna) => this.formatHasilPengguna(pengguna));
  }

  async ambilPenggunaBerdasarkanId(id: number) {
    const pengguna = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!pengguna) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    return this.formatHasilPengguna(pengguna);
  }
}
// <--- end --->
