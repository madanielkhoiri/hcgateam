import { PartialType } from '@nestjs/mapped-types';
import { CreateP5mDto } from './create-p5m.dto';

export class UpdateP5mDto extends PartialType(CreateP5mDto) {}
