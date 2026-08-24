import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { EpromFileService } from '../common/eprom-file.service';
import { EpromEngineerSigningService } from './eprom-engineer-signing.service';

describe('EpromEngineerSigningService', () => {
  let direktoriUji: string;
  let cwdAwal: string;

  beforeEach(() => {
    cwdAwal = process.cwd();
    direktoriUji = mkdtempSync(join(tmpdir(), 'eprom-multi-signature-'));
    mkdirSync(join(direktoriUji, 'uploads', 'signatures'), {
      recursive: true,
    });
    process.chdir(direktoriUji);
  });

  afterEach(() => {
    process.chdir(cwdAwal);
    rmSync(direktoriUji, { recursive: true, force: true });
  });

  it('menempelkan lebih dari 100 tanda tangan pada halaman yang sama dan berbeda', async () => {
    const pngSatuPiksel = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 4,
        background: { r: 20, g: 30, b: 120, alpha: 1 },
      },
    })
      .png()
      .toBuffer();
    writeFileSync(
      join(direktoriUji, 'uploads', 'signatures', 'ttd-test.png'),
      pngSatuPiksel,
    );
    const jpegAngga = await sharp(pngSatuPiksel).jpeg({ quality: 95 }).toBuffer();
    writeFileSync(
      join(direktoriUji, 'uploads', 'signatures', 'TTD-Angga.jpeg'),
      jpegAngga,
    );

    const sumber = await PDFDocument.create();
    sumber.addPage([600, 800]);
    sumber.addPage([600, 800]);
    sumber.addPage([600, 800]);
    const sumberBytes = await sumber.save();
    writeFileSync(join(direktoriUji, 'uploads', 'source.pdf'), sumberBytes);

    const file = {
      resolveAbsolut: (relativePath: string) =>
        join(direktoriUji, 'uploads', relativePath),
    } as EpromFileService;
    const service = new EpromEngineerSigningService(file);
    const placements = [
      {
        signatureFile: 'TTD-Angga.jpeg',
        signaturePage: 1,
        signatureXRatio: 0.1,
        signatureYRatio: 0.1,
        signatureWidthRatio: 0.2,
        signatureHeightRatio: 0.1,
      },
      {
        signatureFile: 'ttd-test.png',
        signaturePage: 1,
        signatureXRatio: 0.6,
        signatureYRatio: 0.7,
        signatureWidthRatio: 0.2,
        signatureHeightRatio: 0.1,
      },
      {
        signatureFile: 'ttd-test.png',
        signaturePage: 3,
        signatureXRatio: 0.4,
        signatureYRatio: 0.4,
        signatureWidthRatio: 0.25,
        signatureHeightRatio: 0.12,
      },
      ...Array.from({ length: 120 }, () => ({
        signatureFile: 'ttd-test.png',
        signaturePage: 2,
        signatureXRatio: 0.45,
        signatureYRatio: 0.45,
        signatureWidthRatio: 0.1,
        signatureHeightRatio: 0.05,
      })),
    ];
    const hasil = await service.buatPdfSigned(
      'source.pdf',
      placements,
      'smoke',
    );

    const hasilBytes = readFileSync(join(direktoriUji, 'uploads', hasil));
    const pdfHasil = await PDFDocument.load(hasilBytes);
    const pilihan = service.daftarTandaTangan();

    expect(pdfHasil.getPageCount()).toBe(3);
    expect(pilihan).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ filename: 'TTD-Angga.jpeg', name: 'Angga' }),
      ]),
    );
    expect(placements).toHaveLength(123);
    expect(hasilBytes.length).toBeGreaterThan(sumberBytes.length);
  });
});
