import { BadRequestException } from '@nestjs/common';
import { existsSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DriveFileService } from './drive-file.service';

function buatFilePalsu(ukuranByte: number, namaAsli: string): Express.Multer.File {
  return {
    buffer: Buffer.alloc(ukuranByte, 1),
    size: ukuranByte,
    originalname: namaAsli,
  } as Express.Multer.File;
}

describe('DriveFileService', () => {
  let direktoriUji: string;
  let cwdAwal: string;
  let service: DriveFileService;

  beforeEach(() => {
    cwdAwal = process.cwd();
    direktoriUji = mkdtempSync(join(tmpdir(), 'drive-file-'));
    mkdirSync(join(direktoriUji, 'uploads'), { recursive: true });
    process.chdir(direktoriUji);
    service = new DriveFileService();
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

    it('menolak file lebih dari 25 MB', () => {
      const file = buatFilePalsu(26 * 1024 * 1024, 'a.pdf');
      expect(() => service.simpan(file)).toThrow('Ukuran file maksimal 25 MB');
    });

    it('menolak format yang tidak didukung', () => {
      const file = buatFilePalsu(1024, 'a.exe');
      expect(() => service.simpan(file)).toThrow('Format file tidak didukung');
    });

    it.each(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.jpg', '.png', '.zip', '.rar'])(
      'menerima ekstensi %s',
      (ekstensi) => {
        const path = service.simpan(buatFilePalsu(1024, `a${ekstensi}`));
        expect(path).toMatch(new RegExp(`^drive/\\d+-[0-9a-f-]+\\${ekstensi}$`));
      },
    );

    it('menyimpan file ke folder drive/ dan mengembalikan path relatif', () => {
      const path = service.simpan(buatFilePalsu(1024, 'dokumen.pdf'));

      expect(existsSync(join(direktoriUji, 'uploads', path))).toBe(true);
    });
  });

  describe('hapus', () => {
    it('tidak melakukan apa-apa untuk path kosong', () => {
      expect(() => service.hapus(null)).not.toThrow();
      expect(() => service.hapus(undefined)).not.toThrow();
    });

    it('tidak melempar error kalau file tidak ada', () => {
      expect(() => service.hapus('drive/tidak-ada.pdf')).not.toThrow();
    });

    it('benar-benar menghapus file yang ada', () => {
      const path = service.simpan(buatFilePalsu(1024, 'a.pdf'));
      const absolut = join(direktoriUji, 'uploads', path);

      service.hapus(path);

      expect(existsSync(absolut)).toBe(false);
    });
  });
});
