import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentNumberService } from '../work-orders/document-number.service';
import { HandoverImagesController } from './handover-images.controller';
import { HandoversController } from './handovers.controller';
import { HandoverPdfService } from './handover-pdf.service';
import { HandoversService } from './handovers.service';

@Module({
  controllers: [HandoversController, HandoverImagesController],
  providers: [
    HandoversService,
    HandoverPdfService,
    DocumentNumberService,
    PrismaService,
  ],
})
export class HandoversModule {}
