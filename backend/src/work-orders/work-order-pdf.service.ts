import { Injectable, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { basename, extname, join, parse } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';

type ResolvedImage = {
  filename: string;
  path: string;
};

@Injectable()
export class WorkOrderPdfService {
  private readonly signatureDirectory = join(
    process.cwd(),
    'uploads',
    'signatures',
  );

  private readonly workOrderImageDirectory = join(
    process.cwd(),
    'uploads',
    'work-orders',
  );

  private readonly logoPath = join(
    this.signatureDirectory,
    'Logo PPA Official.png',
  );

  constructor(private readonly prisma: PrismaService) {}

  async streamPdf(id: number, response: Response): Promise<void> {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
        handover: true,
      },
    });

    if (!workOrder) {
      throw new NotFoundException('Work Order tidak ditemukan');
    }

    const images = await this.resolveImages(workOrder.imagePaths ?? []);

    const attachmentPageCount =
      images.length > 2 ? Math.ceil(images.length / 4) : 0;

    const totalPages = 1 + attachmentPageCount;

    const document = new PDFDocument({
      size: 'A4',
      margin: 0,
      bufferPages: true,
      autoFirstPage: true,
      info: {
        Title: `Work Order ${workOrder.workOrderNumber}`,
        Author: 'HCGA TEAM',
        Subject: 'Formulir Permintaan Pekerjaan',
      },
    });

    const safeNumber = String(workOrder.workOrderNumber ?? id)
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\s+/g, '-');

    response.setHeader('Content-Type', 'application/pdf');

    response.setHeader(
      'Content-Disposition',
      `inline; filename="WORK-ORDER-${safeNumber}.pdf"`,
    );

    document.pipe(response);

    this.drawMainPage(document, workOrder, images, totalPages);

    if (images.length > 2) {
      this.drawAttachmentPages(document, workOrder, images, totalPages);
    }

    document.end();
  }

  private drawMainPage(
    document: PDFKit.PDFDocument,
    workOrder: any,
    images: ResolvedImage[],
    totalPages: number,
  ): void {
    const pageLeft = 24;
    const pageTop = 24;
    const pageWidth = document.page.width - 48;
    const pageHeight = document.page.height - 48;

    document
      .lineWidth(1)
      .strokeColor('#000000')
      .rect(pageLeft, pageTop, pageWidth, pageHeight)
      .stroke();

    let y = 37;

    y = this.drawHeader(document, y, totalPages);

    y += 8;

    y = this.drawBasicInformation(document, y, workOrder);

    y += 7;

    y = this.drawRequestSection(document, y, workOrder);

    y += 7;

    y = this.drawReasonAndAttachment(document, y, workOrder, images);

    y += 7;

    this.drawSignatureSection(document, y, workOrder);
  }

  private drawHeader(
    document: PDFKit.PDFDocument,
    top: number,
    totalPages: number,
  ): number {
    const left = 37;
    const width = document.page.width - 74;

    const height = 98;
    const logoWidth = 102;
    const metadataWidth = 200;
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

    if (existsSync(this.logoPath)) {
      try {
        document.image(this.logoPath, left + 18, top + 14, {
          fit: [66, 69],
          align: 'center',
          valign: 'center',
        });
      } catch {
        this.drawLogoFallback(document, left, top, logoWidth, height);
      }
    } else {
      this.drawLogoFallback(document, left, top, logoWidth, height);
    }

    document
      .font('Helvetica-Bold')
      .fontSize(13)
      .fillColor('#000000')
      .text('FORMULIR', left + logoWidth, top + 37, {
        width: titleWidth,
        align: 'center',
      });

    document
      .fontSize(13)
      .text('PERMINTAAN PEKERJAAN', left + logoWidth, top + 55, {
        width: titleWidth,
        align: 'center',
      });

    const metadataLeft = left + logoWidth + titleWidth;

    const labelWidth = 91;
    const rowHeight = height / 4;

    const metadataRows = [
      ['No. Dokumen', 'PPA-F-HCGA-60'],
      ['Revisi', '0'],
      ['Tgl Efektif', '7 Juni 2022'],
      ['Halaman', `1 dari ${totalPages}`],
    ];

    metadataRows.forEach((row, index) => {
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
        .fontSize(7.5)
        .text(row[0], metadataLeft + 6, rowTop + 9, {
          width: labelWidth - 12,
          align: 'left',
        });

      document
        .font('Helvetica')
        .fontSize(7.5)
        .text(`: ${row[1]}`, metadataLeft + labelWidth + 6, rowTop + 9, {
          width: metadataWidth - labelWidth - 12,
          align: 'left',
        });
    });

    return top + height;
  }

  private drawLogoFallback(
    document: PDFKit.PDFDocument,
    left: number,
    top: number,
    width: number,
    height: number,
  ): void {
    document
      .font('Helvetica-Bold')
      .fontSize(21)
      .fillColor('#e31d2b')
      .text('PPA', left + 10, top + height / 2 - 10, {
        width: width - 20,
        align: 'center',
      });
  }

  private drawBasicInformation(
    document: PDFKit.PDFDocument,
    top: number,
    workOrder: any,
  ): number {
    const left = 37;
    const width = document.page.width - 74;
    const rowHeight = 22;
    const labelWidth = 61;
    const colonWidth = 15;

    const rows = [
      ['Tanggal', this.formatShortDate(workOrder.requestedAt)],
      ['User Dept', String(workOrder.department ?? '-').toUpperCase()],
    ];

    rows.forEach((row, index) => {
      const y = top + index * rowHeight;

      document.lineWidth(0.8).rect(left, y, width, rowHeight).stroke();

      document
        .moveTo(left + labelWidth, y)
        .lineTo(left + labelWidth, y + rowHeight)
        .stroke();

      document
        .moveTo(left + labelWidth + colonWidth, y)
        .lineTo(left + labelWidth + colonWidth, y + rowHeight)
        .stroke();

      document
        .font('Helvetica-Bold')
        .fontSize(7.5)
        .text(row[0], left + 5, y + 7, {
          width: labelWidth - 10,
        });

      document.text(':', left + labelWidth, y + 7, {
        width: colonWidth,
        align: 'center',
      });

      document
        .font('Helvetica')
        .text(row[1], left + labelWidth + colonWidth + 6, y + 7, {
          width: width - labelWidth - colonWidth - 12,
        });
    });

    return top + rows.length * rowHeight;
  }

  private drawRequestSection(
    document: PDFKit.PDFDocument,
    top: number,
    workOrder: any,
  ): number {
    const left = 37;
    const width = document.page.width - 74;

    const leftWidth = 220;
    const rightWidth = width - leftWidth;

    const headerHeight = 22;
    const bodyHeight = 166;
    const totalHeight = headerHeight + bodyHeight;

    document.lineWidth(0.8).rect(left, top, width, totalHeight).stroke();

    document
      .moveTo(left + leftWidth, top)
      .lineTo(left + leftWidth, top + totalHeight)
      .stroke();

    document
      .moveTo(left, top + headerHeight)
      .lineTo(left + width, top + headerHeight)
      .stroke();

    document
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('Jenis Pekerjaan', left, top + 7, {
        width: leftWidth,
        align: 'center',
      });

    document.text('Rincian Permintaan', left + leftWidth, top + 7, {
      width: rightWidth,
      align: 'center',
    });

    const selectedType = this.normaliseJobType(
      workOrder.workType ?? workOrder.jobType ?? workOrder.requestType,
    );

    const jobTypes = [
      {
        key: 'REPAIR',
        label: 'Perbaikan & Perawatan',
      },
      {
        key: 'RENOVATION',
        label: 'Renovasi',
      },
      {
        key: 'EXPANSION',
        label: 'Peluasan/ Penambahan',
      },
    ];

    jobTypes.forEach((item, index) => {
      const checkboxY = top + headerHeight + 31 + index * 52;

      this.drawCheckbox(
        document,
        left + 18,
        checkboxY,
        selectedType === item.key,
      );

      document
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#000000')
        .text(item.label, left + 50, checkboxY + 7, {
          width: leftWidth - 60,
        });
    });

    const detail = String(workOrder.workOrderName ?? '-').toUpperCase();

    document
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#000000')
      .text(detail, left + leftWidth + 22, top + headerHeight + 70, {
        width: rightWidth - 44,
        align: 'center',
        lineGap: 3,
      });

    return top + totalHeight;
  }

  private drawCheckbox(
    document: PDFKit.PDFDocument,
    left: number,
    top: number,
    checked: boolean,
  ): void {
    const size = 17;

    document.lineWidth(0.8).rect(left, top, size, size).stroke();

    if (checked) {
      document
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('X', left, top + 2, {
          width: size,
          align: 'center',
        });
    }
  }

  private drawReasonAndAttachment(
    document: PDFKit.PDFDocument,
    top: number,
    workOrder: any,
    images: ResolvedImage[],
  ): number {
    const left = 37;
    const width = document.page.width - 74;
    const leftWidth = 220;
    const rightWidth = width - leftWidth;

    const headerHeight = 22;
    const bodyHeight = 240;
    const totalHeight = headerHeight + bodyHeight;

    document.lineWidth(0.8).rect(left, top, width, totalHeight).stroke();

    document
      .moveTo(left + leftWidth, top)
      .lineTo(left + leftWidth, top + totalHeight)
      .stroke();

    document
      .moveTo(left, top + headerHeight)
      .lineTo(left + width, top + headerHeight)
      .stroke();

    document
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('Alasan Permintaan', left, top + 7, {
        width: leftWidth,
        align: 'center',
      });

    document.text('Data penyerta', left + leftWidth, top + 7, {
      width: rightWidth,
      align: 'center',
    });

    const description = String(workOrder.description ?? '-').toUpperCase();

    document
      .font('Helvetica')
      .fontSize(8)
      .text(description, left + 20, top + headerHeight + 98, {
        width: leftWidth - 40,
        align: 'center',
        lineGap: 3,
      });

    const imageArea = {
      left: left + leftWidth + 12,
      top: top + headerHeight + 12,
      width: rightWidth - 24,
      height: bodyHeight - 24,
    };

    if (images.length === 0) {
      document
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#555555')
        .text('-', imageArea.left, imageArea.top + imageArea.height / 2, {
          width: imageArea.width,
          align: 'center',
        });
    } else if (images.length <= 2) {
      this.drawInlineImages(document, images, imageArea);
    } else {
      document
        .font('Helvetica-Bold')
        .fontSize(9)
        .fillColor('#000000')
        .text(
          `Lihat lampiran dokumentasi pada halaman 2`,
          imageArea.left,
          imageArea.top + imageArea.height / 2 - 5,
          {
            width: imageArea.width,
            align: 'center',
          },
        );
    }

    return top + totalHeight;
  }

  private drawInlineImages(
    document: PDFKit.PDFDocument,
    images: ResolvedImage[],
    area: {
      left: number;
      top: number;
      width: number;
      height: number;
    },
  ): void {
    if (images.length === 1) {
      try {
        document.image(images[0].path, area.left + 15, area.top + 10, {
          fit: [area.width - 30, area.height - 20],
          align: 'center',
          valign: 'center',
        });
      } catch {
        this.drawInvalidImageText(document, area);
      }

      return;
    }

    const gap = 8;
    const imageWidth = (area.width - gap) / 2;

    images.slice(0, 2).forEach((image, index) => {
      const x = area.left + index * (imageWidth + gap);

      try {
        document.image(image.path, x + 3, area.top + 12, {
          fit: [imageWidth - 6, area.height - 24],
          align: 'center',
          valign: 'center',
        });
      } catch {
        document
          .font('Helvetica')
          .fontSize(7)
          .text('Gambar gagal ditampilkan', x, area.top + area.height / 2, {
            width: imageWidth,
            align: 'center',
          });
      }
    });
  }

  private drawInvalidImageText(
    document: PDFKit.PDFDocument,
    area: {
      left: number;
      top: number;
      width: number;
      height: number;
    },
  ): void {
    document
      .font('Helvetica')
      .fontSize(8)
      .text('Gambar gagal ditampilkan', area.left, area.top + area.height / 2, {
        width: area.width,
        align: 'center',
      });
  }

  private drawSignatureSection(
    document: PDFKit.PDFDocument,
    top: number,
    workOrder: any,
  ): number {
    const left = 37;
    const width = document.page.width - 74;

    const firstColumnWidth = 111;
    const approvalWidth = width - firstColumnWidth;
    const approvalColumnWidth = approvalWidth / 3;

    const headerHeight = 22;
    const signatureHeight = 69;
    const nameHeight = 23;
    const positionHeight = 25;

    const totalHeight =
      headerHeight + signatureHeight + nameHeight + positionHeight;

    document.lineWidth(0.8).rect(left, top, width, totalHeight).stroke();

    const columnWidths = [
      firstColumnWidth,
      approvalColumnWidth,
      approvalColumnWidth,
      approvalColumnWidth,
    ];

    let x = left;

    columnWidths.forEach((columnWidth, index) => {
      if (index > 0) {
        document
          .moveTo(x, top + headerHeight)
          .lineTo(x, top + totalHeight)
          .stroke();
      }

      x += columnWidth;
    });

    document
      .moveTo(left + firstColumnWidth, top)
      .lineTo(left + firstColumnWidth, top + headerHeight)
      .stroke();

    document
      .moveTo(left, top + headerHeight)
      .lineTo(left + width, top + headerHeight)
      .stroke();

    document
      .moveTo(left, top + headerHeight + signatureHeight)
      .lineTo(left + width, top + headerHeight + signatureHeight)
      .stroke();

    document
      .moveTo(left, top + headerHeight + signatureHeight + nameHeight)
      .lineTo(left + width, top + headerHeight + signatureHeight + nameHeight)
      .stroke();

    document
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('Jabatan', left, top + 7, {
        width: firstColumnWidth,
        align: 'center',
      });

    document.text('Persetujuan', left + firstColumnWidth, top + 7, {
      width: approvalWidth,
      align: 'center',
    });

    const requestedDate = this.formatShortDate(workOrder.requestedAt);

    const userName = String(workOrder.userDepartmentName ?? '-').toUpperCase();

    const userPosition = String(workOrder.position ?? '-').toUpperCase();

    const signers = [
      {
        name: userName,
        position: userPosition,
        signature: null,
        showDate: false,
      },
      {
        name: 'ARIEF RAHMAN HAKIM',
        position: '(GL GA)',
        signature: join(this.signatureDirectory, 'arief-rahman.png'),
        showDate: true,
      },
      {
        name: 'SINGGIEH PRANANDA',
        position: '(HCGA SH)',
        signature: join(this.signatureDirectory, 'singgieh-prananda.png'),
        showDate: true,
      },
      {
        name: 'WAHYU BINUKO',
        position: '(Project Manager)',
        signature: join(this.signatureDirectory, 'wahyu-binuko.png'),
        showDate: true,
      },
    ];

    x = left;

    signers.forEach((signer, index) => {
      const columnWidth = columnWidths[index];

      if (signer.signature && existsSync(signer.signature)) {
        try {
          document.image(signer.signature, x + 14, top + headerHeight + 5, {
            fit: [columnWidth - 28, signatureHeight - 9],
            align: 'center',
            valign: 'center',
          });
        } catch {
          // Abaikan file tanda tangan rusak.
        }
      }

      document
        .font('Helvetica-Bold')
        .fontSize(7.3)
        .fillColor('#000000')
        .text(signer.name, x + 4, top + headerHeight + signatureHeight + 7, {
          width: columnWidth - 8,
          align: 'center',
          ellipsis: true,
        });

      document
        .font('Helvetica-Bold')
        .fontSize(7)
        .text(
          signer.position,
          x + 4,
          top + headerHeight + signatureHeight + nameHeight + 7,
          {
            width: columnWidth - 8,
            align: 'center',
            ellipsis: true,
          },
        );

      if (signer.showDate) {
        document
          .font('Helvetica')
          .fontSize(6.4)
          .text(requestedDate, x + 4, top + totalHeight - 11, {
            width: columnWidth - 8,
            align: 'right',
          });
      }

      x += columnWidth;
    });

    return top + totalHeight;
  }

  private drawAttachmentPages(
    document: PDFKit.PDFDocument,
    workOrder: any,
    images: ResolvedImage[],
    totalPages: number,
  ): void {
    const chunks: ResolvedImage[][] = [];

    for (let index = 0; index < images.length; index += 4) {
      chunks.push(images.slice(index, index + 4));
    }

    chunks.forEach((chunk, pageIndex) => {
      document.addPage({
        size: 'A4',
        margin: 0,
      });

      const outerLeft = 24;
      const outerTop = 24;
      const outerWidth = document.page.width - 48;
      const outerHeight = document.page.height - 48;

      document
        .lineWidth(1)
        .rect(outerLeft, outerTop, outerWidth, outerHeight)
        .stroke();

      const pageNumber = pageIndex + 2;

      document
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('DATA PENYERTA / LAMPIRAN DOKUMENTASI', 37, 42, {
          width: document.page.width - 74,
          align: 'center',
        });

      document
        .font('Helvetica')
        .fontSize(7.5)
        .text(`No. Work Order: ${workOrder.workOrderNumber ?? '-'}`, 37, 62, {
          width: document.page.width - 74,
          align: 'center',
        });

      document
        .fontSize(7)
        .text(`Halaman ${pageNumber} dari ${totalPages}`, 37, 76, {
          width: document.page.width - 74,
          align: 'center',
        });

      const gridLeft = 37;
      const gridTop = 98;
      const gridWidth = document.page.width - 74;
      const gap = 10;

      const cellWidth = (gridWidth - gap) / 2;
      const cellHeight = 327;

      chunk.forEach((image, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);

        const x = gridLeft + column * (cellWidth + gap);

        const y = gridTop + row * (cellHeight + gap);

        document.lineWidth(0.8).rect(x, y, cellWidth, cellHeight).stroke();

        try {
          document.image(image.path, x + 7, y + 7, {
            fit: [cellWidth - 14, cellHeight - 30],
            align: 'center',
            valign: 'center',
          });
        } catch {
          document
            .font('Helvetica')
            .fontSize(8)
            .text('Gambar gagal ditampilkan', x + 5, y + cellHeight / 2, {
              width: cellWidth - 10,
              align: 'center',
            });
        }
      });
    });
  }

  private async resolveImages(storedPaths: string[]): Promise<ResolvedImage[]> {
    const images: ResolvedImage[] = [];

    const pdfCacheDirectory = join(
      process.cwd(),
      'uploads',
      'pdf-cache',
      'work-orders',
    );

    mkdirSync(pdfCacheDirectory, {
      recursive: true,
    });

    for (const storedPath of storedPaths) {
      const normalizedStoredPath = String(storedPath).replace(/\\/g, '/');

      const filename = basename(normalizedStoredPath);

      const candidates = [
        join(process.cwd(), 'uploads', 'work-orders', filename),
        join(process.cwd(), normalizedStoredPath.replace(/^[/\\]+/, '')),
      ];

      const sourcePath = candidates.find(
        (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
      );

      if (!sourcePath) {
        console.warn(`Foto Work Order tidak ditemukan: ${storedPath}`);
        continue;
      }

      const extension = extname(sourcePath).toLowerCase();

      if (
        extension === '.png' ||
        extension === '.jpg' ||
        extension === '.jpeg'
      ) {
        images.push({
          filename,
          path: sourcePath,
        });

        continue;
      }

      const parsedFilename = parse(filename);

      const convertedFilename = `${parsedFilename.name}-pdf.png`;

      const convertedPath = join(pdfCacheDirectory, convertedFilename);

      try {
        const sourceModifiedAt = statSync(sourcePath).mtimeMs;

        const cacheValid =
          existsSync(convertedPath) &&
          statSync(convertedPath).mtimeMs >= sourceModifiedAt;

        if (!cacheValid) {
          await sharp(sourcePath)
            .rotate()
            .png({
              compressionLevel: 9,
            })
            .toFile(convertedPath);
        }

        images.push({
          filename,
          path: convertedPath,
        });
      } catch (error) {
        console.error(`Gagal mengubah foto ${filename} menjadi PNG:`, error);
      }
    }

    return images;
  }
  private normaliseJobType(
    value: unknown,
  ): 'REPAIR' | 'RENOVATION' | 'EXPANSION' {
    const text = String(value ?? '').toUpperCase();

    if (text.includes('RENOV') || text === 'RENOVATION') {
      return 'RENOVATION';
    }

    if (
      text.includes('PELUAS') ||
      text.includes('PENAMBAH') ||
      text.includes('EXPANS')
    ) {
      return 'EXPANSION';
    }

    return 'REPAIR';
  }

  private formatShortDate(value: Date | string | null): string {
    if (!value) {
      return '-';
    }

    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Makassar',
    })
      .format(new Date(value))
      .replace(/\//g, '-');
  }
}
