import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, Matches, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MessOccupantShift } from '@prisma/client';

export class MessOccupantDto {
  @IsString() @IsNotEmpty() nrp!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsEnum(MessOccupantShift) shift!: MessOccupantShift;
}

export class CreateMessRoomDto {
  @IsString() @Matches(/^([1-3]|[A-F])$/) building!: string;
  @IsString() @IsNotEmpty() number!: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => MessOccupantDto)
  occupants?: MessOccupantDto[];
}

export class UpdateMessRoomDto {
  @IsString() @Matches(/^([1-3]|[A-F])$/) building!: string;
  @IsString() @IsNotEmpty() number!: string;
}

export class UpdateMessOccupantDto extends MessOccupantDto {}
