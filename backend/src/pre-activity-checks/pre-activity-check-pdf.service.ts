import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { existsSync, readdirSync, statSync } from 'node:fs';
import { basename, join, normalize } from 'node:path';
import { siapkanGambarUntukPdfKit } from '../common/pdf-image.util';
import { PreActivityChecksService } from './pre-activity-checks.service';

type PdfData = Awaited<ReturnType<PreActivityChecksService['findOne']>>;

/** Gambar siap-pakai untuk doc.image(), kunci = path mentah asli dari data. */
type GambarSiap = Map<string, string | Buffer>;

@Injectable()
export class PreActivityCheckPdfService {
  constructor(private readonly service: PreActivityChecksService) {}

  async generate(id: number): Promise<Buffer> {
    const data = await this.service.findOne(id);
    const gambarSiap = await this.siapkanSemuaGambar(data);

    return new Promise<Buffer>((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 0,
        autoFirstPage: true,
        bufferPages: true,
        info: {
          Title: 'Formulir Pre-Activity Check',
          Author: 'PT. Putra Perkasa Abadi',
        },
      });

      const chunks: Buffer[] = [];

      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      this.drawFirstPage(doc, data, gambarSiap);

      doc.addPage({
        size: 'A4',
        margin: 0,
      });

      this.drawAttachmentPage(doc, data, gambarSiap);

      doc.end();
    });
  }

  /**
   * Resolve & convert semua gambar (tanda tangan + lampiran) sebelum PDF
   * mulai digambar. PDFKit hanya baca JPEG/PNG — foto WebP hasil kompresi
   * frontend dikonversi dulu ke buffer PNG lewat siapkanGambarUntukPdfKit.
   */
  private async siapkanSemuaGambar(data: PdfData): Promise<GambarSiap> {
    const rawPaths = [
      data.executor_signature,
      data.supervisor_signature,
      data.jsa_image,
      data.checklist_image,
      ...this.parseStoredPaths(data.socialization_photo),
    ].filter((path): path is string => Boolean(path?.trim()));

    const gambarSiap: GambarSiap = new Map();

    for (const rawPath of rawPaths) {
      const absolutePath = this.resolveUploadPath(rawPath);

      if (!absolutePath) {
        continue;
      }

      try {
        gambarSiap.set(rawPath, await siapkanGambarUntukPdfKit(absolutePath));
      } catch {
        // Gambar dilewati — kolom akan tampil "gambar tidak ditemukan".
      }
    }

    return gambarSiap;
  }

  /** socialization_photo (dan field sejenis) kadang berupa JSON array path. */
  private parseStoredPaths(rawPaths: string | null): string[] {
    if (!rawPaths?.trim()) {
      return [];
    }

    try {
      const parsed: unknown = JSON.parse(rawPaths);

      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // Path biasa, lanjutkan di bawah.
    }

    return [rawPaths.trim()];
  }

  private drawFirstPage(
    doc: PDFKit.PDFDocument,
    data: PdfData,
    gambarSiap: GambarSiap,
  ) {
    this.drawPageBorder(doc);
    this.drawHeader(doc);
    this.drawIdentity(doc, data);

    /*
     * Background wajib digambar sebelum tabel,
     * supaya garis dan teks tetap berada di atas gambar.
     */
    this.drawBackground(doc);

    this.drawRiskSection(doc, data);
    this.drawEquipmentSection(doc, data);
    this.drawDocumentSection(doc, data);
    this.drawApprovalSection(doc, data, gambarSiap);
  }

  private drawPageBorder(doc: PDFKit.PDFDocument) {
    doc
      .save()
      .lineWidth(0.65)
      .strokeColor('#333333')
      .rect(10, 10, 575, 822)
      .stroke()
      .restore();
  }

  private drawHeader(doc: PDFKit.PDFDocument) {
    const logo = this.findAsset([
      join(process.cwd(), 'uploads', 'signatures', 'Logo PPA Official.png'),
      join(process.cwd(), 'uploads', 'signatures', 'PPA_cut.png'),
    ]);

    if (logo) {
      try {
        doc.image(logo, 24, 20, {
          fit: [82, 82],
        });
      } catch {
        // Header tetap dibuat.
      }
    }

    doc
      .fillColor('#1f1f1f')
      .font('Times-Bold')
      .fontSize(17)
      .text('FORMULIR PRE-ACTIVITY CHECK', 112, 25, {
        width: 445,
        align: 'center',
      });

    doc
      .font('Times-Bold')
      .fontSize(15)
      .text('PT. PUTRA PERKASA ABADI', 112, 72, {
        width: 445,
        align: 'center',
      });

    doc
      .save()
      .strokeColor('#b81524')
      .lineWidth(2.1)
      .moveTo(19, 105)
      .lineTo(576, 105)
      .stroke()
      .restore();
  }

  /** Lebih dari satu pekerjaan (dipisah koma saat disimpan) ditampilkan bernomor: "1) A  2) B". */
  private formatJobNames(jobName: string): string {
    const names = jobName
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);

    if (names.length <= 1) {
      return jobName || '-';
    }

    return names.map((name, index) => `${index + 1}) ${name}`).join('  ');
  }

  private drawIdentity(doc: PDFKit.PDFDocument, data: PdfData) {
    const rows: Array<[string, string]> = [
      ['Nama Pekerjaan', this.formatJobNames(data.job_name || '')],
      ['Tanggal', this.formatDate(data.activityDate)],
      ['Lokasi Kerja', data.work_location_text || '-'],
      ['Nama Alat Berat', data.heavy_equipment_name_text || '-'],
      ['Nomor Unit', data.unit_number_text || '-'],
      ['Tim Pelaksana', data.executor_team_text || '-'],
    ];

    const labelX = 23;
    const colonX = 144;
    const valueX = 159;

    const labelWidth = 116;
    const colonWidth = 13;
    const valueWidth = 411;

    const startY = 111;
    const rowHeight = 20;

    rows.forEach(([label, value], index) => {
      const y = startY + index * rowHeight;
      const baselineY = y + 6;

      doc
        .fillColor('#1f1f1f')
        .font('Helvetica-Bold')
        .fontSize(8.7)
        .text(label, labelX, baselineY, {
          width: labelWidth,
          lineGap: 0,
        });

      doc.font('Helvetica-Bold').text(':', colonX, baselineY, {
        width: colonWidth,
        align: 'center',
        lineGap: 0,
      });

      doc.font('Helvetica').text(value, valueX, baselineY, {
        width: valueWidth,
        lineGap: 0,
      });
    });

    doc
      .save()
      .strokeColor('#b81524')
      .lineWidth(1.8)
      .moveTo(19, 235)
      .lineTo(576, 235)
      .stroke()
      .restore();
  }

  private drawBackground(doc: PDFKit.PDFDocument) {
    const background = this.findAsset([
      join(process.cwd(), 'uploads', 'signatures', 'bg-transparan.png'),
    ]);

    if (!background) {
      return;
    }

    try {
      doc
        .save()
        .opacity(0.17)
        .image(background, 20, 371, {
          fit: [555, 430],
        })
        .restore();
    } catch {
      try {
        doc.restore();
      } catch {
        // Abaikan.
      }
    }
  }

  private drawRiskSection(doc: PDFKit.PDFDocument, data: PdfData) {
    const x = 19;
    const width = 557;

    const titleY = 242;
    const titleHeight = 26;

    this.drawGreenSectionTitle(
      doc,
      x,
      titleY,
      width,
      '1.',
      'Identifikasi Risiko dan Langkah Pengendalian',
    );

    const iconWidth = 36;
    const labelWidth = 146;
    const colonWidth = 18;
    const valueWidth = width - iconWidth - labelWidth - colonWidth;

    /*
     * Posisi final:
     * Title       : 242 - 268
     * Bahaya      : 268 - 310
     * Pengendalian: 310 - 359
     * Status      : 359 - 389
     */
    this.drawRiskRow(
      doc,
      x,
      268,
      width,
      42,
      iconWidth,
      labelWidth,
      colonWidth,
      valueWidth,
      'warning',
      'Potensi Bahaya',
      data.hazard_potential_text || '-',
      false,
    );

    this.drawRiskRow(
      doc,
      x,
      310,
      width,
      49,
      iconWidth,
      labelWidth,
      colonWidth,
      valueWidth,
      'shield',
      'Langkah Pengendalian',
      data.control_step_text || '-',
      false,
    );

    this.drawRiskRow(
      doc,
      x,
      359,
      width,
      30,
      iconWidth,
      labelWidth,
      colonWidth,
      valueWidth,
      'check',
      'Status',
      'AMAN',
      true,
    );
  }
  private drawRiskRow(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number,
    iconWidth: number,
    labelWidth: number,
    colonWidth: number,
    valueWidth: number,
    icon: 'warning' | 'shield' | 'check',
    label: string,
    value: string,
    isStatus: boolean,
  ) {
    const labelX = x + iconWidth;
    const colonX = labelX + labelWidth;
    const valueX = colonX + colonWidth;

    this.drawTransparentBox(doc, x, y, width, height);

    /*
     * Setiap garis pemisah hanya digambar sekali.
     */
    doc
      .save()
      .strokeColor('#8e989f')
      .lineWidth(0.55)
      .moveTo(labelX, y)
      .lineTo(labelX, y + height)
      .moveTo(colonX, y)
      .lineTo(colonX, y + height)
      .moveTo(valueX, y)
      .lineTo(valueX, y + height)
      .stroke()
      .restore();

    const centerY = y + height / 2;

    this.drawRiskIcon(doc, icon, x + iconWidth / 2, centerY);

    /*
     * Label dan titik dua menggunakan Y yang sama persis.
     * PDFKit memiliki baseline font, sehingga offset tetap
     * lebih stabil daripada heightOfString untuk satu baris.
     */
    const baselineY = centerY - 4.4;

    doc
      .fillColor('#202020')
      .font('Helvetica-Bold')
      .fontSize(8.8)
      .text(label, labelX + 7, baselineY, {
        width: labelWidth - 14,
        lineGap: 0,
      });

    doc
      .fillColor('#202020')
      .font('Helvetica-Bold')
      .fontSize(8.8)
      .text(':', colonX, baselineY, {
        width: colonWidth,
        align: 'center',
        lineGap: 0,
      });

    const valueAvailableWidth = valueWidth - (isStatus ? 58 : 16);

    doc.font(isStatus ? 'Helvetica-Bold' : 'Helvetica').fontSize(8.6);

    /*
     * Hanya isi multiline yang dihitung tingginya.
     * Label dan titik dua tetap pada baseline yang sama.
     */
    const valueHeight = doc.heightOfString(value, {
      width: valueAvailableWidth,
      lineGap: 1,
    });

    const valueY = valueHeight > 12 ? centerY - valueHeight / 2 : baselineY;

    doc
      .fillColor(isStatus ? '#07984f' : '#202020')
      .text(value, valueX + 8, valueY, {
        width: valueAvailableWidth,
        lineGap: 1,
      });

    if (isStatus) {
      this.drawCheckMark(doc, valueX + 67, centerY, 1.8);
    }
  }
  private drawEquipmentSection(doc: PDFKit.PDFDocument, data: PdfData) {
    const x = 19;
    const width = 557;

    const titleY = 394;
    const titleHeight = 26;

    this.drawRedSectionTitle(
      doc,
      x,
      titleY,
      width,
      '2.',
      'Pemeriksaan Alat & Lingkungan Kerja',
    );

    const rows = [
      ['APD lengkap', data.apd_check],
      ['Kondisi alat berat baik', data.tool_condition_check],
      ['Area kerja aman', data.work_area_check],
      ['Alat kerja lengkap / aman', data.tool_complete_check],
    ] as const;

    const rowHeight = 24;
    let y = titleY + titleHeight + 5;

    rows.forEach(([label, checked]) => {
      this.drawChecklistRow(doc, x, y, width, rowHeight, label, checked);

      y += rowHeight;
    });
  }

  private drawDocumentSection(doc: PDFKit.PDFDocument, data: PdfData) {
    const x = 19;
    const width = 557;

    const titleY = 526;
    const titleHeight = 26;

    this.drawRedSectionTitle(
      doc,
      x,
      titleY,
      width,
      '3.',
      'Izin & Dokumen Pendukung',
    );

    const rows = [
      ['Izin Kerja (Work Permit)', data.work_permit_check],
      ['SOP', data.sop_check],
      ['JSA', data.jsa_check],
      ['LIFTING PLAN', data.lifting_plan_check],
    ] as const;

    const rowHeight = 24;
    let y = titleY + titleHeight + 5;

    rows.forEach(([label, checked]) => {
      this.drawChecklistRow(doc, x, y, width, rowHeight, label, checked);

      y += rowHeight;
    });
  }

  private drawChecklistRow(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number,
    label: string,
    checked: boolean,
  ) {
    const statusWidth = 91;
    const separatorX = x + width - statusWidth;

    this.drawTransparentBox(doc, x, y, width, height);

    doc
      .save()
      .strokeColor('#8e989f')
      .lineWidth(0.55)
      .moveTo(separatorX, y)
      .lineTo(separatorX, y + height)
      .stroke()
      .restore();

    doc
      .fillColor('#242424')
      .font('Helvetica')
      .fontSize(8.8)
      .text(label, x + 7, y + 8, {
        width: width - statusWidth - 14,
        lineGap: 0,
      });

    const statusX = separatorX + statusWidth / 2;

    if (checked) {
      this.drawCheckMark(doc, statusX, y + height / 2, 2);
    } else {
      this.drawCrossMark(doc, statusX, y + height / 2, 2);
    }
  }

  private drawApprovalSection(
    doc: PDFKit.PDFDocument,
    data: PdfData,
    gambarSiap: GambarSiap,
  ) {
    const x = 19;
    const width = 557;

    const titleY = 658;
    const titleHeight = 26;

    this.drawRedSectionTitle(doc, x, titleY, width, '4.', 'Persetujuan');

    const statementY = titleY + titleHeight + 7;
    const statementHeight = 22;

    this.drawTransparentBox(doc, x, statementY, width, statementHeight);

    doc
      .fillColor('#252525')
      .font('Helvetica')
      .fontSize(8)
      .text(
        'Saya menyatakan bahwa pemeriksaan telah dilakukan dan siap melanjutkan pekerjaan:',
        x + 6,
        statementY + 8,
        {
          width: width - 12,
          lineGap: 0,
        },
      );

    let y = statementY + statementHeight;

    y = this.drawApprovalNameRow(
      doc,
      x,
      y,
      width,
      'Koordinator Lapangan',
      data.pic || '-',
    );

    y = this.drawApprovalSignatureRow(
      doc,
      x,
      y,
      width,
      data.executor_signature,
      gambarSiap,
    );

    y = this.drawApprovalNameRow(
      doc,
      x,
      y,
      width,
      'Group Leader',
      data.supervisorName || '-',
    );

    this.drawApprovalSignatureRow(
      doc,
      x,
      y,
      width,
      data.supervisor_signature,
      gambarSiap,
    );
  }

  private drawApprovalNameRow(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    label: string,
    value: string,
  ) {
    const height = 22;
    const labelWidth = 145;
    const colonWidth = 18;

    const colonX = x + labelWidth;
    const valueX = colonX + colonWidth;

    this.drawTransparentBox(doc, x, y, width, height);

    doc
      .save()
      .strokeColor('#8e989f')
      .lineWidth(0.55)
      .moveTo(colonX, y)
      .lineTo(colonX, y + height)
      .moveTo(valueX, y)
      .lineTo(valueX, y + height)
      .stroke()
      .restore();

    doc
      .fillColor('#222222')
      .font('Helvetica-Bold')
      .fontSize(8.4)
      .text(label, x + 6, y + 7, {
        width: labelWidth - 12,
      });

    doc.font('Helvetica-Bold').text(':', colonX, y + 7, {
      width: colonWidth,
      align: 'center',
    });

    doc.font('Helvetica').text(value, valueX + 6, y + 7, {
      width: width - labelWidth - colonWidth - 12,
    });

    return y + height;
  }

  private drawApprovalSignatureRow(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    signaturePath: string | null,
    gambarSiap: GambarSiap,
  ) {
    const height = 35;
    const labelWidth = 145;
    const colonWidth = 18;

    const colonX = x + labelWidth;
    const valueX = colonX + colonWidth;
    const valueWidth = width - labelWidth - colonWidth;

    this.drawTransparentBox(doc, x, y, width, height);

    doc
      .save()
      .strokeColor('#8e989f')
      .lineWidth(0.55)
      .moveTo(colonX, y)
      .lineTo(colonX, y + height)
      .moveTo(valueX, y)
      .lineTo(valueX, y + height)
      .stroke()
      .restore();

    doc
      .fillColor('#222222')
      .font('Helvetica-Bold')
      .fontSize(8.4)
      .text('Tanda Tangan', x + 6, y + 13, {
        width: labelWidth - 12,
      });

    doc.font('Helvetica-Bold').text(':', colonX, y + 13, {
      width: colonWidth,
      align: 'center',
    });

    this.drawSignature(
      doc,
      signaturePath,
      valueX,
      y,
      valueWidth,
      height,
      gambarSiap,
    );

    return y + height;
  }

  private drawGreenSectionTitle(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    number: string,
    title: string,
  ) {
    const numberWidth = 36;
    const height = 26;

    doc
      .save()
      .fillColor('#07984f')
      .rect(x, y, numberWidth, height)
      .fill()
      .restore();

    doc
      .save()
      .fillColor('#e8f5ec')
      .strokeColor('#89969c')
      .lineWidth(0.55)
      .rect(x + numberWidth, y, width - numberWidth, height)
      .fillAndStroke()
      .restore();

    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(number, x, y + 8, {
        width: numberWidth,
        align: 'center',
      });

    doc
      .fillColor('#078c4a')
      .font('Helvetica-Bold')
      .fontSize(8.7)
      .text(title, x + numberWidth + 7, y + 8, {
        width: width - numberWidth - 14,
      });
  }

  private drawRedSectionTitle(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    number: string,
    title: string,
  ) {
    const numberWidth = 36;
    const height = 26;

    doc
      .save()
      .fillColor('#c71020')
      .rect(x, y, numberWidth, height)
      .fill()
      .restore();

    doc
      .save()
      .fillColor('#ffffff')
      .fillOpacity(0.2)
      .strokeColor('#c71020')
      .lineWidth(0.75)
      .rect(x + numberWidth, y, width - numberWidth, height)
      .fillAndStroke()
      .restore();

    doc
      .fillColor('#ffffff')
      .font('Helvetica-Bold')
      .fontSize(9)
      .text(number, x, y + 8, {
        width: numberWidth,
        align: 'center',
      });

    doc
      .fillColor('#202020')
      .font('Helvetica-Bold')
      .fontSize(8.8)
      .text(title, x + numberWidth + 7, y + 8, {
        width: width - numberWidth - 14,
      });
  }

  private drawTransparentBox(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    doc
      .save()
      .fillColor('#ffffff')
      .fillOpacity(0.18)
      .strokeColor('#8e989f')
      .lineWidth(0.55)
      .rect(x, y, width, height)
      .fillAndStroke()
      .restore();
  }

  private drawRiskIcon(
    doc: PDFKit.PDFDocument,
    type: 'warning' | 'shield' | 'check',
    x: number,
    y: number,
  ) {
    doc.save();

    if (type === 'warning') {
      doc
        .strokeColor('#07984f')
        .lineWidth(1.1)
        .moveTo(x, y - 8)
        .lineTo(x - 8, y + 7)
        .lineTo(x + 8, y + 7)
        .closePath()
        .stroke();

      doc
        .fillColor('#07984f')
        .font('Helvetica-Bold')
        .fontSize(9)
        .text('!', x - 3, y - 4, {
          width: 6,
          align: 'center',
        });
    }

    if (type === 'shield') {
      doc
        .strokeColor('#07984f')
        .lineWidth(1.1)
        .moveTo(x, y - 8)
        .lineTo(x + 6, y - 5)
        .lineTo(x + 5, y + 3)
        .lineTo(x, y + 8)
        .lineTo(x - 5, y + 3)
        .lineTo(x - 6, y - 5)
        .closePath()
        .stroke();

      doc
        .moveTo(x - 3, y)
        .lineTo(x - 1, y + 3)
        .lineTo(x + 4, y - 3)
        .stroke();
    }

    if (type === 'check') {
      doc.strokeColor('#07984f').lineWidth(1.1).circle(x, y, 8).stroke();

      doc
        .moveTo(x - 4, y)
        .lineTo(x - 1, y + 3)
        .lineTo(x + 5, y - 4)
        .stroke();
    }

    doc.restore();
  }

  private drawCheckMark(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    lineWidth: number,
  ) {
    doc
      .save()
      .strokeColor('#07984f')
      .lineWidth(lineWidth)
      .moveTo(x - 6, y)
      .lineTo(x - 1, y + 5)
      .lineTo(x + 8, y - 7)
      .stroke()
      .restore();
  }

  private drawCrossMark(
    doc: PDFKit.PDFDocument,
    x: number,
    y: number,
    lineWidth: number,
  ) {
    doc
      .save()
      .strokeColor('#e01b24')
      .lineWidth(lineWidth)
      .moveTo(x - 6, y - 6)
      .lineTo(x + 6, y + 6)
      .moveTo(x + 6, y - 6)
      .lineTo(x - 6, y + 6)
      .stroke()
      .restore();
  }

  private drawSignature(
    doc: PDFKit.PDFDocument,
    relativePath: string | null,
    x: number,
    y: number,
    width: number,
    height: number,
    gambarSiap: GambarSiap,
  ) {
    const gambar = relativePath ? gambarSiap.get(relativePath) : undefined;

    if (!gambar) {
      return;
    }

    try {
      doc.image(gambar, x + 9, y + 3, {
        fit: [Math.min(width - 18, 130), height - 6],
      });
    } catch {
      // Kolom tanda tangan tetap dibuat.
    }
  }

  private drawAttachmentPage(
    doc: PDFKit.PDFDocument,
    data: PdfData,
    gambarSiap: GambarSiap,
  ) {
    this.drawPageBorder(doc);

    const headerX = 20;
    const headerWidth = 555;

    doc
      .save()
      .fillColor('#f7dddd')
      .strokeColor('#333333')
      .lineWidth(0.65)
      .rect(headerX, 22, headerWidth, 42)
      .fillAndStroke()
      .restore();

    doc
      .fillColor('#202020')
      .font('Times-Bold')
      .fontSize(15)
      .text('LAMPIRAN FOTO PRE-ACTIVITY', headerX, 36, {
        width: headerWidth,
        align: 'center',
      });

    type Kategori =
      | { title: string; kind: 'single'; path: string }
      | { title: string; kind: 'grid'; paths: string[] };

    const kategoriTerisi: Kategori[] = [];

    if (data.jsa_image && gambarSiap.has(data.jsa_image)) {
      kategoriTerisi.push({ title: 'JSA', kind: 'single', path: data.jsa_image });
    }

    if (data.checklist_image && gambarSiap.has(data.checklist_image)) {
      kategoriTerisi.push({
        title: 'Ceklis',
        kind: 'single',
        path: data.checklist_image,
      });
    }

    const fotoBriefing = this.parseStoredPaths(data.socialization_photo).filter(
      (item) => gambarSiap.has(item),
    );

    if (fotoBriefing.length) {
      kategoriTerisi.push({
        title: 'Briefing Pekerjaan',
        kind: 'grid',
        paths: fotoBriefing,
      });
    }

    if (!kategoriTerisi.length) {
      doc
        .fillColor('#777777')
        .font('Helvetica')
        .fontSize(10)
        .text('Belum ada foto lampiran.', 20, 400, {
          width: 555,
          align: 'center',
        });

      return;
    }

    /*
     * Area kosong (kategori tanpa foto) tidak ikut digambar sama sekali —
     * kotak yang tersisa membesar menyesuaikan: 1 kategori memenuhi
     * seluruh area, 2 berdampingan, 3 memakai tata letak lama (2 atas + 1
     * bawah tengah) supaya ukurannya tetap proporsional dengan halaman A4.
     */
    const areaX = 20;
    const areaTop = 82;
    const areaBottom = 812;
    const areaWidth = 555;
    const gap = 9;

    if (kategoriTerisi.length === 1) {
      this.drawKategoriLampiran(
        doc,
        kategoriTerisi[0],
        gambarSiap,
        areaX,
        areaTop,
        areaWidth,
        areaBottom - areaTop,
      );
    } else if (kategoriTerisi.length === 2) {
      const boxWidth = (areaWidth - gap) / 2;
      const boxHeight = areaBottom - areaTop;

      this.drawKategoriLampiran(
        doc,
        kategoriTerisi[0],
        gambarSiap,
        areaX,
        areaTop,
        boxWidth,
        boxHeight,
      );

      this.drawKategoriLampiran(
        doc,
        kategoriTerisi[1],
        gambarSiap,
        areaX + boxWidth + gap,
        areaTop,
        boxWidth,
        boxHeight,
      );
    } else {
      const boxWidth = 265;
      const boxHeight = 330;
      const leftX = 28;
      const rightX = leftX + boxWidth + gap;
      const centerX = (595.28 - boxWidth) / 2;
      const bottomY = 425;

      this.drawKategoriLampiran(
        doc,
        kategoriTerisi[0],
        gambarSiap,
        leftX,
        areaTop,
        boxWidth,
        boxHeight,
      );

      this.drawKategoriLampiran(
        doc,
        kategoriTerisi[1],
        gambarSiap,
        rightX,
        areaTop,
        boxWidth,
        boxHeight,
      );

      this.drawKategoriLampiran(
        doc,
        kategoriTerisi[2],
        gambarSiap,
        centerX,
        bottomY,
        boxWidth,
        boxHeight,
      );
    }
  }

  private drawKategoriLampiran(
    doc: PDFKit.PDFDocument,
    kategori:
      | { title: string; kind: 'single'; path: string }
      | { title: string; kind: 'grid'; paths: string[] },
    gambarSiap: GambarSiap,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    if (kategori.kind === 'single') {
      this.drawAttachmentBox(
        doc,
        kategori.title,
        kategori.path,
        x,
        y,
        width,
        height,
        gambarSiap,
      );
      return;
    }

    this.drawAttachmentGrid(
      doc,
      kategori.title,
      kategori.paths,
      x,
      y,
      width,
      height,
      gambarSiap,
    );
  }
  private drawAttachmentGrid(
    doc: PDFKit.PDFDocument,
    title: string,
    paths: string[],
    x: number,
    y: number,
    width: number,
    height: number,
    gambarSiap: GambarSiap,
  ) {
    const titleHeight = 25;
    const padding = 7;
    const gap = 4;

    doc
      .save()
      .strokeColor('#333333')
      .lineWidth(0.65)
      .rect(x, y, width, height)
      .stroke()
      .restore();

    doc
      .fillColor('#202020')
      .font('Times-Bold')
      .fontSize(8.5)
      .text(title, x + padding, y + 8, {
        width: width - padding * 2,
      });

    const innerX = x + padding;
    const innerY = y + titleHeight + 5;
    const innerWidth = width - padding * 2;
    const innerHeight = height - titleHeight - 12;

    doc
      .save()
      .strokeColor('#c4ccd2')
      .lineWidth(0.45)
      .rect(innerX, innerY, innerWidth, innerHeight)
      .stroke()
      .restore();

    const imagePaths = paths.slice(0, 5);

    const layouts: Array<{
      x: number;
      y: number;
      width: number;
      height: number;
    }> = [];

    const count = imagePaths.length;

    if (count === 1) {
      layouts.push({
        x: innerX,
        y: innerY,
        width: innerWidth,
        height: innerHeight,
      });
    } else if (count === 2) {
      const photoWidth = (innerWidth - gap) / 2;

      layouts.push(
        {
          x: innerX,
          y: innerY,
          width: photoWidth,
          height: innerHeight,
        },
        {
          x: innerX + photoWidth + gap,
          y: innerY,
          width: photoWidth,
          height: innerHeight,
        },
      );
    } else if (count === 3) {
      const photoWidth = (innerWidth - gap * 2) / 3;

      for (let index = 0; index < 3; index += 1) {
        layouts.push({
          x: innerX + index * (photoWidth + gap),
          y: innerY,
          width: photoWidth,
          height: innerHeight,
        });
      }
    } else if (count === 4) {
      const photoWidth = (innerWidth - gap) / 2;

      const photoHeight = (innerHeight - gap) / 2;

      for (let index = 0; index < 4; index += 1) {
        const row = Math.floor(index / 2);
        const column = index % 2;

        layouts.push({
          x: innerX + column * (photoWidth + gap),
          y: innerY + row * (photoHeight + gap),
          width: photoWidth,
          height: photoHeight,
        });
      }
    } else {
      const photoWidth = (innerWidth - gap * 2) / 3;

      const photoHeight = (innerHeight - gap) / 2;

      // Tiga foto pada baris pertama.
      for (let index = 0; index < 3; index += 1) {
        layouts.push({
          x: innerX + index * (photoWidth + gap),
          y: innerY,
          width: photoWidth,
          height: photoHeight,
        });
      }

      // Dua foto pada baris kedua dan rata tengah.
      const secondRowWidth = photoWidth * 2 + gap;

      const secondRowStartX = innerX + (innerWidth - secondRowWidth) / 2;

      for (let index = 0; index < 2; index += 1) {
        layouts.push({
          x: secondRowStartX + index * (photoWidth + gap),
          y: innerY + photoHeight + gap,
          width: photoWidth,
          height: photoHeight,
        });
      }
    }

    imagePaths.forEach((imagePath, index) => {
      const layout = layouts[index];
      const gambar = gambarSiap.get(imagePath);

      doc
        .save()
        .strokeColor('#9aa4ad')
        .lineWidth(0.35)
        .rect(layout.x, layout.y, layout.width, layout.height)
        .stroke()
        .restore();

      if (!gambar) {
        return;
      }

      try {
        doc.image(gambar, layout.x + 2, layout.y + 2, {
          fit: [layout.width - 4, layout.height - 4],
          align: 'center',
          valign: 'center',
        });
      } catch {
        doc
          .fillColor('#777777')
          .font('Helvetica')
          .fontSize(6)
          .text(
            'Gambar gagal dibaca',
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
  private drawAttachmentBox(
    doc: PDFKit.PDFDocument,
    title: string,
    path: string | null,
    x: number,
    y: number,
    width: number,
    height: number,
    gambarSiap: GambarSiap,
  ) {
    const gambar = path ? gambarSiap.get(path) : undefined;

    if (!gambar) {
      return;
    }

    const titleHeight = 25;

    doc
      .save()
      .strokeColor('#333333')
      .lineWidth(0.65)
      .rect(x, y, width, height)
      .stroke()
      .restore();

    doc
      .fillColor('#202020')
      .font('Times-Bold')
      .fontSize(8.5)
      .text(title, x + 7, y + 8, {
        width: width - 14,
      });

    const innerX = x + 7;
    const innerY = y + titleHeight + 5;
    const innerWidth = width - 14;
    const innerHeight = height - titleHeight - 12;

    doc
      .save()
      .strokeColor('#c4ccd2')
      .lineWidth(0.45)
      .rect(innerX, innerY, innerWidth, innerHeight)
      .stroke()
      .restore();

    try {
      doc.image(gambar, innerX + 7, innerY + 7, {
        fit: [innerWidth - 14, innerHeight - 14],
      });
    } catch {
      doc
        .fillColor('#777777')
        .font('Helvetica')
        .fontSize(8.5)
        .text(
          'Format gambar tidak dapat dibaca',
          innerX,
          innerY + innerHeight / 2 - 4,
          {
            width: innerWidth,
            align: 'center',
          },
        );
    }
  }

  private formatDate(value: Date | string) {
    const date = new Date(value);

    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  }

  private findAsset(candidates: string[]): string | null {
    return candidates.find((candidate) => existsSync(candidate)) ?? null;
  }

  private resolveUploadPath(rawPath: string | null): string | null {
    if (!rawPath?.trim()) {
      return null;
    }

    let pathValue = rawPath.trim();

    /*
     * socialization_photo pada data lama
     * kadang disimpan sebagai array JSON.
     */
    try {
      const parsed: unknown = JSON.parse(pathValue);

      if (Array.isArray(parsed) && typeof parsed[0] === 'string') {
        pathValue = parsed[0];
      }
    } catch {
      // Path biasa.
    }

    if (pathValue.startsWith('http://') || pathValue.startsWith('https://')) {
      return null;
    }

    const cleaned = normalize(pathValue)
      .replace(/^[/\\]+/, '')
      .replace(/^uploads[/\\]/i, '');

    const filename = basename(cleaned);

    const candidates = [
      join(process.cwd(), 'uploads', cleaned),
      join(process.cwd(), cleaned),
      join(process.cwd(), 'uploads', 'pre-activity-checks', filename),
      join(process.cwd(), 'uploads', 'signatures', filename),
    ];

    const direct = candidates.find((candidate) => existsSync(candidate));

    if (direct) {
      return direct;
    }

    return this.searchFile(join(process.cwd(), 'uploads'), filename);
  }

  private searchFile(directory: string, targetFilename: string): string | null {
    if (!existsSync(directory)) {
      return null;
    }

    try {
      for (const entry of readdirSync(directory)) {
        const fullPath = join(directory, entry);
        const stats = statSync(fullPath);

        if (
          stats.isFile() &&
          entry.toLowerCase() === targetFilename.toLowerCase()
        ) {
          return fullPath;
        }

        if (stats.isDirectory()) {
          const nested = this.searchFile(fullPath, targetFilename);

          if (nested) {
            return nested;
          }
        }
      }
    } catch {
      return null;
    }

    return null;
  }
}
