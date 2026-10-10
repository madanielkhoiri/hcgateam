import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

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

  private async document(build: (doc: PDFKit.PDFDocument) => void): Promise<Buffer> {
    return new Promise((resolveBuffer, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 32, bufferPages: true });
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
    if (logo) doc.image(logo, 34, 26, { fit: [58, 42] });
    doc.font('Helvetica-Bold').fontSize(13).fillColor('#142b4f').text(title, 105, 35, { align: 'center', width: 420 });
    doc.moveTo(32, 76).lineTo(563, 76).lineWidth(2).strokeColor('#d51f26').stroke();
    doc.y = 86;
  }

  private section(doc: PDFKit.PDFDocument, title: string) {
    doc.moveDown(0.5).font('Helvetica-Bold').fontSize(9).fillColor('#ffffff');
    const y = doc.y;
    doc.rect(32, y, 531, 17).fill('#b32025');
    doc.text(title, 38, y + 4, { width: 519 });
    doc.y = y + 22;
  }

  private field(doc: PDFKit.PDFDocument, label: string, value: unknown) {
    const y = doc.y;
    doc.font('Helvetica-Bold').fontSize(8).fillColor('#243b5a').text(label, 38, y, { width: 120 });
    doc.font('Helvetica').text(String(value ?? '-'), 160, y, { width: 395 });
    doc.moveTo(32, y + 12).lineTo(563, y + 12).lineWidth(0.4).strokeColor('#dce4ed').stroke();
    doc.y = y + 15;
  }

  async daily(data: any, project: ProjectInfo, photos: Express.Multer.File[]) {
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
      for (const row of data.staff ?? []) this.field(doc, row.jabatan || 'Jabatan', row.nama || '-');
      this.section(doc, 'LAPORAN PEKERJAAN & DOKUMENTASI');
      const docs = data.dokumentasi ?? [];
      docs.forEach((item: any, index: number) => {
        if (doc.y > 690) doc.addPage();
        const x = 35 + (index % 3) * 176;
        if (index % 3 === 0 && index > 0) doc.y += 150;
        const y = doc.y;
        doc.rect(x, y, 166, 18).fill('#a83b3d');
        doc.font('Helvetica-Bold').fontSize(7).fillColor('#fff').text(item.tim || 'Tim', x + 3, y + 5, { width: 160, align: 'center' });
        const photo = photos[index];
        if (photo?.buffer?.length) {
          try { doc.image(photo.buffer, x, y + 18, { fit: [166, 105], align: 'center', valign: 'center' }); } catch { /* file non-gambar */ }
        }
        doc.rect(x, y + 18, 166, 105).strokeColor('#d8e0e8').stroke();
        doc.rect(x, y + 123, 166, 20).fill('#b84b4d');
        doc.font('Helvetica').fontSize(6.5).fillColor('#fff').text(item.pekerjaan || '-', x + 4, y + 128, { width: 158, align: 'center' });
      });
    });
  }

  async inspection(data: any, project: ProjectInfo) {
    return this.document((doc) => {
      this.header(doc, 'FORM INSPEKSI LINGKUNGAN KERJA');
      this.section(doc, 'INFORMASI INSPEKSI');
      this.field(doc, 'Proyek / Area', project.namaProject);
      this.field(doc, 'Perusahaan / Vendor', project.kontrak.vendor.namaVendor);
      this.field(doc, 'Tanggal', data.tanggal);
      this.field(doc, 'Inspektor', data.inspektor);
      this.field(doc, 'Pendamping / PIC', data.pic);
      this.field(doc, 'Shift / Jam', data.shiftJam);
      this.section(doc, 'CHECKLIST KONDISI LINGKUNGAN KERJA');
      const widths = [20, 82, 210, 55, 110, 54];
      const heads = ['No', 'Kategori', 'Item Pemeriksaan', 'Hasil', 'Temuan / Keterangan', 'Risiko'];
      let y = doc.y;
      let x = 32;
      heads.forEach((h, i) => { doc.rect(x, y, widths[i], 18).fill('#7f2b2e'); doc.font('Helvetica-Bold').fontSize(6).fillColor('#fff').text(h, x + 2, y + 5, { width: widths[i] - 4, align: 'center' }); x += widths[i]; });
      y += 18;
      (data.checklist ?? []).forEach((row: any, i: number) => {
        if (y > 760) { doc.addPage(); y = 35; }
        x = 32; const values = [i + 1, CHECKLIST[i]?.[0] ?? '', CHECKLIST[i]?.[1] ?? '', row.hasil, row.temuan, row.risiko];
        values.forEach((v, j) => { doc.rect(x, y, widths[j], 25).strokeColor('#ccd6e1').stroke(); doc.font('Helvetica').fontSize(5.7).fillColor('#263d5b').text(String(v ?? ''), x + 2, y + 4, { width: widths[j] - 4, height: 19 }); x += widths[j]; });
        y += 25;
      });
      doc.y = y + 4;
      this.section(doc, 'TINDAK LANJUT TEMUAN (PRIORITAS)');
      (data.temuan ?? []).forEach((item: any, index: number) => this.field(doc, `${index + 1}. ${item.referensi || 'Temuan'}`, `${item.uraian || '-'} | Risiko: ${item.risiko || '-'} | Tindakan: ${item.tindakan || '-'} | PIC: ${item.pic || '-'} | Target: ${item.target || '-'} | Status: ${item.status || '-'}`));
      this.section(doc, 'KESIMPULAN & PERSETUJUAN');
      this.field(doc, 'Kesimpulan', data.kesimpulan);
      this.field(doc, 'Inspektor', data.inspektor);
      this.field(doc, 'PIC Area / Vendor', data.pic);
    });
  }

  async p5m(data: any, project: ProjectInfo, photos: Express.Multer.File[]) {
    return this.document((doc) => {
      this.header(doc, `P5M - ${project.namaProject.toUpperCase()}`);
      this.section(doc, 'INFORMASI P5M');
      this.field(doc, 'Kontraktor', project.kontrak.vendor.namaVendor);
      this.field(doc, 'Tanggal', data.activityDate);
      this.field(doc, 'Lokasi', data.location);
      this.field(doc, 'Pemateri', data.speaker);
      this.field(doc, 'Pengawas', data.supervisor);
      this.field(doc, 'Peserta', data.participants);
      this.section(doc, 'MATERI');
      doc.font('Helvetica').fontSize(9).fillColor('#243b5a').text(data.topic || '-', 38, doc.y, { width: 517 });
      this.section(doc, 'CATATAN');
      doc.font('Helvetica').fontSize(9).fillColor('#243b5a').text(data.notes || '-', 38, doc.y, { width: 517 });
      this.section(doc, 'DOKUMENTASI');
      photos.slice(0, 4).forEach((photo, index) => {
        const x = 38 + (index % 2) * 258;
        const y = doc.y + Math.floor(index / 2) * 150;
        try { doc.image(photo.buffer, x, y, { fit: [245, 140], align: 'center', valign: 'center' }); } catch { /* abaikan gambar rusak */ }
        doc.rect(x, y, 245, 140).strokeColor('#ccd6e1').stroke();
      });
    });
  }
}
