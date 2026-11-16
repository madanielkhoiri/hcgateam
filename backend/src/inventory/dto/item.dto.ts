import { ItemCategory, ItemUnit, LokasiGudang } from '@prisma/client';
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

  /** Wajib untuk Inventory Electric (divalidasi di service). */
  @IsOptional()
  @IsEnum(LokasiGudang, { message: 'Lokasi gudang tidak valid' })
  lokasiGudang?: LokasiGudang;
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

  @IsOptional()
  @IsEnum(LokasiGudang, { message: 'Lokasi gudang tidak valid' })
  lokasiGudang?: LokasiGudang;
}
