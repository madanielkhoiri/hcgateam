import { Module } from '@nestjs/common';
import { OrderPackMealController } from './order-pack-meal.controller';
import { OrderPackMealService } from './order-pack-meal.service';
import { OrderPackMealReceiptPdfService } from './order-pack-meal-receipt-pdf.service';
import { OrderPackMealMiningController } from './order-pack-meal-mining.controller';
import { OrderPackMealMiningService } from './order-pack-meal-mining.service';

@Module({
  controllers: [OrderPackMealController, OrderPackMealMiningController],
  providers: [
    OrderPackMealService,
    OrderPackMealReceiptPdfService,
    OrderPackMealMiningService,
  ],
})
export class OrderPackMealModule {}
