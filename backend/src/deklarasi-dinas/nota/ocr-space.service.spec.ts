import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { OcrSpaceService } from './ocr-space.service';

const envAsli = process.env.OCR_SPACE_API_KEY;
let direktoriUji: string;
let filePath: string;
let fetchAsli: typeof fetch;

function mockFetchJson(payload: unknown, ok = true) {
  (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
    ok,
    json: async () => payload,
  });
}

function buatService() {
  process.env.OCR_SPACE_API_KEY = 'test-key';
  return new OcrSpaceService();
}

function hasilOcr(parsedText: string, lines?: unknown[]) {
  return {
    ParsedResults: [
      {
        ParsedText: parsedText,
        TextOverlay: lines ? { Lines: lines, HasOverlay: true } : undefined,
      },
    ],
    OCRExitCode: 1,
    IsErroredOnProcessing: false,
  };
}

beforeEach(() => {
  direktoriUji = mkdtempSync(join(tmpdir(), 'ocr-nota-'));
  filePath = join(direktoriUji, 'nota.jpg');
  writeFileSync(filePath, Buffer.from('dummy'));
  fetchAsli = global.fetch;
});

afterEach(() => {
  rmSync(direktoriUji, { recursive: true, force: true });
  global.fetch = fetchAsli;
  if (envAsli !== undefined) {
    process.env.OCR_SPACE_API_KEY = envAsli;
  } else {
    delete process.env.OCR_SPACE_API_KEY;
  }
});

