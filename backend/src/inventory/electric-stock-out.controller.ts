import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { diskStorage } from 'multer';
import { randomUUID } from 'node:crypto';
import { extname, join } from 'node:path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ElectricStockOutService } from './electric-stock-out.service';

const electricPhotoUpload = FileInterceptor('photo', {
  storage: diskStorage({
    destination: join(process.cwd(), 'uploads', 'inventory-electric'),
    filename: (_request, file, callback) => {
      const extension = extname(file.originalname).toLowerCase();

      callback(null, `${Date.now()}-${randomUUID()}${extension}`);
    },
  }),
  limits: {},
  fileFilter: (_request, file, callback) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

    if (!allowedTypes.includes(file.mimetype)) {
      callback(
        new BadRequestException('Foto hanya boleh JPG, PNG, atau WEBP'),
        false,
      );
      return;
    }

    callback(null, true);
  },
});

@Controller('inventory-area/ELECTRIC/stock-outs')
@UseGuards(JwtAuthGuard)
export class ElectricStockOutController {
  constructor(private readonly service: ElectricStockOutService) {}

  @Post('batch-upload')
  @UseInterceptors(electricPhotoUpload)
  createBatch(
    @Body()
    body: {
      date?: string;
      taker?: string;
      description?: string;
      items?: string;
    },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let items: {
      itemId: number;
      quantity: number;
    }[];

    try {
      items = JSON.parse(body.items ?? '[]');
    } catch {
      throw new BadRequestException('Format daftar barang tidak valid');
    }

    return this.service.createBatch(
      {
        date: body.date ?? '',
        taker: body.taker ?? '',
        description: body.description ?? '',
        items,
      },
      file?.filename,
    );
  }

  @Patch(':id/edit-upload')
  @UseInterceptors(electricPhotoUpload)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body()
    body: {
      date?: string;
      itemId?: string;
      quantity?: string;
      taker?: string;
      description?: string;
    },
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.update(
      id,
      {
        date: body.date ?? '',
        itemId: Number(body.itemId),
        quantity: Number(body.quantity),
        taker: body.taker ?? '',
        description: body.description ?? '',
      },
      file?.filename,
    );
  }

  @Get('photo/:filename')
  getPhoto(@Param('filename') filename: string, @Res() response: Response) {
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '');

    return response.sendFile(safeFilename, {
      root: join(process.cwd(), 'uploads', 'inventory-electric'),
    });
  }
}
