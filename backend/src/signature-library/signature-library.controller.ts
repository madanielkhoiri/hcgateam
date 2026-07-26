import {
  BadRequestException,
  Controller,
  Get,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync, readdirSync } from 'node:fs';
import { extname, join } from 'node:path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

const signatureRoot = join(process.cwd(), 'uploads', 'signatures');

const coordinatorFolder = join(signatureRoot, 'coordinators');

function ensureFolders() {
  mkdirSync(signatureRoot, { recursive: true });
  mkdirSync(coordinatorFolder, { recursive: true });
}

function normalizeName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

@Controller('signature-library')
@UseGuards(JwtAuthGuard)
export class SignatureLibraryController {
  @Get('supervisors')
  getSupervisors() {
    ensureFolders();

    const items = [
      {
        name: 'Herfit Almiya',
        filename: 'herfit-almiya.png',
      },
      {
        name: 'Singgieh Prananda',
        filename: 'singgieh-prananda.png',
      },
      {
        name: 'Wahyu Binuko',
        filename: 'wahyu-binuko.png',
      },
      {
        name: 'Arief Rahman',
        filename: 'arief-rahman.png',
      },
    ];

    return items
      .filter((item) => existsSync(join(signatureRoot, item.filename)))
      .map((item) => ({
        ...item,
        path: `/uploads/signatures/${item.filename}`,
      }));
  }

  @Get('coordinators')
  getCoordinators() {
    ensureFolders();

    return readdirSync(coordinatorFolder)
      .filter((filename) => /\.(png|jpe?g|webp)$/i.test(filename))
      .sort((a, b) => a.localeCompare(b))
      .map((filename) => ({
        name: filename
          .replace(/\.[^.]+$/, '')
          .replace(/-\d+$/, '')
          .split('-')
          .filter(Boolean)
          .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(' '),

        filename,

        path: `/uploads/signatures/coordinators/${filename}`,
      }));
  }

  @Post('coordinators')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_request, _file, callback) => {
          ensureFolders();
          callback(null, coordinatorFolder);
        },

        filename: (request, file, callback) => {
          const rawName = String(request.body?.name ?? 'koordinator');

          const safeName = normalizeName(rawName) || 'koordinator';

          const extension = extname(file.originalname).toLowerCase() || '.png';

          callback(null, `${safeName}-${Date.now()}${extension}`);
        },
      }),

      fileFilter: (_request, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(
            new BadRequestException('Tanda tangan wajib berupa gambar.'),
            false,
          );
          return;
        }

        callback(null, true);
      },

      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  uploadCoordinator(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('File tanda tangan belum dipilih.');
    }

    return {
      filename: file.filename,
      path: `/uploads/signatures/coordinators/${file.filename}`,
    };
  }
}
