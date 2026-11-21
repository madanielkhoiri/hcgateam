import { KondisiBarangOpname, LokasiGudang } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class BuatStockOpnameDto {
  /** Khusus Inventory Electric: kosong = semua lokasi gudang. */
  @IsOptional()
  @IsEnum(LokasiGudang, { message: 'Lokasi gudang tidak valid' })
  lokasiGudang?: LokasiGudang;

  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Catatan maksimal 500 karakter' })
  catatan?: string;
}

export class IsiStockOpnameItemDto {
  @IsInt({ message: 'Jumlah fisik harus angka bulat' })
  @Min(0, { message: 'Jumlah fisik tidak boleh minus' })
  stokFisik!: number;

  @IsOptional()
  @IsEnum(KondisiBarangOpname, { message: 'Kondisi barang tidak valid' })
  kondisi?: KondisiBarangOpname;

  @IsOptional()
  @IsString()
  @MaxLength(300, { message: 'Catatan maksimal 300 karakter' })
  catatan?: string;
}
