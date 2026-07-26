import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import QRCode = require('qrcode');
import { existsSync } from 'node:fs';
import { basename, join, normalize } from 'node:path';
import { PostActivitiesService } from './post-activities.service';

type PostActivityData = Awaited<ReturnType<PostActivitiesService['findOne']>>;

@Injectable()
export class PostActivityPdfService {
  constructor(private readonly postActivitiesService: PostActivitiesService) {}

  async generate(id: number): Promise<Buffer> {
    const data = await this.postActivitiesService.findOne(id);

    const qrBuffer = await QRCode.toBuffer(
      [
        'HCGA TEAM',
        `POST ACTIVITY ID: ${data.id}`,
        `PEKERJAAN: ${data.workName}`,
        `DISETUJUI OLEH: ${data.approverName}`,
        `TANGGAL: ${this.formatDate(data.activityDate)}`,
      ].join('\n'),
      {
        type: 'png',
        width: 220,
        margin: 1,
        errorCorrectionLevel: 'M',
      },
    );

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        autoFirstPage: true,
        bufferPages: true,
        info: {
          Title: 'Post Activity Report',
          Author: 'PT. Putra Perkasa Abadi',
        },
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.drawPage(doc, data, qrBuffer);

      doc.end();
    });
  }

  private drawPage(
    doc: PDFKit.PDFDocument,
    data: PostActivityData,
    qrBuffer: Buffer,
  ) {
    const pageWidth = 595.28;
    const left = 28;
    const right = 566;
    const contentWidth = right - left;

    this.drawBackground(doc);
    this.drawHeader(doc);

    this.drawGeneralInformation(doc, data, left);
    this.drawWorkforce(doc, data, left);
    this.drawWorkTable(doc, data, left, contentWidth);
    this.drawWeatherTable(doc, data, left, contentWidth);
    this.drawApproval(doc, data, qrBuffer);

    doc
      .save()
      .strokeColor('#111827')
      .lineWidth(0.75)
      .rect(14, 14, pageWidth - 28, 813)
      .stroke()
      .restore();
  }

  private drawBackground(doc: PDFKit.PDFDocument) {
    const background = join(
      process.cwd(),
      'uploads',
      'signatures',
      'bg-transparan.png',
    );

    if (!existsSync(background)) {
      return;
    }

    try {
      doc
        .save()
        .opacity(0.16)
        .image(background, 42, 73, {
          fit: [510, 690],
          align: 'center',
          valign: 'center',
        })
        .restore();
    } catch {
      try {
        doc.restore();
      } catch {
        // Abaikan background jika file tidak dapat dibaca.
      }
    }
  }

  private drawHeader(doc: PDFKit.PDFDocument) {
    const logoCandidates = [
      join(process.cwd(), 'uploads', 'signatures', 'PPA_cut.png'),
      join(process.cwd(), 'uploads', 'signatures', 'Logo PPA Official.png'),
    ];

    const logo = logoCandidates.find((file) => existsSync(file));

    if (logo) {
      try {
        doc.image(logo, 30, 29, {
          fit: [42, 42],
        });
      } catch {
        // Judul tetap dibuat.
      }
    }

    doc
      .fillColor('#111111')
      .font('Times-Bold')
      .fontSize(13)
      .text('PUTRA PERKASA ABADI', 92, 43, {
        width: 410,
        align: 'center',
      });

    doc
      .save()
      .strokeColor('#111827')
      .lineWidth(1.5)
      .moveTo(28, 76)
      .lineTo(566, 76)
      .stroke()
      .restore();
  }

  private drawGeneralInformation(
    doc: PDFKit.PDFDocument,
    data: PostActivityData,
    x: number,
  ) {
    const rows: Array<[string, string]> = [
      ['Tanggal', this.formatDate(data.activityDate)],
      ['Jam Mulai', `${data.startTime} WITA`],
      ['Jam Selesai', `${data.endTime} WITA`],
    ];

    let y = 96;

    rows.forEach(([label, value]) => {
      doc
        .fillColor('#111111')
        .font('Helvetica-Bold')
        .fontSize(8)
        .text(label, x, y, {
          width: 78,
        });

      doc.font('Helvetica-Bold').text(':', x + 79, y, {
        width: 10,
        align: 'center',
      });

      doc.font('Helvetica').text(value, x + 92, y, {
        width: 220,
      });

      y += 17;
    });
  }

  private drawWorkforce(
    doc: PDFKit.PDFDocument,
    data: PostActivityData,
    x: number,
  ) {
    let y = 156;

    doc
      .fillColor('#111111')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('Tenaga Kerja', x, y);

    y += 18;

    const rows: Array<[string, number]> = [
      ['Koordinator', data.coordinatorCount],
      ['Carpenter', data.carpenterCount],
      ['Helper GA', data.helperCount],
    ];

    rows.forEach(([label, count]) => {
      doc.font('Helvetica').fontSize(8).text(`${label} : ${count} Org`, x, y, {
        width: 180,
      });

      y += 16;
    });
  }

  private drawWorkTable(
    doc: PDFKit.PDFDocument,
    data: PostActivityData,
    x: number,
    width: number,
  ) {
    const y = 222;
    const headerHeight = 23;
    const bodyHeight = 96;

    const noWidth = 36;
    const workWidth = 240;
    const progressWidth = 102;
    const documentationWidth = width - noWidth - workWidth - progressWidth;

    const columns = [
      x,
      x + noWidth,
      x + noWidth + workWidth,
      x + noWidth + workWidth + progressWidth,
      x + width,
    ];

    doc
      .save()
      .fillColor('#f3f4f6')
      .fillOpacity(0.78)
      .strokeColor('#111827')
      .lineWidth(0.8)
      .rect(x, y, width, headerHeight)
      .fillAndStroke()
      .restore();

    doc
      .save()
      .fillColor('#ffffff')
      .fillOpacity(0.38)
      .strokeColor('#111827')
      .lineWidth(0.8)
      .rect(x, y + headerHeight, width, bodyHeight)
      .fillAndStroke()
      .restore();

    for (const columnX of columns.slice(1, -1)) {
      doc
        .save()
        .strokeColor('#111827')
        .lineWidth(0.8)
        .moveTo(columnX, y)
        .lineTo(columnX, y + headerHeight + bodyHeight)
        .stroke()
        .restore();
    }

    this.centerText(doc, 'No', x, y, noWidth, headerHeight, true, 7);

    this.centerText(
      doc,
      'Nama Pekerjaan yang Dilaksanakan',
      x + noWidth,
      y,
      workWidth,
      headerHeight,
      true,
      7,
    );

    this.centerText(
      doc,
      'Estimasi Persen',
      x + noWidth + workWidth,
      y,
      progressWidth,
      headerHeight,
      true,
      7,
    );

    this.centerText(
      doc,
      'Dokumentasi',
      x + noWidth + workWidth + progressWidth,
      y,
      documentationWidth,
      headerHeight,
      true,
      7,
    );

    doc
      .fillColor('#111111')
      .font('Helvetica')
      .fontSize(8)
      .text('1.', x, y + headerHeight + 12, {
        width: noWidth,
        align: 'center',
      });

    doc
      .font('Helvetica')
      .fontSize(8)
      .text(data.workName, x + noWidth + 8, y + headerHeight + 12, {
        width: workWidth - 16,
        lineGap: 2,
      });

    this.centerText(
      doc,
      `${data.progressPercent}%`,
      x + noWidth + workWidth,
      y + headerHeight,
      progressWidth,
      bodyHeight,
      false,
      8,
    );

    const visiblePhotos = data.photoPaths
      .slice(0, 5)
      .map((photoPath) => this.resolveUploadPath(photoPath))
      .filter((photoPath): photoPath is string => Boolean(photoPath));

    const areaX = columns[3] + 4;
    const areaY = y + headerHeight + 4;
    const areaWidth = documentationWidth - 8;
    const areaHeight = bodyHeight - 8;
    const gap = 3;

    if (!visiblePhotos.length) {
      this.drawPhotoPlaceholder(
        doc,
        columns[3],
        y + headerHeight,
        documentationWidth,
        bodyHeight,
      );
    } else {
      const layouts: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
      }> = [];

      if (visiblePhotos.length === 1) {
        layouts.push({
          x: areaX,
          y: areaY,
          width: areaWidth,
          height: areaHeight,
        });
      } else if (visiblePhotos.length === 2) {
        const photoWidth = (areaWidth - gap) / 2;

        layouts.push(
          {
            x: areaX,
            y: areaY,
            width: photoWidth,
            height: areaHeight,
          },
          {
            x: areaX + photoWidth + gap,
            y: areaY,
            width: photoWidth,
            height: areaHeight,
          },
        );
      } else if (visiblePhotos.length === 3) {
        const photoWidth = (areaWidth - gap * 2) / 3;

        for (let index = 0; index < 3; index += 1) {
          layouts.push({
            x: areaX + index * (photoWidth + gap),
            y: areaY,
            width: photoWidth,
            height: areaHeight,
          });
        }
      } else if (visiblePhotos.length === 4) {
        const photoWidth = (areaWidth - gap) / 2;
        const photoHeight = (areaHeight - gap) / 2;

        for (let index = 0; index < 4; index += 1) {
          const rowIndex = Math.floor(index / 2);
          const columnIndex = index % 2;

          layouts.push({
            x: areaX + columnIndex * (photoWidth + gap),
            y: areaY + rowIndex * (photoHeight + gap),
            width: photoWidth,
            height: photoHeight,
          });
        }
      } else {
        const photoWidth = (areaWidth - gap * 2) / 3;
        const photoHeight = (areaHeight - gap) / 2;

        // Tiga foto pada baris atas
        for (let index = 0; index < 3; index += 1) {
          layouts.push({
            x: areaX + index * (photoWidth + gap),
            y: areaY,
            width: photoWidth,
            height: photoHeight,
          });
        }

        // Dua foto pada baris bawah dan rata tengah
        const bottomStartX = areaX + (areaWidth - (photoWidth * 2 + gap)) / 2;

        for (let index = 0; index < 2; index += 1) {
          layouts.push({
            x: bottomStartX + index * (photoWidth + gap),
            y: areaY + photoHeight + gap,
            width: photoWidth,
            height: photoHeight,
          });
        }
      }

      visiblePhotos.forEach((photoPath, index) => {
        const layout = layouts[index];

        doc
          .save()
          .strokeColor('#7f8994')
          .lineWidth(0.35)
          .rect(layout.x, layout.y, layout.width, layout.height)
          .stroke()
          .restore();

        try {
          doc.image(photoPath, layout.x + 1.5, layout.y + 1.5, {
            fit: [layout.width - 3, layout.height - 3],
            align: 'center',
            valign: 'center',
          });
        } catch {
          doc
            .fillColor('#6b7280')
            .font('Helvetica')
            .fontSize(4.5)
            .text(
              'Foto gagal dibaca',
              layout.x + 2,
              layout.y + layout.height / 2 - 3,
              {
                width: layout.width - 4,
                align: 'center',
              },
            );
        }
      });
    }
  }
  private drawWeatherTable(
    doc: PDFKit.PDFDocument,
    data: PostActivityData,
    x: number,
    width: number,
  ) {
    const y = 351;
    const titleHeight = 22;
    const headerHeight = 23;
    const valueHeight = 23;
    const columnWidth = width / 3;

    doc
      .save()
      .fillColor('#f3f4f6')
      .fillOpacity(0.78)
      .strokeColor('#111827')
      .lineWidth(0.8)
      .rect(x, y, width, titleHeight)
      .fillAndStroke()
      .restore();

    doc
      .fillColor('#111111')
      .font('Helvetica-Bold')
      .fontSize(7)
      .text('KONDISI CUACA', x + 7, y + 8, {
        width: width - 14,
      });

    doc
      .save()
      .fillColor('#ffffff')
      .fillOpacity(0.38)
      .strokeColor('#111827')
      .lineWidth(0.8)
      .rect(x, y + titleHeight, width, headerHeight + valueHeight)
      .fillAndStroke()
      .restore();

    doc
      .save()
      .strokeColor('#111827')
      .lineWidth(0.8)
      .moveTo(x, y + titleHeight + headerHeight)
      .lineTo(x + width, y + titleHeight + headerHeight)
      .moveTo(x + columnWidth, y + titleHeight)
      .lineTo(x + columnWidth, y + titleHeight + headerHeight + valueHeight)
      .moveTo(x + columnWidth * 2, y + titleHeight)
      .lineTo(x + columnWidth * 2, y + titleHeight + headerHeight + valueHeight)
      .stroke()
      .restore();

    const weather = [
      ['Pagi', data.morningWeather],
      ['Siang', data.afternoonWeather],
      ['Sore', data.eveningWeather],
    ];

    weather.forEach(([label, value], index) => {
      const columnX = x + columnWidth * index;

      this.centerText(
        doc,
        label,
        columnX,
        y + titleHeight,
        columnWidth,
        headerHeight,
        true,
        7,
      );

      this.centerText(
        doc,
        String(value).toUpperCase(),
        columnX,
        y + titleHeight + headerHeight,
        columnWidth,
        valueHeight,
        false,
        7,
      );
    });
  }

  private drawApproval(
    doc: PDFKit.PDFDocument,
    data: PostActivityData,
    qrBuffer: Buffer,
  ) {
    const x = 388;
    const y = 438;
    const width = 128;

    doc
      .fillColor('#111111')
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('Disetujui Oleh :', x, y, {
        width,
        align: 'center',
      });

    try {
      doc.image(qrBuffer, x + 31, y + 17, {
        fit: [66, 66],
      });
    } catch {
      // Nama penyetuju tetap tampil.
    }

    doc
      .font('Helvetica')
      .fontSize(6)
      .text('QR Tanda Tangan', x, y + 87, {
        width,
        align: 'center',
      });

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .text(data.approverName.toUpperCase(), x, y + 105, {
        width,
        align: 'center',
      });
  }

  private centerText(
    doc: PDFKit.PDFDocument,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number,
    bold: boolean,
    fontSize: number,
  ) {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(fontSize);

    const textHeight = doc.heightOfString(text, {
      width: width - 8,
      align: 'center',
      lineGap: 0,
    });

    doc
      .fillColor('#111111')
      .text(text, x + 4, y + Math.max(2, (height - textHeight) / 2), {
        width: width - 8,
        align: 'center',
        lineGap: 0,
      });
  }

  private drawPhotoPlaceholder(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    doc
      .fillColor('#6b7280')
      .font('Helvetica')
      .fontSize(7)
      .text('Foto belum tersedia', x + 4, y + height / 2 - 4, {
        width: width - 8,
        align: 'center',
      });
  }

  private formatDate(value: Date | string) {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Makassar',
    }).format(new Date(value));
  }

  private resolveUploadPath(rawPath: string): string | null {
    if (!rawPath?.trim()) {
      return null;
    }

    const cleaned = normalize(rawPath)
      .replace(/^[/\\]+/, '')
      .replace(/^uploads[/\\]/i, '');

    const filename = basename(cleaned);

    const candidates = [
      join(process.cwd(), 'uploads', cleaned),
      join(process.cwd(), 'uploads', 'post-activities', filename),
      join(process.cwd(), cleaned),
    ];

    return candidates.find((candidate) => existsSync(candidate)) ?? null;
  }
}
