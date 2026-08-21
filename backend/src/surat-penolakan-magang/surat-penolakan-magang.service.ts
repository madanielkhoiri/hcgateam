// ==================================================
// FILE: backend/src/surat-penolakan-magang/surat-penolakan-magang.service.ts
// FUNGSI: Terbitkan Surat Penolakan magang (1 surat per 1 orang) -
// nama diambil dari Database Anak Magang, sapaan & alasan penolakan
// diisi manual karena beda tiap pelamar.
// ==================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { McuAksesService } from '../mcu/common/mcu-akses.service';
import { AktorMcu } from '../mcu/common/mcu-aktor';
import { BuatSuratPenolakanMagangDto } from './dto/surat-penolakan-magang.dto';
import { SuratPenolakanMagangPdfService } from './surat-penolakan-magang-pdf.service';

@Injectable()
export class SuratPenolakanMagangService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: McuAksesService,
    private readonly pdf: SuratPenolakanMagangPdfService,
  ) {}

  async daftar() {
    return this.prisma.suratPenolakanMagang.findMany({
      include: {
        anakMagang: { select: { id: true, nama: true, nrp: true } },
        dibuatOleh: { select: { id: true, name: true, role: true } },
      },
      orderBy: { id: 'desc' },
    });
  }

  async detail(id: number) {
    const surat = await this.prisma.suratPenolakanMagang.findUnique({
      where: { id },
      include: {
        anakMagang: { select: { id: true, nama: true, nrp: true } },
        dibuatOleh: { select: { id: true, name: true, role: true } },
      },
    });

    if (!surat) {
      throw new NotFoundException('Surat penolakan tidak ditemukan');
    }

    return surat;
  }

  async terbitkan(dto: BuatSuratPenolakanMagangDto, aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, UserRole.HC);

    const anakMagang = await this.prisma.anakMagang.findUnique({
      where: { id: dto.anakMagangId },
    });

    if (!anakMagang) {
      throw new NotFoundException('Data anak magang tidak ditemukan');
    }

    const tahunTerbit = new Date().getUTCFullYear();

    const surat = await this.prisma.$transaction(async (tx) => {
      const terakhir = await tx.suratPenolakanMagang.findFirst({
        where: { tahunTerbit },
        orderBy: { nomorUrut: 'desc' },
        select: { nomorUrut: true },
      });

      const nomorUrut = (terakhir?.nomorUrut ?? 0) + 1;
      const nomor = this.formatNomorSurat(nomorUrut, tahunTerbit);

      return tx.suratPenolakanMagang.create({
        data: {
          nomor,
          nomorUrut,
          tahunTerbit,
          anakMagangId: anakMagang.id,
          nama: anakMagang.nama,
          sapaan: dto.sapaan,
          alasanPenolakan: dto.alasanPenolakan.trim(),
          dibuatOlehId: aktor.id,
        },
      });
    });

    return this.cetakUlang(surat.id);
  }

  async cetakUlang(id: number) {
    const surat = await this.prisma.suratPenolakanMagang.findUnique({
      where: { id },
    });

    if (!surat) {
      throw new NotFoundException('Surat penolakan tidak ditemukan');
    }

    const filePdf = await this.pdf.buatFile(surat);

    return this.prisma.suratPenolakanMagang.update({
      where: { id },
      data: { filePdf },
      include: {
        anakMagang: { select: { id: true, nama: true, nrp: true } },
        dibuatOleh: { select: { id: true, name: true, role: true } },
      },
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
