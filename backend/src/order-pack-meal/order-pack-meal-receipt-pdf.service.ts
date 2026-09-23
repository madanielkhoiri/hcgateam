// ==================================================
// FILE: backend/src/order-pack-meal/order-pack-meal-receipt-pdf.service.ts
// FUNGSI: Resi Order Pack Meal (PDF format struk) yang bisa diunduh Admin
// setelah order diproses - No Order, Kegiatan, Lokasi, Vendor, daftar item,
// status Approval/Delivery, sampai kolom tanda tangan HCGA/Vendor.
// ==================================================

import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import * as fs from 'node:fs';
import * as path from 'node:path';

type ItemResi = {
  orderType: string;
  quantity: number;
  notes?: string | null;
};

type DataResi = {
  orderNumber: string;
  neededDate: Date;
  pemesan: string;
  department: string | null;
  kegiatan: string | null;
  deliveryLocation: string;
  deliveryTime: string | null;
  vendor: string | null;
  statusApproval: string;
  statusDelivery: string;
  totalPacks: number;
  items: ItemResi[];
};

const LABEL_APPROVAL: Record<string, string> = {
  MENUNGGU: 'MENUNGGU',
  DISETUJUI: 'DISETUJUI',
  DITOLAK: 'DITOLAK',
};

const LABEL_DELIVERY: Record<string, string> = {
  DIPROSES: 'DIPROSES',
  SELESAI: 'SELESAI',
  DIBATALKAN: 'DIBATALKAN',
};

const PAGE_WIDTH = 300;
const MARGIN = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

@Injectable()
export class OrderPackMealReceiptPdfService {
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

  private dashedLine(doc: PDFKit.PDFDocument, y: number) {
    doc
      .save()
      .dash(2, { space: 2 })
      .lineWidth(0.8)
      .strokeColor('#B7BEC7')
      .moveTo(MARGIN, y)
      .lineTo(PAGE_WIDTH - MARGIN, y)
      .stroke()
      .undash()
      .restore();
  }

  private fieldRow(
    doc: PDFKit.PDFDocument,
    y: number,
    label: string,
    value: string,
  ) {
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor('#10244A')
      .text(label, MARGIN, y, { width: CONTENT_WIDTH * 0.42, align: 'left' });

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor('#10244A')
      .text(value || '-', MARGIN + CONTENT_WIDTH * 0.42, y, {
        width: CONTENT_WIDTH * 0.58,
        align: 'right',
      });
  }

  /** Tinggi dokumen dihitung dulu dari jumlah baris supaya tidak ada halaman kosong/terpotong. */
  private hitungTinggi(data: DataResi): number {
    const tinggiHeader = 118;
    const tinggiField = 8 * 15 + 14;
    const tinggiTabelHeader = 20;

    const tinggiItem = data.items.reduce((total, item) => {
      const adaCatatan = Boolean(item.notes?.trim());
      return total + 14 + (adaCatatan ? 12 : 0);
    }, 0);

    const tinggiRingkasan = 15 * 3 + 14;
    const tinggiTandaTangan = 90;
    const tinggiFooter = 40;

    return (
      tinggiHeader +
      tinggiField +
      tinggiTabelHeader +
      tinggiItem +
      tinggiRingkasan +
      tinggiTandaTangan +
      tinggiFooter +
      MARGIN
    );
  }

