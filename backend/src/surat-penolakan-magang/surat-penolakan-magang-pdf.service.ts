// ==================================================
// FILE: backend/src/surat-penolakan-magang/surat-penolakan-magang-pdf.service.ts
// FUNGSI: Cetak PDF Surat Penolakan magang (1 surat per 1 orang),
// layout surat bisnis polos - sama seperti Surat Pengantar MCU.
// ==================================================

import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import type { Prisma } from '@prisma/client';

type SuratLengkap = Prisma.SuratPenolakanMagangGetPayload<object>;

const SIGNATURE_DIR = join(process.cwd(), 'uploads', 'signatures');
const LOGO_PATH = join(SIGNATURE_DIR, 'PPA_cut.png');

const SH_SIGNER = {
  nama: 'SINGGIEH PRANANDA',
  jabatan: 'Section Head HCGA',
  file: join(SIGNATURE_DIR, 'singgieh-prananda.png'),
};

@Injectable()
export class SuratPenolakanMagangPdfService {
  async buatFile(surat: SuratLengkap): Promise<string> {
    const dir = join(process.cwd(), 'uploads', 'surat-penolakan-magang');

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const namaFile = `surat-penolakan-${surat.nomor.replace(/[\\/:*?"<>|]+/g, '-')}.pdf`;
    const tujuan = join(dir, namaFile);

    const buffer = await this.render(surat);
    writeFileSync(tujuan, buffer);

    return `surat-penolakan-magang/${namaFile}`;
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
      .text('Perihal      : Penolakan Permohonan Magang Industri', left, y + 26, {
        width,
      });
    y += 50;

    document
      .font('Helvetica')
      .text(`Kepada Yth,`, left, y);
    y += 13;
    document
      .font('Helvetica-Bold')
      .text(`${surat.sapaan} ${surat.nama}`, left, y);
    y += 24;

    document.font('Helvetica').text('Dengan hormat,', left, y);
    y += 16;

    const paragraf1 =
      `Terima kasih atas ketertarikan dan permohonan magang industri yang telah diajukan oleh ` +
      `${surat.sapaan} ${surat.nama} kepada PT Putra Perkasa Abadi. Sehubungan dengan hal tersebut, ` +
      `dengan berat hati kami sampaikan bahwa permohonan magang yang ${surat.sapaan} ajukan belum ` +
      `dapat kami terima untuk saat ini.`;

    document.text(paragraf1, left, y, { width, align: 'justify', lineGap: 2 });
    y += 13 * Math.ceil(document.heightOfString(paragraf1, { width, lineGap: 2 }) / 13) + 12;

    const paragraf2 =
      `Keputusan ini berdasarkan berbagai pertimbangan, antara lain ${surat.alasanPenolakan}.`;

    document.text(paragraf2, left, y, { width, align: 'justify', lineGap: 2 });
    y += 13 * Math.ceil(document.heightOfString(paragraf2, { width, lineGap: 2 }) / 13) + 12;

    const paragraf3 =
      `Kami berharap ${surat.sapaan} ${surat.nama} tetap semangat dan dapat mencoba kembali di ` +
      `kesempatan lain. Atas perhatian dan pengertiannya, kami ucapkan terima kasih.`;

    document.text(paragraf3, left, y, { width, align: 'justify', lineGap: 2 });
    y += 13 * Math.ceil(document.heightOfString(paragraf3, { width, lineGap: 2 }) / 13) + 20;

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

  private formatTanggalPanjang(value: Date): string {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Makassar',
    }).format(value);
  }
}
