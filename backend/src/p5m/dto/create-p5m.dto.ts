import {
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateP5mDto {
  @IsDateString()
  activityDate!: string;

  @IsString()
  @MaxLength(255)
  location!: string;

  @IsString()
  @MaxLength(255)
  speaker!: string;

  @IsString()
  participants!: string;

  @IsString()
  topic!: string;

  @IsArray()
  @IsString({ each: true })
  supervisors!: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentationPaths?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
