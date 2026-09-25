// ==================================================
// FILE: backend/src/tiket/billing/tiket-billing.controller.ts
// FUNGSI: Endpoint upload ZIP invoice -> unduh PDF rekap grid
// ==================================================

import {
  BadRequestException,
  Controller,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RequireAccessKey } from '../../auth/require-access-key.decorator';
import { TiketBillingRekapService } from './tiket-billing-rekap.service';

const zipUpload = FileInterceptor('zip', {
  storage: memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
  fileFilter: (_request, file, callback) => {
    const allowedMimeTypes = new Set([
      'application/zip',
      'application/x-zip-compressed',
      'application/x-zip',
      'application/octet-stream',
    ]);

    if (
      !allowedMimeTypes.has(file.mimetype) &&
      !file.originalname.toLowerCase().endsWith('.zip')
    ) {
      callback(new BadRequestException('File wajib berformat ZIP'), false);
      return;
    }

    callback(null, true);
  },
});

@Controller('tiket/billing')
@UseGuards(JwtAuthGuard)
@RequireAccessKey('GA_TRANSPORT_TIKET')
export class TiketBillingController {
  constructor(private readonly rekap: TiketBillingRekapService) {}

  @Post('rekap')
  @UseInterceptors(zipUpload)
  async rekapkan(
    @UploadedFile() zip: Express.Multer.File | undefined,
    @Res() response: Response,
  ) {
    if (!zip) {
      throw new BadRequestException('File ZIP wajib diunggah');
    }

    const pdf = await this.rekap.generate(zip.buffer);

    response
      .set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="rekap-billing-tiket.pdf"',
      })
      .send(pdf);
  }
}

// ==================================================
// SELESAI: backend/src/tiket/billing/tiket-billing.controller.ts
// ==================================================
