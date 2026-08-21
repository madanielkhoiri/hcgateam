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
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';
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
import { hariIni, tanggalSaja } from '../mcu-date.util';
import { McuNotifikasiService } from '../notifikasi/mcu-notifikasi.service';

const SIGNATURE_DIR = join(process.cwd(), 'uploads', 'signatures');
const LOGO_PATH = join(SIGNATURE_DIR, 'PPA_cut.png');
const SH_SIGNER = {
  nama: 'SINGGIEH PRANANDA',
  jabatan: 'Section Head HCGA',
  file: join(SIGNATURE_DIR, 'singgieh-prananda.png'),
};
/** Alamat email tetap penerima hasil MCU, sesuai format surat resmi. */
const EMAIL_HASIL_MCU =
  'hcd.ppaadr@ppa.co.id; lela.kurniawati@amm.id; misbakhulhuda@ppa.co.id';

export class BarisSuratPengantarDto {
  @IsInt()
  jadwalMcuId: number;

  @IsString()
  @IsNotEmpty({ message: 'Jenis pemeriksaan wajib diisi' })
  jenisPemeriksaan: string;

  @IsDateString()
  tanggalMcu: string;
}

export class TerbitkanSuratBatchDto {
  @IsInt()
  klinikId: number;

  @IsOptional()
  @IsString()
  catatan?: string;

  @ValidateNested({ each: true })
  @Type(() => BarisSuratPengantarDto)
  @ArrayMinSize(1, { message: 'Minimal 1 jadwal MCU pada surat pengantar' })
  jadwal: BarisSuratPengantarDto[];
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
        suratPengantarId: null,
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

  /**
   * Generate surat pengantar batch (PDF + nomor otomatis) mencakup
   * beberapa Jadwal MCU sekaligus ke satu klinik tujuan yang sama.
   * Jenis Pemeriksaan & Tanggal MCU diisi manual per baris di sini;
   * identitas karyawan (NIK/Nama/Jabatan/Departemen) tetap diambil dari
   * Jadwal MCU -> Database Karyawan, tidak diketik ulang.
   */
  async terbitkan(dto: TerbitkanSuratBatchDto, aktor: AktorMcu) {
    this.akses.wajibPeran(aktor, UserRole.HC);

    const klinik = await this.prisma.klinik.findUnique({
      where: { id: dto.klinikId },
    });

    if (!klinik) {
      throw new NotFoundException('Klinik tidak ditemukan');
    }

    const jadwalIds = dto.jadwal.map((item) => item.jadwalMcuId);
    const jadwalList = await this.prisma.jadwalMcu.findMany({
      where: { id: { in: jadwalIds } },
    });

    if (jadwalList.length !== jadwalIds.length) {
      throw new BadRequestException(
        'Sebagian Jadwal MCU yang dipilih tidak ditemukan',
      );
    }

    for (const jadwal of jadwalList) {
      if (jadwal.suratPengantarId) {
        throw new BadRequestException(
          `Jadwal MCU #${jadwal.id} sudah memiliki surat pengantar`,
        );
      }

      if (jadwal.statusPendaftaran === StatusPendaftaran.DIBATALKAN) {
        throw new BadRequestException(
          `Jadwal MCU #${jadwal.id} sudah dibatalkan`,
        );
      }
    }

    const tanggalTerbit = hariIni();
    const tahunTerbit = tanggalTerbit.getUTCFullYear();
    const catatan = dto.catatan?.trim() || null;

    const surat = await this.prisma.$transaction(async (tx) => {
      const terakhir = await tx.suratPengantar.findFirst({
        where: { tahunTerbit },
        orderBy: { nomorUrut: 'desc' },
        select: { nomorUrut: true },
      });

      const nomorUrut = (terakhir?.nomorUrut ?? 0) + 1;
      const nomorSurat = this.formatNomorSurat(nomorUrut, tahunTerbit);

      const dibuat = await tx.suratPengantar.create({
        data: {
          nomorSurat,
          nomorUrut,
          tahunTerbit,
          klinikId: dto.klinikId,
          tanggalTerbit,
          catatan,
          status: StatusSuratPengantar.DRAFT,
          diterbitkanId: aktor.id,
        },
      });

      for (const baris of dto.jadwal) {
        await tx.jadwalMcu.update({
          where: { id: baris.jadwalMcuId },
          data: {
            klinikId: dto.klinikId,
            jenisPemeriksaan: baris.jenisPemeriksaan.trim(),
            tanggalMcu: tanggalSaja(baris.tanggalMcu),
            suratPengantarId: dibuat.id,
          },
        });
      }

      return dibuat;
    });

    return this.cetakUlang(surat.id);
  }

