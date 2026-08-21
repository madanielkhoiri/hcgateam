// ==================================================
// FILE: backend/src/surat-tugas-dinas/surat-tugas-dinas-pdf.service.ts
// FUNGSI: Cetak PDF Surat Tugas Dinas mengikuti layout formulir
// PPA-ADR-F-HCGA-36. Dua penanda tangan tetap: SH (Section Head HCGA,
// "Dibuat Oleh") dan PJO (Project Manager, "Mengetahui" - baru muncul
// tanda tangannya setelah surat disetujui).
// ==================================================

import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import PDFDocument from 'pdfkit';
import type { Prisma } from '@prisma/client';

type SuratLengkap = Prisma.SuratTugasDinasGetPayload<{
  include: { karyawan: true };
}>;

const SIGNATURE_DIR = join(process.cwd(), 'uploads', 'signatures');
const LOGO_PATH = join(SIGNATURE_DIR, 'PPA_cut.png');

const SH_SIGNER = {
  nama: 'SINGGIEH PRANANDA',
  jabatan: 'Section Head HCGA',
  file: join(SIGNATURE_DIR, 'singgieh-prananda.png'),
};

const PJO_SIGNER = {
  nama: 'WAHYU BINUKO',
  jabatan: 'Project Manager',
  file: join(SIGNATURE_DIR, 'wahyu-binuko.png'),
};

