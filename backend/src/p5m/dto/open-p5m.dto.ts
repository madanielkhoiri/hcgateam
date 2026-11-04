import { IsString, Matches } from 'class-validator';

export class OpenP5mDto {
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/)
  startTime!: string;
}
