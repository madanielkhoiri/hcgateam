import { BadRequestException, Injectable } from '@nestjs/common';
import { PDFDocument, PDFImage, StandardFonts, degrees, rgb } from 'pdf-lib';
import sharp from 'sharp';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { randomUUID } from 'node:crypto';
import { basename, extname, join, parse } from 'node:path';
import { EpromFileService } from '../common/eprom-file.service';

export type PosisiTandaTangan = {
  signatureFile: string;
  signaturePage: number;
  signatureXRatio: number;
  signatureYRatio: number;
  signatureWidthRatio: number;
  signatureHeightRatio: number;
};
export type AnotasiCoretan = { page: number; color: string; width: number; points: string };
export type AnotasiTeks = { page: number; text: string; x: number; y: number; rotation: number; size: number };

const BUKAN_TANDA_TANGAN = new Set([
  'bg-transparan.png',
  'footer.png',
  'header.png',
  'logo-ppa-official.png',
  'logo ppa official.png',
  'logo-ppa.png',
  'ppa_cut.png',
]);

const EKSTENSI_TANDA_TANGAN = new Set(['.png', '.jpg', '.jpeg']);

@Injectable()
export class EpromEngineerSigningService {
  private readonly signatureDir = join(process.cwd(), 'uploads', 'signatures');

  constructor(private readonly file: EpromFileService) {}

  async buatPdfReview(sourceFilePath: string, annotations: AnotasiCoretan[] = [], textAnnotations: AnotasiTeks[] = [], scope: string): Promise<string> {
    const sourcePath = this.file.resolveAbsolut(sourceFilePath);
    const pdf = await PDFDocument.load(readFileSync(sourcePath));
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    for (const anotasi of annotations) {
      const page = pdf.getPages()[anotasi.page - 1]; if (!page) continue;
      const { width, height } = page.getSize(); const values = anotasi.points.trim().split(/\s+/).map((p) => p.split(',').map(Number));
      const hex = anotasi.color.replace('#', ''); const color = hex.length === 6 ? rgb(parseInt(hex.slice(0,2),16)/255, parseInt(hex.slice(2,4),16)/255, parseInt(hex.slice(4,6),16)/255) : rgb(0.9,0.1,0.1);
      for (let i = 1; i < values.length; i++) { const [x1,y1]=values[i-1]; const [x2,y2]=values[i]; page.drawLine({start:{x:x1/100*width,y:height-y1/100*height},end:{x:x2/100*width,y:height-y2/100*height},thickness:Math.max(1,anotasi.width*3),color,opacity:anotasi.width>=1?.35:1}); }
    }
    for (const anotasi of textAnnotations) { const page=pdf.getPages()[anotasi.page-1]; if(!page||!anotasi.text?.trim()) continue; const {width,height}=page.getSize(); page.drawText(anotasi.text,{x:anotasi.x*width,y:height-anotasi.y*height,size:Math.max(6,Math.min(72,anotasi.size)),font,rotate:degrees(anotasi.rotation),color:rgb(.05,.05,.05)}); }
    const targetDir=join(process.cwd(),'uploads','eprom',scope,'reviewed'); mkdirSync(targetDir,{recursive:true}); const targetName=`review-${Date.now()}-${randomUUID()}.pdf`; writeFileSync(join(targetDir,targetName),await pdf.save()); return `eprom/${scope}/reviewed/${targetName}`;
  }

