// ==================================================
// FILE: backend/src/eprom/meeting/eprom-meeting.controller.ts
// FUNGSI: Endpoint Meeting, Dokumentasi Meeting, MOM
// ==================================================

import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { TipeLinkMeeting } from '@prisma/client';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Aktor } from '../common/eprom-aktor';
import type { AktorEprom } from '../common/eprom-aktor';
import { BuatMeetingDto, BuatMomDto, EpromMeetingService } from './eprom-meeting.service';

@Controller('eprom/meeting')
@UseGuards(JwtAuthGuard)
export class EpromMeetingController {
  constructor(private readonly service: EpromMeetingService) {}

  @Get()
  daftarMeeting(@Aktor() aktor: AktorEprom, @Query('projectId', ParseIntPipe) projectId: number) {
    return this.service.daftarMeeting(aktor, projectId);
  }

  @Get('sumber-progress')
  sumberProgress(
    @Aktor() aktor: AktorEprom,
    @Query('projectId', ParseIntPipe) projectId: number,
    @Query('tipeLink') tipeLink: TipeLinkMeeting,
  ) {
    return this.service.sumberProgress(aktor, projectId, tipeLink);
  }

  @Post()
  buatMeeting(@Aktor() aktor: AktorEprom, @Body() dto: BuatMeetingDto) {
    return this.service.buatMeeting(aktor, dto);
  }

  @Delete(':id')
  hapusMeeting(@Aktor() aktor: AktorEprom, @Param('id', ParseIntPipe) id: number) {
    return this.service.hapusMeeting(aktor, id);
  }

  @Get(':meetingId/dokumentasi')
  daftarDokumentasi(@Aktor() aktor: AktorEprom, @Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.service.daftarDokumentasi(aktor, meetingId);
  }

  @Post(':meetingId/dokumentasi')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  unggahDokumentasi(
    @Aktor() aktor: AktorEprom,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.unggahDokumentasi(aktor, meetingId, file);
  }

  @Delete('dokumentasi/:id')
  hapusDokumentasi(@Aktor() aktor: AktorEprom, @Param('id', ParseIntPipe) id: number) {
    return this.service.hapusDokumentasi(aktor, id);
  }

  @Get(':meetingId/mom')
  daftarMom(@Aktor() aktor: AktorEprom, @Param('meetingId', ParseIntPipe) meetingId: number) {
    return this.service.daftarMom(aktor, meetingId);
  }

  @Post(':meetingId/mom')
  buatMom(
    @Aktor() aktor: AktorEprom,
    @Param('meetingId', ParseIntPipe) meetingId: number,
    @Body() dto: BuatMomDto,
  ) {
    return this.service.buatMom(aktor, meetingId, dto);
  }

  @Patch('mom/:id/close')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  closeMom(
    @Aktor() aktor: AktorEprom,
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.service.closeMom(aktor, id, file);
  }

  @Delete('mom/:id')
  hapusMom(@Aktor() aktor: AktorEprom, @Param('id', ParseIntPipe) id: number) {
    return this.service.hapusMom(aktor, id);
  }
}
