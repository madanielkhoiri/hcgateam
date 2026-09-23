import { Module } from '@nestjs/common';
import { OrderPackMealController } from './order-pack-meal.controller';
import { OrderPackMealService } from './order-pack-meal.service';
import { OrderPackMealReceiptPdfService } from './order-pack-meal-receipt-pdf.service';

@Module({
  controllers: [OrderPackMealController],
  providers: [OrderPackMealService, OrderPackMealReceiptPdfService],
})
export class OrderPackMealModule {}
