import { IsIn, IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

// <--- fitur dto buat pengajuan --->
export class BuatPengajuanDto {
  @IsNotEmpty({
    message: 'Pengguna wajib dipilih.',
  })
  @Type(() => Number)
  @IsInt({
    message: 'ID pengguna tidak valid.',
  })
  id_pengguna!: number;

  @IsOptional()
  @IsString({
    message: 'NRP tidak valid.',
  })
  nrp?: string;

  @IsOptional()
  @IsString({
    message: 'Nama pengguna tidak valid.',
  })
  nama_pengguna?: string;

  @IsNotEmpty({
    message: 'Jenis pengajuan wajib dipilih.',
  })
  @IsIn(['PERJALANAN_DINAS', 'UANG_OPERASIONAL'], {
    message: 'Jenis pengajuan tidak valid.',
  })
  jenis_pengajuan!: 'PERJALANAN_DINAS' | 'UANG_OPERASIONAL';

  @IsOptional()
  @IsString({
    message: 'Lokasi tidak valid.',
  })
  lokasi?: string;

  @IsOptional()
  @IsString({
    message: 'Keterangan tidak valid.',
  })
  keterangan?: string;

  @IsOptional()
  @IsString({
    message: 'Tanggal pengajuan tidak valid.',
  })
  tanggal_pengajuan?: string;

  @IsOptional()
  @IsString({
    message: 'Nomor STD tidak valid.',
  })
  nomor_std?: string;

  @IsOptional()
  @IsString({
    message: 'Nomor RAB tidak valid.',
  })
  nomor_rab?: string;
}
// <--- end --->