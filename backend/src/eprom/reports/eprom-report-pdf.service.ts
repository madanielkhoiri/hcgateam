import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { PDFDocument as TemplateDocument, StandardFonts, rgb } from 'pdf-lib';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { siapkanBufferGambarUntukPdfKit } from '../../common/pdf-image.util';

type ProjectInfo = { namaProject: string; kontrak: { vendor: { namaVendor: string } } };

const CHECKLIST = [
  ['Housekeeping', 'Area kerja bersih dari sampah dan material berserakan'],
  ['Housekeeping', 'Material dan peralatan tersusun rapi dan aman'],
  ['Housekeeping', 'Tempat sampah tersedia, memadai dan tidak meluap'],
  ['Akses & Jalur', 'Jalur pejalan kaki / evakuasi bebas hambatan'],
  ['Akses & Jalur', 'Jalur kendaraan dan area manuver aman'],
  ['Akses & Jalur', 'Rambu dan pembatas area berbahaya tersedia'],
  ['Pencahayaan', 'Pencahayaan area kerja mencukupi'],
  ['Ventilasi & Udara', 'Ventilasi / sirkulasi udara memadai'],
  ['Ventilasi & Udara', 'Debu, asap dan emisi dikendalikan'],
  ['Kebisingan', 'Paparan kebisingan dikendalikan'],
  ['Drainase', 'Drainase lancar, tidak ada genangan berbahaya'],
  ['Air & Sanitasi', 'Air bersih dan fasilitas cuci tangan tersedia'],
  ['Air & Sanitasi', 'Toilet / fasilitas sanitasi bersih dan layak'],
  ['Limbah', 'Limbah domestik dipilah dan dikelola'],
  ['Limbah', 'Limbah B3 disimpan dan diberi label sesuai ketentuan'],
  ['Bahan Kimia', 'Bahan kimia disimpan aman, label dan SDS tersedia'],
  ['Tumpahan', 'Tidak ada tumpahan oli / BBM / bahan kimia'],
  ['Cuaca & Panas', 'Pengendalian panas, hujan, petir dan cuaca ekstrem memadai'],
  ['Vegetasi & Lingkungan', 'Tidak ada gangguan lingkungan / erosi / pencemaran terlihat'],
  ['Fasilitas Darurat', 'APAR, P3K dan akses darurat tidak terhalang'],
];

@Injectable()
export class EpromReportPdfService {
  private logoPath(): string | null {
    const candidates = [
      join(process.cwd(), 'uploads', 'signatures', 'Logo PPA Official.png'),
      resolve(process.cwd(), '..', 'frontend', 'public', 'logos', 'Logo PPA Official.png'),
    ];
    return candidates.find(existsSync) ?? null;
  }

  private inspectionTemplatePath(): string {
    const candidates = [
      join(__dirname, 'templates', 'Form_Inspeksi_Lingkungan_Kerja.pdf'),
      join(process.cwd(), 'src', 'eprom', 'reports', 'templates', 'Form_Inspeksi_Lingkungan_Kerja.pdf'),
    ];
    const template = candidates.find(existsSync);
    if (!template) throw new Error('Template Form Inspeksi Lingkungan Kerja tidak ditemukan');
    return template;
  }

