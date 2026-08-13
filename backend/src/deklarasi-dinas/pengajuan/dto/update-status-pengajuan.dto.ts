import { IsIn, IsOptional, IsString } from 'class-validator';

// <--- fitur dto update status pengajuan --->
export class UpdateStatusPengajuanDto {
  @IsIn(['DIAJUKAN', 'DISETUJUI', 'DITOLAK', 'MENUNGGU_TRANSFER', 'SELESAI'], {
    message: 'Status pengajuan tidak valid.',
  })
  status_pengajuan!:
    | 'DIAJUKAN'
    | 'DISETUJUI'
    | 'DITOLAK'
    | 'MENUNGGU_TRANSFER'
    | 'SELESAI';

  @IsOptional()
  @IsString({
    message: 'Catatan tidak valid.',
  })
  catatan_admin?: string;
}
// <--- end --->