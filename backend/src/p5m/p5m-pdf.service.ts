import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import * as fs from 'node:fs';
import * as path from 'node:path';
import { siapkanGambarUntukPdfKit } from '../common/pdf-image.util';
import { P5mService } from './p5m.service';

type GambarSiap = Map<string, string | Buffer>;

@Injectable()
export class P5mPdfService {
  constructor(private readonly p5mService: P5mService) {}

  private normalizeSupervisors(value: unknown): string[] {
    if (Array.isArray(value)) {
      return value
        .map(String)
        .map((item) => item.trim())
        .filter(Boolean);
    }

    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);

        if (Array.isArray(parsed)) {
          return parsed
            .map(String)
            .map((item) => item.trim())
            .filter(Boolean);
        }
      } catch {
        return value
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean);
      }
    }

    return [];
  }

  private resolveLogo(): string | null {
    const candidates = [
      path.resolve(process.cwd(), 'uploads', 'signatures', 'PPA_cut.png'),
      path.resolve(
        process.cwd(),
        'uploads',
        'signatures',
        'Logo PPA Official.png',
      ),
      path.resolve(process.cwd(), 'uploads', 'signatures', 'logo-ppa.png'),
    ];

    return candidates.find((file) => fs.existsSync(file)) ?? null;
  }

  private resolveImage(storedPath: string): string | null {
    const normalized = storedPath
      .replace(/^https?:\/\/[^/]+/i, '')
      .replace(/^\/+/, '');

    const withoutUploads = normalized.replace(/^uploads\//, '');

    const candidates = [
      path.resolve(process.cwd(), normalized),
      path.resolve(process.cwd(), 'uploads', withoutUploads),
      path.resolve(process.cwd(), '..', normalized),
    ];

    return candidates.find((file) => fs.existsSync(file)) ?? null;
  }

  /** PDFKit hanya baca JPEG/PNG — foto WebP hasil kompresi frontend dikonversi dulu. */
  private async siapkanGambarDokumentasi(
    paths: string[],
  ): Promise<GambarSiap> {
    const gambarSiap: GambarSiap = new Map();

    for (const storedPath of paths.slice(0, 4)) {
      const absolutePath = this.resolveImage(storedPath);

      if (!absolutePath) {
        continue;
      }

      try {
        gambarSiap.set(
          storedPath,
          await siapkanGambarUntukPdfKit(absolutePath),
        );
      } catch {
        // Gambar dilewati — kartu akan tampil "gambar tidak ditemukan".
      }
    }

    return gambarSiap;
  }

  private fitText(
    doc: PDFKit.PDFDocument,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    options?: {
      bold?: boolean;
      fontSize?: number;
      color?: string;
      align?: 'left' | 'center' | 'right';
    },
  ) {
    const bold = options?.bold ?? false;
    const initialSize = options?.fontSize ?? 10;
    const color = options?.color ?? '#202631';
    const align = options?.align ?? 'left';

    let fontSize = initialSize;

    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica');

    while (fontSize > 7) {
      doc.fontSize(fontSize);

      const measuredHeight = doc.heightOfString(text || '-', {
        width,
        align,
        lineGap: 1,
      });

      if (measuredHeight <= height) {
        break;
      }

      fontSize -= 0.5;
    }

    doc
      .font(bold ? 'Helvetica-Bold' : 'Helvetica')
      .fontSize(fontSize)
      .fillColor(color)
      .text(text || '-', x, y, {
        width,
        height,
        align,
        lineGap: 1,
        ellipsis: true,
      });
  }

  private drawInformationTable(
    doc: PDFKit.PDFDocument,
    values: {
      date: string;
      location: string;
      speaker: string;
      participants: string;
    },
    x: number,
    y: number,
    width: number,
  ) {
    const rowHeight = 40;
    const halfWidth = width / 2;
    const labelWidth = 92;

    const cells = [
      {
        row: 0,
        column: 0,
        label: 'Tanggal',
        value: values.date,
      },
      {
        row: 0,
        column: 1,
        label: 'Lokasi',
        value: values.location,
      },
      {
        row: 1,
        column: 0,
        label: 'Pemateri',
        value: values.speaker,
      },
      {
        row: 1,
        column: 1,
        label: 'Peserta',
        value: values.participants,
      },
    ];

    doc
      .lineWidth(0.8)
      .strokeColor('#C6D0D8')
      .rect(x, y, width, rowHeight * 2)
      .stroke();

    doc
      .moveTo(x + halfWidth, y)
      .lineTo(x + halfWidth, y + rowHeight * 2)
      .stroke();

    doc
      .moveTo(x, y + rowHeight)
      .lineTo(x + width, y + rowHeight)
      .stroke();

    for (const cell of cells) {
      const cellX = x + cell.column * halfWidth;
      const cellY = y + cell.row * rowHeight;

      this.fitText(
        doc,
        cell.label,
        cellX + 12,
        cellY + 13,
        labelWidth - 18,
        18,
        {
          bold: true,
          fontSize: 10,
        },
      );

      this.fitText(
        doc,
        cell.value,
        cellX + labelWidth,
        cellY + 13,
        halfWidth - labelWidth - 10,
        20,
        {
          fontSize: 10,
        },
      );
    }
  }

  private drawSection(
    doc: PDFKit.PDFDocument,
    title: string,
    value: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor('#147A70')
      .text(title, x, y, {
        width,
      });

    const boxY = y + 24;

    doc
      .lineWidth(0.8)
      .strokeColor('#C6D0D8')
      .fillColor('#FAFBFC')
      .rect(x, boxY, width, height)
      .fillAndStroke();

    this.fitText(
      doc,
      value || '-',
      x + 12,
      boxY + 12,
      width - 24,
      height - 24,
      {
        fontSize: 10,
      },
    );
  }

  private drawDocumentation(
    doc: PDFKit.PDFDocument,
    images: string[],
    x: number,
    y: number,
    width: number,
    gambarSiap: GambarSiap,
  ) {
    doc
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor('#147A70')
      .text('Dokumentasi', x, y, {
        width,
      });

    const gap = 12;
    const cardWidth = (width - gap) / 2;
    const cardHeight = 164;
    const imageHeight = 128;
    const startY = y + 27;

    if (!images.length) {
      doc
        .lineWidth(0.8)
        .strokeColor('#C6D0D8')
        .roundedRect(x, startY, width, 105, 8)
        .stroke();

      this.fitText(doc, 'Belum ada dokumentasi.', x, startY + 44, width, 20, {
        color: '#718091',
        align: 'center',
        fontSize: 9,
      });

      return;
    }

    images.slice(0, 4).forEach((storedPath, index) => {
      const column = index % 2;
      const row = Math.floor(index / 2);

      const cardX = x + column * (cardWidth + gap);
      const cardY = startY + row * (cardHeight + 12);

      doc
        .lineWidth(0.8)
        .strokeColor('#C6D0D8')
        .roundedRect(cardX, cardY, cardWidth, cardHeight, 8)
        .stroke();

      this.fitText(
        doc,
        `Dokumentasi ${index + 1}`,
        cardX,
        cardY + 10,
        cardWidth,
        18,
        {
          bold: true,
          color: '#4D5A68',
          align: 'center',
          fontSize: 9,
        },
      );

      const gambar = gambarSiap.get(storedPath);

      if (gambar) {
        try {
          doc.image(gambar, cardX + 8, cardY + 30, {
            fit: [cardWidth - 16, imageHeight - 6],
            align: 'center',
            valign: 'center',
          });
        } catch {
          this.fitText(
            doc,
            'Gambar gagal dibaca.',
            cardX,
            cardY + 88,
            cardWidth,
            18,
            {
              color: '#788697',
              align: 'center',
              fontSize: 8,
            },
          );
        }
      } else {
        this.fitText(
          doc,
          'Gambar tidak ditemukan.',
          cardX,
          cardY + 88,
          cardWidth,
          18,
          {
            color: '#788697',
            align: 'center',
            fontSize: 8,
          },
        );
      }
    });
  }

  private normalizeNumberedText(value: string | null | undefined): string {
    const lines = String(value ?? '')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) =>
        line
          .replace(/^\d+\s*[.)-]\s*/, '')
          .replace(/^[-•]\s*/, '')
          .trim(),
      )
      .filter(Boolean);

    if (!lines.length) {
      return '-';
    }

    return lines.map((line, index) => `${index + 1}. ${line}`).join('\n');
  }

  private drawAttendancePagesLegacy(doc: PDFKit.PDFDocument, data: any, logo: string | null) {
    const rows = Array.isArray(data.attendances) ? data.attendances : [];
    const chunks = rows.length
      ? Array.from({ length: Math.ceil(rows.length / 35) }, (_, index) => rows.slice(index * 35, index * 35 + 35))
      : [[]];
    const topics = String(data.topic ?? '').split(/\r?\n/).map((value) => value.trim()).filter(Boolean)
      .map((value, index) => `${index + 1}) ${value}`).join('  ');
    const date = new Date(data.activityDate);
    const day = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(date);
    const dateText = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);

    chunks.forEach((items: any[], pageIndex) => {
      doc.addPage({ size: 'A4', layout: 'landscape', margin: 16 });
      const width = doc.page.width - 32;
      if (logo) { try { doc.image(logo, 19, 17, { fit: [45, 40] }); } catch {} }
      doc.font('Helvetica-Bold').fillColor('#111827').fontSize(12).text('FORM SAFETY TALK & P5M', 70, 18, { width: width - 140, align: 'center' });
      doc.fontSize(7).text('PPA-ADRO-F-SHE-13A · Rev. 3', 70, 35, { width: width - 140, align: 'center' });
      doc.font('Helvetica').fontSize(6.5).text(`Halaman ${pageIndex + 2}`, doc.page.width - 90, 22, { width: 70, align: 'right' });

      const infoY = 58;
      const info = [
        `Hari / Tanggal: ${day}, ${dateText}`,
        `Waktu: ${data.startTime || '-'}${data.endTime ? ` - ${data.endTime}` : ''}`,
        'Departemen: HCGA',
        `Lokasi: ${data.location || '-'}`,
        `Penyaji: ${data.speaker || '-'}`,
      ];
      info.forEach((text, index) => doc.font('Helvetica').fontSize(6.5).fillColor('#111827').text(text, 18 + (index % 3) * 270, infoY + Math.floor(index / 3) * 13, { width: 260 }));
      doc.font('Helvetica-Bold').fontSize(6.5).text(`Judul / Topik K3PLM: ${topics || '-'}`, 18, 86, { width });

      const y = 111;
      const columns = [22, 74, 48, 62, 64, 34, 34, 34, 34, 34, 34, 34, 34, 34, 34, 37, 38, 42, 68];
      const headers = ['No', 'Nama', 'NRP', 'Jabatan', 'Dept.', 'Tidur\n72 jam', 'Tidur\n48 jam', 'Tidur\n24 jam', 'Gizi\ncukup', 'Tanpa\nalkohol/obat', 'Tanpa aktivitas\nberlebih', 'Bebas\nstres', 'Bebas penyakit\nserius', 'Bebas masalah\nkeluarga', 'Paham\npekerjaan', 'Sehat /\nSakit', 'Tanda\ntangan', 'Boleh\nkerja', 'Keterangan'];
      let x = 18;
      headers.forEach((header, index) => {
        doc.rect(x, y, columns[index], 38).fillAndStroke('#E8F2F7', '#607080');
        doc.font('Helvetica-Bold').fillColor('#111827').fontSize(4.8).text(header, x + 1, y + 7, { width: columns[index] - 2, height: 29, align: 'center' });
        x += columns[index];
      });
      const mark = (value: boolean) => value ? 'Ya' : 'Tidak';
      for (let rowIndex = 0; rowIndex < 35; rowIndex += 1) {
        const item = items[rowIndex];
        const rowY = y + 38 + rowIndex * 11.5;
        const values = item ? [
          String(pageIndex * 35 + rowIndex + 1), item.nameSnapshot, item.nrpSnapshot,
          item.jobTitleSnapshot, item.departmentSnapshot,
          mark(item.sleep72), mark(item.sleep48),
          item.sleep24 === 'LESS_THAN_4' ? '<4' : item.sleep24 === 'BETWEEN_4_6' ? '4-6' : '>6',
          mark(item.nutritionEnough), mark(item.noAlcoholMedicine), mark(item.noExcessActivity),
          mark(item.noExcessStress), mark(item.noSeriousIllness), mark(item.noFamilyProblem),
          mark(item.understandsWork), item.health === 'HEALTHY' ? 'Sehat' : 'Sakit',
          'Digital', item.allowedToWork == null ? '-' : item.allowedToWork ? 'Ya' : 'Tidak', item.reviewNote || '',
        ] : Array(headers.length).fill('');
        x = 18;
        values.forEach((value, index) => {
          doc.rect(x, rowY, columns[index], 11.5).strokeColor('#8796A5').stroke();
          doc.font('Helvetica').fillColor('#111827').fontSize(index === 1 || index === 18 ? 4.8 : 5).text(String(value), x + 1, rowY + 3, { width: columns[index] - 2, height: 8, align: index < 5 || index === 18 ? 'left' : 'center', ellipsis: true });
          x += columns[index];
        });
      }
      const footerY = y + 38 + 35 * 11.5 + 8;
      doc.font('Helvetica-Bold').fontSize(6).fillColor('#111827').text('Kesimpulan pemeriksaan kesiapan kerja:', 18, footerY);
      doc.font('Helvetica').fontSize(5.5).text('Peserta dinyatakan siap bekerja setelah seluruh kondisi diperiksa. Keputusan akhir “Boleh Kerja” dan keterangannya diisi oleh Group Leader.', 18, footerY + 10, { width: 600 });
      doc.font('Helvetica-Bold').fontSize(6).text(`Group Leader / Pengawas: ${this.normalizeSupervisors(data.supervisors).join(', ') || '-'}`, 620, footerY, { width: 190, align: 'center' });
    });
  }
  private drawAttendancePages(doc: PDFKit.PDFDocument, data: any, logo: string | null) {
    const rows = Array.isArray(data.attendances) ? data.attendances : [];
    const chunks: any[][] = rows.length
      ? Array.from({ length: Math.ceil(rows.length / 35) }, (_, index) => rows.slice(index * 35, index * 35 + 35))
      : [[]];
    const topics = String(data.topic ?? '').split(/\r?\n/).map((value) => value.trim()).filter(Boolean)
      .map((value, index) => `${index + 1}) ${value}`).join('  ');
    const date = new Date(data.activityDate);
    const day = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(date);
    const dateText = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);

    const drawVerticalText = (
      text: string,
      x: number,
      y: number,
      width: number,
      height: number,
      fontSize = 5.1,
    ) => {
      doc.save();
      doc.translate(x + width / 2, y + height / 2);
      doc.rotate(-90);
      doc.font('Helvetica-Bold').fillColor('#111827').fontSize(fontSize)
        .text(text, -height / 2 + 4, -width / 2 + 1, {
          width: height - 8,
          height: Math.max(width - 2, 5),
          align: 'center',
          ellipsis: true,
        });
      doc.restore();
    };

    const drawCenteredHeader = (
      text: string,
      x: number,
      y: number,
      width: number,
      height: number,
      fontSize = 5.7,
    ) => {
      doc.font('Helvetica-Bold').fillColor('#111827').fontSize(fontSize);
      const textHeight = doc.heightOfString(text, {
        width: Math.max(width - 4, 1),
        align: 'center',
      });
      doc.text(text, x + 2, y + Math.max(2, (height - textHeight) / 2), {
        width: Math.max(width - 4, 1),
        height: Math.max(height - 4, 1),
        align: 'center',
        ellipsis: true,
      });
    };

    chunks.forEach((items, pageIndex) => {
      doc.addPage({ size: 'A4', layout: 'portrait', margin: 12 });
      const left = 14;
      const tableWidth = doc.page.width - left * 2;
      const border = '#111827';

      doc.rect(left, 12, tableWidth, 43).stroke(border);
      doc.rect(left, 12, 58, 43).stroke(border);
      if (logo) { try { doc.image(logo, left + 5, 16, { fit: [48, 34] }); } catch {} }
      doc.rect(left + 58, 12, tableWidth - 250, 43).stroke(border);
      doc.font('Helvetica-Bold').fillColor('#111827').fontSize(10)
        .text('DAFTAR HADIR PERTEMUAN', left + 63, 19, { width: tableWidth - 260, align: 'center' })
        .text('SAFETY TALK / P5M DAN BUGAR SELAMAT', left + 63, 33, { width: tableWidth - 260, align: 'center' });
      const metaX = left + tableWidth - 192;
      const metaRows = [
        ['No. Dokumen', ': PPA-ADRO-F-SHE-13A'], ['Revisi', ': 3'],
        ['Tgl Efektif', ': 25 Desember 2022'], ['Halaman', `: ${pageIndex + 2} dari ${chunks.length + 1}`],
      ];
      metaRows.forEach(([label, value], index) => {
        const rowY = 12 + index * 10.75;
        doc.rect(metaX, rowY, 62, 10.75).stroke(border).rect(metaX + 62, rowY, 130, 10.75).stroke(border);
        doc.font('Helvetica').fontSize(5.7).text(label, metaX + 2, rowY + 2.5, { width: 58 });
        doc.text(value, metaX + 64, rowY + 2.5, { width: 126 });
      });

      const info = (label: string, value: string, x: number, y: number, width: number) => {
        doc.font('Helvetica-Bold').fontSize(6).text(label, x, y + 2, { width: 88 });
        doc.font('Helvetica').text(`: ${value}`, x + 88, y + 2, { width: width - 88 });
      };
      const infoHalf = tableWidth / 2;
      info('HARI, TANGGAL', `${day}, ${dateText}`, left, 59, infoHalf);
      info('DEPARTEMEN', 'HCGA', left + infoHalf, 59, infoHalf);
      info('WAKTU', `${data.startTime || '-'}${data.endTime ? ` - ${data.endTime}` : ''}`, left, 70, infoHalf);
      info('LOKASI', data.location || '-', left + infoHalf, 70, infoHalf);
      info('JUDUL TOPIK K3PLM', topics || '-', left, 81, infoHalf);
      info('PENYAJI', data.speaker || '-', left + infoHalf, 81, infoHalf);

      const y = 96;
      const headers = [
        'No', 'Nama', 'NRP', 'Jabatan', 'Departemen', 'Tidur cukup dalam 72 jam terakhir (minimal 18 jam) *',
        'Tidur cukup dalam 48 jam terakhir (minimal 12 jam) *', '<4', '4-6', '>6', 'Asupan gizi cukup *',
        'Tidak mengkonsumsi alkohol dan obat-obatan (termasuk alternatif/herbal) *',
        'Tidak melakukan aktivitas berlebih sebelum bekerja *', 'Bebas beban pikiran/stress berlebihan *',
        'Bebas dari penyakit serius dan telah diobati *', 'Bebas dari permasalahan keluarga *',
        'Memahami pekerjaan yang akan dilakukan *', 'Sehat', 'Sakit', 'Tanda Tangan', 'Keterangan',
      ];
      const rawWidths = [1097, 4571, 2413, 2962, 2669, 1536, 1682, 841, 877, 841, 1097, 1974, 1462, 1426, 1426, 1426, 1609, 1097, 1353, 2413, 3657];
      const rawTotal = rawWidths.reduce((total, width) => total + width, 0);
      const columns = rawWidths.map((width) => tableWidth * width / rawTotal);
      const headerHeight = 118;
      let x = left;
      headers.forEach((header, index) => {
        const yellow = index >= 5 && index <= 9;
        doc.rect(x, y, columns[index], headerHeight)
          .fillAndStroke(yellow ? '#FFF200' : '#FFFFFF', border);

        if (index < 5 || index === 19 || index === 20) {
          drawCenteredHeader(header, x, y, columns[index], headerHeight, index === 1 ? 6.2 : 5.7);
        } else if (!(index >= 7 && index <= 9) && !(index >= 17 && index <= 18)) {
          drawVerticalText(header, x, y, columns[index], headerHeight, yellow ? 5.2 : 5.05);
        }
        x += columns[index];
      });
      const sleepGroupX = left + columns.slice(0, 7).reduce((sum, width) => sum + width, 0);
      const sleepGroupWidth = columns.slice(7, 10).reduce((sum, width) => sum + width, 0);
      doc.rect(sleepGroupX, y, sleepGroupWidth, headerHeight).fillAndStroke('#FFF200', border);
      drawVerticalText(
        'Tidur cukup dalam 24 jam terakhir (minimal 6 jam) (centang salah satu)',
        sleepGroupX,
        y,
        sleepGroupWidth,
        headerHeight,
        5.05,
      );
      const subHeaderHeight = 13;
      let sleepX = sleepGroupX;
      ['<4', '4-6', '>6'].forEach((label, offset) => {
        doc.rect(sleepX, y + headerHeight - subHeaderHeight, columns[7 + offset], subHeaderHeight)
          .fillAndStroke('#FFF200', border);
        doc.font('Helvetica-Bold').fontSize(4.4).fillColor('#111827')
          .text(label, sleepX, y + headerHeight - 9.5, {
            width: columns[7 + offset],
            align: 'center',
          });
        sleepX += columns[7 + offset];
      });
      const healthX = left + columns.slice(0, 17).reduce((sum, width) => sum + width, 0);
      const healthWidth = columns[17] + columns[18];
      doc.rect(healthX, y, healthWidth, headerHeight).fillAndStroke('#FFFFFF', border);
      drawVerticalText('Kondisi kesehatan *', healthX, y, healthWidth, headerHeight, 5.05);
      let healthXPosition = healthX;
      ['Sehat', 'Sakit'].forEach((label, offset) => {
        doc.rect(healthXPosition, y + headerHeight - subHeaderHeight, columns[17 + offset], subHeaderHeight)
          .fillAndStroke('#FFFFFF', border);
        doc.font('Helvetica-Bold').fontSize(3.9).fillColor('#111827')
          .text(label, healthXPosition, y + headerHeight - 9.5, {
            width: columns[17 + offset],
            align: 'center',
          });
        healthXPosition += columns[17 + offset];
      });

      const mark = (value: boolean) => value ? '__CHECK__' : 'X';
      const rowHeight = 14;
      for (let rowIndex = 0; rowIndex < 35; rowIndex += 1) {
        const item = items[rowIndex];
        const rowY = y + headerHeight + rowIndex * rowHeight;
        const values = item ? [
          String(pageIndex * 35 + rowIndex + 1), item.nameSnapshot, item.nrpSnapshot, item.jobTitleSnapshot,
          item.departmentSnapshot, mark(item.sleep72), mark(item.sleep48),
          item.sleep24 === 'LESS_THAN_4' ? '__CHECK__' : '', item.sleep24 === 'BETWEEN_4_6' ? '__CHECK__' : '',
          item.sleep24 === 'MORE_THAN_6' ? '__CHECK__' : '', mark(item.nutritionEnough), mark(item.noAlcoholMedicine),
          mark(item.noExcessActivity), mark(item.noExcessStress), mark(item.noSeriousIllness),
          mark(item.noFamilyProblem), mark(item.understandsWork), item.health === 'HEALTHY' ? '__CHECK__' : '',
          item.health === 'SICK' ? '__CHECK__' : '', '', item.health === 'SICK' ? 'Perlu observasi' : 'Boleh kerja',
        ] : [String(pageIndex * 35 + rowIndex + 1), ...Array(headers.length - 1).fill('')];
        x = left;
        values.forEach((value, index) => {
          doc.rect(x, rowY, columns[index], rowHeight).stroke(border);
          const isCheck = value === '__CHECK__';
          if (isCheck) {
            const centerX = x + columns[index] / 2;
            const centerY = rowY + rowHeight / 2;
            doc.save()
              .lineWidth(1.15)
              .lineCap('round')
              .lineJoin('round')
              .strokeColor('#111827')
              .moveTo(centerX - 2.6, centerY)
              .lineTo(centerX - 0.7, centerY + 2)
              .lineTo(centerX + 3.2, centerY - 2.5)
              .stroke()
              .restore();
          } else {
            const identityColumn = index >= 1 && index <= 4;
            const fontSize = index === 1 ? 4.9 : index === 20 ? 4.7 : identityColumn ? 4.7 : 4.8;
            doc.font(index >= 5 && index <= 18 ? 'Helvetica-Bold' : 'Helvetica')
              .fillColor('#111827')
              .fontSize(fontSize)
              .text(String(value), x + 1.2, rowY + 3, {
                width: columns[index] - 2.4,
                height: rowHeight - 4,
                align: 'center',
                ellipsis: true,
              });
          }
          x += columns[index];
        });
      }

      const footerY = y + headerHeight + 35 * rowHeight + 5;
      doc.font('Helvetica').fillColor('#111827').fontSize(5.3)
        .text('* Beri tanda centang jika "Ya" dan silang (X) jika "Tidak" pada kolom bertanda *.', left, footerY, { width: tableWidth });
      doc.font('Helvetica-Bold').fontSize(5.4).text('Kesimpulan:', left, footerY + 12);
      doc.font('Helvetica').fontSize(5.1)
        .text('Sehat: otomatis boleh kerja.', left + 65, footerY + 12)
        .text('Sakit: perlu observasi dan tindak lanjut bersama pengawas/tenaga medis.', left + 65, footerY + 21, { width: tableWidth - 70 });
      doc.font('Helvetica-Bold').fontSize(5.5).text('Pengawas / Group Leader', left + tableWidth - 165, footerY + 36, { width: 165, align: 'center' });
      doc.font('Helvetica').fontSize(5.2).text(this.normalizeSupervisors(data.supervisors).join(', ') || '(........................................)', left + tableWidth - 165, footerY + 53, { width: 165, align: 'center' });
    });
  }

  async generate(id: number): Promise<Buffer> {
    const data = await this.p5mService.findOne(id);
    const gambarSiap = await this.siapkanGambarDokumentasi(
      data.documentationPaths ?? [],
    );

    const supervisors = this.normalizeSupervisors(data.supervisors);

    const supervisorText = supervisors.length
      ? supervisors.map((name, index) => `${index + 1}. ${name}`).join('\n')
      : '-';

    const materialText = this.normalizeNumberedText(data.topic);
    const formattedDate = new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(new Date(data.activityDate));

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 22,
        autoFirstPage: true,
        bufferPages: true,
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => {
        chunks.push(Buffer.from(chunk));
      });

      doc.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      doc.on('error', reject);

      const pageWidth = doc.page.width;
      const margin = 22;
      const contentWidth = pageWidth - margin * 2;

      const logo = this.resolveLogo();

      if (logo) {
        try {
          doc.image(logo, margin + 2, 20, {
            fit: [58, 58],
            align: 'center',
            valign: 'center',
          });
        } catch {
          // PDF tetap dibuat bila logo gagal dibaca.
        }
      }

      doc
        .font('Helvetica-Bold')
        .fontSize(15)
        .fillColor('#147A70')
        .text('SAFETY MEETING', margin + 72, 27, {
          width: contentWidth - 72,
        });

      doc
        .font('Helvetica-Bold')
        .fontSize(24)
        .fillColor('#111827')
        .text('P5M', margin + 72, 52, {
          width: contentWidth - 72,
        });

      this.drawInformationTable(
        doc,
        {
          date: formattedDate,
          location: data.location,
          speaker: data.speaker ?? '-',
          participants: data.participants ?? '-',
        },
        margin,
        94,
        contentWidth,
      );

      this.drawSection(
        doc,
        'Materi',
        materialText,
        margin,
        190,
        contentWidth,
        84,
      );

      this.drawSection(
        doc,
        'Pengawas',
        supervisorText,
        margin,
        317,
        contentWidth,
        82,
      );

      this.drawDocumentation(
        doc,
        data.documentationPaths ?? [],
        margin,
        442,
        contentWidth,
        gambarSiap,
      );

      this.drawAttendancePages(doc, data, logo);

      /*
       * Footer sengaja tidak dibuat.
       * Tidak ada teks "Dicetak dari sistem Safety Meeting"
       * dan tidak ada tanggal cetak.
       */

      doc.end();
    });
  }
}
