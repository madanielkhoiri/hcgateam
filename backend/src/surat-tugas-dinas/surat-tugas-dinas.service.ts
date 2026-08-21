// ==================================================
// FILE: backend/src/surat-tugas-dinas/surat-tugas-dinas.service.ts
// FUNGSI: CRUD + alur persetujuan 2 tahap Surat Tugas Dinas (R & D).
// Tidak ada pemilihan penyetuju saat membuat surat - siapapun cukup
// mengisi form, lalu SH menyetujui dulu (tanda tangan SH tercetak),
// baru PJO menyetujui (tanda tangan PJO tercetak, surat final).
// ==================================================

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StatusSuratTugas, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  BuatSuratTugasDinasDto,
  TolakSuratTugasDinasDto,
} from './dto/surat-tugas-dinas.dto';
import { SuratTugasDinasPdfService } from './surat-tugas-dinas-pdf.service';

type AktorSurat = {
  id: number;
  role: UserRole;
};

const SURAT_INCLUDE = {
  karyawan: { orderBy: { urutan: 'asc' } },
  dibuatOleh: { select: { id: true, name: true, role: true } },
  disetujuiShOleh: { select: { id: true, name: true, role: true } },
  disetujuiPjoOleh: { select: { id: true, name: true, role: true } },
} satisfies Prisma.SuratTugasDinasInclude;

