// ==================================================
// FILE: backend/src/anak-magang/anak-magang.service.ts
// FUNGSI: CRUD Database Anak Magang - master data mahasiswa magang
// (identitas, pendidikan, kontak, rekening, kesehatan, ukuran seragam),
// dipakai bersama oleh Surat Balasan dan Surat Penolakan supaya tidak
// input ulang data.
// ==================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, StatusAnakMagang } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BuatAnakMagangDto, UbahAnakMagangDto } from './dto/anak-magang.dto';

const FIELD_TEKS: Array<keyof BuatAnakMagangDto> = [
  'nrp',
  'gender',
  'universitas',
  'jurusan',
  'maritalStatus',
  'agama',
  'departemen',
  'jabatan',
  'posisi',
  'tempatLahir',
  'pendidikan',
  'email',
  'noHp',
  'noKtp',
  'npwp',
  'nomorRekening',
  'bank',
  'namaRekening',
  'alamat',
  'site',
  'golonganDarah',
  'bpjsTk',
  'bpjsKesehatan',
  'ukuranBaju',
  'ukuranCelana',
  'ukuranSepatu',
  'noKk',
  'rekomendasi',
  'atasanLangsung',
];

const FIELD_TANGGAL: Array<keyof BuatAnakMagangDto> = [
  'tanggalLahir',
  'tanggalMulai',
  'tanggalSelesai',
  'tanggalMcu',
  'tanggalPemeriksaan',
  'tanggalInduksi',
];

@Injectable()
export class AnakMagangService {
  constructor(private readonly prisma: PrismaService) {}

  async daftar(filter: { status?: StatusAnakMagang; cari?: string }) {
    const where: Prisma.AnakMagangWhereInput = {
      ...(filter.status ? { status: filter.status } : {}),
      ...(filter.cari
        ? {
            OR: [
              { nama: { contains: filter.cari, mode: 'insensitive' } },
              { nrp: { contains: filter.cari, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    return this.prisma.anakMagang.findMany({
      where,
      orderBy: { nama: 'asc' },
    });
  }

  async detail(id: number) {
    const item = await this.prisma.anakMagang.findUnique({ where: { id } });

    if (!item) {
      throw new NotFoundException('Data anak magang tidak ditemukan');
    }

    return item;
  }

  async buat(dto: BuatAnakMagangDto) {
    return this.prisma.anakMagang.create({
      data: {
        nama: dto.nama.trim(),
        status: dto.status ?? StatusAnakMagang.AKTIF,
        ...this.dataTeks(dto),
        ...this.dataTanggal(dto),
      },
    });
  }

  async ubah(id: number, dto: UbahAnakMagangDto) {
    await this.detail(id);

    return this.prisma.anakMagang.update({
      where: { id },
      data: {
        ...(dto.nama !== undefined ? { nama: dto.nama.trim() } : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
        ...this.dataTeks(dto),
        ...this.dataTanggal(dto),
      },
    });
  }

  /** Field teks: string kosong dianggap null, undefined berarti tidak diubah. */
  private dataTeks(
    dto: BuatAnakMagangDto,
  ): Record<string, string | null> {
    const hasil: Record<string, string | null> = {};

    for (const field of FIELD_TEKS) {
      const nilai = dto[field] as string | undefined;

      if (nilai !== undefined) {
        hasil[field] = nilai.trim() || null;
      }
    }

    return hasil;
  }

  /** Field tanggal: string kosong dianggap null, undefined berarti tidak diubah. */
  private dataTanggal(
    dto: BuatAnakMagangDto,
  ): Record<string, Date | null> {
    const hasil: Record<string, Date | null> = {};

    for (const field of FIELD_TANGGAL) {
      const nilai = dto[field] as string | undefined;

      if (nilai !== undefined) {
        hasil[field] = nilai ? new Date(nilai) : null;
      }
    }

    return hasil;
  }
}
