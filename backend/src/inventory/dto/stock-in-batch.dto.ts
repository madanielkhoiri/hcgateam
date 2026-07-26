import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsPositive,
  ValidateNested,
} from 'class-validator';

export class StockInBatchItemDto {
  @IsInt()
  @IsPositive()
  itemId!: number;

  @IsInt()
  @IsPositive()
  quantity!: number;
}

export class CreateStockInBatchDto {
  @IsDateString()
  date!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StockInBatchItemDto)
  items!: StockInBatchItemDto[];
}
