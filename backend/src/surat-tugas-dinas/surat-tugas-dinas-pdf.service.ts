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
const ARIAL_PATH = join(
  process.env.WINDIR || 'C:\\Windows',
  'Fonts',
  'arial.ttf',
);
const ARIAL_BOLD_PATH = join(
  process.env.WINDIR || 'C:\\Windows',
  'Fonts',
  'arialbd.ttf',
);

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

      if (existsSync(ARIAL_PATH)) {
        doc.registerFont('Arial', ARIAL_PATH);
      }
      if (existsSync(ARIAL_BOLD_PATH)) {
        doc.registerFont('Arial-Bold', ARIAL_BOLD_PATH);
      }

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
    y += 14;

    if (surat.denganAkomodasi) {
      y = this.gambarAkomodasi(document, y, left, width, surat);
      y += 18;
      y = this.gambarRincianAkomodasi(document, y, left, width, surat);
    }

    if (y + 145 > document.page.height - 37) {
      document.addPage({ size: 'A4', margin: 0 });
      this.gambarBingkaiHalaman(document);
      y = 37;
    }
    this.gambarTandaTangan(document, y + 10, left, width, surat);
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

    document
      .lineWidth(1)
      .strokeColor('#000000')
      .rect(left, top, width, height)
      .stroke();

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
      ['Halaman', 'Lihat lembar'],
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
          document
            .moveTo(x, rowTop)
            .lineTo(x, rowTop + headerHeight)
            .stroke();
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
          document
            .moveTo(x, y)
            .lineTo(x, y + rowHeight)
            .stroke();
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

  private formatRupiah(nilai: number): string {
    return new Intl.NumberFormat('id-ID').format(nilai);
  }

  private laundryTersedia(surat: SuratLengkap): boolean {
    const durasiHari =
      Math.floor(
        (surat.tanggalSelesai.getTime() - surat.tanggalMulai.getTime()) /
          (24 * 60 * 60 * 1000),
      ) + 1;
    return durasiHari >= 3;
  }

  private gambarAkomodasi(
    document: PDFKit.PDFDocument,
    top: number,
    left: number,
    width: number,
    surat: SuratLengkap,
  ): number {
    const labelWidth = 130;
    let y = top;

    document
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor('#000000')
      .text('Akomodasi', left, y);

    y += 17;

    const baris = (label: string, nilai: string, nilaiSamping?: string) => {
      const ruangNilai = width - labelWidth;
      const nilaiUtamaWidth = nilaiSamping ? ruangNilai * 0.55 : ruangNilai;

      document
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#000000')
        .text(label, left, y, { width: labelWidth });

      document
        .font('Helvetica')
        .fontSize(9)
        .text(nilai, left + labelWidth, y, { width: nilaiUtamaWidth - 8 });

      if (nilaiSamping) {
        document.text(
          `/ ${nilaiSamping}`,
          left + labelWidth + nilaiUtamaWidth,
          y,
          { width: ruangNilai - nilaiUtamaWidth },
        );
      }

      y += 17;
    };

    baris('Penginapan / Hotel', surat.penginapanHotel || '-');
    baris(
      'Bantuan Transportasi',
      surat.bantuanTransportasi || '-',
      surat.rutePerjalanan || undefined,
    );

    return y;
  }

  private gambarRincianAkomodasi(
    document: PDFKit.PDFDocument,
    top: number,
    left: number,
    width: number,
    surat: SuratLengkap,
  ): number {
    const fontNormal = existsSync(ARIAL_PATH) ? 'Arial' : 'Helvetica';
    const fontBold = existsSync(ARIAL_BOLD_PATH)
      ? 'Arial-Bold'
      : 'Helvetica-Bold';

    document
      .font(fontBold)
      .fontSize(9)
      .fillColor('#000000')
      .text('Rincian Akomodasi per Karyawan', left, top);
    let y = top + 16;
    const pakaiLaundry = this.laundryTersedia(surat);
    const columns = pakaiLaundry
      ? [
          { label: 'Nama / NRP', width: width * 0.22 },
          { label: 'Makan', width: width * 0.3 },
          { label: 'Transportasi', width: width * 0.18 },
          { label: 'Laundry', width: width * 0.13 },
          { label: 'Total', width: width * 0.17 },
        ]
      : [
          { label: 'Nama / NRP', width: width * 0.24 },
          { label: 'Makan', width: width * 0.34 },
          { label: 'Transportasi', width: width * 0.22 },
          { label: 'Total', width: width * 0.2 },
        ];
    const rowHeight = 44;
    const drawHeader = (at: number) => {
      let x = left;
      document
        .lineWidth(0.7)
        .rect(left, at, width, 22)
        .fillAndStroke('#bdd7ee', '#000000');
      for (const col of columns) {
        document
          .font(fontBold)
          .fontSize(7)
          .fillColor('#000000')
          .text(col.label, x + 3, at + 7, {
            width: col.width - 6,
            align: 'center',
          });
        if (x > left)
          document
            .moveTo(x, at)
            .lineTo(x, at + 22)
            .stroke();
        x += col.width;
      }
    };
    drawHeader(y);
    y += 22;
    for (const item of surat.karyawan) {
      if (y + rowHeight > document.page.height - 70) {
        document.addPage({ size: 'A4', margin: 0 });
        this.gambarBingkaiHalaman(document);
        y = 37;
        this.gambarHeader(document, y, left, width);
        y += 90;
        document
          .font(fontBold)
          .fontSize(9)
          .fillColor('#000000')
          .text('Rincian Akomodasi per Karyawan (lanjutan)', left, y);
        y += 16;
        drawHeader(y);
        y += 22;
      }
      const jumlah =
        (item.uangPerjalananNominal ?? 0) +
        (item.akomodasiNominal ?? 0) +
        (pakaiLaundry ? (item.laundryNominal ?? 0) : 0);
      const amount = (nominal: number | null, detail?: string | null) => {
        const rupiah = `Rp ${this.formatRupiah(nominal ?? 0)}`;
        return detail ? `${rupiah}\n${detail}` : rupiah;
      };
      const values = [
        `${item.nama}\n${item.nrp}`,
        amount(
          item.uangPerjalananNominal,
          item.frekuensiMakan
            ? `Rp ${this.formatRupiah(
                Math.round(
                  (item.uangPerjalananNominal ?? 0) / item.frekuensiMakan,
                ),
              )} / Uang Makan Selama Perjalanan ( ${item.frekuensiMakan}x )`
            : null,
        ),
        amount(item.akomodasiNominal, item.ruteTransportasiLokal),
        ...(pakaiLaundry ? [amount(item.laundryNominal)] : []),
        `Rp ${this.formatRupiah(jumlah)}`,
      ];
      let x = left;
      document.lineWidth(0.6).rect(left, y, width, rowHeight).stroke();
      columns.forEach((col, index) => {
        const textWidth = col.width - 8;
        document.font(fontNormal).fontSize(6.5);
        const textHeight = document.heightOfString(values[index], {
          width: textWidth,
          align: 'center',
        });
        const textTop = y + Math.max(4, (rowHeight - textHeight) / 2);

        document
          .font(fontNormal)
          .fontSize(6.5)
          .fillColor('#000000')
          .text(values[index], x + 4, textTop, {
            width: textWidth,
            height: rowHeight - 8,
            ellipsis: true,
            align: 'center',
          });
        if (x > left)
          document
            .moveTo(x, y)
            .lineTo(x, y + rowHeight)
            .stroke();
        x += col.width;
      });
      y += rowHeight;
    }

    const totalMakan = surat.karyawan.reduce(
      (total, item) => total + (item.uangPerjalananNominal ?? 0),
      0,
    );
    const totalTransportasi = surat.karyawan.reduce(
      (total, item) => total + (item.akomodasiNominal ?? 0),
      0,
    );
    const totalLaundry = pakaiLaundry
      ? surat.karyawan.reduce(
          (total, item) => total + (item.laundryNominal ?? 0),
          0,
        )
      : 0;
    const totalKeseluruhan = totalMakan + totalTransportasi + totalLaundry;
    const footerHeight = 26;

    if (y + footerHeight > document.page.height - 70) {
      document.addPage({ size: 'A4', margin: 0 });
      this.gambarBingkaiHalaman(document);
      y = 37;
      this.gambarHeader(document, y, left, width);
      y += 90;
      document
        .font(fontBold)
        .fontSize(9)
        .fillColor('#000000')
        .text('Jumlah Rincian Akomodasi', left, y);
      y += 16;
      drawHeader(y);
      y += 22;
    }

    const footerValues = [
      'JUMLAH',
      `Rp ${this.formatRupiah(totalMakan)}`,
      `Rp ${this.formatRupiah(totalTransportasi)}`,
      ...(pakaiLaundry ? [`Rp ${this.formatRupiah(totalLaundry)}`] : []),
      `Rp ${this.formatRupiah(totalKeseluruhan)}`,
    ];
    let footerX = left;
    document
      .lineWidth(0.7)
      .rect(left, y, width, footerHeight)
      .fillAndStroke('#eef4f9', '#000000');
    columns.forEach((col, index) => {
      document
        .font(fontBold)
        .fontSize(7)
        .fillColor('#000000')
        .text(footerValues[index], footerX + 4, y + 9, {
          width: col.width - 8,
          align: 'center',
        });
      if (footerX > left) {
        document
          .moveTo(footerX, y)
          .lineTo(footerX, y + footerHeight)
          .stroke();
      }
      footerX += col.width;
    });
    y += footerHeight;

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
      .text(
        `Tabalong, ${this.formatTanggalPanjang(tanggalSh)}`,
        left + kolomWidth,
        top,
        {
          width: kolomWidth,
          align: 'center',
        },
      );

    document.text('Dibuat Oleh,', left + kolomWidth, top + 15, {
      width: kolomWidth,
      align: 'center',
    });

    if (shSudahSetuju && existsSync(SH_SIGNER.file)) {
      try {
        document.image(
          SH_SIGNER.file,
          left + kolomWidth + kolomWidth / 2 - 40,
          top + 32,
          {
            fit: [80, 55],
            align: 'center',
            valign: 'center',
          },
        );
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
          shSudahSetuju
            ? '(Menunggu Persetujuan PJO)'
            : '(Menunggu Persetujuan SH)',
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
