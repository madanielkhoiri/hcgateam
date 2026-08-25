// ==================================================
// FILE: backend/src/ir/aspirasi/ir-aspirasi.service.ts
// FUNGSI: Kuesioner Aspirasi Karyawan - Admin/Admin HC/Section Head
// menyusun pertanyaan (pilihan ganda/essay), akun lain menjawab.
// Jawaban tercatat dengan nama & NRP akun yang menjawab.
// ==================================================

import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { TipeAspirasiPertanyaan } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AktorIr } from '../common/ir-aktor';
import {
  BuatPertanyaanDto,
  JawabPertanyaanDto,
  UbahPertanyaanDto,
} from './ir-aspirasi.dto';

@Injectable()
export class IrAspirasiService {
  constructor(private readonly prisma: PrismaService) {}

  /** Daftar pertanyaan untuk diisi akun yang login (hanya yang aktif, plus jawabannya sendiri bila sudah pernah menjawab). */
  async daftarUntukDiisi(aktor: AktorIr) {
    const pertanyaan = await this.prisma.aspirasiPertanyaan.findMany({
      where: { aktif: true },
      include: {
        opsi: { orderBy: { urutan: 'asc' } },
        jawaban: { where: { userId: aktor.id } },
      },
      orderBy: [{ urutan: 'asc' }, { createdAt: 'asc' }],
    });

    return pertanyaan.map((item) => ({
      id: item.id,
      teks: item.teks,
      tipe: item.tipe,
      opsi: item.opsi,
      jawabanSaya: item.jawaban[0] ?? null,
    }));
  }

  /** Daftar seluruh pertanyaan (termasuk nonaktif) untuk dikelola Admin/Admin HC/Section Head. */
  async daftarUntukKelola() {
    return this.prisma.aspirasiPertanyaan.findMany({
      include: {
        opsi: { orderBy: { urutan: 'asc' } },
        createdBy: { select: { id: true, name: true, nrp: true } },
        _count: { select: { jawaban: true } },
      },
      orderBy: [{ urutan: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async buatPertanyaan(dto: BuatPertanyaanDto, aktor: AktorIr) {
    return this.prisma.aspirasiPertanyaan.create({
      data: {
        teks: dto.teks.trim(),
        tipe: dto.tipe,
        createdById: aktor.id,
        opsi:
          dto.tipe === TipeAspirasiPertanyaan.PILIHAN_GANDA
            ? {
                create: (dto.opsi ?? []).map((teks, index) => ({
                  teks: teks.trim(),
                  urutan: index,
                })),
              }
            : undefined,
      },
      include: { opsi: true },
    });
  }

  async ubahPertanyaan(id: number, dto: UbahPertanyaanDto) {
    const pertanyaan = await this.prisma.aspirasiPertanyaan.findUnique({
      where: { id },
    });

    if (!pertanyaan) {
      throw new NotFoundException('Pertanyaan tidak ditemukan');
    }

    if (
      dto.opsi &&
      pertanyaan.tipe === TipeAspirasiPertanyaan.PILIHAN_GANDA
    ) {
      await this.prisma.aspirasiOpsi.deleteMany({
        where: { pertanyaanId: id },
      });
      await this.prisma.aspirasiOpsi.createMany({
        data: dto.opsi.map((teks, index) => ({
          pertanyaanId: id,
          teks: teks.trim(),
          urutan: index,
        })),
      });
    }

    return this.prisma.aspirasiPertanyaan.update({
      where: { id },
      data: {
        ...(dto.teks !== undefined ? { teks: dto.teks.trim() } : {}),
        ...(dto.aktif !== undefined ? { aktif: dto.aktif } : {}),
      },
      include: { opsi: { orderBy: { urutan: 'asc' } } },
    });
  }

  async hapusPertanyaan(id: number) {
    const pertanyaan = await this.prisma.aspirasiPertanyaan.findUnique({
      where: { id },
    });

    if (!pertanyaan) {
      throw new NotFoundException('Pertanyaan tidak ditemukan');
    }

    await this.prisma.aspirasiPertanyaan.delete({ where: { id } });

    return { message: 'Pertanyaan berhasil dihapus' };
  }

  async jawab(pertanyaanId: number, dto: JawabPertanyaanDto, aktor: AktorIr) {
    const pertanyaan = await this.prisma.aspirasiPertanyaan.findUnique({
      where: { id: pertanyaanId },
      include: { opsi: true },
    });

    if (!pertanyaan || !pertanyaan.aktif) {
      throw new NotFoundException('Pertanyaan tidak ditemukan atau sudah ditutup');
    }

    if (pertanyaan.tipe === TipeAspirasiPertanyaan.PILIHAN_GANDA) {
      if (!dto.opsiId || !pertanyaan.opsi.some((o) => o.id === dto.opsiId)) {
        throw new BadRequestException('Pilihan jawaban tidak valid');
      }
    } else if (!dto.jawabanTeks?.trim()) {
      throw new BadRequestException('Jawaban essay wajib diisi');
    }

    return this.prisma.aspirasiJawaban.upsert({
      where: {
        pertanyaanId_userId: { pertanyaanId, userId: aktor.id },
      },
      create: {
        pertanyaanId,
        userId: aktor.id,
        namaPenjawab: aktor.nama,
        nrpPenjawab: aktor.nrp,
        opsiId:
          pertanyaan.tipe === TipeAspirasiPertanyaan.PILIHAN_GANDA
            ? dto.opsiId
            : null,
        jawabanTeks:
          pertanyaan.tipe === TipeAspirasiPertanyaan.ESSAY
            ? dto.jawabanTeks!.trim()
            : null,
      },
      update: {
        namaPenjawab: aktor.nama,
        nrpPenjawab: aktor.nrp,
        opsiId:
          pertanyaan.tipe === TipeAspirasiPertanyaan.PILIHAN_GANDA
            ? dto.opsiId
            : null,
        jawabanTeks:
          pertanyaan.tipe === TipeAspirasiPertanyaan.ESSAY
            ? dto.jawabanTeks!.trim()
            : null,
      },
    });
  }

  /** Rekap seluruh jawaban satu pertanyaan - Admin/Admin HC/Section Head. */
  async rekapJawaban(pertanyaanId: number) {
    const pertanyaan = await this.prisma.aspirasiPertanyaan.findUnique({
      where: { id: pertanyaanId },
      include: {
        opsi: { orderBy: { urutan: 'asc' } },
        jawaban: {
          include: { opsi: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!pertanyaan) {
      throw new NotFoundException('Pertanyaan tidak ditemukan');
    }

    return pertanyaan;
  }
}
