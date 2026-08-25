import { TipeAspirasiPertanyaan } from '@prisma/client';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class BuatPertanyaanDto {
  @IsString()
  @IsNotEmpty({ message: 'Teks pertanyaan wajib diisi' })
  @MaxLength(500)
  teks: string;

  @IsEnum(TipeAspirasiPertanyaan, { message: 'Tipe pertanyaan tidak valid' })
  tipe: TipeAspirasiPertanyaan;

  @ValidateIf((dto) => dto.tipe === TipeAspirasiPertanyaan.PILIHAN_GANDA)
  @IsArray()
  @ArrayMinSize(2, { message: 'Pilihan ganda minimal 2 opsi' })
  @IsString({ each: true })
  opsi?: string[];
}

export class UbahPertanyaanDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  teks?: string;

  @IsOptional()
  @IsBoolean()
  aktif?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  opsi?: string[];
}

export class JawabPertanyaanDto {
  @IsOptional()
  @IsInt()
  opsiId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  jawabanTeks?: string;
}
