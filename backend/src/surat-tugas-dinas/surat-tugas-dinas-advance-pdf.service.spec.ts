import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SuratTugasDinasAdvancePdfService } from './surat-tugas-dinas-advance-pdf.service';

describe('SuratTugasDinasAdvancePdfService', () => {
  it('membuat PDF berita acara advance yang valid', async () => {
    const cwdAwal = process.cwd();
    const direktori = mkdtempSync(join(tmpdir(), 'advance-std-'));
    try {
      process.chdir(direktori);
      const service = new SuratTugasDinasAdvancePdfService();
      const path = await service.buatFile({
        karyawanTugasId: 20,
        nomorSurat: 'STD-001',
        jenisKegiatan: 'Pelatihan',
        nominalAdvance: 550_000,
        tanggalBerakhir: new Date('2026-09-03'),
        pembuatNama: 'Budi',
        shNama: 'Siti',
        shJabatan: 'SH HCGA',
      });
      const absolut = join(direktori, 'uploads', path);

      expect(existsSync(absolut)).toBe(true);
      expect(readFileSync(absolut).subarray(0, 4).toString()).toBe('%PDF');
    } finally {
      process.chdir(cwdAwal);
      rmSync(direktori, { recursive: true, force: true });
    }
  });
});
