// ==================================================
// FILE: backend/src/postingan/postingan.module.ts
// FUNGSI: Modul Postingan (poster/video carousel beranda)
// ==================================================

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PostinganController } from './postingan.controller';
import { PostinganFileService } from './postingan-file.service';
import { PostinganService } from './postingan.service';

@Module({
  imports: [PrismaModule],
  controllers: [PostinganController],
  providers: [PostinganService, PostinganFileService],
})
export class PostinganModule {}
