import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { DailyActivityType } from '@prisma/client';

export class CreateDailyActivityDto {
  @IsEnum(DailyActivityType)
  activityType: DailyActivityType;

  @IsDateString()
  startDate: string;

  @IsString()
  @IsNotEmpty()
  workName: string;

  @IsString()
  @IsNotEmpty()
  location: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsString()
  @IsNotEmpty()
  profilePhotoPath: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  preActivityPhotoPaths: string[];

  @IsInt()
  @Min(0)
  @Max(100)
  initialProgress: number;

  @IsString()
  @IsNotEmpty()
  pic: string;

  @IsOptional()
  @IsString()
  initialNotes?: string;
}
