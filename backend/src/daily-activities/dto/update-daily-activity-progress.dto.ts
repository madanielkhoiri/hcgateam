import {
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateDailyActivityProgressDto {
  @IsDateString()
  progressDate: string;

  @IsInt()
  @Min(1)
  @Max(100)
  addedProgress: number;

  @IsString()
  @IsNotEmpty()
  pic: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  preActivityPhotoPaths: string[];

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  photoPaths: string[];
}
