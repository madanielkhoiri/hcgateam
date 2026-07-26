import { IsDateString, IsInt, IsPositive } from 'class-validator';

export class CreateStockInDto {
  @IsDateString()
  date!: string;

  @IsInt()
  @IsPositive()
  itemId!: number;

  @IsInt()
  @IsPositive()
  quantity!: number;
}

export class UpdateStockInDto {
  @IsDateString()
  date!: string;

  @IsInt()
  @IsPositive()
  itemId!: number;

  @IsInt()
  @IsPositive()
  quantity!: number;
}
