import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class StockOutBatchItemDto {
  @IsInt()
  @IsPositive()
  itemId!: number;

  @IsInt()
  @IsPositive()
  quantity!: number;
}

export class CreateStockOutBatchDto {
  @IsDateString()
  date!: string;

  @IsString()
  @MinLength(2)
  taker!: string;

  @IsString()
  @MinLength(2)
  department!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockOutBatchItemDto)
  items!: StockOutBatchItemDto[];
}
