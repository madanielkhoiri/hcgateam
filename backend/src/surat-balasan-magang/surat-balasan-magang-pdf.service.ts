// ==================================================
// FILE: backend/src/surat-balasan-magang/surat-balasan-magang-pdf.service.ts
// FUNGSI: Cetak PDF Surat Balasan (persetujuan permohonan magang),
// layout surat bisnis polos - sama seperti Surat Pengantar MCU.
// ==================================================

import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import type { Prisma } from '@prisma/client';

type SuratLengkap = Prisma.SuratBalasanMagangGetPayload<{
  include: { baris: { orderBy: { urutan: 'asc' } } };
}>;

const SIGNATURE_DIR = join(process.cwd(), 'uploads', 'signatures');
const LOGO_PATH = join(SIGNATURE_DIR, 'PPA_cut.png');

const SH_SIGNER = {
  nama: 'SINGGIEH PRANANDA',
  jabatan: 'Section Head HCGA',
  file: join(SIGNATURE_DIR, 'singgieh-prananda.png'),
};

@Injectable()
export class SuratBalasanMagangPdfService {
  async buatFile(surat: SuratLengkap): Promise<string> {
    const dir = join(process.cwd(), 'uploads', 'surat-balasan-magang');

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const namaFile = `surat-balasan-${surat.nomor.replace(/[\\/:*?"<>|]+/g, '-')}.pdf`;
    const tujuan = join(dir, namaFile);

    const buffer = await this.render(surat);
    writeFileSync(tujuan, buffer);

    return `surat-balasan-magang/${namaFile}`;
  }

  private render(surat: SuratLengkap): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 0 });
      const potongan: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => potongan.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(potongan)));
      doc.on('error', reject);

      this.gambarHalaman(doc, surat);

      doc.end();
    });
  }

  private gambarHalaman(document: PDFKit.PDFDocument, surat: SuratLengkap) {
    const left = 56;
    const width = document.page.width - 112;

    let y = 45;

    y = this.gambarKopSurat(document, y, left, width);
    y += 24;

    document
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#000000')
      .text(`Tabalong, ${this.formatTanggalPanjang(surat.createdAt)}`, left, y, {
        width,
        align: 'right',
      });
    y += 24;

    document
      .fontSize(9)
      .text(`Nomor      : ${surat.nomor}`, left, y, { width: 300 })
      .text('Lampiran   : -', left, y + 13, { width: 300 });

    document
      .font('Helvetica-Bold')
      .text(
        'Perihal      : Persetujuan Permohonan Magang Industri dan Data Tugas Akhir',
        left,
        y + 26,
        { width },
      );
    y += 50;

    document.font('Helvetica').text('Kepada Yth,', left, y);
    y += 13;
    document.font('Helvetica-Bold').text(surat.tujuanJurusan, left, y, {
      width,
    });
    y += 13 * Math.ceil(document.heightOfString(surat.tujuanJurusan, { width }) / 13);
    document.font('Helvetica').text(`di – ${surat.kotaTujuan}`, left, y);
    y += 24;

    document.font('Helvetica').text('Dengan hormat,', left, y);
    y += 16;

    const pembuka = surat.nomorSuratMasuk
      ? `Berhubung dengan surat No. ${surat.nomorSuratMasuk} perihal ${
          surat.perihalSuratMasuk ?? 'Permohonan Magang Industri dan Data Tugas Akhir'
        }, dengan ini kami sampaikan bahwa PT. Putra Perkasa Abadi Job Site Adaro-Wara ` +
        'menyetujui permohonan magang industri atas nama mahasiswa/i berikut:'
      : 'Dengan ini kami sampaikan bahwa PT. Putra Perkasa Abadi Job Site Adaro-Wara ' +
        'menyetujui permohonan magang industri atas nama mahasiswa/i berikut:';

    document.text(pembuka, left, y, { width, align: 'justify', lineGap: 2 });
    y += 13 * Math.ceil(document.heightOfString(pembuka, { width, lineGap: 2 }) / 13) + 10;

    y = this.gambarTabelMahasiswa(document, y, left, width, surat);
    y += 16;

    document.text(
      'Demikian surat balasan ini kami sampaikan, atas perhatian dan kerjasamanya diucapkan terima kasih.',
      left,
      y,
      { width, align: 'justify' },
    );
    y += 30;

    document.font('Helvetica').text('Hormat kami,', left, y);
    y += 6;
    document.font('Helvetica-Bold').text('PT. PUTRA PERKASA ABADI', left, y + 13);
    y += 19;

    if (existsSync(SH_SIGNER.file)) {
      try {
        document.image(SH_SIGNER.file, left, y + 8, { fit: [80, 55] });
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

  private gambarTabelMahasiswa(
    document: PDFKit.PDFDocument,
    top: number,
    left: number,
    width: number,
    surat: SuratLengkap,
  ): number {
    const kolom = [
      { label: 'No', width: 26 },
      { label: 'Nama', width: 120 },
      { label: 'NRP', width: 80 },
      { label: 'Jurusan', width: width - 26 - 120 - 80 - 100 - 90 },
      { label: 'Departemen', width: 100 },
      { label: 'Tanggal Pelaksanaan', width: 90 },
    ];

    const headerHeight = 24;
    const rowHeight = 24;
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
        .text(item.label, x + 2, y + 8, {
          width: item.width - 4,
          align: 'center',
        });

      if (x > left) {
        document.moveTo(x, y).lineTo(x, y + headerHeight).stroke();
      }

      x += item.width;
    });

    y += headerHeight;

    surat.baris.forEach((baris, index) => {
      x = left;

      document.lineWidth(0.8).rect(left, y, width, rowHeight).stroke();

      const nilai = [
        String(index + 1),
        baris.nama,
        baris.nrp,
        baris.jurusan,
        baris.departemenTujuan,
        `${this.formatTanggalPendek(baris.tanggalMulai)} - ${this.formatTanggalPendek(baris.tanggalSelesai)}`,
      ];

      kolom.forEach((kolomItem, kolomIndex) => {
        document
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor('#000000')
          .text(nilai[kolomIndex], x + 3, y + 8, {
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

    document.rect(0, barTop, document.page.width, barHeight).fill('#e86600');

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
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Makassar',
    }).format(value);
  }
}
