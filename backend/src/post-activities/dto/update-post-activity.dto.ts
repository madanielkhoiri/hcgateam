import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreatePostActivityDto } from './create-post-activity.dto';

export class UpdatePostActivityDto extends PartialType(CreatePostActivityDto) {
  @IsOptional()
  @IsString()
  retainedPhotoPaths?: string;
}
