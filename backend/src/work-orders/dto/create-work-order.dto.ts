import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  WorkOrderPic,
  WorkOrderPriority,
  WorkOrderStatus,
} from '@prisma/client';

export class CreateWorkOrderDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  workOrderName: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  department: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  position?: string;

  @IsEnum(WorkOrderPic)
  pic: WorkOrderPic;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  jobType: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  userDepartmentName: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsDateString()
  requestedAt: string;

  @IsEnum(WorkOrderStatus)
  status: WorkOrderStatus;

  @IsOptional()
  @IsEnum(WorkOrderPriority)
  priority?: WorkOrderPriority;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  imagePaths?: string[];

  /** Durasi pekerjaan dalam hari (angka saja), diinput manual. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(3650)
  workDurationDays?: number;
}
