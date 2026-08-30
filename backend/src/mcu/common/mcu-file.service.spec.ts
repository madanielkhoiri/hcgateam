import { BadRequestException, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { McuFileService } from './mcu-file.service';

function buatFilePalsu(ukuranByte: number, namaAsli = 'dokumen.pdf'): Express.Multer.File {
  return {
    buffer: Buffer.alloc(ukuranByte, 1),
    size: ukuranByte,
    originalname: namaAsli,
  } as Express.Multer.File;
}

describe('McuFileService', () => {
  let direktoriUji: string;
  let cwdAwal: string;
  let service: McuFileService;

  beforeEach(() => {
    cwdAwal = process.cwd();
    direktoriUji = mkdtempSync(join(tmpdir(), 'mcu-file-'));
    mkdirSync(join(direktoriUji, 'uploads'), { recursive: true });
    process.chdir(direktoriUji);
    service = new McuFileService();
  });

  afterEach(() => {
    process.chdir(cwdAwal);
    rmSync(direktoriUji, { recursive: true, force: true });
  });

  describe('parseKategori', () => {
    it('menerima kategori yang valid', () => {
      expect(service.parseKategori('hasil-mcu')).toBe('hasil-mcu');
    });

    it('menolak kategori yang tidak dikenal', () => {
      expect(() => service.parseKategori('kategori-ngasal')).toThrow(BadRequestException);
    });
  });

  describe('simpan', () => {
    it('menolak kalau file tidak ada buffernya', () => {
      const file = { buffer: undefined } as unknown as Express.Multer.File;
      expect(() => service.simpan(file, 'hasil-mcu')).toThrow(BadRequestException);
    });

    it('menolak file lebih dari 15 MB', () => {
      const file = buatFilePalsu(16 * 1024 * 1024);
      expect(() => service.simpan(file, 'hasil-mcu')).toThrow('Ukuran file maksimal 15 MB');
    });

    it('menolak ekstensi selain PDF/JPG/PNG/WEBP', () => {
      const file = buatFilePalsu(1024, 'dokumen.docx');
      expect(() => service.simpan(file, 'hasil-mcu')).toThrow('Format file harus PDF, JPG, PNG, atau WEBP');
    });

    it('menyimpan file valid dan mengembalikan path relatif mcu/<kategori>/...', () => {
      const path = service.simpan(buatFilePalsu(1024), 'hasil-follow-up');

      expect(path).toMatch(/^mcu\/hasil-follow-up\/\d+-[0-9a-f-]+\.pdf$/);
      expect(existsSync(join(direktoriUji, 'uploads', path))).toBe(true);
    });
  });

  describe('resolveAbsolut', () => {
    it('menolak path yang tidak diawali mcu/', () => {
      expect(() => service.resolveAbsolut('../lain/rahasia.pdf')).toThrow(BadRequestException);
    });

    it('melempar NotFoundException kalau file belum ada', () => {
      expect(() => service.resolveAbsolut('mcu/hasil-mcu/tidak-ada.pdf')).toThrow(NotFoundException);
    });

    it('mengembalikan path absolut untuk file yang benar-benar ada', () => {
      const path = service.simpan(buatFilePalsu(1024), 'hasil-mcu');

      expect(existsSync(service.resolveAbsolut(path))).toBe(true);
    });
  });

  describe('hapus & hapusBanyak', () => {
    it('hapus mengembalikan false untuk path kosong/null', () => {
      expect(service.hapus(null)).toBe(false);
      expect(service.hapus(undefined)).toBe(false);
    });

    it('hapus mengembalikan false (tidak melempar error) kalau file tidak ditemukan', () => {
      expect(service.hapus('mcu/hasil-mcu/tidak-ada.pdf')).toBe(false);
    });

    it('hapus benar-benar menghapus file yang ada', () => {
      const path = service.simpan(buatFilePalsu(1024), 'hasil-mcu');
      const absolut = service.resolveAbsolut(path);

      expect(service.hapus(path)).toBe(true);
      expect(existsSync(absolut)).toBe(false);
    });

    it('hapusBanyak menghitung jumlah file yang benar-benar terhapus', () => {
      const path1 = service.simpan(buatFilePalsu(1024), 'hasil-mcu');
      const path2 = service.simpan(buatFilePalsu(1024), 'hasil-follow-up');

      const jumlah = service.hapusBanyak([path1, path2, null, 'mcu/hasil-mcu/tidak-ada.pdf']);

      expect(jumlah).toBe(2);
    });
  });
});