  async generate(data: DataResi): Promise<Buffer> {
    const tinggi = this.hitungTinggi(data);

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: [PAGE_WIDTH, tinggi],
        margin: 0,
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      let y = MARGIN;

      // ---------- Kop ----------
      const logo = this.resolveLogo();

      if (logo) {
        try {
          doc.image(logo, PAGE_WIDTH / 2 - 20, y, { fit: [40, 40] });
        } catch {
          // Resi tetap dibuat bila logo gagal dibaca.
        }
      }

      y += 44;

      doc
        .font('Helvetica-Bold')
        .fontSize(13)
        .fillColor('#10244A')
        .text('PPA', MARGIN, y, { width: CONTENT_WIDTH, align: 'center' });

      y += 22;

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor('#10244A')
        .text('RESI ORDER ADDITIONAL', MARGIN, y, {
          width: CONTENT_WIDTH,
          align: 'center',
        });

      y += 15;

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#6D7F99')
        .text('MEAL & SNACK SPESIAL', MARGIN, y, {
          width: CONTENT_WIDTH,
          align: 'center',
        });

      y += 18;
      this.dashedLine(doc, y);
      y += 10;

      // ---------- Field informasi order ----------
      const formattedNeededDate = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Pontianak',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(data.neededDate);

      const baris: Array<[string, string]> = [
        ['NO ORDER', data.orderNumber],
        ['TGL ORDER', formattedNeededDate],
        ['PEMESAN', data.pemesan.toUpperCase()],
        ['DEPT', (data.department ?? '-').toUpperCase()],
        ['KEGIATAN', (data.kegiatan ?? '-').toUpperCase()],
        ['LOKASI', data.deliveryLocation.toUpperCase()],
        [
          'JAM',
          data.deliveryTime ? `${data.deliveryTime} WITA` : '-',
        ],
        ['VENDOR', (data.vendor ?? '-').toUpperCase()],
      ];

      for (const [label, value] of baris) {
        this.fieldRow(doc, y, label, value);
        y += 15;
      }

      y += 4;
      this.dashedLine(doc, y);
      y += 10;

      // ---------- Tabel item ----------
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#10244A')
        .text('NO', MARGIN, y, { width: 26 })
        .text('ITEM', MARGIN + 26, y, { width: CONTENT_WIDTH - 26 - 40 })
        .text('JLH', MARGIN + CONTENT_WIDTH - 40, y, {
          width: 40,
          align: 'right',
        });

      y += 14;

      data.items.forEach((item, index) => {
        doc
          .font('Helvetica')
          .fontSize(8)
          .fillColor('#10244A')
          .text(`${(index + 1).toFixed(2)}`, MARGIN, y, { width: 26 })
          .text(item.orderType.toUpperCase(), MARGIN + 26, y, {
            width: CONTENT_WIDTH - 26 - 40,
          })
          .text(String(item.quantity), MARGIN + CONTENT_WIDTH - 40, y, {
            width: 40,
            align: 'right',
          });

        y += 14;

        const catatan = item.notes?.trim();

        if (catatan) {
          doc
            .font('Helvetica')
            .fontSize(7.5)
            .fillColor('#6D7F99')
            .text(
              `${item.orderType.toUpperCase()} (${catatan.toUpperCase()})`,
              MARGIN,
              y,
              { width: CONTENT_WIDTH },
            );

          y += 12;
        }
      });

      y += 4;
      this.dashedLine(doc, y);
      y += 10;

      // ---------- Ringkasan status ----------
      this.fieldRow(doc, y, 'TOTAL JLH', `${data.totalPacks} PAX`);
      y += 15;
      this.fieldRow(
        doc,
        y,
        'APPROVAL',
        LABEL_APPROVAL[data.statusApproval] ?? data.statusApproval,
      );
      y += 15;
      this.fieldRow(
        doc,
        y,
        'DELIVERY',
        LABEL_DELIVERY[data.statusDelivery] ?? data.statusDelivery,
      );
      y += 14;

      this.dashedLine(doc, y);
      y += 26;

      // ---------- Tanda tangan ----------
      const halfWidth = CONTENT_WIDTH / 2;

      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor('#10244A')
        .text('HCGA', MARGIN, y, { width: halfWidth, align: 'center' })
        .text('VENDOR', MARGIN + halfWidth, y, {
          width: halfWidth,
          align: 'center',
        });

      y += 44;

      doc
        .font('Helvetica')
        .fontSize(8)
        .fillColor('#10244A')
        .text('(...........)', MARGIN, y, { width: halfWidth, align: 'center' })
        .text('(...........)', MARGIN + halfWidth, y, {
          width: halfWidth,
          align: 'center',
        });

      y += 20;
      this.dashedLine(doc, y);
      y += 12;

      // ---------- Footer ----------
      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#8697B2')
        .text('Dicetak otomatis dari sistem', MARGIN, y, {
          width: CONTENT_WIDTH,
          align: 'center',
        });

      y += 10;

      doc
        .font('Helvetica')
        .fontSize(7)
        .fillColor('#8697B2')
        .text('PPA SITE ADW', MARGIN, y, {
          width: CONTENT_WIDTH,
          align: 'center',
        });

      doc.end();
    });
  }
}

// ==================================================
// SELESAI: backend/src/order-pack-meal/order-pack-meal-receipt-pdf.service.ts
// ==================================================
