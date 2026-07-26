import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
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
}
