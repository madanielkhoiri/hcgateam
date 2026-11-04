import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewP5mAttendanceDto {
  @IsBoolean()
  allowedToWork!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  reviewNote?: string;
}
