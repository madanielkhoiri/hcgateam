import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateTransportDto {
  @IsString() unitNumber!: string;
  @IsString() department!: string;
  @IsOptional() @IsIn(['LV', 'BUS']) vehicleType?: 'LV' | 'BUS';
  @IsDateString() fuelDate!: string;
  @Type(() => Number) @IsNumber() @Min(0) hmStart!: number;
  @Type(() => Number) @IsNumber() @Min(0) hmEnd!: number;
  @Type(() => Number) @IsNumber() @Min(0) totalLiter!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) lostTimeBd?: number;
  @IsOptional() @IsIn(['READY', 'BREAKDOWN']) unitStatus?: 'READY' | 'BREAKDOWN';
}

export class UpdateTransportDto extends PartialType(CreateTransportDto) {}
