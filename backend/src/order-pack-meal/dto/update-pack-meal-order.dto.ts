import { PartialType } from '@nestjs/mapped-types';
import { CreatePackMealOrderDto } from './create-pack-meal-order.dto';

export class UpdatePackMealOrderDto extends PartialType(
  CreatePackMealOrderDto,
) {}
