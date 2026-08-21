// ==================================================
// FILE: backend/src/surat-penolakan-magang/dto/surat-penolakan-magang.dto.ts
// FUNGSI: Validasi request Surat Penolakan Magang (R & D)
// ==================================================

import { IsIn, IsInt, IsNotEmpty, IsString } from 'class-validator';

export class BuatSuratPenolakanMagangDto {
  @IsInt()
  anakMagangId: number;

  @IsIn(['Saudara', 'Saudari'])
  sapaan: 'Saudara' | 'Saudari';

  @IsString()
  @IsNotEmpty({ message: 'Alasan penolakan wajib diisi' })
  alasanPenolakan: string;
}
