import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateHandoverDto {
  @IsInt()
  workOrderId: number;

  @IsDateString()
  handoverDate: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  receiverName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  receiverPosition?: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  receiverDepartment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  handoverNote?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documentationPaths?: string[];
}
