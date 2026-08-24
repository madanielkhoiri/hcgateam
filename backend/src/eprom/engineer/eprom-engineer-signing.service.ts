import { BadRequestException, Injectable } from '@nestjs/common';
import { PDFDocument, PDFImage } from 'pdf-lib';
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
