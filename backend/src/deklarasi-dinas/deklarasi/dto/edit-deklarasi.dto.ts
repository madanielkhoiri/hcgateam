import { IsNotEmpty, IsString } from 'class-validator';

// <--- fitur dto edit deklarasi --->
export class EditDeklarasiDto {
  @IsNotEmpty()
  @IsString()
  tanggal_kegiatan!: string;

  @IsNotEmpty()
  @IsString()
  lokasi!: string;

  @IsNotEmpty()
  @IsString()
  keterangan!: string;
}
// <--- end --->