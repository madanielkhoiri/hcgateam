import { Controller, Get, NotFoundException, Param, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('work-order-images')
@UseGuards(JwtAuthGuard)
export class WorkOrderImagesController {
  @Get(':filename')
  getImage(@Param('filename') filename: string, @Res() response: Response) {
    const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '');

    const uploadDirectory = join(process.cwd(), 'uploads', 'work-orders');

    const filePath = join(uploadDirectory, safeFilename);

    if (!existsSync(filePath)) {
      throw new NotFoundException('Foto Work Order tidak ditemukan');
    }

    return response.sendFile(safeFilename, {
      root: uploadDirectory,
    });
  }
}
