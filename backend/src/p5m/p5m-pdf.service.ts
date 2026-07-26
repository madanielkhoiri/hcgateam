import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import * as fs from 'node:fs';
import * as path from 'node:path';
import { P5mService } from './p5m.service';

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

      const imagePath = this.resolveImage(storedPath);

      if (imagePath) {
        try {
          doc.image(imagePath, cardX + 8, cardY + 30, {
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
  async generate(id: number): Promise<Buffer> {
    const data = await this.p5mService.findOne(id);

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
      );

      /*
       * Footer sengaja tidak dibuat.
       * Tidak ada teks "Dicetak dari sistem Safety Meeting"
       * dan tidak ada tanggal cetak.
       */

      doc.end();
    });
  }
}
