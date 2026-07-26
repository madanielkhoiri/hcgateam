import { IsDateString, IsOptional, IsString } from 'class-validator';

export class EditDailyActivityDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsString()
  workName?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