@Injectable()
export class SuratTugasDinasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pdf: SuratTugasDinasPdfService,
  ) {}

  private isAdmin(aktor: AktorSurat): boolean {
    return aktor.role === UserRole.ADMIN || aktor.role === UserRole.SUPER_ADMIN;
  }

  /** Section Head, PJO, & Admin/Admin HC melihat seluruh surat, bukan cuma buatan sendiri. */
  private bolehLihatSemua(aktor: AktorSurat): boolean {
    return (
      this.isAdmin(aktor) ||
      aktor.role === UserRole.SECTION_HEAD ||
      aktor.role === UserRole.PJO
    );
  }

  /** Tahap SH: role Section Head yang berwenang. Tahap PJO: role PJO yang berwenang. */
  private bolehSetujuiTahap(
    aktor: AktorSurat,
    status: StatusSuratTugas,
  ): boolean {
    if (this.isAdmin(aktor)) {
      return true;
    }

    if (status === StatusSuratTugas.MENUNGGU_SH) {
      return aktor.role === UserRole.SECTION_HEAD;
    }

    if (status === StatusSuratTugas.MENUNGGU_PJO) {
      return aktor.role === UserRole.PJO;
    }

    return false;
  }

  async daftar(aktor: AktorSurat, status?: string) {
    const statusValid = (
      Object.values(StatusSuratTugas) as string[]
    ).includes(status ?? '')
      ? (status as StatusSuratTugas)
      : undefined;

    return this.prisma.suratTugasDinas.findMany({
      where: {
        ...(statusValid ? { status: statusValid } : {}),
        ...(this.bolehLihatSemua(aktor) ? {} : { dibuatOlehId: aktor.id }),
      },
      include: SURAT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async detail(id: number, aktor: AktorSurat) {
    const surat = await this.ambilAtauGagal(id);

    if (!this.bolehLihatSemua(aktor) && surat.dibuatOlehId !== aktor.id) {
      throw new ForbiddenException('Anda tidak dapat mengakses surat ini');
    }

    return surat;
  }

  /** Cetak ulang PDF dari data yang sudah ada, tanpa mengubah status. */
  async cetakUlangManual(id: number, aktor: AktorSurat) {
    await this.detail(id, aktor);
    return this.cetakUlang(id);
  }

  async buat(dto: BuatSuratTugasDinasDto, aktor: AktorSurat) {
    const nomor = dto.nomor.trim();

    const duplikat = await this.prisma.suratTugasDinas.findUnique({
      where: { nomor },
    });

    if (duplikat) {
      throw new BadRequestException('Nomor surat sudah digunakan');
    }

    const tanggalMulai = new Date(dto.tanggalMulai);
    const tanggalSelesai = new Date(dto.tanggalSelesai);

    if (tanggalSelesai < tanggalMulai) {
      throw new BadRequestException(
        'Tanggal selesai tidak boleh sebelum tanggal mulai',
      );
    }

    const dibuat = await this.prisma.suratTugasDinas.create({
      data: {
        nomor,
        tujuanLokasi: dto.tujuanLokasi.trim(),
        tanggalMulai,
        tanggalSelesai,
        keteranganTugas: dto.keteranganTugas.trim(),
        dibuatOlehId: aktor.id,
        status: StatusSuratTugas.MENUNGGU_SH,
        karyawan: {
          create: dto.karyawan.map((item, index) => ({
            urutan: index + 1,
            nrp: item.nrp.trim(),
            nama: item.nama.trim(),
            departemen: item.departemen.trim(),
            jabatan: item.jabatan.trim(),
          })),
        },
      },
      include: SURAT_INCLUDE,
    });

    return this.cetakUlang(dibuat.id);
  }

  async setujui(id: number, aktor: AktorSurat) {
    const surat = await this.ambilAtauGagal(id);
    this.wajibBolehSetujuiTahap(aktor, surat.status);

    if (surat.status === StatusSuratTugas.MENUNGGU_SH) {
      await this.prisma.suratTugasDinas.update({
        where: { id },
        data: {
          status: StatusSuratTugas.MENUNGGU_PJO,
          disetujuiShOlehId: aktor.id,
          disetujuiShPada: new Date(),
        },
      });
    } else if (surat.status === StatusSuratTugas.MENUNGGU_PJO) {
      await this.prisma.suratTugasDinas.update({
        where: { id },
        data: {
          status: StatusSuratTugas.DISETUJUI,
          disetujuiPjoOlehId: aktor.id,
          disetujuiPjoPada: new Date(),
        },
      });
    } else {
      throw new BadRequestException('Surat sudah diproses sebelumnya');
    }

    return this.cetakUlang(id);
  }

  async tolak(id: number, dto: TolakSuratTugasDinasDto, aktor: AktorSurat) {
    const surat = await this.ambilAtauGagal(id);
    this.wajibBolehSetujuiTahap(aktor, surat.status);

    if (
      surat.status !== StatusSuratTugas.MENUNGGU_SH &&
      surat.status !== StatusSuratTugas.MENUNGGU_PJO
    ) {
      throw new BadRequestException('Surat sudah diproses sebelumnya');
    }

    await this.prisma.suratTugasDinas.update({
      where: { id },
      data: { status: StatusSuratTugas.DITOLAK, alasanTolak: dto.alasan.trim() },
    });

    return this.cetakUlang(id);
  }

  private wajibBolehSetujuiTahap(
    aktor: AktorSurat,
    status: StatusSuratTugas,
  ): void {
    if (!this.bolehSetujuiTahap(aktor, status)) {
      const tahap =
        status === StatusSuratTugas.MENUNGGU_SH ? 'Section Head (SH)' : 'PJO';

      throw new ForbiddenException(
        `Hanya ${tahap} yang dapat memproses surat pada tahap ini`,
      );
    }
  }

  private async ambilAtauGagal(id: number) {
    const surat = await this.prisma.suratTugasDinas.findUnique({
      where: { id },
      include: SURAT_INCLUDE,
    });

    if (!surat) {
      throw new NotFoundException('Surat tugas dinas tidak ditemukan');
    }

    return surat;
  }

  private async cetakUlang(id: number) {
    const surat = await this.prisma.suratTugasDinas.findUniqueOrThrow({
      where: { id },
      include: SURAT_INCLUDE,
    });

    const filePdf = await this.pdf.buatFile(surat);

    return this.prisma.suratTugasDinas.update({
      where: { id },
      data: { filePdf },
      include: SURAT_INCLUDE,
    });
  }
}