import { IsNotEmpty, IsString } from 'class-validator';

export class RejectDailyActivityDto {
  @IsString()
  @IsNotEmpty()
  comment: string;
}