@Injectable()
export class SuratTugasDinasPdfService {
  async buatFile(surat: SuratLengkap): Promise<string> {
    const dir = join(process.cwd(), 'uploads', 'surat-tugas-dinas');

    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    const namaFile = `surat-tugas-${surat.nomor.replace(/[\\/:*?"<>|]+/g, '-')}.pdf`;
    const tujuan = join(dir, namaFile);

    const buffer = await this.render(surat);
    writeFileSync(tujuan, buffer);

    return `surat-tugas-dinas/${namaFile}`;
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

  private gambarBingkaiHalaman(document: PDFKit.PDFDocument): void {
    const pageLeft = 24;
    const pageTop = 24;
    const pageWidth = document.page.width - 48;
    const pageHeight = document.page.height - 48;

    document
      .lineWidth(1)
      .strokeColor('#000000')
      .rect(pageLeft, pageTop, pageWidth, pageHeight)
      .stroke();
  }

  private gambarHalaman(document: PDFKit.PDFDocument, surat: SuratLengkap) {
    const left = 37;
    const width = document.page.width - 74;

    this.gambarBingkaiHalaman(document);

    let y = 37;

    y = this.gambarHeader(document, y, left, width);
    y += 18;

    y = this.gambarMetaSurat(document, y, left, width, surat);
    y += 14;

    y = this.gambarTabelKaryawan(document, y, left, width, surat);
    y += 18;

    y = this.gambarInfoTugas(document, y, left, width, surat);
    y += 32;

    this.gambarTandaTangan(document, y, left, width, surat);
  }

  private gambarHeader(
    document: PDFKit.PDFDocument,
    top: number,
    left: number,
    width: number,
  ): number {
    const height = 78;
    const logoWidth = 90;
    const metadataWidth = 190;
    const titleWidth = width - logoWidth - metadataWidth;

    document.lineWidth(1).strokeColor('#000000').rect(left, top, width, height).stroke();

    document
      .moveTo(left + logoWidth, top)
      .lineTo(left + logoWidth, top + height)
      .stroke();

    document
      .moveTo(left + logoWidth + titleWidth, top)
      .lineTo(left + logoWidth + titleWidth, top + height)
      .stroke();

    if (existsSync(LOGO_PATH)) {
      try {
        document.image(LOGO_PATH, left + 12, top + 12, {
          fit: [logoWidth - 24, height - 24],
          align: 'center',
          valign: 'center',
        });
      } catch {
        // Abaikan logo yang gagal dibaca.
      }
    }

    document
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor('#000000')
      .text('SURAT TUGAS DINAS', left + logoWidth, top + height / 2 - 8, {
        width: titleWidth,
        align: 'center',
      });

    const metadataLeft = left + logoWidth + titleWidth;
    const labelWidth = 78;
    const rowHeight = height / 4;

    const rows: Array<[string, string]> = [
      ['No Dokumen', 'PPA-ADR-F-HCGA-36'],
      ['Revisi', '0'],
      ['Tgl Efektif', '13/06/2022'],
      ['Halaman', '1 dari 1'],
    ];

    rows.forEach((row, index) => {
      const rowTop = top + index * rowHeight;

      if (index > 0) {
        document
          .moveTo(metadataLeft, rowTop)
          .lineTo(metadataLeft + metadataWidth, rowTop)
          .stroke();
      }

      document
        .moveTo(metadataLeft + labelWidth, rowTop)
        .lineTo(metadataLeft + labelWidth, rowTop + rowHeight)
        .stroke();

      document
        .font('Helvetica-Bold')
        .fontSize(7)
        .text(row[0], metadataLeft + 5, rowTop + 8, {
          width: labelWidth - 10,
        });

      document
        .font('Helvetica')
        .fontSize(7)
        .text(`: ${row[1]}`, metadataLeft + labelWidth + 5, rowTop + 8, {
          width: metadataWidth - labelWidth - 10,
        });
    });

    return top + height;
  }

  private gambarMetaSurat(
    document: PDFKit.PDFDocument,
    top: number,
    left: number,
    width: number,
    surat: SuratLengkap,
  ): number {
    document
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#000000')
      .text(`Nomor  : ${surat.nomor}`, left, top, { width })
      .text('Perihal   : Tugas Dinas Perusahaan', left, top + 15, { width });

    return top + 34;
  }

  private gambarTabelKaryawan(
    document: PDFKit.PDFDocument,
    top: number,
    left: number,
    width: number,
    surat: SuratLengkap,
  ): number {
    document
      .font('Helvetica')
      .fontSize(9)
      .fillColor('#000000')
      .text('Diberikan kepada :', left, top);

    let y = top + 18;

    const kolom = [
      { label: 'No', width: 28 },
      { label: 'NRP', width: 80 },
      { label: 'Nama', width: width - 28 - 80 - 100 - 130 },
      { label: 'Departemen', width: 100 },
      { label: 'Jabatan', width: 130 },
    ];

    const headerHeight = 22;
    const rowHeight = 19;
    const bottomLimit = document.page.height - 200;

    const gambarBarisHeader = (rowTop: number) => {
      let x = left;

      document
        .lineWidth(0.8)
        .rect(left, rowTop, width, headerHeight)
        .fillAndStroke('#bdd7ee', '#000000');

      kolom.forEach((item) => {
        document
          .font('Helvetica-Bold')
          .fontSize(8)
          .fillColor('#000000')
          .text(item.label, x + 3, rowTop + 7, {
            width: item.width - 6,
            align: 'center',
          });

        if (x > left) {
          document.moveTo(x, rowTop).lineTo(x, rowTop + headerHeight).stroke();
        }

        x += item.width;
      });
    };

    gambarBarisHeader(y);
    y += headerHeight;

    surat.karyawan.forEach((item) => {
      if (y + rowHeight > bottomLimit) {
        document.addPage({ size: 'A4', margin: 0 });
        this.gambarBingkaiHalaman(document);
        y = 37;
        gambarBarisHeader(y);
        y += headerHeight;
      }

      let x = left;

      document.lineWidth(0.8).rect(left, y, width, rowHeight).stroke();

      const nilai = [
        String(item.urutan),
        item.nrp,
        item.nama,
        item.departemen,
        item.jabatan,
      ];

      kolom.forEach((kolomItem, index) => {
        document
          .font('Helvetica')
          .fontSize(7.5)
          .fillColor('#000000')
          .text(nilai[index], x + 4, y + 6, {
            width: kolomItem.width - 8,
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

  private gambarInfoTugas(
    document: PDFKit.PDFDocument,
    top: number,
    left: number,
    width: number,
    surat: SuratLengkap,
  ): number {
    const labelWidth = 110;
    let y = top;

    const baris = (label: string, nilai: string, tinggi = 19) => {
      document
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#000000')
        .text(label, left, y, { width: labelWidth });

      document
        .font('Helvetica-Bold')
        .fontSize(9)
        .text(nilai, left + labelWidth, y, { width: width - labelWidth });

      document
        .moveTo(left + labelWidth, y + 13)
        .lineTo(left + width, y + 13)
        .strokeColor('#999999')
        .lineWidth(0.5)
        .stroke()
        .strokeColor('#000000');

      y += tinggi;
    };

    baris('Tujuan/Lokasi', surat.tujuanLokasi);
    baris(
      'Tanggal Tugas',
      `${this.formatTanggalPendek(surat.tanggalMulai)} - ${this.formatTanggalPendek(surat.tanggalSelesai)}`,
    );
    baris('Keterangan Tugas', surat.keteranganTugas);

    return y;
  }

  private gambarTandaTangan(
    document: PDFKit.PDFDocument,
    top: number,
    left: number,
    width: number,
    surat: SuratLengkap,
  ): void {
    const kolomWidth = width / 2;
    const shSudahSetuju =
      surat.status === 'MENUNGGU_PJO' || surat.status === 'DISETUJUI';
    const pjoSudahSetuju = surat.status === 'DISETUJUI';
    const ditolak = surat.status === 'DITOLAK';

    // Kolom kanan: Dibuat Oleh (SH).
    const tanggalSh = surat.disetujuiShPada ?? surat.createdAt;

    document
      .font('Helvetica')
      .fontSize(9)
      .text(`Tabalong, ${this.formatTanggalPanjang(tanggalSh)}`, left + kolomWidth, top, {
        width: kolomWidth,
        align: 'center',
      });

    document.text('Dibuat Oleh,', left + kolomWidth, top + 15, {
      width: kolomWidth,
      align: 'center',
    });

    if (shSudahSetuju && existsSync(SH_SIGNER.file)) {
      try {
        document.image(SH_SIGNER.file, left + kolomWidth + kolomWidth / 2 - 40, top + 32, {
          fit: [80, 55],
          align: 'center',
          valign: 'center',
        });
      } catch {
        // Abaikan tanda tangan rusak.
      }
    } else if (!ditolak) {
      document
        .font('Helvetica-Oblique')
        .fontSize(7.5)
        .fillColor('#8a6a12')
        .text('(Menunggu Persetujuan SH)', left + kolomWidth, top + 55, {
          width: kolomWidth,
          align: 'center',
        })
        .fillColor('#000000');
    }

    document
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(SH_SIGNER.nama, left + kolomWidth, top + 92, {
        width: kolomWidth,
        align: 'center',
        underline: true,
      });

    document
      .font('Helvetica')
      .fontSize(8.5)
      .text(SH_SIGNER.jabatan, left + kolomWidth, top + 106, {
        width: kolomWidth,
        align: 'center',
      });

    // Kolom kiri: Mengetahui (PJO) - tanda tangan baru tampil setelah SH & PJO menyetujui.
    document
      .font('Helvetica')
      .fontSize(9)
      .text('Mengetahui,', left, top + 15, {
        width: kolomWidth,
        align: 'center',
      });

    if (pjoSudahSetuju && existsSync(PJO_SIGNER.file)) {
      try {
        document.image(PJO_SIGNER.file, left + kolomWidth / 2 - 40, top + 32, {
          fit: [80, 55],
          align: 'center',
          valign: 'center',
        });
      } catch {
        // Abaikan tanda tangan rusak.
      }
    } else if (ditolak) {
      document
        .font('Helvetica-Bold')
        .fontSize(10)
        .fillColor('#b62b22')
        .text('DITOLAK', left, top + 50, {
          width: kolomWidth,
          align: 'center',
        })
        .fillColor('#000000');
    } else {
      document
        .font('Helvetica-Oblique')
        .fontSize(7.5)
        .fillColor('#8a6a12')
        .text(
          shSudahSetuju ? '(Menunggu Persetujuan PJO)' : '(Menunggu Persetujuan SH)',
          left,
          top + 55,
          { width: kolomWidth, align: 'center' },
        )
        .fillColor('#000000');
    }

    document
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(PJO_SIGNER.nama, left, top + 92, {
        width: kolomWidth,
        align: 'center',
        underline: true,
      });

    document
      .font('Helvetica')
      .fontSize(8.5)
      .text(PJO_SIGNER.jabatan, left, top + 106, {
        width: kolomWidth,
        align: 'center',
      });

    if (ditolak && surat.alasanTolak) {
      document
        .font('Helvetica-Oblique')
        .fontSize(7.5)
        .fillColor('#b62b22')
        .text(`Alasan: ${surat.alasanTolak}`, left, top + 122, {
          width,
          align: 'center',
        })
        .fillColor('#000000');
    }
  }

  private formatTanggalPendek(value: Date): string {
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Makassar',
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