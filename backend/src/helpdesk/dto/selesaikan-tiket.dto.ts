import { IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { LEVEL_TIKET_HELPDESK } from '../helpdesk.constants';

export class SelesaikanTiketDto {
  @IsString()
  @MinLength(3, { message: 'Catatan penyelesaian minimal 3 karakter' })
  @MaxLength(2000)
  catatanPenyelesaian: string;

  @IsOptional()
  @IsIn(LEVEL_TIKET_HELPDESK, { message: 'Level tidak valid' })
  level?: string;
}
