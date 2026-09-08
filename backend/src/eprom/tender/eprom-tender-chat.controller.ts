// ==================================================
// FILE: backend/src/eprom/tender/eprom-tender-chat.controller.ts
// FUNGSI: Endpoint chat undangan tender (khusus Owner — vendor tetap
// berkomunikasi lewat email, tidak lewat web).
// ==================================================

import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { EpromAksesService } from '../common/eprom-akses.service';
import { Aktor } from '../common/eprom-aktor';
import type { AktorEprom } from '../common/eprom-aktor';
import { EpromTenderChatService } from './eprom-tender-chat.service';

@Controller('eprom/tender')
@UseGuards(JwtAuthGuard)
export class EpromTenderChatController {
  constructor(
    private readonly service: EpromTenderChatService,
    private readonly akses: EpromAksesService,
  ) {}

  @Get(':id/undangan/:vendorId/pesan')
  daftarPesan(
    @Aktor() aktor: AktorEprom,
    @Param('id', ParseIntPipe) id: number,
    @Param('vendorId', ParseIntPipe) vendorId: number,
  ) {
    this.akses.wajibOwner(aktor);
    return this.service.daftarPesan(id, vendorId);
  }

  @Post(':id/undangan/:vendorId/pesan')
  @UseInterceptors(AnyFilesInterceptor({ storage: memoryStorage() }))
  kirimPesan(
    @Aktor() aktor: AktorEprom,
    @Param('id', ParseIntPipe) id: number,
    @Param('vendorId', ParseIntPipe) vendorId: number,
    @Body('isi') isi: string,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    this.akses.wajibOwner(aktor);
    return this.service.kirimPesanKeluar(aktor, id, vendorId, isi, files ?? []);
  }
}
