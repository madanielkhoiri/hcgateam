import { BadRequestException, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { TipeFileEprom } from '@prisma/client';
import { EpromFileService } from './eprom-file.service';

function buatFilePalsu(ukuranByte: number, namaAsli: string): Express.Multer.File {
  return {
    buffer: Buffer.alloc(ukuranByte, 1),
    size: ukuranByte,
    originalname: namaAsli,
  } as Express.Multer.File;
}

describe('EpromFileService', () => {
  let direktoriUji: string;
  let cwdAwal: string;
  let service: EpromFileService;

  beforeEach(() => {
    cwdAwal = process.cwd();
    direktoriUji = mkdtempSync(join(tmpdir(), 'eprom-file-'));
    mkdirSync(join(direktoriUji, 'uploads'), { recursive: true });
    process.chdir(direktoriUji);
    service = new EpromFileService();
  });

  afterEach(() => {
    process.chdir(cwdAwal);
    rmSync(direktoriUji, { recursive: true, force: true });
  });

  describe('tebakTipe', () => {
    it.each([
      ['foto.jpg', TipeFileEprom.FOTO],
      ['foto.PNG', TipeFileEprom.FOTO],
      ['gambar.dwg', TipeFileEprom.CAD],
      ['rab.xlsx', TipeFileEprom.RAB],
      ['dokumen.pdf', TipeFileEprom.PDF],
      ['tidak-dikenal.zip', TipeFileEprom.PDF],
    ])('%s -> %s', (nama, tipe) => {
      expect(service.tebakTipe(nama)).toBe(tipe);
    });
  });

  describe('simpan', () => {
    it('menolak kalau file tidak ada buffernya', () => {
      const file = { buffer: undefined } as unknown as Express.Multer.File;
      expect(() => service.simpan(file, 'tender', TipeFileEprom.PDF)).toThrow(BadRequestException);
    });

    it('menolak file lebih dari 25 MB', () => {
      const file = buatFilePalsu(26 * 1024 * 1024, 'a.pdf');
      expect(() => service.simpan(file, 'tender', TipeFileEprom.PDF)).toThrow('Ukuran file maksimal 25 MB');
    });

    it('menolak ekstensi yang sama sekali tidak didukung', () => {
      const file = buatFilePalsu(1024, 'a.exe');
      expect(() => service.simpan(file, 'tender', TipeFileEprom.PDF)).toThrow('Format file tidak didukung');
    });

    it('menolak ekstensi valid tapi tidak cocok dengan tipe yang diminta (mis. .xlsx untuk tipe FOTO)', () => {
      const file = buatFilePalsu(1024, 'a.xlsx');
      expect(() => service.simpan(file, 'tender', TipeFileEprom.FOTO)).toThrow(
        `Format file tidak sesuai untuk tipe ${TipeFileEprom.FOTO}`,
      );
    });

    it('menyimpan file valid dan mengembalikan path relatif eprom/<scope>/...', () => {
      const path = service.simpan(buatFilePalsu(1024, 'a.pdf'), 'tender', TipeFileEprom.PDF);

      expect(path).toMatch(/^eprom\/tender\/\d+-[0-9a-f-]+\.pdf$/);
      expect(existsSync(join(direktoriUji, 'uploads', path))).toBe(true);
    });
  });

  describe('simpanDokumen', () => {
    it('menolak kalau file tidak ada buffernya', () => {
      const file = { buffer: undefined } as unknown as Express.Multer.File;
      expect(() => service.simpanDokumen(file, 'kontrak')).toThrow(BadRequestException);
    });

    it('menerima ekstensi dokumen umum yang tidak diizinkan di simpan() biasa (mis. .docx)', () => {
      const path = service.simpanDokumen(buatFilePalsu(1024, 'kontrak.docx'), 'kontrak');

      expect(path).toMatch(/^eprom\/kontrak\/\d+-[0-9a-f-]+\.docx$/);
    });

    it('menolak ekstensi berbahaya (mis. .html) walau ada di kategori dokumen', () => {
      const file = buatFilePalsu(1024, 'a.html');
      expect(() => service.simpanDokumen(file, 'kontrak')).toThrow('Format file tidak didukung');
    });
  });

  describe('resolveAbsolut', () => {
    it('menolak path yang tidak diawali eprom/', () => {
      expect(() => service.resolveAbsolut('../lain/rahasia.pdf')).toThrow(BadRequestException);
    });

    it('menolak path traversal walau diawali eprom/', () => {
      expect(() => service.resolveAbsolut('eprom/../../rahasia.pdf')).toThrow(BadRequestException);
    });

    it('melempar NotFoundException kalau file belum ada', () => {
      expect(() => service.resolveAbsolut('eprom/tender/tidak-ada.pdf')).toThrow(NotFoundException);
    });

    it('mengembalikan path absolut untuk file yang benar-benar ada', () => {
      const path = service.simpan(buatFilePalsu(1024, 'a.pdf'), 'tender', TipeFileEprom.PDF);

      expect(existsSync(service.resolveAbsolut(path))).toBe(true);
    });
  });

  describe('hapus', () => {
    it('mengembalikan false untuk path kosong/null', () => {
      expect(service.hapus(null)).toBe(false);
      expect(service.hapus(undefined)).toBe(false);
    });

    it('mengembalikan false (tidak melempar error) kalau file tidak ditemukan', () => {
      expect(service.hapus('eprom/tender/tidak-ada.pdf')).toBe(false);
    });

    it('benar-benar menghapus file yang ada', () => {
      const path = service.simpan(buatFilePalsu(1024, 'a.pdf'), 'tender', TipeFileEprom.PDF);
      const absolut = service.resolveAbsolut(path);

      expect(service.hapus(path)).toBe(true);
      expect(existsSync(absolut)).toBe(false);
    });
  });
});
