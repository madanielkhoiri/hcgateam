import { BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { PostinganFileService } from './postingan-file.service';

function buatFilePalsu(ukuranByte: number, namaAsli: string): Express.Multer.File {
  return {
    buffer: Buffer.alloc(ukuranByte, 1),
    size: ukuranByte,
    originalname: namaAsli,
  } as Express.Multer.File;
}

describe('PostinganFileService', () => {
  let direktoriUji: string;
  let cwdAwal: string;
  let service: PostinganFileService;

  beforeEach(() => {
    cwdAwal = process.cwd();
    direktoriUji = mkdtempSync(join(tmpdir(), 'postingan-file-'));
    mkdirSync(join(direktoriUji, 'uploads'), { recursive: true });
    process.chdir(direktoriUji);
    service = new PostinganFileService();
  });

  afterEach(() => {
    process.chdir(cwdAwal);
    rmSync(direktoriUji, { recursive: true, force: true });
  });

  describe('simpanPoster', () => {
    it('menolak kalau tidak ada buffer', () => {
      const file = { buffer: undefined } as unknown as Express.Multer.File;
      expect(() => service.simpanPoster(file)).toThrow(BadRequestException);
    });

    it('menolak poster lebih dari 10 MB', () => {
      const file = buatFilePalsu(11 * 1024 * 1024, 'a.jpg');
      expect(() => service.simpanPoster(file)).toThrow('Ukuran poster maksimal 10 MB');
    });

    it('menolak format selain JPG/PNG/WEBP', () => {
      const file = buatFilePalsu(1024, 'a.gif');
      expect(() => service.simpanPoster(file)).toThrow('Format poster harus JPG, PNG, atau WEBP');
    });

    it('menyimpan ke folder postingan/ dan mengembalikan path relatif', () => {
      const path = service.simpanPoster(buatFilePalsu(1024, 'a.jpg'));

      expect(path).toMatch(/^postingan\/\d+-[0-9a-f-]+\.jpg$/);
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

    it('menyimpan ke folder postingan/ dan mengembalikan path relatif', () => {
      const path = service.simpanVideo(buatFilePalsu(1024, 'a.mp4'));

      expect(path).toMatch(/^postingan\/\d+-[0-9a-f-]+\.mp4$/);
      expect(existsSync(join(direktoriUji, 'uploads', path))).toBe(true);
    });
  });

  describe('hapus', () => {
    it('tidak melakukan apa-apa untuk path kosong', () => {
      expect(() => service.hapus(null)).not.toThrow();
      expect(() => service.hapus(undefined)).not.toThrow();
    });

    it('tidak melempar error kalau file tidak ada', () => {
      expect(() => service.hapus('postingan/tidak-ada.jpg')).not.toThrow();
    });

    it('benar-benar menghapus file yang ada', () => {
      const path = service.simpanPoster(buatFilePalsu(1024, 'a.jpg'));
      const absolut = join(direktoriUji, 'uploads', path);

      service.hapus(path);

      expect(existsSync(absolut)).toBe(false);
    });
  });
});
