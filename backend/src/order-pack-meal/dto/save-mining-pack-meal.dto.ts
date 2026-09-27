import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class MiningPackMealEntryDto {
  @IsDateString({}, { message: 'Tanggal harus valid' })
  date: string;

  @IsString()
  @MinLength(2)
  @MaxLength(160)
  area: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  dropLocation?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  dropTimes?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  orderedBy?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsInt()
  @Min(0)
  @Max(100000)
  rosterLunch: number;

  @IsInt()
  @Min(0)
  @Max(100000)
  rosterDinner: number;

  @IsInt()
  @Min(0)
  @Max(100000)
  rosterSpecialMeal: number;

  @IsInt()
  @Min(0)
  @Max(100000)
  rosterSpecialSnack: number;

  @IsInt()
  @Min(0)
  @Max(100000)
  additionalLunch: number;

  @IsInt()
  @Min(0)
  @Max(100000)
  additionalDinner: number;

  @IsInt()
  @Min(0)
  @Max(100000)
  additionalSpecialMeal: number;

  @IsInt()
  @Min(0)
  @Max(100000)
  additionalSpecialSnack: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  receivedLunch?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  receivedDinner?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  receivedSpecialMeal?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  receivedSpecialSnack?: number;
}

export class SaveMiningPackMealDto {
  @IsArray()
  @ArrayMaxSize(1000)
  @ValidateNested({ each: true })
  @Type(() => MiningPackMealEntryDto)
  entries: MiningPackMealEntryDto[];
}
