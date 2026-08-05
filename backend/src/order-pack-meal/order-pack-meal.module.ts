import { Module } from '@nestjs/common';
import { OrderPackMealController } from './order-pack-meal.controller';
import { OrderPackMealService } from './order-pack-meal.service';

@Module({
  controllers: [OrderPackMealController],
  providers: [OrderPackMealService],
})
export class OrderPackMealModule {}