  /** Cetak ulang PDF surat pengantar dari data yang sudah tersimpan. */
  async cetakUlang(id: number) {
    const surat = await this.prisma.suratPengantar.findUnique({
      where: { id },
      include: SURAT_INCLUDE,
    });

    if (!surat) {
      throw new NotFoundException('Surat pengantar tidak ditemukan');
    }

    const filePdf = await this.buatPdfSurat(surat);

    return this.prisma.suratPengantar.update({
      where: { id },
      data: { filePdf },
      include: SURAT_INCLUDE,
    });
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

    const namaKaryawan = diperbarui.jadwalMcu
      .map((item) => item.karyawan.nama)
      .join(', ');

    const pesan =
      `Surat pengantar MCU ${diperbarui.nomorSurat} untuk ` +
      `${diperbarui.jadwalMcu.length} karyawan (${namaKaryawan}).`;

    const targetKlinik =
      diperbarui.klinik?.terkoneksi && diperbarui.klinik.akunId
        ? [{ penerimaId: diperbarui.klinik.akunId, penerimaEmail: null }]
        : [];

    const targetKaryawan = diperbarui.jadwalMcu.map((item) => ({
      penerimaId: item.karyawan.akunId,
      penerimaEmail: item.karyawan.email,
    }));

    const target = [...targetKlinik, ...targetKaryawan].filter(
      (item) => item.penerimaId,
    );

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
    const urut = String(nomorUrut).padStart(2, '0');
    return `${urut}/S-Out/HCGA/PPA-Adw/${this.angkaRomawi(new Date().getUTCMonth() + 1)}/${tahun}`;
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

  /** Render surat pengantar batch ke PDF dan kembalikan path relatifnya. */
  private async buatPdfSurat(
    surat: Prisma.SuratPengantarGetPayload<{ include: typeof SURAT_INCLUDE }>,
  ): Promise<string> {
    const dir = join(process.cwd(), 'uploads', 'mcu', 'surat-pengantar');

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const namaFile = `surat-pengantar-${surat.nomorSurat.replace(/[\\/:*?"<>|]+/g, '-')}.pdf`;
    const tujuan = join(dir, namaFile);

    const buffer = await new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      const potongan: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => potongan.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(potongan)));
      doc.on('error', reject);

      this.gambarHalamanSurat(doc, surat);

