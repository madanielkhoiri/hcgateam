// ==================================================
// FILE: backend/src/ir/ir.module.ts
// FUNGSI: Modul PORTAL IR (Upload Dokumen, Aspirasi Karyawan, IR Course)
// ==================================================

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { IrAksesService } from './common/ir-akses.service';
import { IrFileService } from './common/ir-file.service';
import { IrDokumenController } from './dokumen/ir-dokumen.controller';
import { IrDokumenService } from './dokumen/ir-dokumen.service';
import { IrAspirasiController } from './aspirasi/ir-aspirasi.controller';
import { IrAspirasiService } from './aspirasi/ir-aspirasi.service';
import { IrCourseController } from './course/ir-course.controller';
import { IrCourseService } from './course/ir-course.service';

@Module({
  imports: [PrismaModule],
  controllers: [IrDokumenController, IrAspirasiController, IrCourseController],
  providers: [
    IrAksesService,
    IrFileService,
    IrDokumenService,
    IrAspirasiService,
    IrCourseService,
  ],
})
export class IrModule {}
