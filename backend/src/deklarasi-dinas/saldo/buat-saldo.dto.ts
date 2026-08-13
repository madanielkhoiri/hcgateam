import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

// <--- fitur dto input saldo karyawan --->
export class BuatSaldoDto {
  @IsNotEmpty()
  @IsNumber()
  id_pengguna!: number;

  @IsNotEmpty()
  @IsString()
  nrp!: string;

  @IsNotEmpty()
  @IsString()
  nama_pengguna!: string;

  @IsOptional()
    @IsString()
    lokasi?: string;

  @IsNotEmpty()
  @IsEnum(['PERJALANAN_DINAS', 'UANG_OPERASIONAL'])
  jenis_saldo!: 'PERJALANAN_DINAS' | 'UANG_OPERASIONAL';

  @IsNotEmpty()
  @IsNumber()
  nominal_transfer!: number;

  @IsNotEmpty()
  @IsString()
  tanggal_transfer!: string;

  @IsOptional()
  @IsString()
  keterangan?: string;

  @IsOptional()
  @IsString()
  nomor_std?: string;
}
// <--- end --->