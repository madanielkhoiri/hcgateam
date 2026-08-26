// ==================================================
// FILE: backend/src/album/album.module.ts
// FUNGSI: Modul Album Dokumentasi (foto kegiatan)
// ==================================================

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AlbumController } from './album.controller';
import { AlbumFileService } from './album-file.service';
import { AlbumService } from './album.service';

@Module({
  imports: [PrismaModule],
  controllers: [AlbumController],
  providers: [AlbumService, AlbumFileService],
})
export class AlbumModule {}
