import { P5mHealth, P5mSleep24 } from '@prisma/client';
import { IsBoolean, IsEnum } from 'class-validator';

export class SubmitP5mAttendanceDto {
  @IsBoolean() sleep72!: boolean;
  @IsBoolean() sleep48!: boolean;
  @IsEnum(P5mSleep24) sleep24!: P5mSleep24;
  @IsBoolean() nutritionEnough!: boolean;
  @IsBoolean() noAlcoholMedicine!: boolean;
  @IsBoolean() noExcessActivity!: boolean;
  @IsBoolean() noExcessStress!: boolean;
  @IsBoolean() noSeriousIllness!: boolean;
  @IsBoolean() noFamilyProblem!: boolean;
  @IsBoolean() understandsWork!: boolean;
  @IsEnum(P5mHealth) health!: P5mHealth;
}
