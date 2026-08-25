// ==================================================
// FILE: backend/src/eprom/vendor/eprom-vendor.service.ts
// FUNGSI: Master data Vendor untuk modul e-ProM
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { StatusLegalitasVendor } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EpromAksesService } from '../common/eprom-akses.service';
import { AktorEprom } from '../common/eprom-aktor';

export class BuatVendorDto {
  @IsString()
  @IsNotEmpty()
  namaVendor: string;

  @IsOptional()
  @IsEmail({}, { message: 'Format email tidak valid' })
  email?: string;

  @IsOptional()
  @IsString()
  noTelepon?: string;
}

export class UbahVendorDto extends PartialType(BuatVendorDto) {
  @IsOptional()
  @IsEnum(StatusLegalitasVendor)
  legalitasStatus?: StatusLegalitasVendor;

  @IsOptional()
  @IsBoolean()
  statusAktif?: boolean;
}

export class TautkanUserVendorDto {
  @IsInt()
  userId: number;
}

@Injectable()
export class EpromVendorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: EpromAksesService,
  ) {}

  async daftar(hanyaAktif?: boolean) {
    return this.prisma.vendor.findMany({
      where: hanyaAktif ? { statusAktif: true } : undefined,
      include: {
        users: { select: { id: true, name: true, username: true } },
        _count: { select: { kontrak: true } },
      },
      orderBy: { namaVendor: 'asc' },
    });
  }

  async detail(id: number) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        users: { select: { id: true, name: true, username: true } },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor tidak ditemukan');
    }

    return vendor;
  }

  async buat(dto: BuatVendorDto) {
    return this.prisma.vendor.create({
      data: {
        namaVendor: dto.namaVendor.trim(),
        email: dto.email?.trim() || null,
        noTelepon: dto.noTelepon?.trim() || null,
      },
    });
  }

  /**
   * `bolehOwner` hanya true untuk Owner — akun Vendor cuma boleh mengubah
   * profil kontaknya sendiri (nama/email/telepon), tidak boleh mengubah
   * status legalitas maupun status aktif (itu kewenangan Owner) atau menghapus data.
   */
  async ubah(id: number, dto: UbahVendorDto, bolehOwner: boolean) {
    await this.detail(id);

    if (dto.legalitasStatus !== undefined && !bolehOwner) {
      throw new BadRequestException('Status legalitas hanya dapat diubah oleh Owner');
    }

    if (dto.statusAktif !== undefined && !bolehOwner) {
      throw new BadRequestException('Status aktif hanya dapat diubah oleh Owner');
    }

    return this.prisma.vendor.update({
      where: { id },
      data: {
        ...(dto.namaVendor !== undefined
          ? { namaVendor: dto.namaVendor.trim() }
          : {}),
        ...(dto.email !== undefined ? { email: dto.email?.trim() || null } : {}),
        ...(dto.noTelepon !== undefined
          ? { noTelepon: dto.noTelepon?.trim() || null }
          : {}),
        ...(dto.legalitasStatus !== undefined
          ? { legalitasStatus: dto.legalitasStatus }
          : {}),
        ...(dto.statusAktif !== undefined ? { statusAktif: dto.statusAktif } : {}),
      },
    });
  }

  async hapus(id: number) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id },
      include: {
        _count: { select: { kontrak: true, undanganTender: true, sph: true } },
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor tidak ditemukan');
    }

    if (vendor._count.kontrak > 0) {
      throw new BadRequestException(
        'Vendor sudah memiliki Kontrak, tidak dapat dihapus',
      );
    }

    if (vendor._count.undanganTender > 0) {
      throw new BadRequestException(
        'Vendor sudah pernah diundang ke Tender, tidak dapat dihapus',
      );
    }

    if (vendor._count.sph > 0) {
      throw new BadRequestException(
        'Vendor sudah mengirim SPH pada Tender, tidak dapat dihapus',
      );
    }

    await this.prisma.vendor.delete({ where: { id } });

    return { message: 'Vendor berhasil dihapus' };
  }

  /**
   * Akun Vendor menautkan dirinya sendiri ke satu Vendor pilihannya (sekali
   * saja, saat akunnya belum tertaut ke vendor manapun) — dipakai halaman
   * Legalitas Vendor supaya tiap akun cuma bisa mengelola folder vendornya sendiri.
   */
  async klaimAkun(aktor: AktorEprom, vendorId: number) {
    this.akses.wajibVendor(aktor);

    if (aktor.vendorId) {
      throw new BadRequestException('Akun ini sudah tertaut ke sebuah vendor');
    }

    await this.detail(vendorId);

    await this.prisma.user.update({
      where: { id: aktor.id },
      data: { vendorId },
    });

    return this.detail(vendorId);
  }

  /** Menautkan akun login (role VENDOR) ke satu Vendor. */
  async tautkanUser(id: number, dto: TautkanUserVendorDto) {
    await this.detail(id);

    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('Akun pengguna tidak ditemukan');
    }

    await this.prisma.user.update({
      where: { id: dto.userId },
      data: { vendorId: id },
    });

    return this.detail(id);
  }
}
