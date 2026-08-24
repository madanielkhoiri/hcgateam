import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Aktor } from '../common/eprom-aktor';
import type { AktorEprom } from '../common/eprom-aktor';
import {
  EpromSafetyMeetingService,
  UploadSafetyMeetingDto,
} from './eprom-safety-meeting.service';

@Controller('eprom/safety-meeting')
@UseGuards(JwtAuthGuard)
export class EpromSafetyMeetingController {
  constructor(private readonly service: EpromSafetyMeetingService) {}

  @Get(':tipe')
  daftar(
    @Aktor() aktor: AktorEprom,
    @Param('tipe') tipeRaw: string,
    @Query('projectId', ParseIntPipe) projectId: number,
  ) {
    return this.service.daftar(
      aktor,
      this.service.validasiTipe(tipeRaw),
      projectId,
    );
  }

  @Post(':tipe')
  @UseInterceptors(FilesInterceptor('file', 100, { storage: memoryStorage() }))
  unggah(
    @Aktor() aktor: AktorEprom,
    @Param('tipe') tipeRaw: string,
    @Body() dto: UploadSafetyMeetingDto,
    @UploadedFiles() files?: Express.Multer.File[],
  ) {
    return this.service.unggah(
      aktor,
      this.service.validasiTipe(tipeRaw),
      dto.projectId,
      files,
    );
  }

  @Delete(':tipe/:id')
  hapus(
    @Aktor() aktor: AktorEprom,
    @Param('tipe') tipeRaw: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.service.hapus(aktor, this.service.validasiTipe(tipeRaw), id);
  }
}
