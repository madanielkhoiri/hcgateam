import { NotFoundException } from '@nestjs/common';
import { Writable } from 'node:stream';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PrismaService } from '../prisma/prisma.service';
import { HandoverPdfService } from './handover-pdf.service';

// PNG 1x1 pixel valid (dikenali pdfkit lewat magic bytes, terlepas dari ekstensi file).
const PNG_1X1_VALID = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

class FakeResponse extends Writable {
  headers: Record<string, string> = {};
  chunks: Buffer[] = [];

  setHeader(name: string, value: string) {
    this.headers[name] = value;
  }

  _write(chunk: Buffer, _encoding: string, callback: (error?: Error | null) => void) {
    this.chunks.push(chunk);
    callback();
  }

  buffer() {
    return Buffer.concat(this.chunks);
  }
}

function handoverFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    stpNumber: 'STP-001',
    handoverDate: new Date('2026-01-05'),
    receiverName: 'Siti',
    receiverPosition: 'Staff',
    receiverDepartment: 'HC',
    location: 'Site A',
    handoverNote: null,
    documentationPaths: [],
    workOrder: { id: 1, workOrderNumber: 'WO-001', workOrderName: 'Perbaikan AC', userDepartmentName: 'Siti', position: 'Staff', department: 'HC' },
    creator: { id: 9, name: 'Budi', username: 'budi' },
    ...overrides,
  };
}

function buatService(overrides: { handover?: unknown } = {}) {
  const prisma = {
    handover: {
      findUnique: jest.fn().mockResolvedValue('handover' in overrides ? overrides.handover : handoverFixture()),
    },
  } as unknown as PrismaService;

  return { service: new HandoverPdfService(prisma), prisma };
}

function tunggu(target: FakeResponse): Promise<void> {
  return new Promise((resolve, reject) => {
    target.on('finish', () => resolve());
    target.on('error', reject);
  });
}

describe('HandoverPdfService.streamPdf', () => {
  let cwdAwal: string;
  let direktoriUji: string;

  beforeEach(() => {
    cwdAwal = process.cwd();
    direktoriUji = mkdtempSync(join(tmpdir(), 'handover-pdf-'));
    mkdirSync(join(direktoriUji, 'uploads', 'handovers'), { recursive: true });
    mkdirSync(join(direktoriUji, 'uploads', 'work-orders'), { recursive: true });
    mkdirSync(join(direktoriUji, 'uploads', 'signatures'), { recursive: true });
    process.chdir(direktoriUji);
  });

  afterEach(() => {
    process.chdir(cwdAwal);
    rmSync(direktoriUji, { recursive: true, force: true });
  });

  it('melempar NotFoundException kalau data tidak ada', async () => {
    const { service } = buatService({ handover: null });
    const response = new FakeResponse();

    await expect(service.streamPdf(1, response as any)).rejects.toThrow(NotFoundException);
  });

  it('mengatur header Content-Type dan Content-Disposition dengan nama file aman', async () => {
    const { service } = buatService();
    const response = new FakeResponse();

    await service.streamPdf(1, response as any);
    await tunggu(response);

    expect(response.headers['Content-Type']).toBe('application/pdf');
    expect(response.headers['Content-Disposition']).toContain('Serah Terima STP-001.pdf');
  });

  it('menghasilkan output PDF yang valid tanpa lampiran', async () => {
    const { service } = buatService();
    const response = new FakeResponse();

    await service.streamPdf(1, response as any);
    await tunggu(response);

    expect(response.buffer().subarray(0, 4).toString()).toBe('%PDF');
  });

  it('tetap berhasil generate walau documentationPaths menunjuk file yang tidak ada', async () => {
    const { service } = buatService({
      handover: handoverFixture({ documentationPaths: ['tidak-ada.jpg', 'tidak-ada-juga.png'] }),
    });
    const response = new FakeResponse();

    await service.streamPdf(1, response as any);
    await tunggu(response);

    expect(response.buffer().subarray(0, 4).toString()).toBe('%PDF');
  });

  it('menyertakan lampiran gambar JPG/PNG yang benar-benar ada tanpa perlu konversi', async () => {
    writeFileSync(join(direktoriUji, 'uploads', 'handovers', 'foto.jpg'), PNG_1X1_VALID);
    const { service } = buatService({ handover: handoverFixture({ documentationPaths: ['foto.jpg'] }) });
    const response = new FakeResponse();

    await service.streamPdf(1, response as any);
    await tunggu(response);

    expect(response.buffer().subarray(0, 4).toString()).toBe('%PDF');
  });

  it('deduplikasi path lampiran yang sama tidak menyebabkan error', async () => {
    writeFileSync(join(direktoriUji, 'uploads', 'handovers', 'foto.jpg'), PNG_1X1_VALID);
    const { service } = buatService({ handover: handoverFixture({ documentationPaths: ['foto.jpg', 'foto.jpg'] }) });
    const response = new FakeResponse();

    await service.streamPdf(1, response as any);
    await tunggu(response);

    expect(response.buffer().length).toBeGreaterThan(0);
  });
});

describe('HandoverPdfService — helper murni', () => {
  const { service } = buatService();

  it('safeFilename mengganti karakter terlarang jadi tanda hubung', () => {
    const hasil = (service as any).safeFilename('Serah Terima STP/001:2026*.pdf');

    expect(hasil).toBe('Serah Terima STP-001-2026-.pdf');
  });

  it('formatLongDate memformat tanggal ke Bahasa Indonesia (UTC)', () => {
    const hasil = (service as any).formatLongDate(new Date('2026-01-05T00:00:00Z'));

    expect(hasil).toMatch(/Januari/);
    expect(hasil).toMatch(/2026/);
  });

  it('firstExisting mengembalikan path pertama yang benar-benar ada, atau null', () => {
    const direktoriUji = mkdtempSync(join(tmpdir(), 'handover-first-existing-'));
    const filePath = join(direktoriUji, 'ada.txt');
    writeFileSync(filePath, 'x');

    try {
      expect((service as any).firstExisting([join(direktoriUji, 'tidak-ada.txt'), filePath])).toBe(filePath);
      expect((service as any).firstExisting([join(direktoriUji, 'tidak-ada.txt')])).toBeNull();
    } finally {
      rmSync(direktoriUji, { recursive: true, force: true });
    }
  });
});
