// ==================================================
// FILE: backend/src/surat-balasan-magang/surat-balasan-magang.service.ts
// FUNGSI: Terbitkan Surat Balasan (persetujuan magang) - identitas
// mahasiswa diambil dari Database Anak Magang, departemen tujuan &
// tanggal pelaksanaan diisi manual per baris karena beda tiap batch.
// ==================================================

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { McuAksesService } from '../mcu/common/mcu-akses.service';
import { AktorMcu } from '../mcu/common/mcu-aktor';
import { BuatSuratBalasanMagangDto } from './dto/surat-balasan-magang.dto';
import { SuratBalasanMagangPdfService } from './surat-balasan-magang-pdf.service';

const SURAT_INCLUDE = {
  baris: { orderBy: { urutan: 'asc' } },
  dibuatOleh: { select: { id: true, name: true, role: true } },
} satisfies Prisma.SuratBalasanMagangInclude;

@Injectable()
export class SuratBalasanMagangService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: McuAksesService,
    private readonly pdf: SuratBalasanMagangPdfService,
  ) {}

  async daftar() {
    return this.prisma.suratBalasanMagang.findMany({
      include: SURAT_INCLUDE,
      orderBy: { id: 'desc' },
    });
  }

  async detail(id: number) {
    const surat = await this.prisma.suratBalasanMagang.findUnique({
      where: { id },
      include: SURAT_INCLUDE,
    });

    if (!surat) {
      throw new NotFoundException('Surat balasan tidak ditemukan');
    }

    return surat;
  }

  async terbitkan(dto: BuatSuratBalasanMagangDto, aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, UserRole.HC);

    const anakMagangIds = dto.baris.map((item) => item.anakMagangId);
    const anakMagangList = await this.prisma.anakMagang.findMany({
      where: { id: { in: anakMagangIds } },
    });

    if (anakMagangList.length !== anakMagangIds.length) {
      throw new BadRequestException(
        'Sebagian anak magang yang dipilih tidak ditemukan',
      );
    }

    for (const baris of dto.baris) {
      const anakMagang = anakMagangList.find(
        (item) => item.id === baris.anakMagangId,
      );

      if (!anakMagang?.nrp) {
        throw new BadRequestException(
          `Data anak magang "${anakMagang?.nama ?? baris.anakMagangId}" belum memiliki NRP, lengkapi dulu di Database Anak Magang`,
        );
      }

      if (!anakMagang.jurusan) {
        throw new BadRequestException(
          `Data anak magang "${anakMagang.nama}" belum memiliki jurusan, lengkapi dulu di Database Anak Magang`,
        );
      }

      if (new Date(baris.tanggalSelesai) < new Date(baris.tanggalMulai)) {
        throw new BadRequestException(
          `Tanggal selesai tidak boleh sebelum tanggal mulai untuk ${anakMagang.nama}`,
        );
      }
    }

    const tahunTerbit = new Date().getUTCFullYear();

    const surat = await this.prisma.$transaction(async (tx) => {
      const terakhir = await tx.suratBalasanMagang.findFirst({
        where: { tahunTerbit },
        orderBy: { nomorUrut: 'desc' },
        select: { nomorUrut: true },
      });

      const nomorUrut = (terakhir?.nomorUrut ?? 0) + 1;
      const nomor = this.formatNomorSurat(nomorUrut, tahunTerbit);

      return tx.suratBalasanMagang.create({
        data: {
          nomor,
          nomorUrut,
          tahunTerbit,
          nomorSuratMasuk: dto.nomorSuratMasuk?.trim() || null,
          perihalSuratMasuk: dto.perihalSuratMasuk?.trim() || null,
          tujuanJurusan: dto.tujuanJurusan.trim(),
          kotaTujuan: dto.kotaTujuan.trim(),
          dibuatOlehId: aktor.id,
          baris: {
            create: dto.baris.map((baris, index) => {
              const anakMagang = anakMagangList.find(
                (item) => item.id === baris.anakMagangId,
              )!;

              return {
                urutan: index + 1,
                anakMagangId: baris.anakMagangId,
                nama: anakMagang.nama,
                nrp: anakMagang.nrp ?? '',
                jurusan: anakMagang.jurusan ?? '',
                departemenTujuan: baris.departemenTujuan.trim(),
                tanggalMulai: new Date(baris.tanggalMulai),
                tanggalSelesai: new Date(baris.tanggalSelesai),
              };
            }),
          },
        },
      });
    });

    return this.cetakUlang(surat.id);
  }

  async cetakUlang(id: number) {
    const surat = await this.prisma.suratBalasanMagang.findUnique({
      where: { id },
      include: SURAT_INCLUDE,
    });

    if (!surat) {
      throw new NotFoundException('Surat balasan tidak ditemukan');
    }

    const filePdf = await this.pdf.buatFile(surat);

    return this.prisma.suratBalasanMagang.update({
      where: { id },
      data: { filePdf },
      include: SURAT_INCLUDE,
    });
  }

  private formatNomorSurat(nomorUrut: number, tahun: number): string {
    const urut = String(nomorUrut).padStart(2, '0');
    return `${urut}/S-Out/HCGA/PPA-Adw/${this.angkaRomawi(new Date().getUTCMonth() + 1)}/${tahun}`;
  }

  private angkaRomawi(bulan: number): string {
    const romawi = [
      'I', 'II', 'III', 'IV', 'V', 'VI',
      'VII', 'VIII', 'IX', 'X', 'XI', 'XII',
    ];

    return romawi[bulan - 1] ?? 'I';
  }
}
