import { Injectable, NotFoundException } from '@nestjs/common';
import type { Response } from 'express';
import { existsSync, mkdirSync, statSync } from 'node:fs';
import { basename, extname, join, parse } from 'node:path';
import PDFDocument from 'pdfkit';
import sharp from 'sharp';
import { PrismaService } from '../prisma/prisma.service';

type DocumentationImage = {
  filename: string;
  path: string;
};

@Injectable()
export class HandoverPdfService {
  constructor(private readonly prisma: PrismaService) {}

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

  private readonly handoverImageDirectory = join(
    process.cwd(),
    'uploads',
    'handovers',
  );

  private readonly cacheDirectory = join(
    process.cwd(),
    'uploads',
    'pdf-cache',
    'handovers',
  );

  async streamPdf(id: number, response: Response): Promise<void> {
    const handover = await this.prisma.handover.findUnique({
      where: {
        id,
      },
      include: {
        workOrder: true,
        creator: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    if (!handover) {
      throw new NotFoundException('Serah Terima Pekerjaan tidak ditemukan');
    }

    const filename = this.safeFilename(
      `Serah Terima ${handover.stpNumber}.pdf`,
    );

    response.setHeader('Content-Type', 'application/pdf');

    response.setHeader('Content-Disposition', `inline; filename="${filename}"`);

    const document = new PDFDocument({
      size: 'A4',
      margin: 0,
      autoFirstPage: false,
      bufferPages: true,
      info: {
        Title: `Serah Terima ${handover.stpNumber}`,
        Author: 'HCGA TEAM',
        Subject: 'Serah Terima Pekerjaan',
      },
    });

    document.pipe(response);

    const storedImages = handover.documentationPaths ?? [];

    const uniqueImages = [...new Set(storedImages)];

    const documentationImages = await this.resolveImages(uniqueImages);

    this.renderMainPage(document, handover);

    this.renderAttachmentPages(document, documentationImages);

    document.end();
  }

  private renderMainPage(
    document: PDFKit.PDFDocument,
    handover: {
      stpNumber: string;
      handoverDate: Date;
      receiverName: string | null;
      receiverPosition: string | null;
      receiverDepartment: string | null;
      handoverNote: string | null;
      workOrder: {
        workOrderName: string;
        department: string;
        position: string | null;
        userDepartmentName: string;
        description: string;
      };
    },
  ): void {
    document.addPage({
      size: 'A4',
      margin: 0,
    });

    this.drawDoubleBorder(document);
    this.drawCompanyBanner(document);

    const contentX = 44;
    const contentWidth = 507;

    const titleBoxY = 131;
    const titleBoxHeight = 96;

    document
      .lineWidth(0.8)
      .rect(contentX, titleBoxY, contentWidth, titleBoxHeight)
      .stroke('#000000');

    document
      .font('Helvetica-Bold')
      .fontSize(15)
      .fillColor('#000000')
      .text('SERAH TERIMA PEKERJAAN', contentX, titleBoxY + 25, {
        width: contentWidth,
        align: 'center',
      });

    document
      .font('Helvetica')
      .fontSize(10)
      .text(`No : ${handover.stpNumber}`, contentX, titleBoxY + 51, {
        width: contentWidth,
        align: 'center',
      });

    document
      .font('Helvetica')
      .fontSize(10)
      .text(
        `Tanggal ${this.formatLongDate(handover.handoverDate)}`,
        contentX,
        titleBoxY + 68,
        {
          width: contentWidth,
          align: 'center',
        },
      );

    const firstPartyY = titleBoxY + titleBoxHeight;

    this.drawPartySection(
      document,
      contentX,
      firstPartyY,
      contentWidth,
      'Yang bertanda tangan di bawah ini :',
      'Herfit Almiya',
      'Group Leader GA',
      'HCGA',
    );

    const receiverName =
      handover.receiverName || handover.workOrder.userDepartmentName || '-';

    const receiverPosition =
      handover.receiverPosition || handover.workOrder.position || '-';

    const receiverDepartment =
      handover.receiverDepartment || handover.workOrder.department || '-';

    const receiverY = firstPartyY + 83;

    this.drawPartySection(
      document,
      contentX,
      receiverY,
      contentWidth,
      'Menyerahkan hasil pekerjaan kepada :',
      receiverName,
      receiverPosition,
      receiverDepartment,
    );

    const workSectionY = receiverY + 83;
    const workSectionHeight = 119;

    document
      .lineWidth(0.8)
      .rect(contentX, workSectionY, contentWidth, workSectionHeight)
      .stroke('#000000');

    document
      .font('Helvetica')
      .fontSize(9)
      .text('Nama pekerjaan :', contentX + 22, workSectionY + 22, {
        width: contentWidth - 44,
      });

    document
      .font('Helvetica')
      .fontSize(10)
      .text(
        handover.workOrder.workOrderName.toUpperCase(),
        contentX + 25,
        workSectionY + 51,
        {
          width: contentWidth - 50,
          align: 'center',
        },
      );

    const completionLineY = workSectionY + 86;

    document
      .moveTo(contentX + 22, completionLineY)
      .lineTo(contentX + contentWidth - 22, completionLineY)
      .stroke('#000000');

    document
      .font('Helvetica-Bold')
      .fontSize(10)
      .text('"Telah diselesaikan 100 %"', contentX + 22, completionLineY + 8, {
        width: contentWidth - 44,
        align: 'center',
      });

    document
      .moveTo(contentX + 22, completionLineY + 31)
      .lineTo(contentX + contentWidth - 22, completionLineY + 31)
      .stroke('#000000');

    const signatureY = workSectionY + workSectionHeight;

    this.drawSignatureSection(
      document,
      contentX,
      signatureY,
      contentWidth,
      receiverName,
    );
  }

  private drawPartySection(
    document: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    heading: string,
    name: string,
    position: string,
    department: string,
  ): void {
    const sectionHeight = 83;
    const rowHeight = 16;

    document.lineWidth(0.8).rect(x, y, width, sectionHeight).stroke('#000000');

    document
      .moveTo(x, y + rowHeight)
      .lineTo(x + width, y + rowHeight)
      .stroke('#000000');

    document
      .moveTo(x, y + rowHeight * 2)
      .lineTo(x + width, y + rowHeight * 2)
      .stroke('#000000');

    document
      .moveTo(x, y + rowHeight * 3)
      .lineTo(x + width, y + rowHeight * 3)
      .stroke('#000000');

    document
      .moveTo(x, y + rowHeight * 4)
      .lineTo(x + width, y + rowHeight * 4)
      .stroke('#000000');

    document
      .font('Helvetica')
      .fontSize(9)
      .text(heading, x + 22, y + 4, {
        width: width - 44,
      });

    this.drawLabelValue(document, x + 22, y + 20, 'Nama', name);

    this.drawLabelValue(document, x + 22, y + 36, 'Jabatan', position);

    this.drawLabelValue(document, x + 22, y + 52, 'Dept', department);
  }

  private drawLabelValue(
    document: PDFKit.PDFDocument,
    x: number,
    y: number,
    label: string,
    value: string,
  ): void {
    document.font('Helvetica').fontSize(9).text(label, x, y, {
      width: 64,
    });

    document.text(':', x + 65, y, {
      width: 10,
    });

    document.text(value || '-', x + 78, y, {
      width: 370,
    });
  }

  private drawSignatureSection(
    document: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    receiverName: string,
  ): void {
    const sectionHeight = 146;
    const halfWidth = width / 2;

    document.lineWidth(0.8).rect(x, y, width, sectionHeight).stroke('#000000');

    document
      .font('Helvetica')
      .fontSize(9)
      .text('diserahkan oleh,', x, y + 27, {
        width: halfWidth,
        align: 'center',
      });

    document
      .font('Helvetica')
      .fontSize(9)
      .text('diterima oleh,', x + halfWidth, y + 27, {
        width: halfWidth,
        align: 'center',
      });

    const herfitSignature = this.firstExisting([
      join(this.signatureDirectory, 'herfit-almiya.png'),
      join(this.signatureDirectory, 'Herfit-Almiya.png'),
    ]);

    if (herfitSignature) {
      this.drawContainedImage(
        document,
        herfitSignature,
        x + 72,
        y + 47,
        110,
        52,
      );
    }

    document
      .font('Helvetica-Bold')
      .fontSize(9)
      .text('Herfit Almiya', x + 32, y + 111, {
        width: halfWidth - 64,
        align: 'center',
        underline: true,
      });

    document
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(receiverName.toUpperCase(), x + halfWidth + 32, y + 111, {
        width: halfWidth - 64,
        align: 'center',
        underline: true,
      });
  }

  private renderAttachmentPages(
    document: PDFKit.PDFDocument,
    images: DocumentationImage[],
  ): void {
    if (images.length === 0) {
      return;
    }

    const imagesPerPage = 4;

    for (
      let pageStart = 0;
      pageStart < images.length;
      pageStart += imagesPerPage
    ) {
      const currentImages = images.slice(pageStart, pageStart + imagesPerPage);

      document.addPage({
        size: 'A4',
        margin: 0,
      });

      this.drawAttachmentFrame(document);
      this.drawAttachmentHeader(document);

      if (currentImages.length === 1) {
        this.drawContainedImage(
          document,
          currentImages[0].path,
          72,
          220,
          451,
          500,
        );

        continue;
      }

      const gridX = 48;
      const gridY = 215;
      const columnGap = 13;
      const rowGap = 16;
      const cellWidth = 243;
      const cellHeight = 250;

      currentImages.forEach((currentImage, index) => {
        const column = index % 2;
        const row = Math.floor(index / 2);

        const x = gridX + column * (cellWidth + columnGap);

        const y = gridY + row * (cellHeight + rowGap);

        document
          .save()
          .lineWidth(0.5)
          .strokeColor('#b8b8b8')
          .rect(x, y, cellWidth, cellHeight)
          .stroke()
          .restore();

        this.drawContainedImage(
          document,
          currentImage.path,
          x + 6,
          y + 6,
          cellWidth - 12,
          cellHeight - 12,
        );
      });
    }
  }

  private drawDoubleBorder(document: PDFKit.PDFDocument): void {
    document.lineWidth(0.8).rect(15, 13, 565, 816).stroke('#000000');

    document.lineWidth(0.6).rect(22, 20, 551, 802).stroke('#000000');
  }

  private drawAttachmentFrame(document: PDFKit.PDFDocument): void {
    document.lineWidth(0.8).rect(15, 13, 565, 816).stroke('#000000');

    document.lineWidth(0.6).rect(22, 20, 551, 802).stroke('#000000');

    document
      .font('Helvetica-Bold')
      .fontSize(8)
      .text('PPA-ADRO-F-HCGA-52', 390, 25, {
        width: 160,
        align: 'right',
      });
  }

  private drawCompanyBanner(document: PDFKit.PDFDocument): void {
    const x = 47;
    const y = 49;
    const width = 501;
    const height = 79;

    document
      .save()
      .fillColor('#f5f5f5')
      .rect(x, y, width, height)
      .fill()
      .restore();

    document
      .save()
      .fillColor('#ececec')
      .polygon([x, y], [x + 90, y], [x + 143, y + height], [x + 50, y + height])
      .fill()
      .restore();

    document
      .save()
      .fillColor('#e7e7e7')
      .polygon(
        [x + 300, y],
        [x + width, y],
        [x + width, y + height],
        [x + 245, y + height],
      )
      .fill()
      .restore();

    const logoPath = join(this.signatureDirectory, 'PPA_cut.png');

    if (existsSync(logoPath)) {
      this.drawContainedImage(document, logoPath, x + 111, y + 15, 53, 49);
    }

    document
      .font('Helvetica-Bold')
      .fontSize(17)
      .fillColor('#000000')
      .text('PUTRA PERKASA ABADI', x + 170, y + 28, {
        width: 280,
        align: 'left',
      });
  }

  private drawAttachmentHeader(document: PDFKit.PDFDocument): void {
    this.drawCompanyBanner(document);

    document
      .font('Helvetica')
      .fontSize(10)
      .text('LAMPIRAN PEKERJAAN', 34, 174, {
        width: 220,
        underline: true,
      });
  }

  private async resolveImages(
    storedPaths: string[],
  ): Promise<DocumentationImage[]> {
    mkdirSync(this.cacheDirectory, {
      recursive: true,
    });

    const images: DocumentationImage[] = [];

    for (const storedPath of storedPaths) {
      const normalized = String(storedPath).replace(/\\/g, '/');

      const filename = basename(normalized);

      const candidates = [
        join(this.handoverImageDirectory, filename),
        join(process.cwd(), normalized.replace(/^[/\\]+/, '')),
      ];

      const sourcePath = candidates.find(
        (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
      );

      if (!sourcePath) {
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

      const parsed = parse(filename);

      const convertedPath = join(this.cacheDirectory, `${parsed.name}-stp.png`);

      try {
        const cacheValid =
          existsSync(convertedPath) &&
          statSync(convertedPath).mtimeMs >= statSync(sourcePath).mtimeMs;

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
        console.error(`Gagal memproses lampiran ${filename}`, error);
      }
    }

    return images;
  }

  private drawContainedImage(
    document: PDFKit.PDFDocument,
    imagePath: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): void {
    try {
      document.image(imagePath, x, y, {
        fit: [width, height],
        align: 'center',
        valign: 'center',
      });
    } catch (error) {
      console.error(`Gambar gagal ditampilkan: ${imagePath}`, error);
    }
  }

  private firstExisting(paths: string[]): string | null {
    return (
      paths.find(
        (currentPath) =>
          existsSync(currentPath) && statSync(currentPath).isFile(),
      ) ?? null
    );
  }

  private formatLongDate(value: Date): string {
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(value);
  }

  private safeFilename(filename: string): string {
    return filename.replace(/[\\/:*?"<>|]/g, '-');
  }
}
