import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsString, Min, ValidateNested } from 'class-validator';
import { KategoriRkb, StatusRkb } from '@prisma/client';

export class BarangRkbDto {
  @IsString()
  @IsNotEmpty()
  namaBarang: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  qty: number;

  @IsString()
  @IsNotEmpty()
  satuan: string;
}

export class SimpanMonitoringRkbDto {
  @IsDateString()
  tanggal: string;

  @IsString()
  @IsNotEmpty()
  nomorRkb: string;

  @IsEnum(KategoriRkb)
  kategori: KategoriRkb;

  @IsEnum(StatusRkb)
  status: StatusRkb;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => BarangRkbDto)
  barang: BarangRkbDto[];
}