  daftarTandaTangan() {
    if (!existsSync(this.signatureDir)) {
      return [];
    }

    return readdirSync(this.signatureDir, { withFileTypes: true })
      .filter(
        (entry) =>
          entry.isFile() &&
          EKSTENSI_TANDA_TANGAN.has(extname(entry.name).toLowerCase()) &&
          !BUKAN_TANDA_TANGAN.has(entry.name.toLowerCase()),
      )
      .map((entry) => ({
        filename: entry.name,
        name: parse(entry.name)
          .name.replace(/^ttd[-_\s]*/i, '')
          .split(/[-_\s]+/)
          .filter(Boolean)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),
        path: `signatures/${entry.name}`,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async buatPdfSigned(
    sourceFilePath: string,
    placements: PosisiTandaTangan[],
    scope: string,
    tanggalApproval: Date = new Date(),
    annotations: AnotasiCoretan[] = [],
    textAnnotations: AnotasiTeks[] = [],
    revision = 1,
  ): Promise<string> {
    if (placements.length < 1) {
      throw new BadRequestException('Minimal satu tanda tangan diperlukan.');
    }

    placements.forEach((posisi) => this.validasiPosisi(posisi));

    if (extname(sourceFilePath).toLowerCase() !== '.pdf') {
      throw new BadRequestException(
        'Tanda tangan hanya dapat ditempatkan pada dokumen PDF.',
      );
    }

    const signatureTersedia = new Set(
      this.daftarTandaTangan().map((item) => item.filename),
    );
    const namaTandaTangan = new Set<string>();

    for (const posisi of placements) {
      const namaFile = basename(posisi.signatureFile);
      if (
        namaFile !== posisi.signatureFile ||
        !EKSTENSI_TANDA_TANGAN.has(extname(namaFile).toLowerCase()) ||
        !signatureTersedia.has(namaFile)
      ) {
        throw new BadRequestException('File tanda tangan tidak valid.');
      }
      namaTandaTangan.add(namaFile);
    }

    try {
      const sourcePath = this.file.resolveAbsolut(sourceFilePath);
      const pdf = await PDFDocument.load(readFileSync(sourcePath));
      const pages = pdf.getPages();

      for (const posisi of placements) {
        if (posisi.signaturePage > pages.length) {
          throw new BadRequestException(
            `Halaman tanda tangan ${posisi.signaturePage} tidak tersedia pada PDF.`,
          );
        }
      }

      for (const anotasi of annotations) {
        const page = pages[anotasi.page - 1];
        if (!page) continue;
        const { width: pageWidth, height: pageHeight } = page.getSize();
        const values = anotasi.points.trim().split(/\s+/).map((point) => point.split(',').map(Number));
        const hex = anotasi.color.replace('#', '');
        const color = hex.length === 6 ? rgb(parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255) : rgb(0.9, 0.1, 0.1);
        for (let index = 1; index < values.length; index += 1) {
          const [x1, y1] = values[index - 1];
          const [x2, y2] = values[index];
          if (![x1, y1, x2, y2].every(Number.isFinite)) continue;
          page.drawLine({ start: { x: (x1 / 100) * pageWidth, y: pageHeight - (y1 / 100) * pageHeight }, end: { x: (x2 / 100) * pageWidth, y: pageHeight - (y2 / 100) * pageHeight }, thickness: Math.max(1, anotasi.width * 3), color, opacity: anotasi.width >= 1 ? 0.35 : 1 });
        }
      }
      const font = await pdf.embedFont(StandardFonts.Helvetica);
      for (const anotasi of textAnnotations) {
        const target = pages[anotasi.page - 1];
        if (!target || !anotasi.text?.trim()) continue;
        const { width: pageWidth, height: pageHeight } = target.getSize();
        target.drawText(anotasi.text, { x: anotasi.x * pageWidth, y: pageHeight - anotasi.y * pageHeight, size: Math.max(6, Math.min(72, anotasi.size)), font, rotate: degrees(anotasi.rotation), color: rgb(0.05, 0.05, 0.05) });
      }

      const teksTanggal = `Disetujui: ${tanggalApproval.toLocaleDateString('id-ID', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      })}`;
      const ukuranFontTanggal = 8;
      const teksRevisi = `Revisi ${revision}`;

      const gambarTandaTangan = new Map<string, PDFImage>();
      for (const namaFile of namaTandaTangan) {
        const signaturePath = join(this.signatureDir, namaFile);
        if (!existsSync(signaturePath)) {
          throw new BadRequestException('File tanda tangan tidak ditemukan.');
        }
        const ekstensi = extname(namaFile).toLowerCase();
        const sourceGambar = readFileSync(signaturePath);
        const gambarSiap = await this.tingkatkanResolusi(
          sourceGambar,
          ekstensi,
        );
        gambarTandaTangan.set(
          namaFile,
          ekstensi === '.png'
            ? await pdf.embedPng(gambarSiap)
            : await pdf.embedJpg(gambarSiap),
        );
      }

      for (const posisi of placements) {
        const page = pages[posisi.signaturePage - 1];
        const gambar = gambarTandaTangan.get(posisi.signatureFile);
        if (!gambar) {
          throw new BadRequestException('File tanda tangan tidak ditemukan.');
        }
        const { width: pageWidth, height: pageHeight } = page.getSize();
        const boxWidth = posisi.signatureWidthRatio * pageWidth;
        const boxHeight = posisi.signatureHeightRatio * pageHeight;
        const imageRatio = gambar.width / gambar.height;
        const boxRatio = boxWidth / boxHeight;
        const width = boxRatio > imageRatio ? boxHeight * imageRatio : boxWidth;
        const height =
          boxRatio > imageRatio ? boxHeight : boxWidth / imageRatio;
        const boxX = posisi.signatureXRatio * pageWidth;
        const boxY =
          pageHeight - posisi.signatureYRatio * pageHeight - boxHeight;

        page.drawImage(gambar, {
          // Sama dengan object-fit: contain pada preview frontend.
          x: boxX + (boxWidth - width) / 2,
          y: boxY + (boxHeight - height) / 2,
          width,
          height,
        });

        // Tanggal approval dicetak kecil, rata tengah, tepat di bawah kotak tanda tangan.
        const lebarTeksTanggal = font.widthOfTextAtSize(
          teksTanggal,
          ukuranFontTanggal,
        );
        page.drawText(teksTanggal, {
          x: boxX + (boxWidth - lebarTeksTanggal) / 2,
          y: Math.max(4, boxY - ukuranFontTanggal - 2),
          size: ukuranFontTanggal,
          font,
        });
        page.drawText(teksRevisi, { x: boxX + (boxWidth - font.widthOfTextAtSize(teksRevisi, ukuranFontTanggal)) / 2, y: Math.max(4, boxY - ukuranFontTanggal * 2 - 4), size: ukuranFontTanggal, font });
      }

      const targetDir = join(
        process.cwd(),
        'uploads',
        'eprom',
        scope,
        'signed',
      );
      mkdirSync(targetDir, { recursive: true });

      const sourceName = parse(sourceFilePath).name.replace(
        /-signed(?:-[^.]+)?$/i,
        '',
      );
      const targetName = `${sourceName}-signed-${Date.now()}-${randomUUID()}.pdf`;
      const targetPath = join(targetDir, targetName);
      writeFileSync(targetPath, await pdf.save());

      return `eprom/${scope}/signed/${targetName}`;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        'PDF tidak dapat diproses. Pastikan file PDF tidak rusak atau terenkripsi.',
      );
    }
  }

  private async tingkatkanResolusi(
    source: Buffer,
    ekstensi: string,
  ): Promise<Buffer> {
    const metadata = await sharp(source).metadata();
    const width = metadata.width ?? 0;
    const height = metadata.height ?? 0;
    const sisiTerpanjang = Math.max(width, height);

    if (!width || !height || sisiTerpanjang >= 1200) {
      return source;
    }

    const scale = Math.min(8, 1200 / sisiTerpanjang);
    const gambar = sharp(source)
      .resize({
        width: Math.round(width * scale),
        height: Math.round(height * scale),
        fit: 'fill',
        kernel: sharp.kernel.lanczos3,
      })
      .sharpen({ sigma: 0.8 });

    return ekstensi === '.png'
      ? gambar.png({ compressionLevel: 6 }).toBuffer()
      : gambar.jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toBuffer();
  }

  private validasiPosisi(posisi: PosisiTandaTangan): void {
    const nilai = [
      posisi.signatureXRatio,
      posisi.signatureYRatio,
      posisi.signatureWidthRatio,
      posisi.signatureHeightRatio,
    ];

    if (
      !Number.isInteger(posisi.signaturePage) ||
      posisi.signaturePage < 1 ||
      nilai.some((item) => !Number.isFinite(item)) ||
      posisi.signatureXRatio < 0 ||
      posisi.signatureYRatio < 0 ||
      posisi.signatureWidthRatio <= 0 ||
      posisi.signatureHeightRatio <= 0 ||
      posisi.signatureXRatio + posisi.signatureWidthRatio > 1 ||
      posisi.signatureYRatio + posisi.signatureHeightRatio > 1
    ) {
      throw new BadRequestException('Posisi tanda tangan tidak valid.');
    }
  }
}


