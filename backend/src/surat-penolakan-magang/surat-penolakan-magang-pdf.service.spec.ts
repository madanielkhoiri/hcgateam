import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SuratPenolakanMagangPdfService } from './surat-penolakan-magang-pdf.service';

function suratFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    nomor: '01/S-Out/HCGA/PPA-Adw/I/2026',
    nama: 'Budi',
    sapaan: 'Saudara',
    alasanPenolakan: 'Kuota magang untuk periode ini sudah penuh',
    createdAt: new Date('2026-01-05'),
    ...overrides,
  } as any;
}

// LOGO_PATH/SH_SIGNER di-resolve dari process.cwd() saat modul di-import
// (bukan saat generate dipanggil), jadi tiap tes di sini tetap memuat aset
// asli uploads/signatures/ milik repo (logo ~750KB) — sama seperti
// SuratTugasDinasPdfService/SuratBalasanMagangPdfService.
describe('SuratPenolakanMagangPdfService.buatFile', () => {
  let cwdAwal: string;
  let direktoriUji: string;
  let service: SuratPenolakanMagangPdfService;

  beforeEach(() => {
    cwdAwal = process.cwd();
    direktoriUji = mkdtempSync(join(tmpdir(), 'surat-penolakan-pdf-'));
    mkdirSync(join(direktoriUji, 'uploads', 'signatures'), { recursive: true });
    process.chdir(direktoriUji);
    service = new SuratPenolakanMagangPdfService();
  });

  afterEach(() => {
    process.chdir(cwdAwal);
    rmSync(direktoriUji, { recursive: true, force: true });
  });

  it('menyimpan file dan mengembalikan path relatif surat-penolakan-magang/<nama file>.pdf', async () => {
    const path = await service.buatFile(suratFixture());

    expect(path).toBe('surat-penolakan-magang/surat-penolakan-01-S-Out-HCGA-PPA-Adw-I-2026.pdf');
    expect(existsSync(join(direktoriUji, 'uploads', path))).toBe(true);
  });

  it('nomor surat dengan karakter terlarang disanitasi jadi tanda hubung', async () => {
    const path = await service.buatFile(suratFixture({ nomor: 'ST/002:2026*B' }));

    expect(path).toBe('surat-penolakan-magang/surat-penolakan-ST-002-2026-B.pdf');
  });

  it('file yang tersimpan adalah PDF valid', async () => {
    const path = await service.buatFile(suratFixture());
    const buffer = readFileSync(join(direktoriUji, 'uploads', path));

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('berhasil generate dengan alasan penolakan yang panjang', async () => {
    const path = await service.buatFile(
      suratFixture({ alasanPenolakan: 'Kualifikasi dan jurusan pelamar belum sesuai dengan kebutuhan departemen terkait pada periode magang saat ini' }),
    );

    expect(path).toMatch(/\.pdf$/);
  });
});
