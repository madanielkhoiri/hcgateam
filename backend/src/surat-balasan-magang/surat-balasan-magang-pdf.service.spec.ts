import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SuratBalasanMagangPdfService } from './surat-balasan-magang-pdf.service';

function barisFixture(overrides: Record<string, unknown> = {}) {
  return {
    urutan: 1,
    nama: 'Budi',
    nrp: '12345',
    jurusan: 'Teknik Mesin',
    departemenTujuan: 'HC',
    tanggalMulai: new Date('2026-01-05'),
    tanggalSelesai: new Date('2026-02-05'),
    ...overrides,
  };
}

function suratFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    nomor: '01/S-Out/HCGA/PPA-Adw/I/2026',
    nomorSuratMasuk: null,
    perihalSuratMasuk: null,
    tujuanJurusan: 'Ketua Jurusan Teknik Mesin',
    kotaTujuan: 'Balikpapan',
    createdAt: new Date('2026-01-05'),
    baris: [barisFixture()],
    ...overrides,
  } as any;
}

// LOGO_PATH/SH_SIGNER di-resolve dari process.cwd() saat modul di-import
// (bukan saat generate dipanggil), jadi tiap tes di sini tetap memuat aset
// asli uploads/signatures/ milik repo (logo ~750KB) — sama seperti
// SuratTugasDinasPdfService, sehingga suite ini lebih lambat dari suite PDF lain.
describe('SuratBalasanMagangPdfService.buatFile', () => {
  let cwdAwal: string;
  let direktoriUji: string;
  let service: SuratBalasanMagangPdfService;

  beforeEach(() => {
    cwdAwal = process.cwd();
    direktoriUji = mkdtempSync(join(tmpdir(), 'surat-balasan-pdf-'));
    mkdirSync(join(direktoriUji, 'uploads', 'signatures'), { recursive: true });
    process.chdir(direktoriUji);
    service = new SuratBalasanMagangPdfService();
  });

  afterEach(() => {
    process.chdir(cwdAwal);
    rmSync(direktoriUji, { recursive: true, force: true });
  });

  it('menyimpan file dan mengembalikan path relatif surat-balasan-magang/<nama file>.pdf', async () => {
    const path = await service.buatFile(suratFixture());

    expect(path).toBe('surat-balasan-magang/surat-balasan-01-S-Out-HCGA-PPA-Adw-I-2026.pdf');
    expect(existsSync(join(direktoriUji, 'uploads', path))).toBe(true);
  });

  it('file yang tersimpan adalah PDF valid', async () => {
    const path = await service.buatFile(suratFixture());
    const buffer = readFileSync(join(direktoriUji, 'uploads', path));

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  it('berhasil generate dengan surat masuk (nomorSuratMasuk/perihalSuratMasuk) diisi', async () => {
    const path = await service.buatFile(
      suratFixture({ nomorSuratMasuk: 'S-123/UNI/2026', perihalSuratMasuk: 'Permohonan Magang' }),
    );

    expect(path).toMatch(/\.pdf$/);
  });

  it('berhasil generate dengan banyak baris mahasiswa', async () => {
    const banyakBaris = Array.from({ length: 15 }, (_, i) =>
      barisFixture({ urutan: i + 1, nrp: String(10000 + i), nama: `Mahasiswa ${i + 1}` }),
    );

    const path = await service.buatFile(suratFixture({ baris: banyakBaris }));

    expect(path).toMatch(/\.pdf$/);
  });
});
