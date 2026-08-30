import { BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { IrFileService } from './ir-file.service';

function buatFilePalsu(ukuranByte: number, namaAsli: string): Express.Multer.File {
  return {
    buffer: Buffer.alloc(ukuranByte, 1),
    size: ukuranByte,
    originalname: namaAsli,
  } as Express.Multer.File;
}

describe('IrFileService', () => {
  let direktoriUji: string;
  let cwdAwal: string;
  let service: IrFileService;

  beforeEach(() => {
    cwdAwal = process.cwd();
    direktoriUji = mkdtempSync(join(tmpdir(), 'ir-file-'));
    mkdirSync(join(direktoriUji, 'uploads'), { recursive: true });
    process.chdir(direktoriUji);
    service = new IrFileService();
  });

  afterEach(() => {
    process.chdir(cwdAwal);
    rmSync(direktoriUji, { recursive: true, force: true });
  });

  describe('simpanDokumen', () => {
    it('menolak kalau tidak ada buffer', () => {
      const file = { buffer: undefined } as unknown as Express.Multer.File;
      expect(() => service.simpanDokumen(file)).toThrow(BadRequestException);
    });

    it('menolak dokumen lebih dari 15 MB', () => {
      const file = buatFilePalsu(16 * 1024 * 1024, 'a.pdf');
      expect(() => service.simpanDokumen(file)).toThrow('Ukuran file maksimal 15 MB');
    });

    it('menolak format selain PDF/JPG/PNG/WEBP', () => {
      const file = buatFilePalsu(1024, 'a.docx');
      expect(() => service.simpanDokumen(file)).toThrow('Format dokumen harus PDF, JPG, PNG, atau WEBP');
    });

    it('menyimpan ke folder ir/dokumen/ dan mengembalikan path relatif', () => {
      const path = service.simpanDokumen(buatFilePalsu(1024, 'a.pdf'));

      expect(path).toMatch(/^ir\/dokumen\/\d+-[0-9a-f-]+\.pdf$/);
      expect(existsSync(join(direktoriUji, 'uploads', path))).toBe(true);
    });
  });

  describe('simpanVideo', () => {
    it('menolak kalau tidak ada buffer', () => {
      const file = { buffer: undefined } as unknown as Express.Multer.File;
      expect(() => service.simpanVideo(file)).toThrow(BadRequestException);
    });

    it('menolak video lebih dari 300 MB', () => {
      const file = buatFilePalsu(301 * 1024 * 1024, 'a.mp4');
      expect(() => service.simpanVideo(file)).toThrow('Ukuran video maksimal 300 MB');
    });

    it('menolak format selain MP4/WEBM/MOV', () => {
      const file = buatFilePalsu(1024, 'a.avi');
      expect(() => service.simpanVideo(file)).toThrow('Format video harus MP4, WEBM, atau MOV');
    });

    it('menyimpan ke folder ir/course/ dan mengembalikan path relatif', () => {
      const path = service.simpanVideo(buatFilePalsu(1024, 'a.mp4'));

      expect(path).toMatch(/^ir\/course\/\d+-[0-9a-f-]+\.mp4$/);
      expect(existsSync(join(direktoriUji, 'uploads', path))).toBe(true);
    });
  });

  describe('hapus', () => {
    it('tidak melakukan apa-apa untuk path kosong', () => {
      expect(() => service.hapus(null)).not.toThrow();
      expect(() => service.hapus(undefined)).not.toThrow();
    });

    it('tidak melempar error kalau file tidak ada', () => {
      expect(() => service.hapus('ir/dokumen/tidak-ada.pdf')).not.toThrow();
    });

    it('benar-benar menghapus file yang ada', () => {
      const path = service.simpanDokumen(buatFilePalsu(1024, 'a.pdf'));
      const absolut = join(direktoriUji, 'uploads', path);

      service.hapus(path);

      expect(existsSync(absolut)).toBe(false);
    });
  });
});
