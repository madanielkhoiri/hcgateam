import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';

import { BuatPenggunaDto } from './dto/buat-pengguna.dto';
import { EditPenggunaDto } from './dto/edit-pengguna.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, User, UserRole } from '@prisma/client';

// <--- fitur service manajemen pengguna --->
@Injectable()
export class PenggunaService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private bersihkanTeks(nilai?: string | null) {
    const teks = nilai?.trim();

    return teks ? teks : null;
  }

  private formatHasilPengguna(pengguna: User) {
    const { passwordHash, ...hasil } = pengguna;

    return {
      id: hasil.id,
      nrp: hasil.nrp,
      nama: hasil.name,
      email: hasil.email,
      nomor_telepon: hasil.phoneNumber,
      role: hasil.role,
      aktif: hasil.isActive,
      kode_tiket: hasil.ticketCode,
      kata_sandi: passwordHash,
      dibuat_pada: hasil.createdAt,
      diperbarui_pada: hasil.updatedAt,
    };
  }

  private buatKodeTiket(nama: string, nrp: string) {
    const namaBersih = nama
      .replace(/[^a-zA-Z0-9]/g, '')
      .toUpperCase()
      .slice(0, 3);

    const nrpAkhir = nrp.slice(-4);
    const angkaAcak = Math.floor(1000 + Math.random() * 9000);

    return `TKT-${namaBersih}${nrpAkhir}-${angkaAcak}`;
  }

  async buatPengguna(data: BuatPenggunaDto) {
    const nrp = data.nrp.trim();
    const nama = data.nama.trim();
    const email = this.bersihkanTeks(data.email);
    const nomorTelepon = this.bersihkanTeks(data.nomor_telepon);
    const kataSandi = data.kata_sandi.trim();
    const role = (data.role || 'KARYAWAN') as UserRole;

    if (!nrp) {
      throw new BadRequestException('NRP wajib diisi');
    }

    if (!nama) {
      throw new BadRequestException('Nama wajib diisi');
    }

    if (!kataSandi) {
      throw new BadRequestException('Kata sandi wajib diisi');
    }

    const nrpSudahAda = await this.prisma.user.findUnique({
      where: {
        nrp,
      },
    });

    if (nrpSudahAda) {
      throw new BadRequestException('NRP sudah terdaftar');
    }

    if (email) {
      const emailSudahAda = await this.prisma.user.findUnique({
        where: {
          email,
        },
      });

      if (emailSudahAda) {
        throw new BadRequestException('Email sudah terdaftar');
      }
    }

    const kataSandiHash = await bcrypt.hash(kataSandi, 10);

    const pengguna = await this.prisma.user.create({
      data: {
        nrp,
        name: nama,
        email,
        phoneNumber: nomorTelepon,
        passwordHash: kataSandiHash,
        role,
        isActive: data.aktif ?? true,
        ticketCode: this.buatKodeTiket(nama, nrp),
      }
    });

    return this.formatHasilPengguna(pengguna);
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

  async ambilPenggunaBerdasarkanNrp(nrp: string) {
    return this.prisma.user.findUnique({
      where: {
        nrp,
      },
    });
  }

  async editPengguna(id: number, data: EditPenggunaDto) {
    const pengguna = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!pengguna) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    const updateData: Prisma.UserUpdateInput = {};

    if (data.nrp !== undefined) {
      const nrpBaru = data.nrp.trim();

      if (!nrpBaru) {
        throw new BadRequestException('NRP tidak boleh kosong');
      }

      if (nrpBaru !== pengguna.nrp) {
        const nrpSudahAda = await this.prisma.user.findUnique({
          where: {
            nrp: nrpBaru,
          },
        });

        if (nrpSudahAda) {
          throw new BadRequestException('NRP sudah digunakan pengguna lain');
        }

        updateData.nrp = nrpBaru;
      }
    }

    if (data.email !== undefined) {
      const emailBaru = this.bersihkanTeks(data.email);

      if (emailBaru && emailBaru !== pengguna.email) {
        const emailSudahAda = await this.prisma.user.findUnique({
          where: {
            email: emailBaru,
          },
        });

        if (emailSudahAda) {
          throw new BadRequestException('Email sudah digunakan pengguna lain');
        }
      }

      updateData.email = emailBaru;
    }

    if (data.nama !== undefined) {
      const namaBaru = data.nama.trim();

      if (!namaBaru) {
        throw new BadRequestException('Nama tidak boleh kosong');
      }

      updateData.name = namaBaru;
    }

    if (data.nomor_telepon !== undefined) {
      updateData.phoneNumber = this.bersihkanTeks(data.nomor_telepon);
    }

    if (data.role !== undefined) {
      updateData.role = data.role as UserRole;
    }

    if (data.aktif !== undefined) {
      updateData.isActive = data.aktif;
    }

    if (data.kata_sandi && data.kata_sandi.trim()) {
      updateData.passwordHash = await bcrypt.hash(data.kata_sandi.trim(), 10);
    }

    const penggunaTersimpan = await this.prisma.user.update({
      where: { id },
      data: updateData
    });

    return this.formatHasilPengguna(penggunaTersimpan);
  }

  async ubahStatusPengguna(id: number, aktif: boolean) {
    const pengguna = await this.prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!pengguna) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    const penggunaTersimpan = await this.prisma.user.update({
      where: { id },
      data: {
        isActive: aktif
      }
    });

    return this.formatHasilPengguna(penggunaTersimpan);
  }
}
// <--- end --->