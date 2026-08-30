import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SuratTugasDinasPdfService } from './surat-tugas-dinas-pdf.service';

function karyawanFixture(overrides: Record<string, unknown> = {}) {
  return { urutan: 1, nrp: '12345', nama: 'Budi', departemen: 'HC', jabatan: 'Staff', ...overrides };
}

function suratFixture(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    nomor: 'ST-001/2026',
    tujuanLokasi: 'Jakarta',
    tanggalMulai: new Date('2026-01-05'),
    tanggalSelesai: new Date('2026-01-10'),
    keteranganTugas: 'Rapat koordinasi',
    status: 'MENUNGGU_SH',
    disetujuiShPada: null,
    alasanTolak: null,
    createdAt: new Date('2026-01-01'),
    karyawan: [karyawanFixture()],
    ...overrides,
  } as any;
}

describe('SuratTugasDinasPdfService.buatFile', () => {
  let cwdAwal: string;
  let direktoriUji: string;
  let service: SuratTugasDinasPdfService;

  beforeEach(() => {
    cwdAwal = process.cwd();
    direktoriUji = mkdtempSync(join(tmpdir(), 'surat-tugas-pdf-'));
    mkdirSync(join(direktoriUji, 'uploads', 'signatures'), { recursive: true });
    process.chdir(direktoriUji);
    service = new SuratTugasDinasPdfService();
  });

  afterEach(() => {
    process.chdir(cwdAwal);
    rmSync(direktoriUji, { recursive: true, force: true });
  });

  it('menyimpan file dan mengembalikan path relatif surat-tugas-dinas/<nama file>.pdf', async () => {
    const path = await service.buatFile(suratFixture());

    expect(path).toMatch(/^surat-tugas-dinas\/surat-tugas-ST-001-2026\.pdf$/);
    expect(existsSync(join(direktoriUji, 'uploads', path))).toBe(true);
  });

  it('nomor surat dengan karakter terlarang disanitasi jadi tanda hubung', async () => {
    const path = await service.buatFile(suratFixture({ nomor: 'ST/001:2026*A' }));

    expect(path).toBe('surat-tugas-dinas/surat-tugas-ST-001-2026-A.pdf');
  });

  it('file yang tersimpan adalah PDF valid', async () => {
    const path = await service.buatFile(suratFixture());
    const buffer = readFileSync(join(direktoriUji, 'uploads', path));

    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');
  });

  // Logo dan tanda tangan SH/PJO di-resolve dari path absolut process.cwd() SAAT
  // MODUL DI-IMPORT (konstanta top-level), bukan dari chdir() di beforeEach —
  // jadi setiap generate di sini selalu memuat aset asli uploads/signatures/
  // milik repo (termasuk logo ~750KB), yang membuat tes ini lebih lambat dari
  // tes PDF lain di sesi ini. Ini sekaligus menguji lintasan render tanda
  // tangan SH/PJO yang sungguhan (bukan file tiruan) untuk tiap status.
  it.each(['MENUNGGU_SH', 'MENUNGGU_PJO', 'DISETUJUI', 'DITOLAK'])(
    'berhasil generate untuk status %s tanpa crash',
    async (status) => {
      const surat = suratFixture({ status, alasanTolak: status === 'DITOLAK' ? 'Data tidak lengkap' : null });

      await expect(service.buatFile(surat)).resolves.toMatch(/\.pdf$/);
    },
  );

  it('berhasil generate dengan banyak baris karyawan yang memicu halaman baru', async () => {
    const banyakKaryawan = Array.from({ length: 40 }, (_, i) =>
      karyawanFixture({ urutan: i + 1, nrp: String(10000 + i), nama: `Karyawan ${i + 1}` }),
    );

    const path = await service.buatFile(suratFixture({ karyawan: banyakKaryawan }));

    expect(path).toMatch(/\.pdf$/);
  });
});
