import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, statSync, unlinkSync } from 'node:fs';
import { basename, join } from 'node:path';
import sharp from 'sharp';

export type DailyImageCategory = 'profiles' | 'pre-activities' | 'progresses';

export type DailyImageScope = 'daily-activities' | 'grass-cutting';

@Injectable()
export class DailyActivityImagesService {
  private readonly uploadsDirectory = join(process.cwd(), 'uploads');

  async saveImage(
    file: Express.Multer.File,
    scope: DailyImageScope,
    category: DailyImageCategory,
  ): Promise<string> {
    if (!file) {
      throw new BadRequestException('File foto wajib dipilih');
    }

    if (!file.mimetype?.startsWith('image/')) {
      throw new BadRequestException('File yang diunggah wajib berupa gambar');
    }

    const destination = join(this.uploadsDirectory, scope, category);

    mkdirSync(destination, {
      recursive: true,
    });

    const filename = `${Date.now()}-${randomUUID()}.webp`;
    const outputPath = join(destination, filename);

    try {
      await sharp(file.buffer)
        .rotate()
        .resize({
          width: 1920,
          height: 1920,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({
          quality: 75,
          effort: 4,
        })
        .toFile(outputPath);
    } catch {
      throw new BadRequestException(`Foto ${file.originalname} gagal diproses`);
    }

    return `uploads/${scope}/${category}/${filename}`;
  }

  async saveMany(
    files: Express.Multer.File[],
    scope: DailyImageScope,
    category: DailyImageCategory,
  ): Promise<string[]> {
    if (!files?.length) {
      throw new BadRequestException('Minimal satu foto wajib dipilih');
    }

    const paths: string[] = [];

    for (const file of files) {
      const savedPath = await this.saveImage(file, scope, category);

      paths.push(savedPath);
    }

    return paths;
  }

  resolveImage(
    scope: DailyImageScope,
    category: DailyImageCategory,
    filename: string,
  ): string {
    const safeFilename = basename(filename);

    const imagePath = join(
      this.uploadsDirectory,
      scope,
      category,
      safeFilename,
    );

    if (!existsSync(imagePath) || !statSync(imagePath).isFile()) {
      throw new NotFoundException('Foto Daily Activity tidak ditemukan');
    }

    return imagePath;
  }

  deleteImage(storedPath: string): void {
    if (!storedPath) {
      return;
    }

    const normalizedPath = storedPath.replace(/\\/g, '/').replace(/^\/+/, '');

    if (
      !normalizedPath.startsWith('uploads/daily-activities/') &&
      !normalizedPath.startsWith('uploads/grass-cutting/')
    ) {
      return;
    }

    const absolutePath = join(process.cwd(), normalizedPath);

    if (existsSync(absolutePath) && statSync(absolutePath).isFile()) {
      unlinkSync(absolutePath);
    }
  }

  deleteMany(storedPaths: string[]): void {
    for (const storedPath of storedPaths || []) {
      this.deleteImage(storedPath);
    }
  }
}
