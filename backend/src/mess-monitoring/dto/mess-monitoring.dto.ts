import { IsArray, IsEnum, IsNotEmpty, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { MessOccupantShift } from '@prisma/client';

export class MessOccupantDto {
  @IsString() @IsNotEmpty() nrp!: string;
  @IsString() @IsNotEmpty() name!: string;
  @IsEnum(MessOccupantShift) shift!: MessOccupantShift;
}

export class CreateMessRoomDto {
  @IsString() @IsNotEmpty() number!: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => MessOccupantDto)
  occupants?: MessOccupantDto[];
}

export class UpdateMessRoomDto {
  @IsString() @IsNotEmpty() number!: string;
}

export class UpdateMessOccupantDto extends MessOccupantDto {}
