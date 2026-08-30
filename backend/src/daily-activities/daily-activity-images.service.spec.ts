import { BadRequestException, NotFoundException } from '@nestjs/common';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DailyActivityImagesService } from './daily-activity-images.service';

const PNG_1X1_VALID = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  'base64',
);

function fileFixture(overrides: Partial<Express.Multer.File> = {}): Express.Multer.File {
  return {
    buffer: PNG_1X1_VALID,
    size: PNG_1X1_VALID.length,
    mimetype: 'image/png',
    originalname: 'foto.png',
    ...overrides,
  } as Express.Multer.File;
}

describe('DailyActivityImagesService', () => {
  let cwdAwal: string;
  let direktoriUji: string;
  let service: DailyActivityImagesService;

  beforeEach(() => {
    cwdAwal = process.cwd();
    direktoriUji = mkdtempSync(join(tmpdir(), 'daily-activity-img-'));
    mkdirSync(join(direktoriUji, 'uploads'), { recursive: true });
    process.chdir(direktoriUji);
    service = new DailyActivityImagesService();
  });

  afterEach(() => {
    process.chdir(cwdAwal);
    rmSync(direktoriUji, { recursive: true, force: true });
  });

  describe('saveImage', () => {
    it('menolak kalau tidak ada file', async () => {
      await expect(service.saveImage(undefined as any, 'daily-activities', 'profiles')).rejects.toThrow(
        'File foto wajib dipilih',
      );
    });

    it('menolak mimetype selain gambar', async () => {
      const file = fileFixture({ mimetype: 'application/pdf' });

      await expect(service.saveImage(file, 'daily-activities', 'profiles')).rejects.toThrow(
        'wajib berupa gambar',
      );
    });

    it('menolak file lebih dari 15 MB', async () => {
      const file = fileFixture({ size: 16 * 1024 * 1024 });

      await expect(service.saveImage(file, 'daily-activities', 'profiles')).rejects.toThrow(
        'Ukuran file maksimal 15 MB',
      );
    });

    it('menolak buffer gambar yang rusak/tidak valid', async () => {
      const file = fileFixture({ buffer: Buffer.from('bukan-gambar-asli') });

      await expect(service.saveImage(file, 'daily-activities', 'profiles')).rejects.toThrow('gagal diproses');
    });

    it('berhasil menyimpan sebagai .webp di folder scope/category dan mengembalikan path relatif', async () => {
      const path = await service.saveImage(fileFixture(), 'daily-activities', 'pre-activities');

      expect(path).toMatch(/^uploads\/daily-activities\/pre-activities\/\d+-[0-9a-f-]+\.webp$/);
      expect(existsSync(join(direktoriUji, path))).toBe(true);
    });

    it('mendukung scope grass-cutting', async () => {
      const path = await service.saveImage(fileFixture(), 'grass-cutting', 'progresses');

      expect(path).toMatch(/^uploads\/grass-cutting\/progresses\//);
    });
  });

  describe('saveMany', () => {
    it('menolak kalau tidak ada file sama sekali', async () => {
      await expect(service.saveMany([], 'daily-activities', 'profiles')).rejects.toThrow(
        'Minimal satu foto wajib dipilih',
      );
    });

    it('menyimpan seluruh file dan mengembalikan array path', async () => {
      const paths = await service.saveMany(
        [fileFixture({ originalname: 'a.png' }), fileFixture({ originalname: 'b.png' })],
        'daily-activities',
        'progresses',
      );

      expect(paths).toHaveLength(2);
      const files = readdirSync(join(direktoriUji, 'uploads', 'daily-activities', 'progresses'));
      expect(files).toHaveLength(2);
    });
  });

  describe('resolveImage', () => {
    it('melempar NotFoundException kalau file tidak ada', () => {
      expect(() => service.resolveImage('daily-activities', 'profiles', 'tidak-ada.webp')).toThrow(
        NotFoundException,
      );
    });

    it('mencegah path traversal dengan basename()', () => {
      mkdirSync(join(direktoriUji, 'uploads', 'daily-activities', 'profiles'), { recursive: true });
      writeFileSync(join(direktoriUji, 'uploads', 'daily-activities', 'profiles', 'aman.webp'), 'x');

      const hasil = service.resolveImage('daily-activities', 'profiles', '../../../aman.webp');

      expect(hasil).toBe(join(direktoriUji, 'uploads', 'daily-activities', 'profiles', 'aman.webp'));
    });

    it('mengembalikan path absolut untuk file yang ada', () => {
      mkdirSync(join(direktoriUji, 'uploads', 'daily-activities', 'profiles'), { recursive: true });
      const filePath = join(direktoriUji, 'uploads', 'daily-activities', 'profiles', 'foto.webp');
      writeFileSync(filePath, 'x');

      expect(service.resolveImage('daily-activities', 'profiles', 'foto.webp')).toBe(filePath);
    });
  });

  describe('deleteImage', () => {
    it('tidak melakukan apa-apa untuk path kosong', () => {
      expect(() => service.deleteImage('')).not.toThrow();
      expect(() => service.deleteImage(null as any)).not.toThrow();
    });

    it('mengabaikan path di luar scope daily-activities/grass-cutting (tidak menghapus file sembarangan)', () => {
      mkdirSync(join(direktoriUji, 'uploads', 'lain'), { recursive: true });
      const filePath = join(direktoriUji, 'uploads', 'lain', 'rahasia.txt');
      writeFileSync(filePath, 'x');

      service.deleteImage('uploads/lain/rahasia.txt');

      expect(existsSync(filePath)).toBe(true);
    });

    it('menghapus file yang ada di scope yang diizinkan', () => {
      mkdirSync(join(direktoriUji, 'uploads', 'daily-activities', 'profiles'), { recursive: true });
      const filePath = join(direktoriUji, 'uploads', 'daily-activities', 'profiles', 'foto.webp');
      writeFileSync(filePath, 'x');

      service.deleteImage('uploads/daily-activities/profiles/foto.webp');

      expect(existsSync(filePath)).toBe(false);
    });

    it('tidak melempar error kalau file sudah tidak ada', () => {
      expect(() => service.deleteImage('uploads/daily-activities/profiles/tidak-ada.webp')).not.toThrow();
    });
  });

  describe('deleteMany', () => {
    it('menghapus seluruh file dalam daftar', () => {
      mkdirSync(join(direktoriUji, 'uploads', 'daily-activities', 'profiles'), { recursive: true });
      const path1 = join(direktoriUji, 'uploads', 'daily-activities', 'profiles', 'a.webp');
      const path2 = join(direktoriUji, 'uploads', 'daily-activities', 'profiles', 'b.webp');
      writeFileSync(path1, 'x');
      writeFileSync(path2, 'x');

      service.deleteMany(['uploads/daily-activities/profiles/a.webp', 'uploads/daily-activities/profiles/b.webp']);

      expect(existsSync(path1)).toBe(false);
      expect(existsSync(path2)).toBe(false);
    });
  });
});
