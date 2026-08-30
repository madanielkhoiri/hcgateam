import { BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AlbumFileService } from './album-file.service';

function buatFilePalsu(ukuranByte: number, namaAsli: string): Express.Multer.File {
  return {
    buffer: Buffer.alloc(ukuranByte, 1),
    size: ukuranByte,
    originalname: namaAsli,
  } as Express.Multer.File;
}

describe('AlbumFileService', () => {
  let direktoriUji: string;
  let cwdAwal: string;
  let service: AlbumFileService;

  beforeEach(() => {
    cwdAwal = process.cwd();
    direktoriUji = mkdtempSync(join(tmpdir(), 'album-file-'));
    mkdirSync(join(direktoriUji, 'uploads'), { recursive: true });
    process.chdir(direktoriUji);
    service = new AlbumFileService();
  });

  afterEach(() => {
    process.chdir(cwdAwal);
    rmSync(direktoriUji, { recursive: true, force: true });
  });

  describe('simpan', () => {
    it('menolak kalau tidak ada buffer', () => {
      const file = { buffer: undefined } as unknown as Express.Multer.File;
      expect(() => service.simpan(file)).toThrow(BadRequestException);
    });

    it('menolak foto lebih dari 10 MB', () => {
      const file = buatFilePalsu(11 * 1024 * 1024, 'a.jpg');
      expect(() => service.simpan(file)).toThrow('Ukuran foto maksimal 10 MB');
    });

    it('menolak format selain JPG/PNG/WEBP', () => {
      const file = buatFilePalsu(1024, 'a.gif');
      expect(() => service.simpan(file)).toThrow('Format foto harus JPG, PNG, atau WEBP');
    });

    it('menyimpan ke folder album/ dan mengembalikan path relatif', () => {
      const path = service.simpan(buatFilePalsu(1024, 'a.jpg'));

      expect(path).toMatch(/^album\/\d+-[0-9a-f-]+\.jpg$/);
      expect(existsSync(join(direktoriUji, 'uploads', path))).toBe(true);
    });
  });

  describe('hapus', () => {
    it('tidak melakukan apa-apa untuk path kosong', () => {
      expect(() => service.hapus(null)).not.toThrow();
      expect(() => service.hapus(undefined)).not.toThrow();
    });

    it('tidak melempar error kalau file tidak ada', () => {
      expect(() => service.hapus('album/tidak-ada.jpg')).not.toThrow();
    });

    it('benar-benar menghapus file yang ada', () => {
      const path = service.simpan(buatFilePalsu(1024, 'a.jpg'));
      const absolut = join(direktoriUji, 'uploads', path);

      service.hapus(path);

      expect(existsSync(absolut)).toBe(false);
    });
  });
});
