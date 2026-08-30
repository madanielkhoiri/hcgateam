import { BadRequestException, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TiketFileService } from './tiket-file.service';

function buatFilePalsu(ukuranByte: number, namaAsli: string): Express.Multer.File {
  return {
    buffer: Buffer.alloc(ukuranByte, 1),
    size: ukuranByte,
    originalname: namaAsli,
  } as Express.Multer.File;
}

describe('TiketFileService', () => {
  let direktoriUji: string;
  let cwdAwal: string;
  let service: TiketFileService;

  beforeEach(() => {
    cwdAwal = process.cwd();
    direktoriUji = mkdtempSync(join(tmpdir(), 'tiket-file-'));
    mkdirSync(join(direktoriUji, 'uploads'), { recursive: true });
    process.chdir(direktoriUji);
    service = new TiketFileService();
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

    it('menolak file lebih dari 15 MB', () => {
      const file = buatFilePalsu(16 * 1024 * 1024, 'a.pdf');
      expect(() => service.simpan(file, 1)).toThrow('Ukuran file maksimal 15 MB');
    });

    it('menolak format selain PDF/JPG/PNG/WEBP', () => {
      const file = buatFilePalsu(1024, 'a.docx');
      expect(() => service.simpan(file, 1)).toThrow('Format file harus PDF, JPG, PNG, atau WEBP');
    });

    it('menyimpan ke folder tiket/karyawan-<id>/ dan mengembalikan fileUrl+namaFile asli', () => {
      const hasil = service.simpan(buatFilePalsu(1024, 'Surat Cuti.pdf'), 42);

      expect(hasil.fileUrl).toMatch(/^tiket\/karyawan-42\/\d+-[0-9a-f-]+\.pdf$/);
      expect(hasil.namaFile).toBe('Surat Cuti.pdf');
      expect(existsSync(join(direktoriUji, 'uploads', hasil.fileUrl))).toBe(true);
    });
  });

  describe('resolveAbsolut', () => {
    it('menolak path yang tidak diawali tiket/', () => {
      expect(() => service.resolveAbsolut('../lain/rahasia.pdf')).toThrow(BadRequestException);
    });

    it('menolak path traversal walau diawali tiket/', () => {
      expect(() => service.resolveAbsolut('tiket/../../rahasia.pdf')).toThrow(BadRequestException);
    });

    it('melempar NotFoundException kalau file belum ada', () => {
      expect(() => service.resolveAbsolut('tiket/karyawan-1/tidak-ada.pdf')).toThrow(NotFoundException);
    });

    it('mengembalikan path absolut untuk file yang ada', () => {
      const { fileUrl } = service.simpan(buatFilePalsu(1024, 'a.pdf'), 1);

      expect(existsSync(service.resolveAbsolut(fileUrl))).toBe(true);
    });
  });

  describe('hapus', () => {
    it('mengembalikan false untuk path kosong/null', () => {
      expect(service.hapus(null)).toBe(false);
      expect(service.hapus(undefined)).toBe(false);
    });

    it('mengembalikan false kalau file tidak ditemukan', () => {
      expect(service.hapus('tiket/karyawan-1/tidak-ada.pdf')).toBe(false);
    });

    it('benar-benar menghapus file yang ada', () => {
      const { fileUrl } = service.simpan(buatFilePalsu(1024, 'a.pdf'), 1);
      const absolut = service.resolveAbsolut(fileUrl);

      expect(service.hapus(fileUrl)).toBe(true);
      expect(existsSync(absolut)).toBe(false);
    });
  });
});
