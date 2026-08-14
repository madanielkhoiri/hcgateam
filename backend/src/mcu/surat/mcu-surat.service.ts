// ==================================================
// FILE: backend/src/mcu/surat/mcu-surat.service.ts
// FUNGSI: Surat pengantar MCU (nomor otomatis + PDF) oleh HC
// Referensi: Bagian 4.3 alur-workflow-mcu-periodik-v3.md
// Catatan: surat pengantar FU tidak ada di sini - FU memakai
// surat rujukan Dokter pada tahap rekomendasi.
// ==================================================

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import PDFDocument from 'pdfkit';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  Prisma,
  StatusPendaftaran,
  StatusSuratPengantar,
  TipeNotifikasiMcu,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { McuAksesService } from '../common/mcu-akses.service';
import { AktorMcu } from '../common/mcu-aktor';
import { formatTanggalIndonesia, hariIni } from '../mcu-date.util';
import { McuNotifikasiService } from '../notifikasi/mcu-notifikasi.service';

export class TerbitkanSuratDto {
  @IsOptional()
  @IsString()
  catatan?: string;
}

const SURAT_INCLUDE = {
  jadwalMcu: {
    include: {
      karyawan: {
        select: {
          id: true,
          nik: true,
          nama: true,
          jabatan: true,
          email: true,
          akunId: true,
        },
      },
      departemen: { select: { id: true, namaDepartemen: true } },
    },
  },
  klinik: {
    select: {
      id: true,
      namaKlinik: true,
      alamat: true,
      picKlinik: true,
      terkoneksi: true,
      akunId: true,
    },
  },
  diterbitkan: { select: { id: true, name: true } },
} satisfies Prisma.SuratPengantarInclude;

