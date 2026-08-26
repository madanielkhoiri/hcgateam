// ==================================================
// FILE: backend/src/drive/drive.module.ts
// FUNGSI: Modul Drive Administrasi (CSR, Form Download)
// ==================================================

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DriveController } from './drive.controller';
import { DriveFileService } from './drive-file.service';
import { DriveService } from './drive.service';

@Module({
  imports: [PrismaModule],
  controllers: [DriveController],
  providers: [DriveService, DriveFileService],
})
export class DriveModule {}
