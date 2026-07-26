import { ItemCategory, ItemUnit } from '@prisma/client';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateItemDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEnum(ItemCategory)
  category!: ItemCategory;

  @IsEnum(ItemUnit)
  unit!: ItemUnit;
}

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsEnum(ItemCategory)
  category?: ItemCategory;

  @IsOptional()
  @IsEnum(ItemUnit)
  unit?: ItemUnit;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
