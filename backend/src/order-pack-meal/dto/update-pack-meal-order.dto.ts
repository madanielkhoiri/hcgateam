import { PartialType } from '@nestjs/mapped-types';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { StatusApprovalPackMeal, StatusDeliveryPackMeal } from '@prisma/client';
import { CreatePackMealOrderDto } from './create-pack-meal-order.dto';

export class UpdatePackMealOrderDto extends PartialType(
  CreatePackMealOrderDto,
) {
  /** Vendor pelaksana - ditentukan Admin/HCGA, bukan diisi saat order dibuat. */
  @IsOptional()
  @IsString()
  @MaxLength(120)
  vendor?: string;

  @IsOptional()
  @IsEnum(StatusApprovalPackMeal)
  statusApproval?: StatusApprovalPackMeal;

  @IsOptional()
  @IsEnum(StatusDeliveryPackMeal)
  statusDelivery?: StatusDeliveryPackMeal;
}
