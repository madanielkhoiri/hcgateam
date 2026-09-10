import { DivisiPengaduan, LokasiPengaduan } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class CreatePengaduanLayananDto {
  @IsEnum(DivisiPengaduan)
  divisi: DivisiPengaduan;

  @IsEnum(LokasiPengaduan)
  lokasi: LokasiPengaduan;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  komentar?: string;
}
