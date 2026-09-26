// ==================================================
// FILE: backend/src/tiket/billing/tiket-billing.controller.ts
// FUNGSI: Endpoint Billing (upload ZIP -> simpan histori + PDF rekap)
// dan Rekapan (hitung rekonsiliasi Sub Total - PPN - PPH23)
// ==================================================

import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RequireAccessKey } from '../../auth/require-access-key.decorator';
import {
  BuatTiketBillingDto,
  HitungRekapDto,
  UbahTiketBillingDto,
} from './dto/tiket-billing.dto';
import { TiketBillingService } from './tiket-billing.service';

type AuthRequest = {
  user: { id: number };
};

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
  constructor(private readonly service: TiketBillingService) {}

  @Get()
  daftar(@Query('bulan') bulan?: string, @Query('tahun') tahun?: string) {
    return this.service.daftar({
      bulan: bulan ? Number(bulan) : undefined,
      tahun: tahun ? Number(tahun) : undefined,
    });
  }

  @Get(':id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.detail(id);
  }

  @Post()
  @UseInterceptors(zipUpload)
  async buat(
    @Body() dto: BuatTiketBillingDto,
    @UploadedFile() zip: Express.Multer.File | undefined,
    @Req() request: AuthRequest,
  ) {
    if (!zip) {
      throw new BadRequestException('File ZIP wajib diunggah');
    }

    return this.service.buat(dto, zip.buffer, zip.originalname, request.user.id);
  }

  @Patch(':id/hitung')
  hitungRekap(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: HitungRekapDto,
    @Req() request: AuthRequest,
  ) {
    return this.service.hitungRekap(id, dto, request.user.id);
  }

  @Patch(':id')
  ubah(@Param('id', ParseIntPipe) id: number, @Body() dto: UbahTiketBillingDto) {
    return this.service.ubah(id, dto);
  }

  @Delete(':id')
  hapus(@Param('id', ParseIntPipe) id: number) {
    return this.service.hapus(id);
  }
}

// ==================================================
// SELESAI: backend/src/tiket/billing/tiket-billing.controller.ts
// ==================================================
