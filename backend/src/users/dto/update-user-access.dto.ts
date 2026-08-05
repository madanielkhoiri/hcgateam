import { ArrayMaxSize, IsArray, IsString } from 'class-validator';

export class UpdateUserAccessDto {
  @IsArray()
  @ArrayMaxSize(50)
  @IsString({ each: true })
  accessKeys: string[];
}
