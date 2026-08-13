import { IsEnum, IsOptional, IsString } from 'class-validator';

// <--- fitur dto ubah status deklarasi oleh admin FA --->
export class UbahStatusDeklarasiDto {
  @IsEnum(['DIVERIFIKASI', 'DISETUJUI', 'DITOLAK'])
  status!: 'DIVERIFIKASI' | 'DISETUJUI' | 'DITOLAK';

  @IsOptional()
  @IsString()
  alasan_ditolak?: string;
}
// <--- end --->