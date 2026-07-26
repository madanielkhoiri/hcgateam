import {
  IsDateString,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

const WEATHER_OPTIONS = ['CERAH', 'HUJAN', 'MENDUNG'] as const;

export class CreatePostActivityDto {
  @IsDateString()
  activityDate: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Jam mulai harus memakai format HH:mm',
  })
  startTime: string;

  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'Jam selesai harus memakai format HH:mm',
  })
  endTime: string;

  @Transform(({ value }) =>
    String(value ?? '')
      .trim()
      .toUpperCase(),
  )
  @IsString()
  @IsNotEmpty()
  workName: string;

  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(100)
  progressPercent: number;

  @Transform(({ value }) =>
    String(value ?? '')
      .trim()
      .toUpperCase(),
  )
  @IsIn(WEATHER_OPTIONS)
  morningWeather: string;

  @Transform(({ value }) =>
    String(value ?? '')
      .trim()
      .toUpperCase(),
  )
  @IsIn(WEATHER_OPTIONS)
  afternoonWeather: string;

  @Transform(({ value }) =>
    String(value ?? '')
      .trim()
      .toUpperCase(),
  )
  @IsIn(WEATHER_OPTIONS)
  eveningWeather: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  coordinatorCount: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  carpenterCount: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  helperCount: number;

  @Transform(({ value }) =>
    String(value ?? 'ARIEF RAHIM')
      .trim()
      .toUpperCase(),
  )
  @IsString()
  @IsNotEmpty()
  approverName: string;
}
