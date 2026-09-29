import { Module } from '@nestjs/common';
import { DocumentNumberService } from './document-number.service';
import { PrismaModule } from '../prisma/prisma.module';
import { WorkOrderImagesController } from './work-order-images.controller';
import { WorkOrderPdfService } from './work-order-pdf.service';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';
import { WebPushModule } from '../web-push/web-push.module';

@Module({
  imports: [PrismaModule, WebPushModule],
  controllers: [WorkOrdersController, WorkOrderImagesController],
  providers: [DocumentNumberService, WorkOrdersService, WorkOrderPdfService],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