  private async document(build: (doc: PDFKit.PDFDocument) => void, options: PDFKit.PDFDocumentOptions = {}): Promise<Buffer> {
    return new Promise((resolveBuffer, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 32, bufferPages: true, ...options });
      const chunks: Buffer[] = [];
      doc.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      doc.on('end', () => resolveBuffer(Buffer.concat(chunks)));
      doc.on('error', reject);
      build(doc);
      doc.end();
    });
  }

  private header(doc: PDFKit.PDFDocument, title: string) {
    const logo = this.logoPath();
    if (logo) doc.image(logo, 43, 23, { fit: [40, 34], align: 'center', valign: 'center' });
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#142b4f').text('PPA', 38, 59, { width: 50, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#142b4f').text(title, 105, 35, { align: 'center', width: 420 });
    doc.moveTo(32, 76).lineTo(563, 76).lineWidth(2).strokeColor('#d51f26').stroke();
    doc.y = 86;
  }

  private section(doc: PDFKit.PDFDocument, title: string) {
    doc.moveDown(0.2).font('Helvetica-Bold').fontSize(7.5);
    const y = doc.y;
    doc.rect(32, y, 531, 14).fill('#d40000');
    doc.fillColor('#ffffff').text(title, 35, y + 3.2, { width: 525 });
    doc.y = y + 16;
  }

  private field(doc: PDFKit.PDFDocument, label: string, value: unknown) {
    const y = doc.y;
    doc.rect(32, y, 118, 11).fill('#e7edf6');
    doc.rect(150, y, 413, 11).fill('#ffffff');
    doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#243b5a').text(label, 35, y + 2.1, { width: 112 });
    doc.font('Helvetica').text(String(value ?? '-'), 154, y + 2.1, { width: 405 });
    doc.moveTo(32, y + 11).lineTo(563, y + 11).lineWidth(0.35).strokeColor('#dce4ed').stroke();
    doc.y = y + 11;
  }

  async daily(data: any, project: ProjectInfo, photos: Express.Multer.File[]) {
    const preparedPhotos = await Promise.all(photos.map(async photo => {
      try { return await siapkanBufferGambarUntukPdfKit(photo.buffer); } catch { return null; }
    }));
    return this.document((doc) => {
      this.header(doc, `DAILY REPORT - ${project.namaProject.toUpperCase()}`);
      this.section(doc, 'INFORMASI GENERAL PROYEK');
      this.field(doc, 'Kontraktor', project.kontrak.vendor.namaVendor);
      this.field(doc, 'Tanggal', data.tanggal);
      this.field(doc, 'Waktu Pekerjaan', `${data.waktuMulai || '-'} s.d. ${data.waktuSelesai || '-'}`);
      this.field(doc, 'Lokasi', data.lokasi);
      this.field(doc, 'Hari Kerja Ke', data.hariKerjaKe);
      this.field(doc, 'Cuaca', `Pagi ${data.cuacaPagi || '-'} / Siang ${data.cuacaSiang || '-'} / Sore ${data.cuacaSore || '-'} / Malam ${data.cuacaMalam || '-'}`);
      this.section(doc, 'TIM STAFF PROYEK');
      const staffHeaderY = doc.y;
      doc.rect(32, staffHeaderY, 118, 13).fill('#993333');
      doc.rect(150, staffHeaderY, 413, 13).fill('#993333');
      doc.font('Helvetica-Bold').fontSize(6.5).fillColor('#ffffff').text('Jabatan', 35, staffHeaderY + 3.1, { width: 112, align: 'center' });
      doc.text('Nama Staff', 154, staffHeaderY + 3.1, { width: 405, align: 'center' });
      doc.y = staffHeaderY + 13;
      for (const row of data.staff ?? []) this.field(doc, row.jabatan || 'Jabatan', row.nama || '-');
      this.section(doc, 'LAPORAN PEKERJAAN & DOKUMENTASI');
      const docs = (data.dokumentasi ?? []).map((item: any, index: number) => ({ ...item, photo: preparedPhotos[index] }));
      const teams = ['Tim Sipil', 'Tim Baja', 'Tim MEP', 'Tim Arsitektur'];
      let pageStartY = doc.y;
      const startX = 32;
      const cardWidth = 531 / 5;
      const rowHeight = 120;
      const teamHeight = 12;
      const workHeight = 14;
      const imageHeight = 94;

      teams.forEach((team, teamIndex) => {
        if (teamIndex === 2) {
          doc.addPage();
          this.header(doc, `DAILY REPORT - ${project.namaProject.toUpperCase()}`);
          this.section(doc, 'LAPORAN PEKERJAAN & DOKUMENTASI (LANJUTAN)');
          pageStartY = doc.y;
        }
        const teamDocs = docs.filter((item: any) => item.tim === team).slice(0, 10);
        const teamOnPage = teamIndex % 2;
        for (let slot = 0; slot < 10; slot += 1) {
          const item = teamDocs[slot];
          const column = slot % 5;
          const photoRow = Math.floor(slot / 5);
          const x = startX + column * cardWidth;
          const y = pageStartY + (teamOnPage * 2 + photoRow) * rowHeight;
          doc.rect(x, y, cardWidth, teamHeight).fill('#a83b3d');
          doc.font('Helvetica-Bold').fontSize(6).fillColor('#fff').text(team, x + 2, y + 3, { width: cardWidth - 4, align: 'center' });
          doc.rect(x, y + teamHeight, cardWidth, workHeight).fill('#bd4b4d');
          doc.font('Helvetica-Bold').fontSize(5.2).fillColor('#fff').text(item?.pekerjaan || '-', x + 2, y + teamHeight + 2.8, { width: cardWidth - 4, height: workHeight - 3, align: 'center', ellipsis: true });
          doc.rect(x, y + teamHeight + workHeight, cardWidth, imageHeight).fillAndStroke('#ffffff', '#d8e0e8');
          if (item?.photo?.length) {
            try {
              doc.image(item.photo, x + 1, y + teamHeight + workHeight + 1, { fit: [cardWidth - 2, imageHeight - 2], align: 'center', valign: 'center' });
            } catch { /* gambar rusak ditampilkan sebagai kotak kosong */ }
          }
        }
      });
      doc.y = pageStartY + 4 * rowHeight;
    });
  }

  async inspection(data: any, project: ProjectInfo) {
    const pdf = await TemplateDocument.load(readFileSync(this.inspectionTemplatePath()));
    const page = pdf.getPage(0);
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const ink = rgb(0.04, 0.08, 0.12);
    const yellow = rgb(1, 0.945, 0.79);
    const green = rgb(0.86, 0.94, 0.88);
    const write = (value: unknown, x: number, y: number, size = 5.5, maxWidth?: number, useBold = false) => page.drawText(String(value ?? ''), { x, y, size, font: useBold ? bold : font, color: ink, maxWidth });
    const centered = (value: unknown, x: number, width: number, y: number, size = 5.5, useBold = false, color = ink) => {
      const text = String(value ?? ''); const selectedFont = useBold ? bold : font;
      const textWidth = selectedFont.widthOfTextAtSize(text, size);
      page.drawText(text, { x: x + Math.max(2, (width - textWidth) / 2), y, size, font: selectedFont, color, maxWidth: width - 4 });
    };

    // Header mengikuti format laporan e-ProM: logo PPA di kiri dan judul di tengah.
    page.drawRectangle({ x: 48, y: 722, width: 516, height: 59, color: rgb(1, 1, 1) });
    const logoPath = this.logoPath();
    if (logoPath) {
      const logoBytes = readFileSync(logoPath);
      const logo = logoPath.toLowerCase().endsWith('.png') ? await pdf.embedPng(logoBytes) : await pdf.embedJpg(logoBytes);
      page.drawImage(logo, { x: 51, y: 742, width: 38, height: 33 });
    }
    centered('PPA', 50, 40, 733, 8, true);
    centered('FORM INSPEKSI LINGKUNGAN KERJA', 110, 400, 753, 10, true);
    page.drawLine({ start: { x: 50, y: 724 }, end: { x: 561, y: 724 }, thickness: 1.8, color: rgb(0.83, 0.08, 0.12) });

    // Bersihkan nilai contoh yang tercetak di template, lalu isi data proyek sebenarnya.
    page.drawRectangle({ x: 122, y: 648, width: 439, height: 60, color: yellow });
    [project.namaProject, project.kontrak.vendor.namaVendor, data.tanggal, data.inspektor, data.pic, data.shiftJam]
      .forEach((value, i) => write(value || '-', 126, 699 - i * 10, 5.6, 430));

    const checklist = data.checklist ?? [];
    // Gambar ulang seluruh tabel agar header dan setiap kolom konsisten serta rata tengah.
    const navy = rgb(0.09, 0.2, 0.32); const white = rgb(1, 1, 1);
    const checklistWidths = [24, 88, 148, 55, 130, 66];
    const checklistHeads = ['No', 'Kategori', 'Item Pemeriksaan', 'Hasil', 'Temuan / Keterangan', 'Risiko'];
    page.drawRectangle({ x: 50, y: 629.5, width: 511, height: 14, color: rgb(0.78, 0.08, 0.13) });
    page.drawText('CHECKLIST KONDISI LINGKUNGAN KERJA', { x: 52, y: 633.5, size: 5.2, font: bold, color: white });
    let tableX = 50;
    checklistWidths.forEach((width, i) => {
      page.drawRectangle({ x: tableX, y: 617.5, width, height: 12.5, color: navy });
      centered(checklistHeads[i], tableX, width, 621.5, 5.1, true, white); tableX += width;
    });
    page.drawRectangle({ x: 50, y: 357, width: 260, height: 261, color: white });
    page.drawRectangle({ x: 310, y: 357, width: 251, height: 261, color: yellow });
    CHECKLIST.forEach((definition, i) => {
      const row = checklist[i] ?? {};
      const y = 609 - i * 13.1;
      const hasil = row.hasil === 'N/A' ? '' : (row.hasil ?? '');
      const values = [i + 1, definition[0], definition[1], hasil, row.temuan ?? '', row.risiko ?? ''];
      tableX = 50;
      values.forEach((value, column) => { centered(value, tableX, checklistWidths[column], y, column === 2 ? 4.6 : 5); tableX += checklistWidths[column]; });
    });

    const baik = checklist.filter((row: any) => row.hasil === 'Baik').length;
    const tidakBaik = checklist.filter((row: any) => row.hasil === 'Tidak Baik').length;
    const na = checklist.filter((row: any) => row.hasil === 'N/A').length;
    // Ringkasan digambar sebagai satu tabel agar bidang biru dan hijau persis sejajar.
    page.drawRectangle({ x: 50, y: 339.5, width: 511, height: 12.5, color: rgb(0.78, 0.08, 0.13) });
    page.drawText('RINGKASAN HASIL INSPEKSI', { x: 52, y: 343.2, size: 5.2, font: bold, color: white });
    page.drawRectangle({ x: 50, y: 315.5, width: 210, height: 24.5, color: rgb(0.9, 0.93, 0.96) });
    page.drawRectangle({ x: 260, y: 315.5, width: 45, height: 24.5, color: green });
    const summaryLabels = ['Item diperiksa', 'Kondisi baik', 'Jumlah temuan', 'Tidak berlaku'];
    summaryLabels.forEach((label, i) => {
      const rowY = 334 - i * 6.12;
      write(label, 52, rowY, 5.2, 204, true);
      centered([checklist.length - na, baik, tidakBaik, na][i], 260, 45, rowY, 5.2, true);
    });

    // Samakan header dan isi tabel tindak lanjut dengan tabel checklist.
    const findingWidths = [24, 70, 125, 48, 105, 50, 60, 29];
    const findingHeads = ['No', 'Referensi Item', 'Uraian Temuan', 'Risiko', 'Tindakan Perbaikan', 'PIC', 'Target Selesai', 'Status'];
    page.drawRectangle({ x: 50, y: 295.5, width: 511, height: 14, color: rgb(0.78, 0.08, 0.13) });
    page.drawText('TINDAK LANJUT TEMUAN (PRIORITAS)', { x: 52, y: 299.5, size: 5.2, font: bold, color: white });
    tableX = 50;
    findingWidths.forEach((width, i) => {
      page.drawRectangle({ x: tableX, y: 283.5, width, height: 12.5, color: navy });
      centered(findingHeads[i], tableX, width, 287.5, 4.4, true, white); tableX += width;
    });
    page.drawRectangle({ x: 50, y: 199, width: 24, height: 85, color: white });
    page.drawRectangle({ x: 74, y: 199, width: 487, height: 85, color: yellow });

    const findings = (data.temuan ?? []).slice(0, 6);
    Array.from({ length: 6 }).forEach((_, i) => {
      const item = findings[i] ?? {};
      const y = 272 - i * 13.56;
      const values = [i + 1, item.referensi ?? '', item.uraian ?? '', item.risiko ?? '', item.tindakan ?? '', item.pic ?? '', item.target ?? '', item.status ?? ''];
      tableX = 50;
      values.forEach((value, column) => { centered(value, tableX, findingWidths[column], y, 4.7); tableX += findingWidths[column]; });
    });
    centered(data.kesimpulan ?? '', 52, 506, 172, 5.5);
    page.drawRectangle({ x: 76, y: 145, width: 56, height: 8, color: white });
    page.drawLine({ start: { x: 76, y: 144 }, end: { x: 132, y: 144 }, thickness: 0.5, color: ink });
    centered(data.inspektor ?? '', 76, 56, 147, 5.4, true);
    page.drawRectangle({ x: 350, y: 145, width: 56, height: 8, color: white });
    page.drawLine({ start: { x: 350, y: 144 }, end: { x: 406, y: 144 }, thickness: 0.5, color: ink });
    centered(data.pic ?? '', 350, 56, 147, 5.4, true);
    return Buffer.from(await pdf.save());
  }

  async p5m(data: any, project: ProjectInfo, photos: Express.Multer.File[]) {
    const preparedPhotos = await Promise.all(photos.slice(0, 4).map(async photo => {
      try { return await siapkanBufferGambarUntukPdfKit(photo.buffer); } catch { return null; }
    }));
    return this.document((doc) => {
      const margin = 22; const contentWidth = doc.page.width - margin * 2;
      const fit = (text: unknown, x: number, y: number, width: number, height: number, options: { bold?: boolean; size?: number; color?: string; align?: 'left'|'center'|'right' } = {}) => {
        const value = String(text || '-'); let size = options.size ?? 10; const align = options.align ?? 'left';
        doc.font(options.bold ? 'Helvetica-Bold' : 'Helvetica');
        while (size > 7 && doc.fontSize(size).heightOfString(value, { width, align, lineGap: 1 }) > height) size -= .5;
        doc.fontSize(size).fillColor(options.color ?? '#202631').text(value, x, y, { width, height, align, lineGap: 1, ellipsis: true });
      };
      const logo = this.logoPath();
      if (logo) { try { doc.image(logo, margin + 2, 20, { fit: [58, 58], align: 'center', valign: 'center' }); } catch { /* logo opsional */ } }
      doc.font('Helvetica-Bold').fontSize(15).fillColor('#147A70').text('SAFETY MEETING', margin + 72, 27, { width: contentWidth - 72 });
      doc.fontSize(24).fillColor('#111827').text('P5M', margin + 72, 52, { width: contentWidth - 72 });

      const formattedDate = new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(data.activityDate));
      const peopleText = (people: any[]) => (Array.isArray(people) ? people : [])
        .map((person: any, index: number) => `${index + 1}. ${person?.name || '-'} - ${person?.position || '-'}`)
        .join('\n') || '-';
      const info = [['Tanggal', formattedDate], ['Lokasi', data.location], ['Pemateri', peopleText(data.speakers)], ['Peserta', data.participants]];
      const infoY = 94; const rowHeight = 58; const half = contentWidth / 2; const labelWidth = 92;
      doc.lineWidth(.8).strokeColor('#C6D0D8').rect(margin, infoY, contentWidth, rowHeight * 2).stroke();
      doc.moveTo(margin + half, infoY).lineTo(margin + half, infoY + rowHeight * 2).stroke();
      doc.moveTo(margin, infoY + rowHeight).lineTo(margin + contentWidth, infoY + rowHeight).stroke();
      info.forEach(([label, value], index) => {
        const column = index % 2; const row = Math.floor(index / 2); const x = margin + column * half; const y = infoY + row * rowHeight;
        fit(label, x + 12, y + 13, labelWidth - 18, 18, { bold: true });
        fit(value, x + labelWidth, y + 13, half - labelWidth - 10, 20);
      });

      const numbered = (value: unknown) => {
        const lines = String(value ?? '').split(/\r?\n/).map(line => line.trim().replace(/^\d+\s*[.)-]\s*/, '').replace(/^[-•]\s*/, '')).filter(Boolean);
        return lines.length ? lines.map((line, i) => `${i + 1}. ${line}`).join('\n') : '-';
      };
      const section = (title: string, value: unknown, y: number, height: number) => {
        doc.font('Helvetica-Bold').fontSize(13).fillColor('#147A70').text(title, margin, y, { width: contentWidth });
        const boxY = y + 24; doc.lineWidth(.8).strokeColor('#C6D0D8').fillColor('#FAFBFC').rect(margin, boxY, contentWidth, height).fillAndStroke();
        fit(value, margin + 12, boxY + 12, contentWidth - 24, height - 24);
      };
      section('Materi', numbered(data.topic), 222, 78);
      section('Pengawas', peopleText(data.supervisors), 323, 82);

      doc.font('Helvetica-Bold').fontSize(13).fillColor('#147A70').text('Dokumentasi', margin, 428, { width: contentWidth });
      const gap = 12; const cardWidth = (contentWidth - gap) / 2; const cardHeight = 164; const startY = 455;
      if (!photos.length) {
        doc.lineWidth(.8).strokeColor('#C6D0D8').roundedRect(margin, startY, contentWidth, 105, 8).stroke();
        fit('Belum ada dokumentasi.', margin, startY + 44, contentWidth, 20, { color: '#718091', align: 'center', size: 9 });
      } else photos.slice(0, 4).forEach((_photo, index) => {
        const x = margin + (index % 2) * (cardWidth + gap); const y = startY + Math.floor(index / 2) * (cardHeight + 12);
        doc.lineWidth(.8).strokeColor('#C6D0D8').roundedRect(x, y, cardWidth, cardHeight, 8).stroke();
        fit(`Dokumentasi ${index + 1}`, x, y + 10, cardWidth, 18, { bold: true, color: '#4D5A68', align: 'center', size: 9 });
        const photo = preparedPhotos[index];
        if (photo) { try { doc.image(photo, x + 8, y + 30, { fit: [cardWidth - 16, 122], align: 'center', valign: 'center' }); }
        catch { fit('Gambar gagal dibaca.', x, y + 88, cardWidth, 18, { color: '#788697', align: 'center', size: 8 }); } }
        else fit('Gambar gagal dibaca.', x, y + 88, cardWidth, 18, { color: '#788697', align: 'center', size: 8 });
      });
    });
  }
}
