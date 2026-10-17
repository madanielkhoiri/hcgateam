import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min, ValidateNested } from 'class-validator';
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
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  projectId: number;

  @IsDateString()
  tanggal: string;

  @IsString()
  @IsNotEmpty()
  nomorRkb: string;

  @IsEnum(StatusRkb)
  status: StatusRkb;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BarangRkbDto)
  barang?: BarangRkbDto[];
}

export class SimpanProjectRkbDto {
  @IsString()
  @IsNotEmpty()
  namaProject: string;

  @IsEnum(KategoriRkb)
  kategori: KategoriRkb;
}

export class TambahBarangRkbDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BarangRkbDto)
  barang: BarangRkbDto[];
}

export class UbahStatusRkbDto {
  @IsEnum(StatusRkb)
  status: StatusRkb;
}
