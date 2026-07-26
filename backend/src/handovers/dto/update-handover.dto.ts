import { PartialType } from '@nestjs/mapped-types';
import { CreateHandoverDto } from './create-handover.dto';

export class UpdateHandoverDto extends PartialType(CreateHandoverDto) {}