      doc.end();
    });

    writeFileSync(tujuan, buffer);

    return `mcu/surat-pengantar/${namaFile}`;
  }

  private gambarHalamanSurat(
    document: PDFKit.PDFDocument,
    surat: Prisma.SuratPengantarGetPayload<{ include: typeof SURAT_INCLUDE }>,
  ): void {
    const left = 56;
    const width = document.page.width - 112;
    const namaKlinik = surat.klinik?.namaKlinik ?? '-';

    let y = 45;

    y = this.gambarKopSurat(document, y, left, width);
    y += 24;

    document
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#000000')
      .text(`Tabalong, ${this.formatTanggalPanjang(surat.tanggalTerbit)}`, left, y, {
        width,
        align: 'right',
      });
    y += 24;

    document
      .fontSize(9)
      .text(`Nomor      : ${surat.nomorSurat}`, left, y, { width: 300 })
      .text('Lampiran   : -', left, y + 13, { width: 300 });

    document
      .font('Helvetica-Bold')
      .text('Perihal      : Pengantar MCU Karyawan (Periodical MCU)', left, y + 26, {
        width,
      });
    y += 50;

    document.font('Helvetica').text('Kepada Yth,', left, y);
    y += 13;
    document
      .font('Helvetica-Bold')
      .text(`Pimpinan ${namaKlinik}`, left, y);
    y += 13;
    document.font('Helvetica').text('di – Tabalong', left, y);
    y += 13;
    document
      .font('Helvetica-BoldOblique')
      .text('u.p.     : Bagian Medical Check-Up', left, y);
    y += 24;

    document.font('Helvetica').text('Dengan hormat,', left, y);
    y += 16;

    document.text(
      'Sehubungan dengan hal tersebut di atas, bersama ini kami sampaikan bahwa karyawan ' +
        'PT. Putra Perkasa Abadi Job Site Adaro-Wara mohon untuk dilakukan tindakan MCU di ' +
        `Klinik ${namaKlinik}.`,
      left,
      y,
      { width, align: 'justify', lineGap: 2 },
    );
    y += 44;

    document.text(`Berikut karyawan yang akan melaksanakan MCU `, left, y, {
      continued: true,
    });
    document
      .font('Helvetica-BoldOblique')
      .text(`di ${namaKlinik}:`);
    y += 16;

    y = this.gambarTabelKaryawan(document, y, left, width, surat);
    y += 16;

    document
      .font('Helvetica')
      .fontSize(9)
      .text(
        'Mengenai biaya medical check-up tersebut, menjadi tanggung jawab sepenuhnya oleh perusahaan.',
        left,
        y,
        { width, align: 'justify' },
      );
    y += 24;

    if (surat.catatan) {
      document.text(`Catatan: ${surat.catatan}`, left, y, {
        width,
        align: 'justify',
      });
      y += 24;
    }

    document.font('Helvetica-Bold').text('NOTE :', left, y);
    y += 13;

    document
      .font('Helvetica')
      .text(`Hasil MCU dikirim ke email: ${EMAIL_HASIL_MCU}`, left, y, {
        width,
      });
    y += 24;

    document.text(
      'Demikian hal ini kami sampaikan, atas perhatian dan kerjasamanya diucapkan terima kasih.',
      left,
      y,
      { width },
    );
    y += 24;

    document.font('Helvetica-Bold').text('PT. PUTRA PERKASA ABADI', left, y);
    y += 13;
    document.font('Helvetica').text('Mengetahui,', left, y);
    y += 6;

    if (existsSync(SH_SIGNER.file)) {
      try {
        document.image(SH_SIGNER.file, left, y + 8, {
          fit: [80, 55],
        });
      } catch {
        // Abaikan tanda tangan rusak.
      }
    }

    y += 70;

    document
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(SH_SIGNER.nama, left, y, { underline: true });
    y += 13;
    document.font('Helvetica').text(SH_SIGNER.jabatan, left, y);
    y += 13;
    document.text('CC: -FA-File', left, y);

    this.gambarFooterSurat(document);
  }

  private gambarKopSurat(
    document: PDFKit.PDFDocument,
    top: number,
    left: number,
    width: number,
  ): number {
    if (existsSync(LOGO_PATH)) {
      try {
        document.image(LOGO_PATH, left, top, { fit: [46, 46] });
      } catch {
        // Abaikan logo yang gagal dibaca.
      }
    }

    document
      .font('Helvetica-Bold')
      .fontSize(22)
      .fillColor('#000000')
      .text('PUTRA PERKASA ABADI', left + 56, top + 12, {
        width: width - 56,
      });

    const garisY = top + 50;
    document
      .moveTo(left, garisY)
      .lineTo(left + width, garisY)
      .lineWidth(1.5)
      .strokeColor('#c0392b')
      .stroke()
      .strokeColor('#000000');

    return garisY;
  }

  private gambarTabelKaryawan(
    document: PDFKit.PDFDocument,
    top: number,
    left: number,
    width: number,
    surat: Prisma.SuratPengantarGetPayload<{ include: typeof SURAT_INCLUDE }>,
  ): number {
    const kolom = [
      { label: 'No', width: 24 },
      { label: 'NIK', width: 70 },
      { label: 'Nama', width: 110 },
      { label: 'Jabatan', width: width - 24 - 70 - 110 - 55 - 65 - 80 },
      { label: 'Dept.', width: 55 },
      { label: 'Jenis\nPemeriksaan', width: 65 },
      { label: 'Tanggal MCU', width: 80 },
    ];

    const headerHeight = 26;
    const rowHeight = 26;
    let y = top;

    let x = left;

    document
      .lineWidth(0.8)
      .rect(left, y, width, headerHeight)
      .fillAndStroke('#bdd7ee', '#000000');

    kolom.forEach((item) => {
      document
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .fillColor('#000000')
        .text(item.label, x + 2, y + 7, {
          width: item.width - 4,
          align: 'center',
        });

      if (x > left) {
        document.moveTo(x, y).lineTo(x, y + headerHeight).stroke();
      }

      x += item.width;
    });

    y += headerHeight;

    surat.jadwalMcu.forEach((jadwal, index) => {
      x = left;

      document.lineWidth(0.8).rect(left, y, width, rowHeight).stroke();

      const nilai = [
        String(index + 1),
        jadwal.karyawan.nik,
        jadwal.karyawan.nama,
        jadwal.karyawan.jabatan ?? '-',
        jadwal.departemen.namaDepartemen,
        jadwal.jenisPemeriksaan ?? '-',
        this.formatTanggalPendek(jadwal.tanggalMcu),
      ];

      kolom.forEach((kolomItem, kolomIndex) => {
        document
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor('#000000')
          .text(nilai[kolomIndex], x + 3, y + 9, {
            width: kolomItem.width - 6,
            align: 'center',
            ellipsis: true,
          });

        if (x > left) {
          document.moveTo(x, y).lineTo(x, y + rowHeight).stroke();
        }

        x += kolomItem.width;
      });

      y += rowHeight;
    });

    return y;
  }

  private gambarFooterSurat(document: PDFKit.PDFDocument): void {
    const barHeight = 8;
    const barTop = document.page.height - barHeight;

    document
      .rect(0, barTop, document.page.width, barHeight)
      .fill('#e86600');

    document
      .font('Helvetica')
      .fontSize(7)
      .fillColor('#8494a9')
      .text(
        'Gedung Office 8, Lantai 8, SCBD Lot 28. Jl. Jend Sudirman Kav. 52-53 Senayan, ' +
          'Kebayoran Baru, Jakarta Selatan, 12190.\nTelp. +62 21 5790 3456  |  www.ppa.co.id',
        0,
        barTop - 30,
        { width: document.page.width, align: 'center' },
      )
      .fillColor('#000000');
  }

  private formatTanggalPendek(value: Date): string {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(value);
  }

  private formatTanggalPanjang(value: Date): string {
    return this.formatTanggalPendek(value);
  }
}
