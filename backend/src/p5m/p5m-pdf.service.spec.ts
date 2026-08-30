import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { P5mService } from './p5m.service';
import { P5mPdfService } from './p5m-pdf.service';

const PNG_1X1_VALID = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

function dataFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    activityDate: new Date('2026-01-05'),
    location: 'Site A',
    speaker: 'Budi',
    participants: 'Semua Karyawan',
    topic: 'K3',
    supervisors: ['Budi', 'Siti'],
    documentationPaths: [],
    notes: null,
    ...overrides,
  };
}

function buatService(data: unknown) {
  const p5mService = { findOne: jest.fn().mockResolvedValue(data) } as unknown as P5mService;

  return new P5mPdfService(p5mService);
}

describe('P5mPdfService.generate', () => {
  let cwdAwal: string;
  let direktoriUji: string;

  beforeEach(() => {
    cwdAwal = process.cwd();
    direktoriUji = mkdtempSync(join(tmpdir(), 'p5m-pdf-'));
    mkdirSync(join(direktoriUji, 'uploads', 'signatures'), { recursive: true });
    process.chdir(direktoriUji);
  });

  afterEach(() => {
    process.chdir(cwdAwal);
    rmSync(direktoriUji, { recursive: true, force: true });
  });

  it('menghasilkan buffer PDF valid tanpa logo/dokumentasi', async () => {
    const service = buatService(dataFixture());

    const buffer = await service.generate(1);

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('tetap berhasil generate dengan logo perusahaan yang ada', async () => {
    writeFileSync(join(direktoriUji, 'uploads', 'signatures', 'PPA_cut.png'), PNG_1X1_VALID);
    const service = buatService(dataFixture());

    const buffer = await service.generate(1);

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('tetap berhasil generate dengan foto dokumentasi yang ada', async () => {
    mkdirSync(join(direktoriUji, 'uploads', 'p5m'), { recursive: true });
    writeFileSync(join(direktoriUji, 'uploads', 'p5m', 'foto.png'), PNG_1X1_VALID);
    const service = buatService(dataFixture({ documentationPaths: ['uploads/p5m/foto.png'] }));

    const buffer = await service.generate(1);

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('tetap berhasil generate walau path dokumentasi tidak ditemukan', async () => {
    const service = buatService(dataFixture({ documentationPaths: ['uploads/p5m/tidak-ada.png'] }));

    const buffer = await service.generate(1);

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });
});

describe('P5mPdfService — helper murni', () => {
  const service = buatService(dataFixture());

  describe('normalizeSupervisors', () => {
    it('menerima array string dan membuang entri kosong', () => {
      expect((service as any).normalizeSupervisors(['Budi', ' ', 'Siti'])).toEqual(['Budi', 'Siti']);
    });

    it('mem-parse string JSON array (data lama)', () => {
      expect((service as any).normalizeSupervisors(JSON.stringify(['Budi', 'Siti']))).toEqual(['Budi', 'Siti']);
    });

    it('fallback split koma kalau string bukan JSON valid', () => {
      expect((service as any).normalizeSupervisors('Budi, Siti')).toEqual(['Budi', 'Siti']);
    });

    it('mengembalikan array kosong untuk nilai lain (null/number/dst)', () => {
      expect((service as any).normalizeSupervisors(null)).toEqual([]);
      expect((service as any).normalizeSupervisors(123)).toEqual([]);
    });
  });

  describe('normalizeNumberedText', () => {
    it('mengembalikan "-" untuk teks kosong', () => {
      expect((service as any).normalizeNumberedText('')).toBe('-');
      expect((service as any).normalizeNumberedText(null)).toBe('-');
    });

    it('membuang penomoran/bullet lama lalu menomori ulang', () => {
      const input = '1. Pakai helm\n2) Pakai sepatu safety\n- Cek APD\n• Laporkan bahaya';

      const hasil = (service as any).normalizeNumberedText(input);

      expect(hasil).toBe('1. Pakai helm\n2. Pakai sepatu safety\n3. Cek APD\n4. Laporkan bahaya');
    });

    it('membuang baris kosong sebelum menomori', () => {
      const input = 'Item A\n\n   \nItem B';

      const hasil = (service as any).normalizeNumberedText(input);

      expect(hasil).toBe('1. Item A\n2. Item B');
    });
  });
});
