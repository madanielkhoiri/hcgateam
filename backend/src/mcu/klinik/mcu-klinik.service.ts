// ==================================================
// FILE: backend/src/mcu/klinik/mcu-klinik.service.ts
// FUNGSI: Master klinik provider MCU
// Referensi: Bagian 4.8 alur-workflow-mcu-periodik-v3.md
// ==================================================

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PartialType } from '@nestjs/mapped-types';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { PrismaService } from '../../prisma/prisma.service';

export class BuatKlinikDto {
  @IsString()
  @IsNotEmpty()
  namaKlinik: string;

  @IsOptional()
  @IsString()
  alamat?: string;

  @IsOptional()
  @IsString()
  picKlinik?: string;

  @IsOptional()
  @IsBoolean()
  terkoneksi?: boolean;

  /** Wajib diisi bila klinik terkoneksi agar bisa submit hasil sendiri. */
  @IsOptional()
  @IsInt()
  akunId?: number;

  @IsOptional()
  @IsBoolean()
  statusAktif?: boolean;
}

export class UbahKlinikDto extends PartialType(BuatKlinikDto) {}

@Injectable()
export class McuKlinikService {
  constructor(private readonly prisma: PrismaService) {}

  async daftar(filter: { terkoneksi?: boolean; hanyaAktif?: boolean }) {
    return this.prisma.klinik.findMany({
      where: {
        ...(filter.terkoneksi !== undefined
          ? { terkoneksi: filter.terkoneksi }
          : {}),
        ...(filter.hanyaAktif ? { statusAktif: true } : {}),
      },
      include: {
        akun: { select: { id: true, name: true, username: true, email: true } },
        _count: { select: { jadwalMcu: true } },
      },
      orderBy: [{ statusAktif: 'desc' }, { namaKlinik: 'asc' }],
    });
  }

  async detail(id: number) {
    const klinik = await this.prisma.klinik.findUnique({
      where: { id },
      include: {
        akun: { select: { id: true, name: true, username: true, email: true } },
      },
    });

    if (!klinik) {
      throw new NotFoundException('Klinik tidak ditemukan');
    }

    return klinik;
  }

  async buat(dto: BuatKlinikDto) {
    const terkoneksi = dto.terkoneksi ?? false;

    if (terkoneksi && !dto.akunId) {
      throw new BadRequestException(
        'Klinik terkoneksi wajib memiliki akun untuk submit hasil',
      );
    }

    return this.prisma.klinik.create({
      data: {
        namaKlinik: dto.namaKlinik.trim(),
        alamat: dto.alamat?.trim() || null,
        picKlinik: dto.picKlinik?.trim() || null,
        terkoneksi,
        akunId: dto.akunId ?? null,
        statusAktif: dto.statusAktif ?? true,
      },
    });
  }

  async ubah(id: number, dto: UbahKlinikDto) {
    const klinik = await this.detail(id);

    const terkoneksi = dto.terkoneksi ?? klinik.terkoneksi;
    const akunId = dto.akunId !== undefined ? dto.akunId : klinik.akunId;

    if (terkoneksi && !akunId) {
      throw new BadRequestException(
        'Klinik terkoneksi wajib memiliki akun untuk submit hasil',
      );
    }

    return this.prisma.klinik.update({
      where: { id },
      data: {
        ...(dto.namaKlinik !== undefined
          ? { namaKlinik: dto.namaKlinik.trim() }
          : {}),
        ...(dto.alamat !== undefined
          ? { alamat: dto.alamat?.trim() || null }
          : {}),
        ...(dto.picKlinik !== undefined
          ? { picKlinik: dto.picKlinik?.trim() || null }
          : {}),
        ...(dto.terkoneksi !== undefined ? { terkoneksi: dto.terkoneksi } : {}),
        ...(dto.akunId !== undefined ? { akunId: dto.akunId } : {}),
        ...(dto.statusAktif !== undefined
          ? { statusAktif: dto.statusAktif }
          : {}),
      },
    });
  }

  async hapus(id: number) {
    const klinik = await this.prisma.klinik.findUnique({
      where: { id },
      include: { _count: { select: { jadwalMcu: true } } },
    });

    if (!klinik) {
      throw new NotFoundException('Klinik tidak ditemukan');
    }

    if (klinik._count.jadwalMcu > 0) {
      throw new BadRequestException(
        'Klinik sudah dipakai pada jadwal MCU. Nonaktifkan saja klinik ini.',
      );
    }

    await this.prisma.klinik.delete({ where: { id } });

    return { message: 'Klinik berhasil dihapus' };
  }
}