describe('OcrSpaceService.bacaNota — gating awal', () => {
  it('mengembalikan pesan info tanpa fetch kalau API key belum diisi', async () => {
    delete process.env.OCR_SPACE_API_KEY;
    const service = new OcrSpaceService();
    global.fetch = jest.fn();

    const hasil = await service.bacaNota(filePath);

    expect(hasil.nominal_ocr).toBe(0);
    expect(hasil.hasil_ocr_text).toMatch(/belum aktif/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('mengembalikan pesan gagal tanpa fetch kalau file tidak ditemukan', async () => {
    const service = buatService();
    global.fetch = jest.fn();

    const hasil = await service.bacaNota(join(direktoriUji, 'tidak-ada.jpg'));

    expect(hasil.nominal_ocr).toBe(0);
    expect(hasil.hasil_ocr_text).toMatch(/tidak ditemukan/);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('mengembalikan pesan error kalau response tidak ok', async () => {
    const service = buatService();
    mockFetchJson({ ErrorMessage: 'Unauthorized' }, false);

    const hasil = await service.bacaNota(filePath);

    expect(hasil.nominal_ocr).toBe(0);
    expect(hasil.hasil_ocr_text).toBe('Unauthorized');
  });

  it('menggabungkan ErrorMessage array dengan koma', async () => {
    const service = buatService();
    mockFetchJson({ IsErroredOnProcessing: true, ErrorMessage: ['Error A', 'Error B'] });

    const hasil = await service.bacaNota(filePath);

    expect(hasil.hasil_ocr_text).toBe('Error A, Error B');
  });
});

describe('OcrSpaceService.bacaNota — ekstraksi nominal dari teks fallback', () => {
  it('mengambil angka setelah label TOTAL biasa', async () => {
    const service = buatService();
    mockFetchJson(hasilOcr('Belanja Toko\nTOTAL Rp 150.000\nTerima kasih'));

    const hasil = await service.bacaNota(filePath);

    expect(hasil.nominal_ocr).toBe(150000);
  });

  it('tidak salah ambil dari SUBTOTAL / TOTAL HARGA, tetap pilih TOTAL final', async () => {
    const service = buatService();
    mockFetchJson(hasilOcr('SUBTOTAL Rp 90.000\nTOTAL HARGA Rp 95.000\nTOTAL Rp 100.000'));

    const hasil = await service.bacaNota(filePath);

    expect(hasil.nominal_ocr).toBe(100000);
  });

  it('memilih kandidat GRAND TOTAL yang punya pasangan kembalian (bukan angka tunai terbesar)', async () => {
    const service = buatService();
    mockFetchJson(hasilOcr('GRAND TOTAL Rp 250.000 Rp 300.000 Rp 50.000'));

    const hasil = await service.bacaNota(filePath);

    expect(hasil.nominal_ocr).toBe(250000);
  });

  it('mengenali format ribuan pakai titik (150.000 = seratus lima puluh ribu)', async () => {
    const service = buatService();
    mockFetchJson(hasilOcr('JUMLAH TAGIHAN: Rp1.250.000'));

    const hasil = await service.bacaNota(filePath);

    expect(hasil.nominal_ocr).toBe(1250000);
  });

  it('mengenali format desimal koma sebagai sen (150.000,50 dibulatkan)', async () => {
    const service = buatService();
    mockFetchJson(hasilOcr('TOTAL Rp 150.000,50'));

    const hasil = await service.bacaNota(filePath);

    expect(hasil.nominal_ocr).toBe(150001);
  });

  it('kalau tidak ada label sama sekali, fallback ke angka terbesar yang masuk akal (bukan tanggal/telepon)', async () => {
    const service = buatService();
    mockFetchJson(hasilOcr('Tanggal 05/01/2026\nTelp 081234567890\nBiaya makan siang 75.000'));

    const hasil = await service.bacaNota(filePath);

    expect(hasil.nominal_ocr).toBe(75000);
  });

  it('mengembalikan 0 kalau tidak ada nominal yang masuk akal ditemukan', async () => {
    const service = buatService();
    mockFetchJson(hasilOcr('Tanggal 05/01/2026\nTelp 081234567890'));

    const hasil = await service.bacaNota(filePath);

    expect(hasil.nominal_ocr).toBe(0);
  });
});

describe('OcrSpaceService.bacaNota — aturan khusus Pertamina/SPBU', () => {
  it('mengonversi format koma SPBU (250,00 berarti Rp 250.000) dan diprioritaskan sebelum logika umum', async () => {
    const service = buatService();
    mockFetchJson(hasilOcr('SPBU PERTAMINA\nPERTAMAX\nTOTAL Rp 250,00\nTUNAI Rp 300,00\nKEMBALI Rp 50,00'));

    const hasil = await service.bacaNota(filePath);

    expect(hasil.nominal_ocr).toBe(250000);
  });

  it('fallback ke nominal setelah TUNAI kalau tidak ada TOTAL pada nota SPBU', async () => {
    const service = buatService();
    mockFetchJson(hasilOcr('SPBU PERTAMINA\nSOLAR\nTUNAI Rp 100,00'));

    const hasil = await service.bacaNota(filePath);

    expect(hasil.nominal_ocr).toBe(100000);
  });

  it('nota non-SPBU tidak terpengaruh aturan koma-sebagai-ribuan', async () => {
    const service = buatService();
    mockFetchJson(hasilOcr('Toko Kelontong\nTOTAL Rp 250,00'));

    const hasil = await service.bacaNota(filePath);

    // Tanpa konteks SPBU, "250,00" dianggap desimal biasa (Rp 250) — di bawah ambang
    // batas minimal (Rp 1.000) sehingga tidak dianggap nominal nota yang valid.
    expect(hasil.nominal_ocr).toBe(0);
  });
});

describe('OcrSpaceService.bacaNota — ekstraksi dari layout overlay (posisi baris)', () => {
  function baris(teks: string, top: number) {
    return { LineText: teks, MinTop: top, Words: [{ WordText: teks, Left: 0, Top: top, Width: 50, Height: 10 }] };
  }

  it('mengambil nominal dari baris TERPISAH tepat di bawah label TOTAL', async () => {
    const service = buatService();
    mockFetchJson(
      hasilOcr('Toko ABC\nTOTAL\n120.000', [
        baris('Toko ABC', 0),
        baris('TOTAL', 10),
        baris('120.000', 20),
      ]),
    );

    const hasil = await service.bacaNota(filePath);

    expect(hasil.nominal_ocr).toBe(120000);
  });

});