@Injectable()
export class McuSuratService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly akses: McuAksesService,
    private readonly notifikasi: McuNotifikasiService,
  ) {}

  async daftar(filter: { status?: StatusSuratPengantar }) {
    return this.prisma.suratPengantar.findMany({
      where: { ...(filter.status ? { status: filter.status } : {}) },
      include: SURAT_INCLUDE,
      orderBy: [{ tanggalTerbit: 'desc' }, { id: 'desc' }],
    });
  }

  /** Jadwal yang sudah tersimpan tetapi suratnya belum diterbitkan. */
  async jadwalMenungguSurat() {
    return this.prisma.jadwalMcu.findMany({
      where: {
        suratPengantar: null,
        statusPendaftaran: {
          in: [StatusPendaftaran.DRAFT, StatusPendaftaran.TERKUNCI],
        },
      },
      include: {
        karyawan: { select: { id: true, nik: true, nama: true } },
        departemen: { select: { id: true, namaDepartemen: true } },
        klinik: { select: { id: true, namaKlinik: true, terkoneksi: true } },
      },
      orderBy: { tanggalMcu: 'asc' },
    });
  }

  async detail(id: number) {
    const surat = await this.prisma.suratPengantar.findUnique({
      where: { id },
      include: SURAT_INCLUDE,
    });

    if (!surat) {
      throw new NotFoundException('Surat pengantar tidak ditemukan');
    }

    return surat;
  }

  /** Generate surat pengantar (PDF + nomor otomatis) untuk satu jadwal. */
  async terbitkan(jadwalId: number, dto: TerbitkanSuratDto, aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, UserRole.HC);

    const jadwal = await this.prisma.jadwalMcu.findUnique({
      where: { id: jadwalId },
      include: {
        karyawan: true,
        departemen: true,
        klinik: true,
        suratPengantar: true,
      },
    });

    if (!jadwal) {
      throw new NotFoundException('Jadwal MCU tidak ditemukan');
    }

    if (jadwal.suratPengantar) {
      throw new BadRequestException(
        'Surat pengantar untuk jadwal ini sudah diterbitkan',
      );
    }

    if (jadwal.statusPendaftaran === StatusPendaftaran.DIBATALKAN) {
      throw new BadRequestException('Jadwal MCU sudah dibatalkan');
    }

    if (!jadwal.klinikId) {
      throw new BadRequestException(
        'Klinik tujuan wajib ditentukan sebelum surat pengantar diterbitkan',
      );
    }

    const tanggalTerbit = hariIni();
    const tahunTerbit = tanggalTerbit.getUTCFullYear();

    const terakhir = await this.prisma.suratPengantar.findFirst({
      where: { tahunTerbit },
      orderBy: { nomorUrut: 'desc' },
      select: { nomorUrut: true },
    });

    const nomorUrut = (terakhir?.nomorUrut ?? 0) + 1;
    const nomorSurat = this.formatNomorSurat(nomorUrut, tahunTerbit);

    const filePdf = await this.buatPdfSurat({
      nomorSurat,
      tanggalTerbit,
      namaKaryawan: jadwal.karyawan.nama,
      nik: jadwal.karyawan.nik,
      jabatan: jadwal.karyawan.jabatan,
      departemen: jadwal.departemen.namaDepartemen,
      jenisMcu: jadwal.jenisMcu,
      tanggalMcu: jadwal.tanggalMcu,
      namaKlinik: jadwal.klinik?.namaKlinik ?? '-',
      alamatKlinik: jadwal.klinik?.alamat ?? null,
      catatan: dto.catatan?.trim() || null,
    });

    const surat = await this.prisma.suratPengantar.create({
      data: {
        jadwalMcuId: jadwal.id,
        nomorSurat,
        nomorUrut,
        tahunTerbit,
        klinikId: jadwal.klinikId,
        tanggalTerbit,
        filePdf,
        status: StatusSuratPengantar.DRAFT,
        diterbitkanId: aktor.id,
      },
      include: SURAT_INCLUDE,
    });

    return surat;
  }

  /**
   * Klinik terkoneksi: surat dikirim ke akun klinik.
   * Klinik non-terkoneksi: HC mengunduh lalu mengirim manual,
   * status tetap dicatat terkirim untuk pelacakan durasi proses.
   */
  async kirim(id: number, aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, UserRole.HC);

    const surat = await this.detail(id);

    if (surat.status === StatusSuratPengantar.TERKIRIM) {
      throw new BadRequestException('Surat pengantar sudah terkirim');
    }

    const diperbarui = await this.prisma.suratPengantar.update({
      where: { id },
      data: {
        status: StatusSuratPengantar.TERKIRIM,
        tanggalKirim: new Date(),
      },
      include: SURAT_INCLUDE,
    });

    const pesan =
      `Surat pengantar MCU ${diperbarui.nomorSurat} atas nama ` +
      `${diperbarui.jadwalMcu.karyawan.nama} untuk pelaksanaan ` +
      `${formatTanggalIndonesia(diperbarui.jadwalMcu.tanggalMcu)}.`;

    const target = [
      // Akun klinik terkoneksi
      ...(diperbarui.klinik?.terkoneksi && diperbarui.klinik.akunId
        ? [{ penerimaId: diperbarui.klinik.akunId, penerimaEmail: null }]
        : []),
      // Karyawan yang bersangkutan
      {
        penerimaId: diperbarui.jadwalMcu.karyawan.akunId,
        penerimaEmail: diperbarui.jadwalMcu.karyawan.email,
      },
    ].filter((item) => item.penerimaId);

    await this.notifikasi.kirimBanyak(
      target.flatMap((item) =>
        this.notifikasi.duaKanal({
          tipe: TipeNotifikasiMcu.JADWAL_MCU,
          refTabel: 'surat_pengantar',
          refId: diperbarui.id,
          judul: `Surat pengantar MCU ${diperbarui.nomorSurat}`,
          pesan,
          ...item,
        }),
      ),
    );

    return diperbarui;
  }

  private formatNomorSurat(nomorUrut: number, tahun: number): string {
    const urut = String(nomorUrut).padStart(4, '0');
    return `${urut}/HC-MCU/${this.angkaRomawi(new Date().getUTCMonth() + 1)}/${tahun}`;
  }

  private angkaRomawi(bulan: number): string {
    const romawi = [
      'I',
      'II',
      'III',
      'IV',
      'V',
      'VI',
      'VII',
      'VIII',
      'IX',
      'X',
      'XI',
      'XII',
    ];

    return romawi[bulan - 1] ?? 'I';
  }

  /** Render surat pengantar ke PDF dan kembalikan path relatifnya. */
  private async buatPdfSurat(data: {
    nomorSurat: string;
    tanggalTerbit: Date;
    namaKaryawan: string;
    nik: string;
    jabatan: string | null;
    departemen: string;
    jenisMcu: string;
    tanggalMcu: Date;
    namaKlinik: string;
    alamatKlinik: string | null;
    catatan: string | null;
  }): Promise<string> {
    const dir = join(process.cwd(), 'uploads', 'mcu', 'surat-pengantar');

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const namaFile = `surat-pengantar-${data.nomorSurat.replace(/\//g, '-')}.pdf`;
    const tujuan = join(dir, namaFile);

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 56 });
      const potongan: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => potongan.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(potongan)));
      doc.on('error', reject);

      doc.fontSize(16).text('SURAT PENGANTAR MEDICAL CHECK UP', {
        align: 'center',
      });
      doc.moveDown(0.3);
      doc.fontSize(10).text(`Nomor: ${data.nomorSurat}`, { align: 'center' });
      doc.moveDown(1.5);

      doc.fontSize(11).text('Kepada Yth.');
      doc.text(data.namaKlinik);

      if (data.alamatKlinik) {
        doc.text(data.alamatKlinik);
      }

      doc.moveDown(1);
      doc.text(
        'Dengan hormat, bersama surat ini kami mengajukan pelaksanaan Medical Check Up untuk karyawan berikut:',
        { align: 'justify' },
      );
      doc.moveDown(1);

      const baris: Array<[string, string]> = [
        ['Nama', data.namaKaryawan],
        ['NIK', data.nik],
        ['Jabatan', data.jabatan ?? '-'],
        ['Departemen', data.departemen],
        ['Jenis MCU', data.jenisMcu],
        ['Tanggal Pelaksanaan', formatTanggalIndonesia(data.tanggalMcu)],
      ];

      for (const [label, nilai] of baris) {
        doc.text(`${label.padEnd(22, ' ')}: ${nilai}`);
      }

      if (data.catatan) {
        doc.moveDown(1);
        doc.text(`Catatan: ${data.catatan}`, { align: 'justify' });
      }

      doc.moveDown(1.5);
      doc.text(
        'Hasil pemeriksaan mohon disampaikan kepada Human Capital untuk direview oleh Dokter perusahaan.',
        { align: 'justify' },
      );

      doc.moveDown(3);
      doc.text(formatTanggalIndonesia(data.tanggalTerbit), { align: 'right' });
      doc.text('Human Capital', { align: 'right' });
      doc.moveDown(3);
      doc.text('( ....................... )', { align: 'right' });

      doc.end();
    });

    writeFileSync(tujuan, buffer);

    return `mcu/surat-pengantar/${namaFile}`;
  }
}
