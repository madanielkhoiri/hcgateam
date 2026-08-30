import { BadRequestException, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { HousekeepingIndoorFileService } from './housekeeping-indoor-file.service';

function buatFilePalsu(ukuranByte: number, namaAsli: string): Express.Multer.File {
  return {
    buffer: Buffer.alloc(ukuranByte, 1),
    size: ukuranByte,
    originalname: namaAsli,
  } as Express.Multer.File;
}

describe('HousekeepingIndoorFileService', () => {
  let direktoriUji: string;
  let cwdAwal: string;
  let service: HousekeepingIndoorFileService;

  beforeEach(() => {
    cwdAwal = process.cwd();
    direktoriUji = mkdtempSync(join(tmpdir(), 'hk-indoor-file-'));
    mkdirSync(join(direktoriUji, 'uploads'), { recursive: true });
    process.chdir(direktoriUji);
    service = new HousekeepingIndoorFileService();
  });

  afterEach(() => {
    process.chdir(cwdAwal);
    rmSync(direktoriUji, { recursive: true, force: true });
  });

  describe('simpan', () => {
    it('menolak kalau tidak ada buffer', () => {
      const file = { buffer: undefined } as unknown as Express.Multer.File;
      expect(() => service.simpan(file, 1)).toThrow(BadRequestException);
    });

    it('menolak foto lebih dari 10 MB', () => {
      const file = buatFilePalsu(11 * 1024 * 1024, 'a.jpg');
      expect(() => service.simpan(file, 1)).toThrow('Ukuran tiap foto maksimal 10 MB');
    });

    it('menolak format selain JPG/PNG/WEBP', () => {
      const file = buatFilePalsu(1024, 'a.gif');
      expect(() => service.simpan(file, 1)).toThrow('Format foto harus JPG, PNG, atau WEBP');
    });

    it('menyimpan ke folder housekeeping-indoor/laporan-<id>/ dan mengembalikan path relatif', () => {
      const path = service.simpan(buatFilePalsu(1024, 'a.jpg'), 42);

      expect(path).toMatch(/^housekeeping-indoor\/laporan-42\/\d+-[0-9a-f-]+\.jpg$/);
      expect(existsSync(join(direktoriUji, 'uploads', path))).toBe(true);
    });
  });

  describe('resolveAbsolut', () => {
    it('menolak path yang tidak diawali housekeeping-indoor/', () => {
      expect(() => service.resolveAbsolut('../lain/rahasia.jpg')).toThrow(BadRequestException);
    });

    it('menolak path traversal walau diawali housekeeping-indoor/', () => {
      expect(() => service.resolveAbsolut('housekeeping-indoor/../../rahasia.jpg')).toThrow(BadRequestException);
    });

    it('melempar NotFoundException kalau file belum ada', () => {
      expect(() => service.resolveAbsolut('housekeeping-indoor/laporan-1/tidak-ada.jpg')).toThrow(NotFoundException);
    });

    it('mengembalikan path absolut untuk file yang ada', () => {
      const path = service.simpan(buatFilePalsu(1024, 'a.jpg'), 1);

      expect(existsSync(service.resolveAbsolut(path))).toBe(true);
    });
  });

  describe('hapus', () => {
    it('mengembalikan false untuk path kosong/null', () => {
      expect(service.hapus(null)).toBe(false);
      expect(service.hapus(undefined)).toBe(false);
    });

    it('mengembalikan false kalau file tidak ditemukan', () => {
      expect(service.hapus('housekeeping-indoor/laporan-1/tidak-ada.jpg')).toBe(false);
    });

    it('benar-benar menghapus file yang ada', () => {
      const path = service.simpan(buatFilePalsu(1024, 'a.jpg'), 1);
      const absolut = service.resolveAbsolut(path);

      expect(service.hapus(path)).toBe(true);
      expect(existsSync(absolut)).toBe(false);
    });
  });
});
