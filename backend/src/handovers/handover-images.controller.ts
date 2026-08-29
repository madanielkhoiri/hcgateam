import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Response } from 'express';
import { existsSync, mkdirSync, unlinkSync } from 'node:fs';
import { basename, extname, join } from 'node:path';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

const uploadDirectory = join(process.cwd(), 'uploads', 'handovers');

mkdirSync(uploadDirectory, {
  recursive: true,
});

function createFilename(originalName: string): string {
  const extension = extname(originalName).toLowerCase() || '.jpg';

  const uniqueName = [
    Date.now(),
    Math.round(Math.random() * 1_000_000_000),
  ].join('-');

  return `${uniqueName}${extension}`;
}

@Controller('handovers')
@UseGuards(JwtAuthGuard)
export class HandoverImagesController {
  constructor(private readonly prisma: PrismaService) {}

  @Post(':id/images')
  @UseInterceptors(
    FilesInterceptor('images', undefined, {
      storage: diskStorage({
        destination: uploadDirectory,
        filename: (_request, file, callback) => {
          callback(null, createFilename(file.originalname));
        },
      }),
      fileFilter: (_request, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(
            new BadRequestException(`${file.originalname} bukan gambar`),
            false,
          );

          return;
        }

        callback(null, true);
      },
      limits: {
        fileSize: 15 * 1024 * 1024,
      },
    }),
  )
  async upload(
    @Param('id', ParseIntPipe)
    id: number,
    @UploadedFiles()
    files: Express.Multer.File[],
  ) {
    const handover = await this.prisma.handover.findUnique({
      where: {
        id,
      },
    });

    if (!handover) {
      this.removeFiles(files);

      throw new NotFoundException('Serah Terima Pekerjaan tidak ditemukan');
    }

    const uploadedPaths = files.map(
      (file) => `uploads/handovers/${file.filename}`,
    );

    const currentPaths = handover.documentationPaths ?? [];

    return this.prisma.handover.update({
      where: {
        id,
      },
      data: {
        documentationPaths: [...currentPaths, ...uploadedPaths],
      },
      include: {
        workOrder: true,
      },
    });
  }

  @Patch(':id/images')
  @UseInterceptors(
    FilesInterceptor('images', undefined, {
      storage: diskStorage({
        destination: uploadDirectory,
        filename: (_request, file, callback) => {
          callback(null, createFilename(file.originalname));
        },
      }),
      fileFilter: (_request, file, callback) => {
        if (!file.mimetype.startsWith('image/')) {
          callback(
            new BadRequestException(`${file.originalname} bukan gambar`),
            false,
          );

          return;
        }

        callback(null, true);
      },
      limits: {
        fileSize: 15 * 1024 * 1024,
      },
    }),
  )
  async addImagesDuringEdit(
    @Param('id', ParseIntPipe)
    id: number,
    @UploadedFiles()
    files: Express.Multer.File[],
  ) {
    return this.upload(id, files);
  }

  @Delete(':id/images/:filename')
  async removeImage(
    @Param('id', ParseIntPipe)
    id: number,
    @Param('filename')
    filename: string,
  ) {
    const handover = await this.prisma.handover.findUnique({
      where: {
        id,
      },
    });

    if (!handover) {
      throw new NotFoundException('Serah Terima Pekerjaan tidak ditemukan');
    }

    const safeFilename = basename(filename);

    const storedPath = `uploads/handovers/${safeFilename}`;

    const nextPaths = (handover.documentationPaths ?? []).filter(
      (path) => basename(path) !== safeFilename,
    );

    await this.prisma.handover.update({
      where: {
        id,
      },
      data: {
        documentationPaths: nextPaths,
      },
    });

    const physicalPath = join(uploadDirectory, safeFilename);

    if (existsSync(physicalPath)) {
      unlinkSync(physicalPath);
    }

    return {
      message: 'Foto Serah Terima berhasil dihapus',
    };
  }

  @Get('images/:filename')
  showImage(
    @Param('filename')
    filename: string,
    @Res()
    response: Response,
  ) {
    const safeFilename = basename(filename);

    const physicalPath = join(uploadDirectory, safeFilename);

    if (!existsSync(physicalPath)) {
      throw new NotFoundException('Foto Serah Terima tidak ditemukan');
    }

    return response.sendFile(physicalPath);
  }

  private removeFiles(files: Express.Multer.File[]): void {
    for (const file of files ?? []) {
      if (file.path && existsSync(file.path)) {
        unlinkSync(file.path);
      }
    }
  }
}
