import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { StatusSuratTugas, UserRole } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SuratTugasDinasAdvancePdfService } from './surat-tugas-dinas-advance-pdf.service';
import { SuratTugasDinasPdfService } from './surat-tugas-dinas-pdf.service';

type AktorKaryawan = {
  id: number;
  nrp?: string | null;
};

const INCLUDE_DATA_KARYAWAN = {
  suratTugas: {
    include: {
      suratTugasAsal: {
        select: { id: true, nomor: true, filePdf: true },
      },
    },
  },
} as const;

@Injectable()
export class SuratTugasDinasKaryawanService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly advancePdf: SuratTugasDinasAdvancePdfService,
    @Optional() private readonly suratPdf?: SuratTugasDinasPdfService,
  ) {}

  async pdfKaryawan(id: number, aktor: AktorKaryawan) {
    const identitas = await this.identitasAktor(aktor);
    const item = await this.prisma.suratTugasKaryawan.findUnique({
      where: { id },
      include: { suratTugas: { include: { karyawan: true } } },
    });
    if (!item || !identitas.nrp.includes(item.nrp)) {
      throw new ForbiddenException('Surat Tugas Dinas ini bukan milik Anda');
    }
    if (
      !item.suratTugas.denganAkomodasi ||
      item.suratTugas.status !== StatusSuratTugas.DISETUJUI
    ) {
      throw new BadRequestException('STD Akomodasi belum mendapatkan persetujuan lengkap');
    }
    if (!this.suratPdf) throw new BadRequestException('Layanan PDF belum tersedia');
    const filePdf = await this.suratPdf.buatFileKaryawan(item.suratTugas, item.id);
    return { filePdf };
  }

  async daftar(aktor: AktorKaryawan) {
    const identitas = await this.identitasAktor(aktor);
    const daftar = await this.prisma.suratTugasKaryawan.findMany({
      where: {
        nrp: { in: identitas.nrp },
        suratTugas: {
          denganAkomodasi: true,
          status: StatusSuratTugas.DISETUJUI,
        },
      },
      include: INCLUDE_DATA_KARYAWAN,
      orderBy: { suratTugas: { disetujuiPjoPada: 'desc' } },
    });

    return daftar.map((item) => this.bentukRespons(item));
  }

  async konfirmasiAdvance(id: number, aktor: AktorKaryawan) {
    const identitas = await this.identitasAktor(aktor);
    const item = await this.prisma.suratTugasKaryawan.findUnique({
      where: { id },
      include: INCLUDE_DATA_KARYAWAN,
    });

    if (!item) {
      throw new NotFoundException('Surat Tugas Dinas karyawan tidak ditemukan');
    }
    if (!identitas.nrp.includes(item.nrp)) {
      throw new ForbiddenException('Surat Tugas Dinas ini bukan milik Anda');
    }
    if (
      !item.suratTugas.denganAkomodasi ||
      item.suratTugas.status !== StatusSuratTugas.DISETUJUI
    ) {
      throw new BadRequestException(
        'STD Akomodasi belum mendapatkan persetujuan lengkap',
      );
    }
    if (item.advanceDikonfirmasiPada) {
      return this.bentukRespons(item);
    }

    const master = await this.prisma.karyawan.findUnique({
      where: { nik: item.nrp },
      include: {
        departemen: {
          include: { adminAkun: true },
        },
      },
    });
    if (!master) {
      throw new BadRequestException('Data karyawan tidak ditemukan');
    }

    const sh = await this.temukanSectionHead(
      master.departemen.namaDepartemen,
      master.departemen.adminAkun,
    );
    if (!sh) {
      throw new BadRequestException(
        `Section Head departemen ${master.departemen.namaDepartemen} belum dikonfigurasi`,
      );
    }

    const nominalAdvance =
      (item.uangPerjalananNominal ?? 0) +
      (item.akomodasiNominal ?? 0) +
      (item.laundryNominal ?? 0);
    const pembuatNama = identitas.nama;
    const shJabatan = `SH ${master.departemen.namaDepartemen}`;
    const advanceFilePdf = await this.advancePdf.buatFile({
      karyawanTugasId: item.id,
      nomorSurat: item.suratTugas.nomor,
      jenisKegiatan: item.suratTugas.keteranganTugas,
      nominalAdvance,
      tanggalBerakhir: item.suratTugas.tanggalSelesai,
      pembuatNama,
      shNama: sh.name,
      shJabatan,
    });

    const diperbarui = await this.prisma.suratTugasKaryawan.update({
      where: { id: item.id },
      data: {
        advanceDikonfirmasiPada: new Date(),
        advanceDikonfirmasiOlehId: aktor.id,
        advancePembuatNama: pembuatNama,
        advanceShNama: sh.name,
        advanceShJabatan: shJabatan,
        advanceFilePdf,
      },
      include: INCLUDE_DATA_KARYAWAN,
    });

    return this.bentukRespons(diperbarui);
  }

  private async identitasAktor(aktor: AktorKaryawan) {
    const user = await this.prisma.user.findUnique({
      where: { id: aktor.id },
      select: {
        name: true,
        nrp: true,
        profilKaryawan: { select: { nik: true } },
      },
    });
    if (!user) throw new NotFoundException('Akun karyawan tidak ditemukan');

    const nrp = [
      ...new Set([user.nrp, user.profilKaryawan?.nik].filter(Boolean)),
    ] as string[];
    if (nrp.length === 0) {
      throw new BadRequestException(
        'NRP akun belum terhubung ke data karyawan',
      );
    }
    return { nama: user.name, nrp };
  }

  private async temukanSectionHead(
    departemen: string,
    adminAkun: {
      id: number;
      name: string;
      role: UserRole;
      isActive: boolean;
    } | null,
  ) {
    if (adminAkun?.isActive && adminAkun.role === UserRole.SECTION_HEAD) {
      return adminAkun;
    }

    return this.prisma.user.findFirst({
      where: {
        role: UserRole.SECTION_HEAD,
        isActive: true,
        departemen: { equals: departemen, mode: 'insensitive' },
      },
      select: { id: true, name: true, role: true, isActive: true },
    });
  }

  private bentukRespons(item: any) {
    const nominalAdvance =
      (item.uangPerjalananNominal ?? 0) +
      (item.akomodasiNominal ?? 0) +
      (item.laundryNominal ?? 0);
    return {
      id: item.id,
      nrp: item.nrp,
      nama: item.nama,
      nominalAdvance,
      advanceDikonfirmasiPada: item.advanceDikonfirmasiPada,
      advancePembuatNama: item.advancePembuatNama,
      advanceShNama: item.advanceShNama,
      advanceShJabatan: item.advanceShJabatan,
      advanceFilePdf: item.advanceFilePdf,
      surat: {
        id: item.suratTugas.id,
        nomor: item.suratTugas.nomor,
        tujuanLokasi: item.suratTugas.tujuanLokasi,
        tanggalMulai: item.suratTugas.tanggalMulai,
        tanggalSelesai: item.suratTugas.tanggalSelesai,
        keteranganTugas: item.suratTugas.keteranganTugas,
        filePdf: item.suratTugas.filePdf,
        suratTugasAsal: item.suratTugas.suratTugasAsal,
      },
    };
  }
}
