import { PartialType } from '@nestjs/mapped-types';
import { CreatePreActivityCheckDto } from './create-pre-activity-check.dto';

export class UpdatePreActivityCheckDto extends PartialType(
  CreatePreActivityCheckDto,
) {}
