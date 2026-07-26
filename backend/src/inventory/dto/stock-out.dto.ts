import {
  IsDateString,
  IsInt,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';

export class CreateStockOutDto {
  @IsDateString()
  date!: string;

  @IsInt()
  @IsPositive()
  itemId!: number;

  @IsInt()
  @IsPositive()
  quantity!: number;

  @IsString()
  @MinLength(2)
  taker!: string;

  @IsString()
  @MinLength(2)
  department!: string;
}

export class UpdateStockOutDto {
  @IsDateString()
  date!: string;

  @IsInt()
  @IsPositive()
  itemId!: number;

  @IsInt()
  @IsPositive()
  quantity!: number;

  @IsString()
  @MinLength(2)
  taker!: string;

  @IsString()
  @MinLength(2)
  department!: string;
}
